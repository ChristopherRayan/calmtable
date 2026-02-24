// Staff-only analytics dashboard for reservation and ordering insights.
'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useAuth } from '@/components/auth-provider';
import { Card } from '@/components/card';
import { SectionHeading } from '@/components/section-heading';
import { formatKwacha } from '@/lib/currency';
import { fetchAnalytics } from '@/lib/services';
import type { AnalyticsPayload } from '@/lib/types';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login?next=/admin-dashboard');
      return;
    }

    if (!loading && isAuthenticated && !user?.is_staff) {
      toast.error('Staff access required.');
      router.push('/');
      return;
    }

    if (!user?.is_staff) {
      return;
    }

    async function loadAnalytics() {
      try {
        setPageLoading(true);
        const data = await fetchAnalytics();
        setAnalytics(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to load analytics.');
      } finally {
        setPageLoading(false);
      }
    }

    void loadAnalytics();
  }, [isAuthenticated, loading, router, user?.is_staff]);

  const totalRevenue = analytics ? formatKwacha(analytics.total_revenue) : 'MK 0';
  const topDish = analytics?.top_dishes[0]?.name ?? 'N/A';

  const reservationChartData = useMemo(
    () =>
      (analytics?.reservation_volume ?? []).map((point) => ({
        ...point,
        label: point.date.slice(5),
      })),
    [analytics?.reservation_volume]
  );

  const dishChartData = useMemo(
    () =>
      (analytics?.dish_volume ?? []).map((dish) => ({
        name: dish.name.length > 14 ? `${dish.name.slice(0, 14)}...` : dish.name,
        quantity: dish.quantity,
      })),
    [analytics?.dish_volume]
  );

  return (
    <div className="page-shell py-10">
      <SectionHeading
        eyebrow="Staff"
        title="Operations Dashboard"
        description="Monitor reservations, revenue, and top-performing menu items."
      />

      {pageLoading && <p className="mt-6 text-sm text-tableBrown/80">Loading analytics...</p>}

      {!pageLoading && analytics && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card elevated className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-tableBrown/70">Today&apos;s Reservations</p>
              <p className="font-heading text-3xl text-tableBrown">{analytics.todays_reservations}</p>
            </Card>
            <Card elevated className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-tableBrown/70">Total Revenue</p>
              <p className="font-heading text-3xl text-tableBrown">{totalRevenue}</p>
            </Card>
            <Card elevated className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-tableBrown/70">Top Dish</p>
              <p className="font-heading text-3xl text-tableBrown">{topDish}</p>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card elevated className="h-[320px] p-4">
              <p className="mb-3 text-sm font-semibold text-tableBrown">Reservation Volume (30 days)</p>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reservationChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8dcca" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5C4033' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#5C4033' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#5C4033" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card elevated className="h-[320px] p-4">
              <p className="mb-3 text-sm font-semibold text-tableBrown">Most Ordered Dishes</p>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dishChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8dcca" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#5C4033' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#5C4033' }} />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#6D4C41" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </motion.div>
      )}
    </div>
  );
}
