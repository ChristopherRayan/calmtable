// Single-modal reservation page with slot availability and typed validation.
'use client';

import { addDays, format, parseISO, startOfDay } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { SectionHeading } from '@/components/section-heading';
import { createReservation, fetchAvailableSlots } from '@/lib/services';
import type { Reservation } from '@/lib/types';
import { cn } from '@/lib/utils';

const guestDetailsSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your full name.'),
  email: z.string().trim().email('Please enter a valid email address.'),
  phone: z.string().trim().min(7, 'Please enter a valid phone number.'),
  special_requests: z.string().trim().max(500, 'Special requests must be 500 characters or less.'),
});

type GuestDetailsForm = z.infer<typeof guestDetailsSchema>;

function clampPartySize(value: number) {
  if (Number.isNaN(value)) {
    return 2;
  }
  return Math.min(20, Math.max(1, value));
}

export default function BookPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const searchParams = useSearchParams();

  const today = useMemo(() => new Date(), []);
  const queryDate = searchParams.get('date');
  const queryPartySize = Number(searchParams.get('party_size') ?? 2);
  const initialDate =
    queryDate && !Number.isNaN(Date.parse(queryDate)) ? format(parseISO(queryDate), 'yyyy-MM-dd') : format(today, 'yyyy-MM-dd');

  const [isModalOpen, setIsModalOpen] = useState(true);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [partySize, setPartySize] = useState(clampPartySize(queryPartySize));
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [fullSlots, setFullSlots] = useState<string[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [slotLoading, setSlotLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdReservation, setCreatedReservation] = useState<Reservation | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<GuestDetailsForm>({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      special_requests: '',
    },
  });

  const minDate = format(today, 'yyyy-MM-dd');
  const maxDate = format(addDays(today, 60), 'yyyy-MM-dd');
  const parsedSelectedDate = useMemo(() => parseISO(selectedDate), [selectedDate]);

  useEffect(() => {
    if (!user) {
      return;
    }
    setValue('email', user.email);
    const fullName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
    if (fullName) {
      setValue('name', fullName);
    }
    if (user.phone) {
      setValue('phone', user.phone);
    }
  }, [setValue, user]);

  useEffect(() => {
    async function loadSlots() {
      try {
        setSlotLoading(true);
        const response = await fetchAvailableSlots(selectedDate);
        setAvailableSlots(response.available_slots);
        setFullSlots(response.full_slots);
        if (selectedTimeSlot && !response.available_slots.includes(selectedTimeSlot)) {
          setSelectedTimeSlot('');
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load available time slots.');
      } finally {
        setSlotLoading(false);
      }
    }

    void loadSlots();
  }, [selectedDate, selectedTimeSlot]);

  function resetModalForm() {
    setCreatedReservation(null);
    setSelectedTimeSlot('');
    reset({
      name: user ? `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() : '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      special_requests: '',
    });
    setIsModalOpen(true);
  }

  const onSubmit = handleSubmit(async (values) => {
    if (startOfDay(parsedSelectedDate).getTime() < startOfDay(today).getTime()) {
      toast.error('Please select today or a future date.');
      return;
    }

    if (!selectedTimeSlot) {
      toast.error('Select an available time slot.');
      return;
    }

    const validated = guestDetailsSchema.safeParse(values);
    if (!validated.success) {
      toast.error(validated.error.issues[0]?.message ?? 'Please review your details.');
      return;
    }

    try {
      setSubmitting(true);
      const reservation = await createReservation({
        ...validated.data,
        date: selectedDate,
        time_slot: selectedTimeSlot,
        party_size: partySize,
      });
      setCreatedReservation(reservation);
      toast.success('Reservation created successfully.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create reservation.');
    } finally {
      setSubmitting(false);
    }
  });

  if (loading) {
    return (
      <div className="page-shell py-10">
        <SectionHeading
          eyebrow="Reservations"
          title="Book Your Table"
          description="Secure your preferred dining time in one quick booking modal."
        />
        <Card elevated className="mt-6 text-sm text-tableBrown/80">
          Loading account details...
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="page-shell py-10">
        <SectionHeading
          eyebrow="Reservations"
          title="Book Your Table"
          description="Customer registration is required before creating reservations."
        />
        <Card elevated className="mt-6 space-y-4">
          <p className="text-sm text-tableBrown/85">
            Sign in or create a customer account to book, checkout, and leave menu reviews.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/login?next=/book"
              className="inline-flex rounded-full bg-tableBrown px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-tableBrownLight"
            >
              Sign In
            </Link>
            <Link
              href="/login?mode=register"
              className="inline-flex rounded-full border border-woodAccent bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-tableBrown hover:bg-warmGray"
            >
              Register Customer
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (user?.is_staff) {
    return (
      <div className="page-shell py-10">
        <SectionHeading
          eyebrow="Reservations"
          title="Book Your Table"
          description="Staff and admin accounts cannot create customer reservations."
        />
        <Card elevated className="mt-6 space-y-3 text-sm text-tableBrown/85">
          <p>Please sign in with a customer account to continue booking.</p>
          <Link
            href="/login?next=/book"
            className="inline-flex rounded-full bg-tableBrown px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-tableBrownLight"
          >
            Switch Account
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-shell py-10">
      <SectionHeading
        eyebrow="Reservations"
        title="Book Your Table"
        description="Everything is handled in one reservation modal: date, party size, slot, and guest details."
      />

      <Card elevated className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-tableBrown/85">Open the booking modal to complete your table reservation.</p>
        <Button onClick={() => setIsModalOpen(true)} aria-label="Open reservation form modal">
          Open Booking Form
        </Button>
      </Card>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[1.2rem] border border-woodAccent/35 bg-cream p-5 shadow-2xl sm:p-6"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              {!createdReservation && (
                <>
                  <div className="mb-5 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-heading text-3xl text-tableBrown">Reservation Form</h3>
                      <p className="text-sm text-muted">Complete all fields and submit once.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="rounded-full border border-woodAccent/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-tableBrown hover:bg-warmGray"
                      aria-label="Close reservation modal"
                    >
                      Close
                    </button>
                  </div>

                  <form className="space-y-5" onSubmit={onSubmit}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label htmlFor="reservation-date" className="text-sm font-medium text-tableBrown">
                          Reservation Date
                        </label>
                        <input
                          id="reservation-date"
                          type="date"
                          min={minDate}
                          max={maxDate}
                          value={selectedDate}
                          onChange={(event) => setSelectedDate(event.target.value)}
                          className="h-11 w-full rounded-xl border border-woodAccent bg-white px-3 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="party-size" className="text-sm font-medium text-tableBrown">
                          Party Size
                        </label>
                        <input
                          id="party-size"
                          type="number"
                          min={1}
                          max={20}
                          value={partySize}
                          onChange={(event) => setPartySize(clampPartySize(Number(event.target.value)))}
                          className="h-11 w-full rounded-xl border border-woodAccent bg-white px-3 text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-tableBrown">Select Time Slot</p>
                      {slotLoading && <p className="text-sm text-tableBrown">Loading available slots...</p>}
                      {!slotLoading && (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {[...availableSlots, ...fullSlots.filter((slot) => !availableSlots.includes(slot))].map((slot) => {
                            const isFull = fullSlots.includes(slot);
                            const isSelected = selectedTimeSlot === slot;
                            return (
                              <button
                                key={slot}
                                type="button"
                                disabled={isFull}
                                aria-label={isFull ? `${slot} slot full` : `Select ${slot}`}
                                onClick={() => setSelectedTimeSlot(slot)}
                                className={cn(
                                  'h-11 rounded-xl border text-sm font-semibold',
                                  isFull && 'cursor-not-allowed border-neutral-300 bg-neutral-100 text-neutral-500',
                                  !isFull && isSelected && 'border-tableBrown bg-tableBrown text-white',
                                  !isFull && !isSelected && 'border-woodAccent bg-white text-tableBrown hover:bg-warmGray'
                                )}
                              >
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <label htmlFor="name" className="text-sm font-medium text-tableBrown">
                          Full Name
                        </label>
                        <input
                          id="name"
                          type="text"
                          {...register('name')}
                          className="h-11 w-full rounded-xl border border-woodAccent bg-white px-3 text-sm"
                        />
                        {errors.name && <p className="text-xs text-[#E07065]">{errors.name.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-tableBrown">
                          Email
                        </label>
                        <input
                          id="email"
                          type="email"
                          {...register('email')}
                          readOnly
                          className="h-11 w-full rounded-xl border border-woodAccent bg-white px-3 text-sm"
                        />
                        {errors.email && <p className="text-xs text-[#E07065]">{errors.email.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="phone" className="text-sm font-medium text-tableBrown">
                          Phone Number
                        </label>
                        <input
                          id="phone"
                          type="tel"
                          {...register('phone')}
                          className="h-11 w-full rounded-xl border border-woodAccent bg-white px-3 text-sm"
                        />
                        {errors.phone && <p className="text-xs text-[#E07065]">{errors.phone.message}</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="special_requests" className="text-sm font-medium text-tableBrown">
                        Special Requests (Optional)
                      </label>
                      <textarea
                        id="special_requests"
                        rows={4}
                        {...register('special_requests')}
                        className="w-full rounded-xl border border-woodAccent bg-white px-3 py-2 text-sm"
                      />
                      {errors.special_requests && <p className="text-xs text-[#E07065]">{errors.special_requests.message}</p>}
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} aria-label="Cancel reservation form">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={submitting} aria-label="Submit reservation">
                        {submitting ? 'Submitting...' : 'Confirm Reservation'}
                      </Button>
                    </div>
                  </form>
                </>
              )}

              {createdReservation && (
                <div className="space-y-6 text-center">
                  <h3 className="font-heading text-3xl text-tableBrown">Reservation Confirmed</h3>
                  <p className="text-sm text-muted">Your table request is complete. Save this confirmation code.</p>
                  <div className="mx-auto max-w-sm rounded-2xl border border-woodAccent bg-white p-6">
                    <p className="text-xs uppercase tracking-[0.2em] text-tableBrown/70">Confirmation Code</p>
                    <p className="mt-2 font-heading text-4xl tracking-[0.15em] text-tableBrown">
                      {createdReservation.confirmation_code}
                    </p>
                    <p className="mt-3 text-xs text-muted">
                      {format(parseISO(createdReservation.date), 'PPP')} at {createdReservation.time_slot} for {createdReservation.party_size} guests
                    </p>
                  </div>
                  <p className="text-xs text-tableBrown/80">Take a screenshot or save this code for lookup and updates.</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button variant="secondary" onClick={resetModalForm} aria-label="Book another reservation">
                      Book Another
                    </Button>
                    <Button
                      onClick={() => {
                        window.location.href = `/reservation/${createdReservation.confirmation_code}`;
                      }}
                      aria-label="View reservation details"
                    >
                      View Reservation
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
