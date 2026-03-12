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
  id?: number;
  name: string;
  email: string;
  phone: string;
  date: string;
  time_slot: string;
  party_size: number;
  party_duration_hours?: number;
  table?: Table;
  table_id?: number;
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
  party_duration_hours?: number;
  table_id?: number;
  special_requests: string;
}

export interface Table {
  id: number;
  table_number: string;
  seats: number;
  description: string;
  is_active: boolean;
}

export interface AvailableTablesResponse {
  date: string;
  time: string;
  party_size: number;
  duration_hours: number;
  available_tables: Table[];
  total_available: number;
}

export interface AvailableSlotsResponse {
  date: string;
  open_hour: number;
  close_hour: number;
  is_past?: boolean;
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
  is_active: boolean;
  role: 'admin' | 'customer' | 'manager' | 'chef' | 'waiter' | 'cashier' | 'cleaner';
  must_change_password: boolean;
}

export interface AuthResponse {
  user: AuthUser;
  access: string;
  refresh: string;
}

export interface RegisterPayload {
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
  customer_name?: string;
  customer_email?: string;
  notes?: string;
  items: Array<
    | OrderCreateItemPayload
    | {
      name: string;
      price_raw: number;
      qty: number;
    }
  >;
}

export interface OrderItem {
  id: number;
  menu_item: number | null;
  menu_item_name: string;
  item_name: string;
  item_price: string;
  quantity: number;
  subtotal: string;
  unit_price: string;
  line_total: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'assigned' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  status: OrderStatus;
  total_amount: string;
  notes: string;
  stripe_payment_intent_id: string;
  items: OrderItem[];
  assigned_chef: number | null;
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

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  notif_type: 'new_order' | 'status_update' | 'general' | 'audit' | 'reservation';
  payload: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  order_number?: string;
  link_url?: string;
}

export interface MembersResponseItem {
  id: number;
  name: string;
  role: string;
  photo: string | null;
  bio: string;
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
  hero_bg_image: string;
  about_image: string;
  story_quote: string;
  story_description: string;
  about_features: FrontendFeatureItem[];
  why_items: FrontendFeatureItem[];
  stats: FrontendStats;
  reservation_banner_title: string;
  reservation_banner_emphasis: string;
  reservation_banner_description: string;
  reservation_bg_image: string;
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
