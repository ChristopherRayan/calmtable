// Shared TypeScript interfaces for Calm Table API contracts.
export type MenuCategory = 'starters' | 'mains' | 'desserts' | 'drinks';

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: string;
  category: MenuCategory;
  image_url: string;
  is_available: boolean;
  is_featured: boolean;
  dietary_tags: string[];
  created_at: string;
  updated_at: string;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled';

export interface Reservation {
  name: string;
  email: string;
  phone: string;
  date: string;
  time_slot: string;
  party_size: number;
  special_requests: string;
  status: ReservationStatus;
  confirmation_code: string;
  created_at: string;
}

export interface ReservationCreatePayload {
  name: string;
  email: string;
  phone: string;
  date: string;
  time_slot: string;
  party_size: number;
  special_requests: string;
}

export interface AvailableSlotsResponse {
  date: string;
  available_slots: string[];
  full_slots: string[];
  max_reservations_per_slot: number;
}
