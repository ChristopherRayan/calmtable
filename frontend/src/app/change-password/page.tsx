'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { changePassword } from '@/lib/services';
import { Button } from '@/components/button';
import toast from 'react-hot-toast';
import { z } from 'zod';

const passwordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters.')
    .refine((pwd) => /[A-Z]/.test(pwd), 'Password must contain at least one uppercase letter.')
    .refine((pwd) => /[a-z]/.test(pwd), 'Password must contain at least one lowercase letter.')
    .refine((pwd) => /[0-9]/.test(pwd), 'Password must contain at least one number.'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

type PasswordForm = z.infer<typeof passwordSchema>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Client-side validation with Zod
    const validated = passwordSchema.safeParse({ password, confirmPassword });
    if (!validated.success) {
      const firstError = validated.error.issues[0];
      toast.error(firstError.message);
      return;
    }

    setLoading(true);
    try {
      await changePassword(password);
      toast.success('Password changed successfully.');
      await refreshProfile();
      router.push('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0604] dark:bg-[#0a0604] px-4">
      <div className="w-full max-w-md bg-cream dark:bg-[#1a0f08] border border-stone-200 dark:border-white/10 p-8 rounded-3xl shadow-2xl">
        <h1 className="text-2xl font-heading font-bold text-ink dark:text-white mb-2">Change Password</h1>
        <p className="text-ink/60 dark:text-white/60 text-sm mb-6">
          Since this is your first login, you must update your password to continue.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-ink/70 dark:text-white/70">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl px-4 text-ink dark:text-white outline-none focus:border-amber-500/50"
              placeholder="••••••••"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-ink/70 dark:text-white/70">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-11 bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-xl px-4 text-ink dark:text-white outline-none focus:border-amber-500/50"
              placeholder="••••••••"
              required
            />
          </div>

          <Button type="submit" className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl" disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}
