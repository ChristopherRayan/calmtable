// Browser auth session utilities for JWT token and profile persistence.
import type { AuthUser } from '@/lib/types';
import { normalizeImageSource } from '@/lib/image';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'auth_user';
const ACCESS_COOKIE = 'ct_access_token';

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
}

function clearCookie(name: string) {
  if (typeof document === 'undefined') {
    return;
  }
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function setAuthSession(access: string, refresh: string, user: AuthUser) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_KEY, access);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));

  // Keep middleware-aware cookie short-lived to avoid stale sessions.
  setCookie(ACCESS_COOKIE, access, 60 * 60 * 24);
}

export function updateAccessToken(access: string) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(ACCESS_TOKEN_KEY, access);
  setCookie(ACCESS_COOKIE, access, 60 * 60 * 24);
}

export function clearAuthSession() {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  clearCookie(ACCESS_COOKIE);
}

export function getAccessToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? '';
}

export function getRefreshToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.localStorage.getItem(REFRESH_TOKEN_KEY) ?? '';
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const role = parsed.role ?? (parsed.is_staff ? 'admin' : 'customer');
    return {
      id: Number(parsed.id),
      username: String(parsed.username ?? ''),
      email: String(parsed.email ?? ''),
      first_name: String(parsed.first_name ?? ''),
      last_name: String(parsed.last_name ?? ''),
      phone: String(parsed.phone ?? ''),
      profile_image_url: normalizeImageSource(String(parsed.profile_image_url ?? '')),
      is_staff: Boolean(parsed.is_staff),
      role,
    };
  } catch (_error) {
    return null;
  }
}
