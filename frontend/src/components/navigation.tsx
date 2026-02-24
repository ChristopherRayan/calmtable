// Responsive top navigation with premium actions, profile controls, and theme toggle.
'use client';

import {
  Bell,
  BookOpen,
  LogOut,
  Menu,
  Moon,
  Phone,
  ShoppingBag,
  Sun,
  UserRound,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { useAuth } from '@/components/auth-provider';
import { useCart } from '@/components/cart-provider';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/menu', label: 'Menu' },
  { href: '/chefs', label: 'Chefs' },
  { href: '/about', label: 'About Us' },
  { href: '/contact', label: 'Contact' },
];

const defaultNotifications = [
  { id: 1, message: 'Reservation updates will appear here.', time: 'Now', unread: true },
  { id: 2, message: 'Track your latest order status in one place.', time: 'Today', unread: true },
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(defaultNotifications);

  const profileWrapRef = useRef<HTMLDivElement | null>(null);
  const bellWrapRef = useRef<HTMLDivElement | null>(null);

  const { user, loading, isAuthenticated, logout } = useAuth();
  const { itemCount, setIsOpen } = useCart();
  const { resolvedTheme, toggleTheme } = useTheme();

  const unreadCount = notifications.filter((notification) => notification.unread).length;
  const profileName = useMemo(() => {
    if (!user) {
      return '';
    }
    const composed = `${user.first_name} ${user.last_name}`.trim();
    return composed || user.username || user.email;
  }, [user]);
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

  function isActive(path: string) {
    if (path === '/') {
      return pathname === path;
    }
    return pathname.startsWith(path);
  }

  function markNotificationsRead() {
    setNotifications((current) => current.map((notification) => ({ ...notification, unread: false })));
  }

  function clearNotifications() {
    setNotifications([]);
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

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-woodAccent/20 bg-gradient-to-b from-cream/95 to-cream/85 backdrop-blur-md">
      <nav className="page-shell flex h-20 items-center justify-between" aria-label="Main">
        <Link href="/" className="font-heading text-xl font-bold uppercase tracking-[0.14em] text-woodAccent">
          <span className="text-ink/92">The</span> CalmTable
        </Link>

        <ul className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  'relative text-[11px] font-medium uppercase tracking-[0.18em] text-ink/58 hover:text-woodAccent',
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
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-woodAccent hover:bg-woodAccent/10"
                onClick={() => {
                  setNotificationsOpen((current) => !current);
                  setProfileOpen(false);
                  markNotificationsRead();
                }}
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#E07065]" />}
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
                    onClick={clearNotifications}
                  >
                    Clear all
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-8 text-center text-xs text-muted">No notifications yet.</p>
                  ) : (
                    notifications.map((notification) => (
                      <div key={notification.id} className="border-b border-woodAccent/15 px-4 py-3 last:border-b-0">
                        <p className="text-sm text-ink">{notification.message}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-muted">{notification.time}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-woodAccent hover:bg-woodAccent/10"
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-woodAccent/35 text-woodAccent hover:bg-woodAccent/10"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {!loading && !isAuthenticated && (
            <Link
              href="/login"
              className="ml-2 inline-flex items-center gap-2 rounded-sm border border-woodAccent/35 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.12em] text-woodAccent hover:bg-tableBrown hover:text-white"
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
                {profileInitials}
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
                  {user?.is_staff && (
                    <Link
                      href="/admin-dashboard"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-ink/80 hover:bg-woodAccent/10 hover:text-ink"
                    >
                      <BookOpen size={15} />
                      Admin Dashboard
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
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-woodAccent/35 text-woodAccent md:hidden"
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
