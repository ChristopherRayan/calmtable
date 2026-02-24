// Multi-step reservation page with slot availability and typed validation.
'use client';

import { addDays, format, formatISO, isBefore, parseISO, startOfDay } from 'date-fns';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { SectionHeading } from '@/components/section-heading';
import { StepIndicator } from '@/components/step-indicator';
import { createReservation, fetchAvailableSlots } from '@/lib/services';
import type { Reservation } from '@/lib/types';
import { cn } from '@/lib/utils';

const steps = ['Date & Party', 'Time Slot', 'Guest Details', 'Confirmation'];

const guestDetailsSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your full name.'),
  email: z.string().trim().email('Please enter a valid email address.'),
  phone: z.string().trim().min(7, 'Please enter a valid phone number.'),
  special_requests: z.string().trim().max(500, 'Special requests must be 500 characters or less.'),
});

type GuestDetailsForm = z.infer<typeof guestDetailsSchema>;

export default function BookPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [partySize, setPartySize] = useState(2);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [fullSlots, setFullSlots] = useState<string[]>([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdReservation, setCreatedReservation] = useState<Reservation | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<GuestDetailsForm>({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      special_requests: '',
    },
  });

  const minDate = format(new Date(), 'yyyy-MM-dd');
  const maxDate = format(addDays(new Date(), 60), 'yyyy-MM-dd');

  useEffect(() => {
    if (!user) {
      return;
    }

    setValue('email', user.email);
    const fullName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
    if (fullName) {
      setValue('name', fullName);
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

  const parsedSelectedDate = useMemo(() => parseISO(selectedDate), [selectedDate]);
  const dateInPast = isBefore(startOfDay(parsedSelectedDate), startOfDay(new Date()));

  function goToStep(targetStep: number) {
    setCurrentStep(Math.min(4, Math.max(1, targetStep)));
  }

  function handleStepOneNext() {
    if (dateInPast) {
      toast.error('Please select today or a future date.');
      return;
    }

    if (partySize < 1 || partySize > 20) {
      toast.error('Party size must be between 1 and 20.');
      return;
    }

    goToStep(2);
  }

  function handleStepTwoNext() {
    if (!selectedTimeSlot) {
      toast.error('Select an available time slot to continue.');
      return;
    }

    goToStep(3);
  }

  const onGuestSubmit = handleSubmit(async (values) => {
    const validated = guestDetailsSchema.safeParse(values);
    if (!validated.success) {
      toast.error(validated.error.issues[0]?.message ?? 'Please review your guest details.');
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
      goToStep(4);
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
          description="A simple step-by-step flow to secure your preferred dining time."
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
        description="A simple step-by-step flow to secure your preferred dining time."
      />

      <div className="mt-6">
        <StepIndicator steps={steps} currentStep={currentStep} />
      </div>

      <motion.div key={currentStep} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
        {currentStep === 1 && (
          <Card elevated className="space-y-6">
            <h3 className="font-heading text-2xl text-tableBrown">Step 1: Date and Party Size</h3>
            <div className="grid gap-5 sm:grid-cols-2">
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
                  onChange={(event) => setPartySize(Number(event.target.value))}
                  className="h-11 w-full rounded-xl border border-woodAccent bg-white px-3 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleStepOneNext} aria-label="Continue to time slot selection">
                Continue
              </Button>
            </div>
          </Card>
        )}

        {currentStep === 2 && (
          <Card elevated className="space-y-6">
            <h3 className="font-heading text-2xl text-tableBrown">Step 2: Select a Time Slot</h3>
            <p className="text-sm text-[#4B3A32]">{format(parsedSelectedDate, 'EEEE, MMMM d, yyyy')}</p>

            {slotLoading && <p className="text-sm text-tableBrown">Loading available slots...</p>}

            {!slotLoading && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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

            <div className="flex items-center justify-between">
              <Button variant="secondary" onClick={() => goToStep(1)} aria-label="Back to date and party size">
                Back
              </Button>
              <Button onClick={handleStepTwoNext} aria-label="Continue to guest details">
                Continue
              </Button>
            </div>
          </Card>
        )}

        {currentStep === 3 && (
          <Card elevated className="space-y-6">
            <h3 className="font-heading text-2xl text-tableBrown">Step 3: Guest Details</h3>
            <form className="space-y-4" onSubmit={onGuestSubmit}>
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-tableBrown">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  {...register('name')}
                  className="h-11 w-full rounded-xl border border-woodAccent bg-white px-3 text-sm"
                />
                {errors.name && <p className="text-xs text-[#8E4A3A]">{errors.name.message}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
                  {errors.email && <p className="text-xs text-[#8E4A3A]">{errors.email.message}</p>}
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
                  {errors.phone && <p className="text-xs text-[#8E4A3A]">{errors.phone.message}</p>}
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
                {errors.special_requests && <p className="text-xs text-[#8E4A3A]">{errors.special_requests.message}</p>}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="secondary" onClick={() => goToStep(2)} aria-label="Back to time slot selection" type="button">
                  Back
                </Button>
                <Button type="submit" disabled={submitting} aria-label="Submit reservation">
                  {submitting ? 'Submitting...' : 'Confirm Reservation'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {currentStep === 4 && createdReservation && (
          <Card elevated className="space-y-6 text-center">
            <h3 className="font-heading text-3xl text-tableBrown">Step 4: Reservation Confirmed</h3>
            <p className="text-sm text-[#4B3A32]">Your table has been requested successfully. Save this confirmation code.</p>
            <div className="mx-auto max-w-sm rounded-2xl border border-woodAccent bg-white p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-tableBrown/70">Confirmation Code</p>
              <p className="mt-2 font-heading text-4xl tracking-[0.15em] text-tableBrown">
                {createdReservation.confirmation_code}
              </p>
              <p className="mt-3 text-xs text-[#4B3A32]">
                {format(parseISO(createdReservation.date), 'PPP')} at {createdReservation.time_slot} for {createdReservation.party_size} guests
              </p>
            </div>
            <p className="text-xs text-tableBrown/80">Take a screenshot or save this code for lookup and updates.</p>
            <div className="flex justify-center gap-3">
              <Button variant="secondary" onClick={() => goToStep(1)} aria-label="Create another reservation">
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
          </Card>
        )}
      </motion.div>
    </div>
  );
}
