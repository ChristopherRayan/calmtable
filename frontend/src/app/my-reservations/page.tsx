// Authenticated customer page showing reservation history.
'use client';

import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { useAuth } from '@/components/auth-provider';
import { Card } from '@/components/card';
import { SectionHeading } from '@/components/section-heading';
import { SkeletonCard } from '@/components/skeleton-card';
import { StatusBadge } from '@/components/status-badge';
import { fetchMyReservations } from '@/lib/services';
import type { Reservation } from '@/lib/types';

export default function MyReservationsPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login?next=/my-reservations');
      return;
    }

    if (!isAuthenticated) {
      return;
    }

    async function loadReservations() {
      try {
        setPageLoading(true);
        const data = await fetchMyReservations();
        setReservations(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to load reservations.');
      } finally {
        setPageLoading(false);
      }
    }

    void loadReservations();
  }, [isAuthenticated, loading, router]);

  return (
    <div className="page-shell py-10">
      <SectionHeading
        eyebrow="Account"
        title="My Reservations"
        description="Track your booking history and current status."
      />

      {pageLoading && (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      )}

      {!pageLoading && reservations.length === 0 && (
        <Card elevated className="mt-6 text-center text-sm text-tableBrown/80">
          No reservations found for this account yet.
        </Card>
      )}

      {!pageLoading && reservations.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
          {reservations.map((reservation) => (
            <Card key={reservation.confirmation_code} elevated className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-heading text-2xl text-tableBrown">{reservation.confirmation_code}</h2>
                <StatusBadge status={reservation.status} />
              </div>
              <dl className="grid gap-2 text-sm text-tableBrown/90 sm:grid-cols-2">
                <div>
                  <dt className="font-semibold">Date</dt>
                  <dd>{format(parseISO(reservation.date), 'PPP')}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Time</dt>
                  <dd>{reservation.time_slot}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Party Size</dt>
                  <dd>{reservation.party_size}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Guest</dt>
                  <dd>{reservation.name}</dd>
                </div>
              </dl>
            </Card>
          ))}
        </motion.div>
      )}
    </div>
  );
}
