// Reservation lookup page that retrieves reservation details by code.
'use client';

import { format, parseISO } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { SectionHeading } from '@/components/section-heading';
import { StatusBadge } from '@/components/status-badge';
import { fetchReservationByCode } from '@/lib/services';
import type { Reservation } from '@/lib/types';

interface ReservationLookupPageProps {
  params: {
    code: string;
  };
}

export default function ReservationLookupPage({ params }: ReservationLookupPageProps) {
  const initialCode = useMemo(() => params.code.toUpperCase(), [params.code]);
  const [codeInput, setCodeInput] = useState(initialCode);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup(code: string) {
    if (!code.trim()) {
      toast.error('Please provide a confirmation code.');
      return;
    }

    try {
      setLoading(true);
      const data = await fetchReservationByCode(code);
      setReservation(data);
    } catch (error) {
      setReservation(null);
      toast.error(error instanceof Error ? error.message : 'Unable to find reservation.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void lookup(initialCode);
  }, [initialCode]);

  return (
    <div className="page-shell py-10">
      <SectionHeading
        eyebrow="Reservation Lookup"
        title="Find Your Booking"
        description="Enter your confirmation code to review reservation details and current status."
      />

      <Card elevated className="mt-6 space-y-4">
        <label htmlFor="code" className="text-sm font-medium text-tableBrown">
          Confirmation Code
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="code"
            value={codeInput}
            onChange={(event) => setCodeInput(event.target.value.toUpperCase())}
            className="h-11 flex-1 rounded-xl border border-woodAccent bg-white px-3 text-sm uppercase tracking-wider"
            placeholder="e.g. A1B2C3D4"
            aria-label="Reservation confirmation code"
          />
          <Button onClick={() => lookup(codeInput)} disabled={loading} aria-label="Lookup reservation">
            {loading ? 'Searching...' : 'Lookup'}
          </Button>
        </div>
      </Card>

      {reservation && (
        <Card elevated className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-2xl text-tableBrown">Reservation Details</h2>
            <StatusBadge status={reservation.status} />
          </div>
          <dl className="grid gap-3 text-sm text-muted sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-tableBrown">Guest</dt>
              <dd>{reservation.name}</dd>
            </div>
            <div>
              <dt className="font-semibold text-tableBrown">Email</dt>
              <dd>{reservation.email}</dd>
            </div>
            <div>
              <dt className="font-semibold text-tableBrown">Phone</dt>
              <dd>{reservation.phone}</dd>
            </div>
            <div>
              <dt className="font-semibold text-tableBrown">Party Size</dt>
              <dd>{reservation.party_size}</dd>
            </div>
            <div>
              <dt className="font-semibold text-tableBrown">Date</dt>
              <dd>{format(parseISO(reservation.date), 'PPP')}</dd>
            </div>
            <div>
              <dt className="font-semibold text-tableBrown">Time</dt>
              <dd>{reservation.time_slot}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="font-semibold text-tableBrown">Special Requests</dt>
              <dd>{reservation.special_requests || 'None provided.'}</dd>
            </div>
          </dl>
        </Card>
      )}
    </div>
  );
}
