// Premium homepage experience for The CalmTable with hero, story, dishes, and booking CTA.
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { motion, useScroll, useTransform } from 'framer-motion';

import { defaultFrontendSettings } from '@/lib/frontend-settings';
import { fetchBestOrderedMenuItems, fetchFrontendSettings } from '@/lib/services';
import { formatKwacha } from '@/lib/currency';
import { normalizeImageSource, shouldSkipImageOptimization } from '@/lib/image';
import type { FrontendContentPayload, MenuItem } from '@/lib/types';

interface SignatureDish {
  id: number;
  name: string;
  category: string;
  price: string;
  image_url: string;
}

const fallbackSignatureDishes: SignatureDish[] = [
  {
    id: 1,
    name: 'Fried Open Chambo',
    category: "Chef's Special",
    price: '25000',
    image_url: '/images/dish-fish.png',
  },
  {
    id: 2,
    name: 'Goat Stew',
    category: 'Starch Meal',
    price: '8000',
    image_url: '/images/dish-meat.png',
  },
  {
    id: 3,
    name: 'Hybrid Braii Chicken',
    category: 'Grilled',
    price: '13000',
    image_url: '/images/dish-meat.png',
  },
  {
    id: 4,
    name: 'Chapati with Beef Stirfry',
    category: 'Snacks',
    price: '8000',
    image_url: '/images/dish-snack.png',
  },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 1, 0.5, 1] } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
};

