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

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const requestCache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_CACHE_TTL_MS = 60_000;
const SLOT_CACHE_TTL_MS = 20_000;

function readCache<T>(key: string): T | null {
  const cached = requestCache.get(key);
  if (!cached) {
    return null;
  }

  if (Date.now() > cached.expiresAt) {
    requestCache.delete(key);
    return null;
  }

  return cached.data as T;
}

function writeCache<T>(key: string, data: T, ttlMs = DEFAULT_CACHE_TTL_MS): T {
  requestCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
  return data;
}

function clearCacheByPrefix(prefix: string) {
  for (const key of Array.from(requestCache.keys())) {
    if (key.startsWith(prefix)) {
      requestCache.delete(key);
    }
  }
}

function menuCacheKey(filters?: { category?: string; dietaryTags?: string[] }) {
  const category = filters?.category ?? '';
  const tags = (filters?.dietaryTags ?? []).slice().sort().join(',');
  return `menu:${category}:${tags}`;
}

export async function fetchFeaturedMenuItems(): Promise<MenuItem[]> {
  const cacheKey = 'menu:featured';
  const cached = readCache<MenuItem[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await api.get<MenuItem[]>('/menu/featured/');
  return writeCache(cacheKey, response.data);
}

export async function fetchBestOrderedMenuItems(): Promise<MenuItem[]> {
  const cacheKey = 'menu:best-ordered';
  const cached = readCache<MenuItem[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await api.get<MenuItem[]>('/menu/best-ordered/');
  return writeCache(cacheKey, response.data);
}

export async function fetchMenuItems(filters?: {
  category?: string;
  dietaryTags?: string[];
}): Promise<MenuItem[]> {
  const cacheKey = menuCacheKey(filters);
  const cached = readCache<MenuItem[]>(cacheKey);
  if (cached) {
    return cached;
  }

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
  return writeCache(cacheKey, response.data);
}

export async function fetchAvailableSlots(date: string): Promise<AvailableSlotsResponse> {
  const cacheKey = `slots:${date}`;
  const cached = readCache<AvailableSlotsResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await api.get<AvailableSlotsResponse>(`/available-slots/?date=${date}`);
  return writeCache(cacheKey, response.data, SLOT_CACHE_TTL_MS);
}

export async function createReservation(payload: ReservationCreatePayload): Promise<Reservation> {
  const response = await api.post<Reservation>('/reservations/', payload);
  clearCacheByPrefix(`slots:${payload.date}`);
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
  const cacheKey = `reviews:${menuItemId ?? 'all'}`;
  const cached = readCache<Review[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const query = menuItemId ? `?menu_item=${menuItemId}` : '';
  const response = await api.get<Review[]>(`/reviews/${query}`);
  return writeCache(cacheKey, response.data, 30_000);
}

export async function createReview(payload: ReviewCreatePayload): Promise<Review> {
  const response = await api.post<Review>('/reviews/', payload);
  clearCacheByPrefix('reviews:');
  clearCacheByPrefix('menu:');
  return response.data;
}

export async function deleteReview(reviewId: number): Promise<void> {
  await api.delete(`/reviews/${reviewId}/`);
  clearCacheByPrefix('reviews:');
  clearCacheByPrefix('menu:');
}

export async function createOrder(payload: OrderCreatePayload): Promise<Order> {
  const response = await api.post<Order>('/orders/', payload);
  clearCacheByPrefix('menu:best-ordered');
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
