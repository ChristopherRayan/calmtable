// Axios client and interceptors for frontend API communication.
import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import { clearAuthSession, getAccessToken, getRefreshToken, getStoredUser, updateAccessToken } from '@/lib/auth';
import type { AuthResponse } from '@/lib/types';

interface ApiErrorPayload {
  detail?: string;
  message?: string;
  non_field_errors?: string[];
  [key: string]: unknown;
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const refreshClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refresh = getRefreshToken();
  if (!refresh) {
    throw new Error('Session expired. Please sign in again.');
  }

  refreshPromise = refreshClient
    .post<{ access: string; refresh?: string }>('/auth/refresh/', { refresh })
    .then((response) => {
      const accessToken = response.data.access;
      const refreshToken = response.data.refresh ?? refresh;
      const user = getStoredUser();
      if (user) {
        // Reuse persisted profile and rotate tokens if refresh endpoint returns both.
        window.localStorage.setItem('refresh_token', refreshToken);
        updateAccessToken(accessToken);
      }
      return accessToken;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiErrorPayload>) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const statusCode = error.response?.status;

    if (statusCode === 401 && originalRequest && !originalRequest._retry && !originalRequest.url?.includes('/auth/refresh/')) {
      originalRequest._retry = true;
      try {
        const newAccess = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api.request(originalRequest);
      } catch (_refreshError) {
        clearAuthSession();
      }
    }

    const payload = error.response?.data;
    const firstFieldError = payload
      ? Object.values(payload).find(
          (value) =>
            Array.isArray(value) &&
            value.length > 0 &&
            typeof value[0] === 'string'
        )
      : null;
    const message =
      payload?.detail ??
      payload?.message ??
      payload?.non_field_errors?.[0] ??
      (Array.isArray(firstFieldError) ? (firstFieldError[0] as string) : undefined) ??
      error.message;
    return Promise.reject(new Error(message));
  }
);

export async function loginRequest(payload: { email: string; password: string }): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login/', payload);
  return response.data;
}

export async function registerRequest(payload: {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/register/', payload);
  return response.data;
}

export default api;
