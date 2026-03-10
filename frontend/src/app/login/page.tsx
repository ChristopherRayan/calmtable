// Premium auth hub combining sign-in and customer registration.
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/button';
import { defaultFrontendSettings } from '@/lib/frontend-settings';
import { fetchFrontendSettings } from '@/lib/services';
import { normalizeImageSource, shouldSkipImageOptimization } from '@/lib/image';
import type { FrontendContentPayload } from '@/lib/types';
import Image from 'next/image';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email or username is required.'),
  password: z.string().min(1, 'Password is required.'),
});

type LoginForm = z.infer<typeof loginSchema>;

const registerSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required.'),
  last_name: z.string().trim().optional(),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  confirm_password: z.string().min(1, 'Please confirm your password.'),
}).superRefine(({ password, confirm_password }, ctx) => {
  if (confirm_password !== password) {
    ctx.addIssue({
      code: 'custom',
      message: 'Passwords do not match.',
      path: ['confirm_password'],
    });
  }
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, register: registerAccount } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [registerSubmitting, setRegisterSubmitting] = useState(false);
  const [nextPath, setNextPath] = useState('');
  const [settings, setSettings] = useState<FrontendContentPayload>(defaultFrontendSettings);

  useEffect(() => {
    let active = true;
    async function loadSettings() {
      try {
        const data = await fetchFrontendSettings();
        if (active) setSettings(data);
      } catch (_error) {
        // use default
      }
    }
    void loadSettings();
    return () => { active = false; };
  }, []);

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
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      confirm_password: '',
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
      if (signedInUser.is_staff) {
        const accessToken = window.localStorage.getItem('access_token');
        router.push(`/api/auth/login/admin/?token=${accessToken}`);
        return;
      }
      router.push('/');
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
      toast.success(`Welcome, ${signedInUser.first_name || signedInUser.username}. Your customer account is ready.`);
      router.push('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create account.');
    } finally {
      setRegisterSubmitting(false);
    }
  });

  const bgImage = normalizeImageSource(settings.home.hero_bg_image) || '/images/hero-placeholder.png';

  return (
    <div className="relative h-[100dvh] w-full flex items-center justify-center overflow-y-auto">
      {/* ─── Background & Overlays ─────────────────────────────────── */}
      <Image
        src={bgImage}
        alt="The CalmTable ambiance"
        fill
        className="absolute inset-0 object-cover"
        unoptimized={shouldSkipImageOptimization(bgImage)}
        priority
      />
      <div className="absolute inset-0 bg-[#1a0f08]/60 backdrop-blur-md" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0604] via-transparent to-transparent opacity-80" />

      {/* ─── Content ──────────────────────────────────────────────── */}
      <div className="page-shell relative z-10 w-full max-w-2xl">
        <div className="text-center mb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-500">
            Account Access
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold text-white sm:text-5xl">
            Welcome <em>Back</em>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/70 max-w-lg mx-auto">
            Sign in or create an account to book your table, easily order your favorite dishes, and manage your CalmTable experience.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="overflow-hidden rounded-3xl border border-white/10 bg-[#2a1810]/40 p-5 backdrop-blur-xl shadow-2xl ring-1 ring-white/5 sm:p-6"
        >
          {/* Tab Switcher */}
          <div className="mb-6 flex rounded-full border border-white/10 bg-[#1a0f08]/60 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`flex-1 rounded-full px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] transition-all ${
                activeTab === 'login' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40' : 'text-white/50 hover:text-white/80'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`flex-1 rounded-full px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] transition-all ${
                activeTab === 'register' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40' : 'text-white/50 hover:text-white/80'
              }`}
            >
              Register
            </button>
          </div>
          
          {/* Tab Content */}
          <div className="relative">
            <AnimatePresence mode="wait">
              {activeTab === 'login' ? (
                <motion.form
                  key="login-form"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="space-y-4"
                  onSubmit={onLoginSubmit}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="login-email" className="text-xs font-bold uppercase tracking-[0.1em] text-white/70">
                        Email or Username
                      </label>
                      <input
                        id="login-email"
                        type="text"
                        {...registerLoginField('email')}
                        className="h-12 w-full rounded-xl border border-white/10 bg-[#1a0f08]/50 px-4 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-amber-500/50 focus:bg-[#1a0f08]/80"
                        placeholder="name@example.com"
                      />
                      {errors.email && <p className="text-xs text-[#E07065]">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="login-password" className="text-xs font-bold uppercase tracking-[0.1em] text-white/70">
                        Password
                      </label>
                      <input
                        id="login-password"
                        type="password"
                        {...registerLoginField('password')}
                        className="h-12 w-full rounded-xl border border-white/10 bg-[#1a0f08]/50 px-4 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-amber-500/50 focus:bg-[#1a0f08]/80"
                        placeholder="••••••••"
                      />
                      {errors.password && <p className="text-xs text-[#E07065]">{errors.password.message}</p>}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="mt-4 w-full rounded-xl bg-amber-600 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-white transition-colors hover:bg-amber-500"
                    disabled={loginSubmitting}
                  >
                    {loginSubmitting ? 'Signing In...' : 'Sign In'}
                  </Button>
                </motion.form>
              ) : (
                <motion.form
                  key="register-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="space-y-4"
                  onSubmit={onRegisterSubmit}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="register-first-name" className="text-xs font-bold uppercase tracking-[0.1em] text-white/70">
                        First Name
                      </label>
                      <input
                        id="register-first-name"
                        type="text"
                        {...registerFormField('first_name')}
                        className="h-12 w-full rounded-xl border border-white/10 bg-[#1a0f08]/50 px-4 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-amber-500/50 focus:bg-[#1a0f08]/80"
                        placeholder="John"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="register-last-name" className="text-xs font-bold uppercase tracking-[0.1em] text-white/70">
                        Last Name
                      </label>
                      <input
                        id="register-last-name"
                        type="text"
                        {...registerFormField('last_name')}
                        className="h-12 w-full rounded-xl border border-white/10 bg-[#1a0f08]/50 px-4 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-amber-500/50 focus:bg-[#1a0f08]/80"
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="register-email" className="text-xs font-bold uppercase tracking-[0.1em] text-white/70">
                        Email
                      </label>
                      <input
                        id="register-email"
                        type="email"
                        {...registerFormField('email')}
                        className="h-12 w-full rounded-xl border border-white/10 bg-[#1a0f08]/50 px-4 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-amber-500/50 focus:bg-[#1a0f08]/80"
                        placeholder="name@example.com"
                      />
                      {registerErrors.email && <p className="text-xs text-[#E07065]">{registerErrors.email.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="register-password" className="text-xs font-bold uppercase tracking-[0.1em] text-white/70">
                        Password
                      </label>
                      <input
                        id="register-password"
                        type="password"
                        {...registerFormField('password')}
                        className="h-12 w-full rounded-xl border border-white/10 bg-[#1a0f08]/50 px-4 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-amber-500/50 focus:bg-[#1a0f08]/80"
                        placeholder="••••••••"
                      />
                      {registerErrors.password && <p className="text-xs text-[#E07065]">{registerErrors.password.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="register-confirm-password" className="text-xs font-bold uppercase tracking-[0.1em] text-white/70">
                        Confirm Password
                      </label>
                      <input
                        id="register-confirm-password"
                        type="password"
                        {...registerFormField('confirm_password')}
                        className="h-12 w-full rounded-xl border border-white/10 bg-[#1a0f08]/50 px-4 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-amber-500/50 focus:bg-[#1a0f08]/80"
                        placeholder="••••••••"
                      />
                      {registerErrors.confirm_password && <p className="text-xs text-[#E07065]">{registerErrors.confirm_password.message}</p>}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="mt-4 w-full rounded-xl bg-amber-600 py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-white transition-colors hover:bg-amber-500"
                    disabled={registerSubmitting}
                  >
                    {registerSubmitting ? 'Creating Account...' : 'Create Customer Account'}
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
