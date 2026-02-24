// Legacy admin dashboard route that forwards staff to Django admin.
'use client';

import { useEffect } from 'react';

export default function AdminDashboardPage() {
  useEffect(() => {
    window.location.replace('/admin/');
  }, []);

  return (
    <div className="page-shell py-10">
      <p className="text-sm text-ink/70">Redirecting to admin panel...</p>
    </div>
  );
}
