// Responsive top navigation with premium actions, profile controls, and theme toggle.
'use client';

import {
  Bell,
  BookOpen,
  LogOut,
  Menu,
  Moon,
  Receipt,
  Phone,
  ShoppingBag,
  Sun,
  UserRound,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { useAuth } from '@/components/auth-provider';
import { useCart } from '@/components/cart-provider';
import { useTheme } from '@/components/theme-provider';
import { normalizeImageSource, shouldSkipImageOptimization } from '@/lib/image';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/services';
import type { NotificationItem } from '@/lib/types';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/menu', label: 'Menu' },
  { href: '/members', label: 'Members' },
  { href: '/book', label: 'Book a Table' },
  { href: '/contact', label: 'Contact' },
];

function initialsFromUserName(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const profileWrapRef = useRef<HTMLDivElement | null>(null);
  const bellWrapRef = useRef<HTMLDivElement | null>(null);

  const { user, loading, isAuthenticated, logout } = useAuth();
  const { itemCount, setIsOpen } = useCart();
  const { resolvedTheme, toggleTheme } = useTheme();
  const isHome = pathname === '/';
  const isTransparentNav = isHome && !isScrolled;

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;
  const profileName = useMemo(() => {
    if (!user) {
      return '';
    }
    const composed = `${user.first_name} ${user.last_name}`.trim();
    return composed || user.username || user.email;
  }, [user]);
  const profileImageSrc = useMemo(
    () => normalizeImageSource(user?.profile_image_url ?? ''),
    [user?.profile_image_url]
  );
  const profileInitials = initialsFromUserName(profileName || 'CT');

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const targetNode = event.target as Node;
      if (profileWrapRef.current && !profileWrapRef.current.contains(targetNode)) {
        setProfileOpen(false);
      }
      if (bellWrapRef.current && !bellWrapRef.current.contains(targetNode)) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 60);
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function isActive(path: string) {
    if (path === '/') {
      return pathname === path;
    }
    return pathname.startsWith(path);
  }

  function parseNotificationDetail(payload: Record<string, unknown>) {
    const customerName = typeof payload.customer_name === 'string' ? payload.customer_name : '';
    const customerEmail = typeof payload.customer_email === 'string' ? payload.customer_email : '';
    const customerPhone = typeof payload.customer_phone === 'string' ? payload.customer_phone : '';
    const totalAmount = typeof payload.total_amount === 'string' ? payload.total_amount : '';

    const summary = [customerName, customerEmail, customerPhone].filter(Boolean).join(' | ');
    const total = totalAmount ? `MK ${Number(totalAmount).toLocaleString()}` : '';
    return [summary, total].filter(Boolean).join(' | ');
  }

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }
    try {
      setLoadingNotifications(true);
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (_error) {
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  }, [isAuthenticated]);

  async function markNotificationsRead() {
    if (!isAuthenticated) {
      return;
    }
    try {
      await markAllNotificationsRead();
      setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })));
    } catch (_error) {
      // No toast: this runs on panel open and should stay silent on transient network issues.
    }
  }

  async function clearNotifications() {
    if (!isAuthenticated) {
      return;
    }
    try {
      await markAllNotificationsRead();
      setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })));
    } catch (_error) {
      toast.error('Unable to clear notifications right now.');
    }
  }

  function handleOpenCart() {
    if (!isAuthenticated) {
      toast.error('Sign in as a customer to use cart and checkout.');
      router.push('/login?next=/menu');
      return;
    }

    if (user?.is_staff) {
      toast.error('Staff accounts cannot checkout. Use a customer account.');
      return;
    }

    setIsOpen(true);
  }

  async function handleLogout() {
    try {
      await logout();
      setProfileOpen(false);
      setMobileOpen(false);
      toast.success('Signed out successfully.');
      router.push('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to sign out.');
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }

    void loadNotifications();
    const timer = window.setInterval(() => {
      void loadNotifications();
    }, 20000);

    return () => window.clearInterval(timer);
  }, [isAuthenticated, loadNotifications]);

  return (
    <header
      className={cn(
        'fixed left-0 right-0 top-0 z-50 transition-all duration-300',
        isTransparentNav
          ? 'border-b border-transparent bg-transparent'
          : 'border-b border-woodAccent/20 bg-gradient-to-b from-cream/95 to-cream/85 backdrop-blur-md'
      )}
    >
      <nav className="page-shell flex h-20 items-center justify-between" aria-label="Main">
        <Link
          href="/"
          className={cn(
            'font-heading text-xl font-bold uppercase tracking-[0.14em]',
            isTransparentNav ? 'text-white' : 'text-woodAccent'
          )}
        >
          <span className={cn(isTransparentNav ? 'text-white/90' : 'text-ink/92')}>The</span> CalmTable
        </Link>

        <ul className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  'relative text-[11px] font-medium uppercase tracking-[0.18em] hover:text-woodAccent',
                  isTransparentNav ? 'text-white/80' : 'text-ink/58',
                  isActive(link.href) && 'text-woodAccent'
                )}
              >
                {link.label}
                {isActive(link.href) && (
                  <span className="absolute -bottom-1 left-0 right-0 h-px bg-woodAccent" aria-hidden />
                )}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-1 md:flex">
          {isAuthenticated && (
            <div ref={bellWrapRef} className="relative">
              <button
                type="button"
                className={cn(
                  'relative inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-woodAccent/10',
                  isTransparentNav ? 'text-white' : 'text-woodAccent'
                )}
                onClick={() => {
                  setNotificationsOpen((current) => !current);
                  setProfileOpen(false);
                  void markNotificationsRead();
                }}
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#E07065] px-1 text-[9px] font-semibold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              <div
                className={cn(
                  'absolute right-0 top-[calc(100%+10px)] w-80 origin-top-right rounded-md border border-woodAccent/20 bg-warmGray shadow-2xl',
                  notificationsOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
                )}
              >
                <div className="flex items-center justify-between border-b border-woodAccent/20 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink">Notifications</p>
                  <button
                    type="button"
                    className="text-[10px] uppercase tracking-[0.08em] text-muted hover:text-woodAccent"
                    onClick={() => void clearNotifications()}
                  >
                    Clear all
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {loadingNotifications ? (
                    <p className="px-4 py-8 text-center text-xs text-muted">Loading notifications...</p>
                  ) : notifications.length === 0 ? (
                    <p className="px-4 py-8 text-center text-xs text-muted">No notifications yet.</p>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        className={cn(
                          'block w-full border-b border-woodAccent/15 px-4 py-3 text-left last:border-b-0 hover:bg-woodAccent/8',
                          !notification.is_read && 'bg-woodAccent/10'
                        )}
                        onClick={() => {
                          void markNotificationRead(notification.id).then((updated) => {
                            setNotifications((current) =>
                              current.map((item) => (item.id === updated.id ? updated : item))
                            );
                          });
                        }}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-tableBrown">
                          {notification.title}
                        </p>
                        <p className="mt-1 text-sm text-ink">{notification.message}</p>
                        <p className="mt-1 text-[11px] text-muted">
                          {parseNotificationDetail(notification.payload)}
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-muted">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            className={cn(
              'relative inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-woodAccent/10',
              isTransparentNav ? 'text-white' : 'text-woodAccent'
            )}
            onClick={handleOpenCart}
            aria-label="Open cart"
          >
            <ShoppingBag size={18} />
            {itemCount > 0 && (
              <span className="absolute right-1.5 top-1.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-tableBrown px-1 text-[9px] font-semibold text-white">
                {itemCount}
              </span>
            )}
          </button>

          <button
            type="button"
            className={cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-full border border-woodAccent/35 hover:bg-woodAccent/10',
              isTransparentNav ? 'text-white' : 'text-woodAccent'
            )}
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {!loading && !isAuthenticated && (
            <Link
              href="/login"
              className={cn(
                'ml-2 inline-flex items-center gap-2 rounded-sm border border-woodAccent/35 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.12em] hover:bg-tableBrown hover:text-white',
                isTransparentNav ? 'text-white' : 'text-woodAccent'
              )}
            >
              <UserRound size={14} />
              Sign In
            </Link>
          )}

          {!loading && isAuthenticated && (
            <div ref={profileWrapRef} className="relative ml-2">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-woodAccent bg-tableBrown text-xs font-bold tracking-[0.05em] text-white"
                onClick={() => {
                  setProfileOpen((current) => !current);
                  setNotificationsOpen(false);
                }}
                aria-label="Account menu"
              >
                {profileImageSrc ? (
                  <span className="relative block h-full w-full overflow-hidden rounded-full">
                    <Image
                      src={profileImageSrc}
                      alt="Profile avatar"
                      fill
                      className="object-cover"
                      sizes="40px"
                      unoptimized={shouldSkipImageOptimization(profileImageSrc)}
                    />
                  </span>
                ) : (
                  profileInitials
                )}
              </button>
              <div
                className={cn(
                  'absolute right-0 top-[calc(100%+10px)] w-64 origin-top-right rounded-md border border-woodAccent/20 bg-warmGray shadow-2xl',
                  profileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
                )}
              >
                <div className="border-b border-woodAccent/20 px-4 py-3">
                  <p className="text-sm font-semibold text-ink">{profileName}</p>
                  <p className="text-xs text-muted">{user?.email}</p>
                </div>
                <div className="py-2">
                  <Link
                    href="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-ink/80 hover:bg-woodAccent/10 hover:text-ink"
                  >
                    <UserRound size={15} />
                    My Profile
                  </Link>
                  {!user?.is_staff && (
                    <Link
                      href="/my-reservations"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-ink/80 hover:bg-woodAccent/10 hover:text-ink"
                    >
                      <BookOpen size={15} />
                      My Reservations
                    </Link>
                  )}
                  {!user?.is_staff && (
                    <Link
                      href="/my-orders"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-ink/80 hover:bg-woodAccent/10 hover:text-ink"
                    >
                      <Receipt size={15} />
                      My Orders
                    </Link>
                  )}
                  {user?.is_staff && (
                    <Link
                      href="/admin/"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-ink/80 hover:bg-woodAccent/10 hover:text-ink"
                    >
                      <BookOpen size={15} />
                      Admin Panel
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[#E07065] hover:bg-[#E07065]/10"
                  >
                    <LogOut size={15} />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          className={cn(
            'inline-flex h-10 w-10 items-center justify-center rounded-full border border-woodAccent/35 md:hidden',
            isTransparentNav ? 'text-white' : 'text-woodAccent'
          )}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMobileOpen((current) => !current)}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="border-t border-woodAccent/20 bg-cream md:hidden"
          >
            <ul className="page-shell flex flex-col gap-1 py-4">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'block rounded-lg px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em]',
                      isActive(link.href)
                        ? 'bg-woodAccent/18 text-woodAccent'
                        : 'text-ink/80 hover:bg-woodAccent/10'
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li className="grid grid-cols-3 gap-2 pt-2">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-lg border border-woodAccent/25 px-3 py-2 text-woodAccent"
                  onClick={() => {
                    handleOpenCart();
                    setMobileOpen(false);
                  }}
                  aria-label="Open cart"
                >
                  <ShoppingBag size={16} />
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-lg border border-woodAccent/25 px-3 py-2 text-woodAccent"
                  onClick={toggleTheme}
                  aria-label="Toggle theme"
                >
                  {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                {isAuthenticated ? (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg border border-woodAccent/25 px-3 py-2 text-[#E07065]"
                    onClick={() => {
                      void handleLogout();
                      setMobileOpen(false);
                    }}
                    aria-label="Sign out"
                  >
                    <LogOut size={16} />
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-lg border border-woodAccent/25 px-3 py-2 text-woodAccent"
                    onClick={() => setMobileOpen(false)}
                  >
                    <UserRound size={16} />
                  </Link>
                )}
              </li>
              <li>
                <Link
                  href="/book"
                  onClick={() => setMobileOpen(false)}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-tableBrown px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white"
                >
                  <Phone size={14} />
                  Reserve a Table
                </Link>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
