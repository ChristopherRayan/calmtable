// Admin dashboard page that checks JWT auth and redirects to Django admin.
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { getAccessToken } from '@/lib/auth';

export default function AdminDashboardPage() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    // Check if user is authenticated and is a staff member
    if (!user || !user.is_staff) {
      // Redirect to login if not authenticated or not staff
      window.location.replace('/login?redirect=/admin-dashboard');
      return;
    }

    // Redirect to Django admin SSO endpoint with JWT token
    // Django will validate the token and create a session
    const accessToken = getAccessToken();
    if (accessToken) {
      window.location.href = `http://localhost:8000/api/auth/login/admin/?token=${encodeURIComponent(accessToken)}`;
    } else {
      window.location.href = 'http://localhost:8000/admin/';
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="page-shell py-10">
        <p className="text-sm text-ink/70 dark:text-white/70">Loading...</p>
      </div>
    );
  }

  if (!user?.is_staff) {
    return (
      <div className="page-shell py-10">
        <p className="text-sm text-ink/70 dark:text-white/70">You do not have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="page-shell py-10">
      <p className="text-sm text-ink/70 dark:text-white/70">Redirecting to admin panel...</p>
    </div>
  );
}


