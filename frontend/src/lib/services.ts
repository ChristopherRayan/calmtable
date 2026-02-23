// API service functions for menu and reservation endpoints.
import api from '@/lib/api';
import type { AvailableSlotsResponse, MenuItem, Reservation, ReservationCreatePayload } from '@/lib/types';

export async function fetchFeaturedMenuItems(): Promise<MenuItem[]> {
  const response = await api.get<MenuItem[]>('/menu/featured/');
  return response.data;
}

export async function fetchMenuItems(filters?: {
  category?: string;
  dietaryTags?: string[];
}): Promise<MenuItem[]> {
  const params = new URLSearchParams();

  if (filters?.category && filters.category !== 'all') {
    params.set('category', filters.category);
  }

  if (filters?.dietaryTags && filters.dietaryTags.length > 0) {
    filters.dietaryTags.forEach((tag) => {
      params.append('dietary_tags', tag);
    });
  }

  const query = params.toString();
  const url = query ? `/menu/?${query}` : '/menu/';
  const response = await api.get<MenuItem[]>(url);
  return response.data;
}

export async function fetchAvailableSlots(date: string): Promise<AvailableSlotsResponse> {
  const response = await api.get<AvailableSlotsResponse>(`/available-slots/?date=${date}`);
  return response.data;
}

export async function createReservation(payload: ReservationCreatePayload): Promise<Reservation> {
  const response = await api.post<Reservation>('/reservations/', payload);
  return response.data;
}

export async function fetchReservationByCode(code: string): Promise<Reservation> {
  const response = await api.get<Reservation>(`/reservations/${code.toUpperCase()}/`);
  return response.data;
}
