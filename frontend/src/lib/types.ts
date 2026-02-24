// Shared TypeScript interfaces for Calm Table API contracts.
export type MenuCategory = 'starters' | 'mains' | 'desserts' | 'drinks';

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: string;
  category: MenuCategory;
  image_url: string;
  image_file?: string;
  is_available: boolean;
  is_featured: boolean;
  dietary_tags: string[];
  average_rating: number | null;
  ordered_count: number;
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

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  profile_image_url: string;
  is_staff: boolean;
  role: 'admin' | 'customer';
}

export interface AuthResponse {
  user: AuthUser;
  access: string;
  refresh: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ProfileUpdatePayload {
  first_name?: string;
  last_name?: string;
  phone?: string;
  profile_image?: File | null;
  clear_profile_image?: boolean;
}

export interface Review {
  id: number;
  menu_item: number;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface ReviewCreatePayload {
  menu_item: number;
  rating: number;
  comment: string;
}

export interface OrderCreateItemPayload {
  menu_item_id: number;
  quantity: number;
}

export interface OrderCreatePayload {
  email?: string;
  items: OrderCreateItemPayload[];
}

export interface OrderItem {
  id: number;
  menu_item: number;
  menu_item_name: string;
  quantity: number;
  unit_price: string;
  line_total: string;
}

export type OrderStatus = 'pending' | 'paid' | 'cancelled';

export interface Order {
  id: number;
  email: string;
  status: OrderStatus;
  total_amount: string;
  stripe_payment_intent_id: string;
  client_secret?: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface AnalyticsDishVolume {
  menu_item_id: number;
  name: string;
  quantity: number;
}

export interface AnalyticsReservationPoint {
  date: string;
  count: number;
}

export interface AnalyticsPayload {
  todays_reservations: number;
  total_revenue: string;
  top_dishes: AnalyticsDishVolume[];
  reservation_volume: AnalyticsReservationPoint[];
  dish_volume: AnalyticsDishVolume[];
}

export interface AdminNotification {
  id: number;
  title: string;
  message: string;
  payload: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface FrontendFeatureItem {
  title: string;
  description: string;
}

export interface FrontendContactHour {
  day: string;
  hours: string;
}

export interface FrontendContactContent {
  address_line_1: string;
  address_line_2: string;
  phone: string;
  email: string;
  whatsapp: string;
  map_embed_url: string;
  opening_hours: FrontendContactHour[];
}

export interface FrontendTestimonial {
  quote: string;
  author: string;
}

export interface FrontendStats {
  years_serving: string;
  menu_items: string;
  rating: string;
}

export interface FrontendHomeContent {
  hero_eyebrow: string;
  hero_title_prefix: string;
  hero_title_emphasis: string;
  hero_title_suffix: string;
  hero_description: string;
  story_quote: string;
  story_description: string;
  about_features: FrontendFeatureItem[];
  why_items: FrontendFeatureItem[];
  stats: FrontendStats;
  reservation_banner_title: string;
  reservation_banner_emphasis: string;
  reservation_banner_description: string;
  testimonials: FrontendTestimonial[];
  gallery_images: string[];
}

export interface FrontendAboutCard {
  title: string;
  body: string;
}

export interface FrontendAboutContent {
  description: string;
  cards: FrontendAboutCard[];
}

export interface FrontendMembersContent {
  description: string;
  benefits: FrontendFeatureItem[];
}

export interface FrontendContentPayload {
  brand_name: string;
  brand_tagline: string;
  contact: FrontendContactContent;
  home: FrontendHomeContent;
  about: FrontendAboutContent;
  members: FrontendMembersContent;
}

export interface FrontendSettingsResponse {
  content: FrontendContentPayload;
  updated_at: string;
}
