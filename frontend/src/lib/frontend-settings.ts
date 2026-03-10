// Fallback frontend settings used when CMS payload is unavailable.
import type { FrontendContentPayload } from '@/lib/types';

export const defaultFrontendSettings: FrontendContentPayload = {
  brand_name: 'The CalmTable',
  brand_tagline: 'Dine with Dignity',
  contact: {
    address_line_1: 'Near Simso Filling Station',
    address_line_2: 'Luwinga, Mzuzu, Malawi',
    phone: '+265 999 000 000',
    email: 'hello@calmtable.mw',
    whatsapp: '+265 888 000 000',
    map_embed_url:
      'https://maps.google.com/maps?q=Simso%20Filling%20Station%2C%20Luwinga%2C%20Mzuzu%2C%20Malawi&t=&z=15&ie=UTF8&iwloc=&output=embed',
    opening_hours: [
      { day: 'Monday - Friday', hours: '07:00 - 21:00' },
      { day: 'Saturday', hours: '08:00 - 22:00' },
      { day: 'Sunday', hours: 'Closed' },
    ],
  },
  home: {
    hero_eyebrow: 'The CalmTable & Family Restaurant',
    hero_title_prefix: 'Modern fine dining with a',
    hero_title_emphasis: 'calm atmosphere',
    hero_title_suffix: 'and unforgettable flavors.',
    hero_description:
      'Join us for handcrafted dishes, warm hospitality, and premium ambiance near Simso Filling Station, Luwinga, Mzuzu.',
    hero_bg_image: '/images/hero-placeholder.svg',
    about_image: '/images/hero-placeholder.png',
    story_quote: 'Good food is the foundation of genuine happiness - we serve both.',
    story_description:
      'The CalmTable started as a family kitchen with one promise: feed every guest with dignity and care. Today we serve Malawian favorites, fresh fish, and heritage recipes in a refined, welcoming setting.',
    about_features: [
      { title: 'Fresh Daily', description: 'Cooked every morning' },
      { title: 'Family Owned', description: 'Since 2012' },
      { title: 'Made with Care', description: 'Every single plate' },
    ],
    why_items: [
      { title: 'Local Ingredients', description: 'We source directly from Malawian suppliers for daily freshness.' },
      { title: 'Family Atmosphere', description: 'Every guest receives warm, dignified, and personal service.' },
      { title: 'Fast Service', description: 'Meals arrive hot and quickly, without compromising quality.' },
      { title: 'Hygiene First', description: 'Clean kitchen, strict standards, and consistent food safety.' },
    ],
    stats: {
      years_serving: '12+',
      menu_items: '80+',
      rating: '4.9★',
    },
    reservation_banner_title: 'Book a Table for',
    reservation_banner_emphasis: 'An Unforgettable Evening',
    reservation_banner_description:
      'Reserve your table in advance and let us prepare your premium dining experience.',
    reservation_bg_image: '/images/hero-placeholder.svg',
    testimonials: [
      {
        quote: 'The Chambo was absolutely divine. I keep coming back because the quality never drops.',
        author: 'Amara Nkhoma',
      },
      {
        quote: 'Our family reunion was hosted perfectly. Warm service, great portions, and elegant atmosphere.',
        author: 'Chisomo Banda',
      },
      {
        quote: 'Best Masamba Otendera in Mzuzu. Authentic taste and consistently professional service.',
        author: 'Takondwa Mwale',
      },
    ],
    gallery_images: [
      '/images/gallery-1.png',
      '/images/gallery-2.svg',
      '/images/gallery-3.svg',
      '/images/gallery-4.svg',
      '/images/gallery-5.svg',
    ],
  },
  about: {
    description:
      'Near Simso Filling Station in Luwinga, we serve premium dishes in a warm family-restaurant setting.',
    cards: [
      {
        title: 'Vision',
        body: 'Build a modern Malawian dining brand where consistency, comfort, and quality define every table.',
      },
      {
        title: 'Cuisine',
        body: 'Local favorites and signature mains from chambo to goat dishes, with curated snacks and beverages.',
      },
      {
        title: 'Service',
        body: 'Fast reservations, smooth checkout, and attentive hosting for both casual and formal dining moments.',
      },
    ],
  },
  members: {
    description: 'Create an account and unlock premium dining perks designed for regular guests and families.',
    benefits: [
      {
        title: 'Priority Reservations',
        description: 'Members get early access to peak evening slots and seasonal tasting nights before public release.',
      },
      {
        title: 'Member-only Offers',
        description: 'Receive curated discounts on signature dishes, family platters, and selected beverages every month.',
      },
      {
        title: 'Birthday Rewards',
        description:
          'Celebrate with a complimentary dessert pairing and a personalized table setup for your birthday booking.',
      },
      {
        title: 'Faster Checkout',
        description: 'Saved account details and order history help members reorder favorites and complete checkout in seconds.',
      },
    ],
  },
};