export default function HomePage() {
  const router = useRouter();
  const [bestOrderedItems, setBestOrderedItems] = useState<MenuItem[]>([]);
  const [settings, setSettings] = useState<FrontendContentPayload>(defaultFrontendSettings);
  const [resForm, setResForm] = useState({
    name: '',
    phone: '',
    date: '',
    time: '',
    guests: '',
  });
  const [booking, setBooking] = useState(false);
  
  // Parallax effect for hero background
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 1000], ['0%', '20%']);

  const signatureDishes = useMemo<SignatureDish[]>(() => {
    if (bestOrderedItems.length === 0) {
      return fallbackSignatureDishes;
    }

    return bestOrderedItems.slice(0, 4).map((item, index) => ({
      id: item.id,
      name: item.name,
      category: index === 0 ? "Chef's Special" : 'Best Ordered',
      price: item.price,
      image_url:
        item.image_url || fallbackSignatureDishes[index]?.image_url || fallbackSignatureDishes[0].image_url,
    }));
  }, [bestOrderedItems]);

  useEffect(() => {
    let active = true;

    async function loadBestOrderedItems() {
      try {
        const data = await fetchBestOrderedMenuItems();
        if (active) {
          setBestOrderedItems(data);
        }
      } catch (error) {
        if (active) {
          toast.error(error instanceof Error ? error.message : 'Unable to load signature dishes.');
        }
      }
    }

    void loadBestOrderedItems();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadSettings() {
      try {
        const data = await fetchFrontendSettings();
        if (active) {
          setSettings(data);
        }
      } catch (_error) {
        // Keep fallback content.
      }
    }

    void loadSettings();
    return () => {
      active = false;
    };
  }, []);

  function onReservationSubmit() {
    if (!resForm.name || !resForm.phone || !resForm.date || !resForm.time || !resForm.guests) {
      toast.error('Please fill in all reservation fields.');
      return;
    }

    setBooking(true);
    setTimeout(() => {
      setBooking(false);
      toast.success('Reservation details captured. Complete your booking in the next step.');
      const params = new URLSearchParams({
        date: resForm.date,
        party_size: resForm.guests,
      });
      router.push(`/book?${params.toString()}`);
    }, 900);
  }

  const heroBg = normalizeImageSource(settings.home.hero_bg_image) || '/images/hero-placeholder.png';
  const aboutImage = normalizeImageSource(settings.home.about_image) || '/images/hero-placeholder.png';
  const resBg = normalizeImageSource(settings.home.reservation_bg_image) || '/images/hero-placeholder.png';

  return (
    <div className="bg-[#0a0604] min-h-screen text-white overflow-hidden selection:bg-amber-600/30 -mt-14">
      
      {/* ─── Hero Section ────────────────────────────────────────────── */}
      <section className="relative h-[100dvh] flex items-center justify-center overflow-hidden">
        <motion.div style={{ y: heroY }} className="absolute inset-0 w-full h-full transform-gpu">
          <Image
            src={heroBg}
            alt="The CalmTable ambiance"
            fill
            className="object-cover"
            priority
            unoptimized={shouldSkipImageOptimization(heroBg)}
          />
        </motion.div>
        
        {/* Gradients to blend into dark background */}
        <div className="absolute inset-0 bg-[#0a0604]/40 backdrop-blur-[2px]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0a0604] to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0a0604_100%)] opacity-70" />

        <div className="page-shell relative z-10 flex flex-col items-center justify-center text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-4xl"
          >
            <motion.p variants={fadeInUp} className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-500 mb-6">
              {settings.home.hero_eyebrow}
            </motion.p>
            <motion.h1 variants={fadeInUp} className="font-heading text-4xl font-bold leading-tight sm:text-5xl md:text-6xl lg:text-7xl drop-shadow-2xl">
              {settings.home.hero_title_prefix}{' '}
              <em className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400">
                {settings.home.hero_title_emphasis}
              </em>{' '}
              <br className="max-sm:hidden" />
              {settings.home.hero_title_suffix}
            </motion.h1>
            <motion.p variants={fadeInUp} className="mt-8 mx-auto max-w-2xl text-sm text-white/70 sm:text-base leading-relaxed font-light">
              {settings.home.hero_description}
            </motion.p>
            
            <motion.div variants={fadeInUp} className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-5">
              <Link 
                href="/book" 
                className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-amber-600 px-8 py-4 font-bold uppercase tracking-[0.15em] text-[10px] text-white transition-all hover:bg-amber-500 hover:shadow-xl hover:shadow-amber-900/40 w-full sm:w-auto"
              >
                <span className="relative z-10">Reserve a Table</span>
                <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-100%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(100%)]">
                  <div className="relative h-full w-8 bg-white/20" />
                </div>
              </Link>
              <Link 
                href="/menu" 
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 backdrop-blur-sm px-8 py-4 font-bold uppercase tracking-[0.15em] text-[10px] text-white transition-all hover:bg-white/10 w-full sm:w-auto hover:border-white/40"
              >
                Explore Menu
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── Story Section ────────────────────────────────────────────── */}
      <section className="py-24 sm:py-32 relative">
        <div className="pointer-events-none absolute -left-40 top-40 h-96 w-96 rounded-full bg-amber-600/10 blur-[100px]" />
        
        <div className="page-shell">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer}
              className="relative"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl md:rounded-[3rem] border border-white/10 ring-1 ring-white/5">
                <Image
                  src={aboutImage}
                  alt="Inside The CalmTable"
                  fill
                  className="object-cover transition-transform duration-1000 hover:scale-105"
                  unoptimized={shouldSkipImageOptimization(aboutImage)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0604]/80 via-transparent to-transparent" />
              </div>
              {/* Floating Badge */}
              <motion.div 
                variants={fadeInUp}
                className="absolute -bottom-8 -right-8 sm:-right-12 rounded-2xl bg-gradient-to-br from-[#2a1810]/95 to-[#1a0f08]/95 p-6 backdrop-blur-md border border-amber-500/20 shadow-2xl"
              >
                <div className="text-center">
                  <span className="block text-4xl font-bold text-amber-500 font-heading">
                    {settings.home.stats.years_serving}
                  </span>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 mt-2">
                    Years Serving
                  </span>
                </div>
              </motion.div>
            </motion.div>

            <motion.div 
              initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer}
            >
              <motion.p variants={fadeInUp} className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500 mb-4">
                Our Heritage
              </motion.p>
              <motion.h2 variants={fadeInUp} className="font-heading text-4xl sm:text-5xl font-bold leading-tight mb-8">
                Where Every Meal Is <em className="text-amber-400">A Celebration</em>
              </motion.h2>
              
              <motion.div variants={fadeInUp} className="w-16 h-[1px] bg-gradient-to-r from-amber-500 to-transparent mb-8" />
              
              <motion.blockquote variants={fadeInUp} className="text-xl sm:text-2xl font-light italic text-white/90 leading-relaxed mb-8 border-l-2 border-amber-500/40 pl-6">
                &quot;{settings.home.story_quote}&quot;
              </motion.blockquote>
              
              <motion.p variants={fadeInUp} className="text-white/60 leading-relaxed mb-10 text-sm sm:text-base">
                {settings.home.story_description}
              </motion.p>

              <div className="grid sm:grid-cols-2 gap-8">
                {settings.home.about_features.map((feature, i) => (
                  <motion.div variants={fadeInUp} key={i}>
                    <p className="font-bold text-amber-100 mb-2 font-heading tracking-wide">{feature.title}</p>
                    <p className="text-sm text-white/50 leading-relaxed">{feature.description}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Signature Dishes ────────────────────────────────────────────── */}
      <section className="py-24 sm:py-32 relative bg-[#0e0805]">
        <div className="pointer-events-none absolute right-0 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-orange-600/5 blur-[120px]" />
        
        <div className="page-shell">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer}
            className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500 mb-3">
                From Our Kitchen
              </p>
              <h2 className="font-heading text-4xl sm:text-5xl font-bold">
                Signature <em className="text-amber-400">Selections</em>
              </h2>
            </div>
            <Link 
              href="/menu" 
              className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-white/70 hover:text-amber-400 transition-colors"
            >
              View Full Menu 
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {signatureDishes.map((dish, i) => (
              <motion.article
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.7, delay: i * 0.1, ease: [0.25, 1, 0.5, 1] }}
                key={dish.id}
                className="group relative rounded-3xl bg-[#1a0f08] p-4 ring-1 ring-white/5 hover:ring-white/20 hover:bg-[#22130a] transition-all duration-500"
              >
                <div className="relative aspect-square overflow-hidden rounded-2xl mb-6 bg-[#0a0604]">
                  <Image
                    src={dish.image_url}
                    alt={dish.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    unoptimized={shouldSkipImageOptimization(dish.image_url)}
                  />
                  {/* Subtle vignette over image */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#000000_120%)] opacity-60" />
                </div>
                
                <div className="px-2 pb-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-500/80 mb-2">
                    {dish.category}
                  </p>
                  <h3 className="font-bold text-lg text-white mb-2 leading-tight">
                    {dish.name}
                  </h3>
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-amber-400 font-heading font-bold text-lg">
                      {formatKwacha(dish.price)}
                    </p>
                    <Link 
                      href="/menu" 
                      className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 group-hover:bg-amber-600 group-hover:text-white transition-colors"
                      aria-label={`Order ${dish.name}`}
                    >
                      +
                    </Link>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Reservation Banner ────────────────────────────────────────────── */}
      <section className="relative py-24 my-24 page-shell rounded-3xl overflow-hidden shadow-2xl shadow-[#000000]">
        <div className="absolute inset-0">
          <Image
            src={resBg}
            alt="Reserve a table"
            fill
            className="object-cover"
            unoptimized={shouldSkipImageOptimization(resBg)}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0604] via-[#0a0604]/90 to-[#0a0604]/60 backdrop-blur-sm" />
        </div>

        <div className="relative z-10 grid lg:grid-cols-2 gap-16 lg:gap-8 items-center p-8 sm:p-16">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={staggerContainer} className="max-w-xl">
            <motion.p variants={fadeInUp} className="text-xs font-bold uppercase tracking-[0.2em] text-amber-500 mb-4">
              Secure Your Spot
            </motion.p>
            <motion.h2 variants={fadeInUp} className="font-heading text-4xl sm:text-5xl font-bold leading-tight mb-6">
              {settings.home.reservation_banner_title} <em className="text-amber-400">{settings.home.reservation_banner_emphasis}</em>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-white/70 leading-relaxed mb-10">
              {settings.home.reservation_banner_description}
            </motion.p>
            
            <motion.div variants={fadeInUp} className="flex gap-10">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2">Call Us</p>
                <p className="text-lg font-bold">{settings.contact.phone}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-2">WhatsApp</p>
                <p className="text-lg font-bold">{settings.contact.whatsapp}</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Glass Form */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}
            className="relative rounded-3xl border border-white/10 bg-[#2a1810]/40 p-8 sm:p-10 backdrop-blur-xl shadow-2xl"
          >
            <h3 className="font-heading text-2xl font-bold mb-8">Quick Reserevation</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text" placeholder="Your Name" value={resForm.name}
                  onChange={(e) => setResForm({ ...resForm, name: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#1a0f08]/60 px-4 py-3.5 text-sm text-white placeholder-white/40 focus:border-amber-500/50 focus:outline-none"
                />
                <input
                  type="tel" placeholder="Phone" value={resForm.phone}
                  onChange={(e) => setResForm({ ...resForm, phone: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#1a0f08]/60 px-4 py-3.5 text-sm text-white placeholder-white/40 focus:border-amber-500/50 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date" min={new Date().toISOString().split('T')[0]} value={resForm.date}
                  onChange={(e) => setResForm({ ...resForm, date: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#1a0f08]/60 px-4 py-3.5 text-sm text-white placeholder-white/40 focus:border-amber-500/50 focus:outline-none [color-scheme:dark]"
                />
                <select
                  value={resForm.time}
                  onChange={(e) => setResForm({ ...resForm, time: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-[#1a0f08]/60 px-4 py-3.5 text-sm text-white focus:border-amber-500/50 focus:outline-none appearance-none"
                >
                  <option value="" disabled hidden>Time</option>
                  <option value="17:00">05:00 PM</option>
                  <option value="18:00">06:00 PM</option>
                  <option value="19:00">07:00 PM</option>
                  <option value="20:00">08:00 PM</option>
                </select>
              </div>
              <select
                value={resForm.guests}
                onChange={(e) => setResForm({ ...resForm, guests: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-[#1a0f08]/60 px-4 py-3.5 text-sm text-white focus:border-amber-500/50 focus:outline-none appearance-none"
              >
                <option value="" disabled hidden>Party Size</option>
                <option value="1">1 Guest</option>
                <option value="2">2 Guests</option>
                <option value="4">3-4 Guests</option>
                <option value="6">5-6 Guests</option>
                <option value="10">7-10 Guests</option>
              </select>

              <button
                type="button"
                onClick={onReservationSubmit}
                disabled={booking}
                className="mt-4 w-full rounded-xl bg-amber-600 py-4 text-xs font-bold uppercase tracking-[0.15em] text-white transition-colors hover:bg-amber-500 disabled:opacity-70"
              >
                {booking ? 'Confirming...' : 'Confirm Reservation'}
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 bg-[#060302] py-16">
        <div className="page-shell">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <p className="font-heading text-2xl font-bold text-amber-500 mb-4">{settings.brand_name}</p>
              <p className="text-sm text-white/50 max-w-sm leading-relaxed">{settings.brand_tagline}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-white mb-6">Navigation</p>
              <div className="flex flex-col gap-4 text-sm text-white/60">
                <Link href="/" className="hover:text-amber-400 transition-colors w-fit">Home</Link>
                <Link href="/menu" className="hover:text-amber-400 transition-colors w-fit">Menu</Link>
                <Link href="/book" className="hover:text-amber-400 transition-colors w-fit">Reservations</Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-white mb-6">Contact</p>
              <div className="flex flex-col gap-4 text-sm text-white/60">
                <p>{settings.contact.address_line_1}</p>
                <p>{settings.contact.address_line_2}</p>
                <p>{settings.contact.email}</p>
              </div>
            </div>
          </div>
          <div className="mt-16 border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/40">© 2026 {settings.brand_name}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
