'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useAuth } from '@/components/auth-provider';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/services';
import { NotificationItem } from '@/lib/types';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

export default function ManagerLayout({ children }: { children: ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Show loading only when we have verified the user has access
  const [accessGranted, setAccessGranted] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login?next=/manager');
        return;
      }
      if (user.must_change_password) {
        router.push('/change-password');
        return;
      }
      // Allow managers, chefs, and staff to access
      const allowedRoles = ['manager', 'chef', 'waiter', 'cashier', 'cleaner'];
      if (user.role && !allowedRoles.includes(user.role) && !user.is_staff) {
        router.push('/login?next=/manager');
        return;
      }
      setAccessGranted(true);
    }
  }, [user, loading, router]);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated || (!user?.is_staff && user?.role !== 'manager')) return;
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (e) {
      console.error(e);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading || !user || !accessGranted) {
    return (
      <div className="min-h-screen bg-[#0a0604] flex items-center justify-center text-white">
        Loading Manager Portal...
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const navItems = [
    { label: 'Dashboard', href: '/manager', icon: 'fas fa-chart-pie' },
    { label: 'Orders', href: '/manager/orders', icon: 'fas fa-receipt' },
    { label: 'Reservations', href: '/manager/bookings', icon: 'fas fa-calendar-alt' },
    { label: 'Tables', href: '/manager/tables', icon: 'fas fa-chair' },
    { label: 'Users', href: '/manager/users', icon: 'fas fa-users' },
    { label: 'Team', href: '/manager/members', icon: 'fas fa-id-badge' },
    { label: 'Site Content', href: '/manager/site', icon: 'fas fa-edit' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0604] flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-[#140d09] flex flex-col">
        <div className="p-6 border-b border-white/10">
          <Link href="/" className="text-xl font-heading font-bold text-amber-500">CalmTable</Link>
          <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Manager Portal</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${pathname === item.href ? 'bg-amber-600/20 text-amber-500 border border-amber-600/20' : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
            >
              <i className={item.icon}></i>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center space-x-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-xs font-bold text-white">
              {user.first_name[0]}{user.last_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{user.first_name} {user.last_name}</p>
              <p className="text-[10px] text-white/40 truncate">{user.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-[#140d09]/50 backdrop-blur-md sticky top-0 z-20">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest">
            {navItems.find(n => n.href === pathname)?.label || 'Management'}
          </h2>
          <div className="flex items-center space-x-6">
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative text-white/40 hover:text-amber-500 transition-colors"
                aria-label="Toggle notifications"
              >
                <i className="fas fa-bell text-lg"></i>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-4 w-80 origin-top-right rounded-2xl border border-white/10 bg-[#140d09] p-2 shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="flex items-center justify-between p-3 border-b border-white/5">
                      <span className="text-[10px] font-bold uppercase text-white/40 tracking-widest">Notifications</span>
                      <button
                        onClick={async () => {
                          await markAllNotificationsRead();
                          setNotifications(notifications.map(n => ({ ...n, is_read: true })));
                        }}
                        className="text-[10px] text-amber-500 hover:text-amber-400 font-bold uppercase tracking-widest"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-white/20 text-xs italic">No notifications yet.</div>
                      ) : (
                        notifications.slice(0, 50).map((n) => (
                          <div
                            key={n.id}
                            className={`p-4 border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors cursor-pointer ${!n.is_read ? 'bg-amber-500/5' : ''}`}
                            onClick={async () => {
                              if (!n.is_read) await markNotificationRead(n.id);
                              if (n.link_url) router.push(n.link_url);
                              setNotifOpen(false);
                              loadNotifications();
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-xs font-bold ${!n.is_read ? 'text-amber-500' : 'text-white/80'}`}>{n.title}</p>
                              <span className="text-[8px] text-white/30 uppercase shrink-0">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                            </div>
                            <p className="mt-1 text-[11px] text-white/60 leading-relaxed line-clamp-2">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link href="/admin" className="text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-widest transition-colors">Go to Admin</Link>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
