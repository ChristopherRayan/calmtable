// Responsive top navigation with auth links, cart access, and mobile interactions.
'use client';

import { Menu, ShoppingBag, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/button';
import { useCart } from '@/components/cart-provider';
import { cn } from '@/lib/utils';

const primaryLinks = [
  { href: '/', label: 'Home' },
  { href: '/menu', label: 'Menu' },
  { href: '/book', label: 'Book a Table' },
];

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount, setIsOpen } = useCart();

  const authLinks = useMemo(() => {
    if (!isAuthenticated) {
      return [];
    }

    const links = [{ href: '/my-reservations', label: 'My Reservations' }];
    if (user?.is_staff) {
      links.push({ href: '/admin-dashboard', label: 'Dashboard' });
    }
    return links;
  }, [isAuthenticated, user?.is_staff]);

  async function handleLogout() {
    try {
      await logout();
      toast.success('Signed out successfully.');
      router.push('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to sign out.');
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

  function isActive(path: string) {
    if (path === '/') {
      return pathname === path;
    }
    return pathname.startsWith(path);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-woodAccent/40 bg-cream/95 backdrop-blur">
      <nav className="page-shell flex h-20 items-center justify-between" aria-label="Main">
        <Link href="/" className="font-heading text-2xl tracking-wide text-tableBrown" aria-label="Calm Table home">
          Calm Table
        </Link>

        <ul className="hidden items-center gap-6 md:flex">
          {[...primaryLinks, ...authLinks].map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  'text-xs font-semibold uppercase tracking-[0.15em] text-tableBrown/90 hover:text-tableBrown',
                  isActive(link.href) && 'text-tableBrown underline decoration-woodAccent underline-offset-8'
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 md:flex">
          <Button
            variant="secondary"
            size="sm"
            aria-label="Open cart drawer"
            onClick={handleOpenCart}
            className="relative"
          >
            <ShoppingBag size={15} />
            Cart
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-tableBrown px-1 text-[10px] text-white">
                {itemCount}
              </span>
            )}
          </Button>
          {isAuthenticated && (
            <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="Logout from your account">
              Logout
            </Button>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-woodAccent text-tableBrown md:hidden"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMobileOpen((prev) => !prev)}
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
            className="border-t border-woodAccent/40 bg-cream md:hidden"
          >
            <ul className="page-shell flex flex-col gap-2 py-4">
              {[...primaryLinks, ...authLinks].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      'block rounded-xl px-4 py-3 text-sm font-semibold uppercase tracking-wider text-tableBrown',
                      isActive(link.href) ? 'bg-warmGray' : 'hover:bg-warmGray/70'
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-tableBrown hover:bg-warmGray/70"
                  onClick={() => {
                    handleOpenCart();
                    setMobileOpen(false);
                  }}
                >
                  <span>Cart</span>
                  <span>{itemCount}</span>
                </button>
              </li>
              {isAuthenticated && (
                <li>
                  <button
                    type="button"
                    className="block w-full rounded-xl px-4 py-3 text-left text-sm font-semibold uppercase tracking-wider text-tableBrown hover:bg-warmGray/70"
                    onClick={() => {
                      void handleLogout();
                      setMobileOpen(false);
                    }}
                  >
                    Logout
                  </button>
                </li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
