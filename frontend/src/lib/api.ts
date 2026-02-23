// Axios client and interceptors for frontend API communication.
import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

interface ApiErrorPayload {
  detail?: string;
  message?: string;
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost/api';

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    const message = error.response?.data?.detail ?? error.response?.data?.message ?? error.message;
    return Promise.reject(new Error(message));
  }
);

export default api;
