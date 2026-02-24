// Premium auth hub combining sign-in and customer registration.
'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { SectionHeading } from '@/components/section-heading';

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginForm = z.infer<typeof loginSchema>;

const registerSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters.'),
  first_name: z.string().trim().optional(),
  last_name: z.string().trim().optional(),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, register: registerAccount } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [registerSubmitting, setRegisterSubmitting] = useState(false);
  const [nextPath, setNextPath] = useState('');

  const {
    register: registerLoginField,
    handleSubmit: handleLoginSubmit,
    formState: { errors },
    setError: setLoginError,
  } = useForm<LoginForm>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const {
    register: registerFormField,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: registerErrors },
    setError: setRegisterError,
  } = useForm<RegisterForm>({
    defaultValues: {
      username: '',
      first_name: '',
      last_name: '',
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');
    const mode = params.get('mode');
    if (next) {
      setNextPath(next);
    }
    if (mode === 'register') {
      setActiveTab('register');
    }
  }, []);

  const onLoginSubmit = handleLoginSubmit(async (values) => {
    const validated = loginSchema.safeParse(values);
    if (!validated.success) {
      validated.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof LoginForm | undefined;
        if (path) {
          setLoginError(path, { message: issue.message });
        }
      });
      return;
    }

    try {
      setLoginSubmitting(true);
      const signedInUser = await login(validated.data);
      toast.success(`Signed in as ${signedInUser.role}.`);
      if (nextPath) {
        router.push(nextPath);
        return;
      }
      router.push(signedInUser.is_staff ? '/admin-dashboard' : '/book');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setLoginSubmitting(false);
    }
  });

  const onRegisterSubmit = handleRegisterSubmit(async (values) => {
    const validated = registerSchema.safeParse(values);
    if (!validated.success) {
      validated.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof RegisterForm | undefined;
        if (path) {
          setRegisterError(path, { message: issue.message });
        }
      });
      return;
    }

    try {
      setRegisterSubmitting(true);
      const signedInUser = await registerAccount(validated.data);
      toast.success(`Welcome, ${signedInUser.username}. Your customer account is ready.`);
      router.push('/book');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create account.');
    } finally {
      setRegisterSubmitting(false);
    }
  });

  return (
    <div className="page-shell py-10 sm:py-14">
      <SectionHeading
        eyebrow="Account"
        title="Welcome Back"
        description="One premium access point for customers and administrators."
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 grid gap-5 rounded-[2rem] border border-woodAccent/60 bg-gradient-to-br from-[#fff8ef] via-[#f8eee3] to-[#efe3d6] p-4 shadow-soft lg:grid-cols-[1.15fr_0.85fr] lg:p-8"
      >
        <Card elevated className="space-y-6 border-white/70 bg-white/90">
          <div className="inline-flex rounded-full border border-woodAccent/60 bg-warmGray p-1">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
                activeTab === 'login' ? 'bg-tableBrown text-white' : 'text-tableBrown'
              }`}
              aria-label="Show sign in form"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
                activeTab === 'register' ? 'bg-tableBrown text-white' : 'text-tableBrown'
              }`}
              aria-label="Show register form"
            >
              Register
            </button>
          </div>

          {activeTab === 'login' && (
            <form className="space-y-4" onSubmit={onLoginSubmit}>
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="text-sm font-medium text-tableBrown">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  {...registerLoginField('email')}
                  className="h-11 w-full rounded-xl border border-woodAccent bg-white px-3 text-sm text-tableBrown"
                />
                {errors.email && <p className="text-xs text-[#8E4A3A]">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-password" className="text-sm font-medium text-tableBrown">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  {...registerLoginField('password')}
                  className="h-11 w-full rounded-xl border border-woodAccent bg-white px-3 text-sm text-tableBrown"
                />
                {errors.password && <p className="text-xs text-[#8E4A3A]">{errors.password.message}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={loginSubmitting} aria-label="Sign in">
                {loginSubmitting ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
          )}

          {activeTab === 'register' && (
            <form className="space-y-4" onSubmit={onRegisterSubmit}>
              <div className="space-y-1.5">
                <label htmlFor="register-username" className="text-sm font-medium text-tableBrown">
                  Username
                </label>
                <input
                  id="register-username"
                  type="text"
                  {...registerFormField('username')}
                  className="h-11 w-full rounded-xl border border-woodAccent bg-white px-3 text-sm text-tableBrown"
                />
                {registerErrors.username && <p className="text-xs text-[#8E4A3A]">{registerErrors.username.message}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="register-first-name" className="text-sm font-medium text-tableBrown">
                    First Name
                  </label>
                  <input
                    id="register-first-name"
                    type="text"
                    {...registerFormField('first_name')}
                    className="h-11 w-full rounded-xl border border-woodAccent bg-white px-3 text-sm text-tableBrown"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="register-last-name" className="text-sm font-medium text-tableBrown">
                    Last Name
                  </label>
                  <input
                    id="register-last-name"
                    type="text"
                    {...registerFormField('last_name')}
                    className="h-11 w-full rounded-xl border border-woodAccent bg-white px-3 text-sm text-tableBrown"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="register-email" className="text-sm font-medium text-tableBrown">
                  Email
                </label>
                <input
                  id="register-email"
                  type="email"
                  {...registerFormField('email')}
                  className="h-11 w-full rounded-xl border border-woodAccent bg-white px-3 text-sm text-tableBrown"
                />
                {registerErrors.email && <p className="text-xs text-[#8E4A3A]">{registerErrors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="register-password" className="text-sm font-medium text-tableBrown">
                  Password
                </label>
                <input
                  id="register-password"
                  type="password"
                  {...registerFormField('password')}
                  className="h-11 w-full rounded-xl border border-woodAccent bg-white px-3 text-sm text-tableBrown"
                />
                {registerErrors.password && <p className="text-xs text-[#8E4A3A]">{registerErrors.password.message}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={registerSubmitting} aria-label="Create customer account">
                {registerSubmitting ? 'Creating Account...' : 'Create Customer Account'}
              </Button>
            </form>
          )}
        </Card>

        <Card elevated className="space-y-4 border-white/70 bg-white/85">
          <h2 className="font-heading text-3xl text-tableBrown">Role-Aware Access</h2>
          <p className="text-sm text-tableBrown/85">
            Sign in once and Calm Table routes you according to your credentials.
          </p>
          <div className="rounded-2xl border border-woodAccent/60 bg-warmGray p-4 text-sm text-tableBrown/90">
            <p className="font-semibold uppercase tracking-wide">Administrator</p>
            <p className="mt-1">Email/Username: <strong>admin@calmtable.mw</strong></p>
            <p>Password: <strong>password123</strong></p>
          </div>
          <p className="text-xs text-tableBrown/75">
            Customer accounts are auto-signed-in after registration and can immediately book, order, and review.
          </p>
          <Link
            href="/admin/login/"
            className="inline-flex rounded-full border border-woodAccent bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-tableBrown hover:bg-warmGray"
            aria-label="Open Django admin page"
          >
            Open Django Admin
          </Link>
        </Card>
      </motion.div>
    </div>
  );
}
