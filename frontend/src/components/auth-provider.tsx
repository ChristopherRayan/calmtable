// Auth context provider for JWT session lifecycle and user profile access.
'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { clearAuthSession, getAccessToken, getRefreshToken, getStoredUser, setAuthSession } from '@/lib/auth';
import { fetchCurrentUser, loginUser, logoutUser, registerUser } from '@/lib/services';
import type { AuthUser, LoginPayload, RegisterPayload } from '@/lib/types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const profile = await fetchCurrentUser();
      const refresh = getRefreshToken();
      if (refresh) {
        setAuthSession(token, refresh, profile);
      }
      setUser(profile);
    } catch (_error) {
      clearAuthSession();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    async function bootstrapAuth() {
      const storedUser = getStoredUser();
      if (storedUser) {
        setUser(storedUser);
      }

      await refreshProfile();
      setLoading(false);
    }

    void bootstrapAuth();
  }, [refreshProfile]);

  async function login(payload: LoginPayload): Promise<AuthUser> {
    const session = await loginUser(payload);
    setAuthSession(session.access, session.refresh, session.user);
    setUser(session.user);
    return session.user;
  }

  async function register(payload: RegisterPayload): Promise<AuthUser> {
    const session = await registerUser(payload);
    setAuthSession(session.access, session.refresh, session.user);
    setUser(session.user);
    return session.user;
  }

  async function logout() {
    const refresh = getRefreshToken();
    try {
      if (refresh) {
        await logoutUser(refresh);
      }
    } finally {
      clearAuthSession();
      setUser(null);
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshProfile,
    }),
    [user, loading, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
}
