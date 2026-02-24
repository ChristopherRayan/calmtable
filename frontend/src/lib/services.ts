// API service functions for menu, reservations, auth, reviews, orders, and analytics.
import api from '@/lib/api';
import type {
  AnalyticsPayload,
  AuthResponse,
  AuthUser,
  AvailableSlotsResponse,
  LoginPayload,
  MenuItem,
  Order,
  OrderCreatePayload,
  ProfileUpdatePayload,
  RegisterPayload,
  Reservation,
  ReservationCreatePayload,
  Review,
  ReviewCreatePayload,
} from '@/lib/types';

export async function fetchFeaturedMenuItems(): Promise<MenuItem[]> {
  const response = await api.get<MenuItem[]>('/menu/featured/');
  return response.data;
}

export async function fetchBestOrderedMenuItems(): Promise<MenuItem[]> {
  const response = await api.get<MenuItem[]>('/menu/best-ordered/');
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

export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/register/', payload);
  return response.data;
}

export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login/', payload);
  return response.data;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const response = await api.get<AuthUser>('/auth/me/');
  return response.data;
}

export async function updateCurrentUserProfile(payload: ProfileUpdatePayload): Promise<AuthUser> {
  const formData = new FormData();

  if (typeof payload.first_name === 'string') {
    formData.append('first_name', payload.first_name);
  }
  if (typeof payload.last_name === 'string') {
    formData.append('last_name', payload.last_name);
  }
  if (typeof payload.phone === 'string') {
    formData.append('phone', payload.phone);
  }
  if (payload.clear_profile_image) {
    formData.append('clear_profile_image', 'true');
  }
  if (payload.profile_image) {
    formData.append('profile_image', payload.profile_image);
  }

  const response = await api.patch<AuthUser>('/auth/me/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function logoutUser(refresh: string): Promise<void> {
  await api.post('/auth/logout/', { refresh });
}

export async function fetchMyReservations(): Promise<Reservation[]> {
  const response = await api.get<Reservation[]>('/my-reservations/');
  return response.data;
}

export async function fetchReviews(menuItemId?: number): Promise<Review[]> {
  const query = menuItemId ? `?menu_item=${menuItemId}` : '';
  const response = await api.get<Review[]>(`/reviews/${query}`);
  return response.data;
}

export async function createReview(payload: ReviewCreatePayload): Promise<Review> {
  const response = await api.post<Review>('/reviews/', payload);
  return response.data;
}

export async function deleteReview(reviewId: number): Promise<void> {
  await api.delete(`/reviews/${reviewId}/`);
}

export async function createOrder(payload: OrderCreatePayload): Promise<Order> {
  const response = await api.post<Order>('/orders/', payload);
  return response.data;
}

export async function fetchOrders(): Promise<Order[]> {
  const response = await api.get<Order[]>('/orders/');
  return response.data;
}

export async function fetchAnalytics(): Promise<AnalyticsPayload> {
  const response = await api.get<AnalyticsPayload>('/analytics/');
  return response.data;
}
