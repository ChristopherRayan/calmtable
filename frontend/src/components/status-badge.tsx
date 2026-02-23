// Reservation status badge with semantic color variants.
import { Badge } from '@/components/badge';
import type { ReservationStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: ReservationStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status === 'confirmed') {
    return <Badge tone="accent">Confirmed</Badge>;
  }

  if (status === 'cancelled') {
    return <Badge className="bg-[#8E4A3A] text-white">Cancelled</Badge>;
  }

  return <Badge tone="neutral">Pending</Badge>;
}
