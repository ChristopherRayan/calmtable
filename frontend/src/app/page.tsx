// Premium homepage experience for The CalmTable with hero, story, dishes, and booking CTA.
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { fetchBestOrderedMenuItems } from '@/lib/services';
import { formatKwacha } from '@/lib/currency';
import { shouldSkipImageOptimization } from '@/lib/image';
import type { MenuItem } from '@/lib/types';

import styles from './page.module.css';

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
    image_url: 'https://images.unsplash.com/photo-1519984388953-d2406bc725e1?w=700&q=80',
  },
  {
    id: 2,
    name: 'Goat Stew',
    category: 'Starch Meal',
    price: '8000',
    image_url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=700&q=80',
  },
  {
    id: 3,
    name: 'Hybrid Braii Chicken',
    category: 'Grilled',
    price: '13000',
    image_url: 'https://images.unsplash.com/photo-1518492104633-130d0cc84637?w=700&q=80',
  },
  {
    id: 4,
    name: 'Chapati with Beef Stirfry',
    category: 'Snacks',
    price: '8000',
    image_url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=700&q=80',
  },
];

export default function HomePage() {
  const router = useRouter();
  const [bestOrderedItems, setBestOrderedItems] = useState<MenuItem[]>([]);
  const [resForm, setResForm] = useState({
    name: '',
    phone: '',
    date: '',
    time: '',
    guests: '',
  });
  const [booking, setBooking] = useState(false);
  const revealRef = useRef<IntersectionObserver | null>(null);

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
    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal="true"]'));
    revealRef.current?.disconnect();

    revealRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
            revealRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    targets.forEach((target) => revealRef.current?.observe(target));

    return () => {
      revealRef.current?.disconnect();
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

  return (
    <div className={styles.page}>
      <section className={styles.hero} id="hero">
        <div className={styles.heroBg} />
        <div className={styles.heroOverlay} />
        <div className={styles.heroOverlayBottom} />
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>The CalmTable &amp; Family Restaurant</p>
          <h1 className={styles.heroTitle}>
            Modern fine dining
            <br />
            with a <em>calm atmosphere</em>
            <br />
            and unforgettable flavors.
          </h1>
          <p className={styles.heroSub}>
            Join us for handcrafted dishes, warm hospitality, and premium ambiance near Simso Filling Station,
            Luwinga, Mzuzu.
          </p>
          <div className={styles.heroButtons}>
            <Link href="/book" className={styles.primaryButton} aria-label="Book a table now">
              Book a Table
            </Link>
            <Link href="/menu" className={styles.ghostButton} aria-label="View full menu">
              View Menu
            </Link>
          </div>
        </div>

        <div className={styles.heroStats}>
          <div className={styles.statBox}>
            <span className={styles.statNumber}>12+</span>
            <span className={styles.statLabel}>Years Serving</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statNumber}>80+</span>
            <span className={styles.statLabel}>Menu Items</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statNumber}>4.9★</span>
            <span className={styles.statLabel}>Avg. Rating</span>
          </div>
        </div>
      </section>

      <section className={styles.section} id="about">
        <div className={styles.aboutWrap}>
          <div className={`${styles.aboutImageWrap} ${styles.reveal}`} data-reveal="true">
            <Image
              src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=900&q=80"
              alt="Inside The CalmTable"
              width={900}
              height={1100}
              className={styles.aboutImage}
            />
            <div className={styles.aboutBadge}>
              <span className={styles.aboutBadgeNum}>12</span>
              <span className={styles.aboutBadgeText}>Years of Dignity</span>
            </div>
          </div>
          <div className={`${styles.reveal} ${styles.delay1}`} data-reveal="true">
            <p className={styles.eyebrow}>Our Story</p>
            <h2 className={styles.sectionTitle}>
              Where Every Meal Is <em>A Celebration</em>
            </h2>
            <div className={styles.goldLine} />
            <blockquote className={styles.aboutQuote}>
              &quot;Good food is the foundation of genuine happiness - we serve both.&quot;
            </blockquote>
            <p className={styles.sectionSub}>
              The CalmTable started as a family kitchen with one promise: feed every guest with dignity and care.
              Today we serve Malawian favorites, fresh fish, and heritage recipes in a refined, welcoming setting.
            </p>
            <div className={styles.aboutFeatures}>
              <div className={styles.featureItem}>
                <span className={styles.featureLabel}>Fresh Daily</span>
                <span className={styles.featureSub}>Cooked every morning</span>
              </div>
              <div className={styles.featureItem}>
                <span className={styles.featureLabel}>Family Owned</span>
                <span className={styles.featureSub}>Since 2012</span>
              </div>
              <div className={styles.featureItem}>
                <span className={styles.featureLabel}>Made with Care</span>
                <span className={styles.featureSub}>Every single plate</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.dishesSection}`} id="dishes">
        <div className={`${styles.dishesHeader} ${styles.reveal}`} data-reveal="true">
          <div>
            <p className={styles.eyebrow}>From Our Kitchen</p>
            <h2 className={styles.sectionTitle}>
              Best Ordered <em>Dishes</em>
            </h2>
          </div>
          <Link href="/menu" className={styles.viewAllLink} aria-label="View full menu">
            View Full Menu
          </Link>
        </div>

        <div className={styles.dishesGrid}>
          {signatureDishes.map((dish, index) => (
            <article
              key={dish.id}
              className={`${styles.dishCard} ${styles.reveal} ${index === 1 ? styles.delay1 : ''} ${index === 2 ? styles.delay2 : ''} ${index === 3 ? styles.delay3 : ''}`}
              data-reveal="true"
            >
              <div className={styles.dishImageWrap}>
                <Image
                  src={dish.image_url}
                  alt={dish.name}
                  width={720}
                  height={900}
                  className={styles.dishImage}
                  unoptimized={shouldSkipImageOptimization(dish.image_url)}
                />
              </div>
              <div className={styles.dishOverlay} />
              <div className={styles.dishInfo}>
                <p className={styles.dishCategory}>{dish.category}</p>
                <p className={styles.dishName}>{dish.name}</p>
                <p className={styles.dishPrice}>{formatKwacha(dish.price)}</p>
                <Link href="/menu" className={styles.dishCta} aria-label={`Order ${dish.name}`}>
                  Order Now
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.whyWrap}>
        <div className={styles.whyImageSide}>
          <Image
            src="https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=900&q=80"
            alt="The CalmTable interior"
            width={1000}
            height={800}
            className={styles.whyImage}
          />
          <div className={styles.whyImageOverlay} />
        </div>
        <div className={styles.whyTextSide}>
          <p className={`${styles.eyebrow} ${styles.reveal}`} data-reveal="true">
            Why The CalmTable
          </p>
          <h2 className={`${styles.sectionTitle} ${styles.reveal} ${styles.delay1}`} data-reveal="true">
            The Experience You <em>Deserve</em>
          </h2>
          <p className={`${styles.sectionSub} ${styles.reveal} ${styles.delay2}`} data-reveal="true">
            Every detail is curated to make guests feel welcomed, comfortable, and fully satisfied.
          </p>
          <div className={styles.whyGrid}>
            <div className={`${styles.whyItem} ${styles.reveal} ${styles.delay1}`} data-reveal="true">
              <p className={styles.whyItemTitle}>Local Ingredients</p>
              <p className={styles.whyItemText}>We source directly from Malawian suppliers for daily freshness.</p>
            </div>
            <div className={`${styles.whyItem} ${styles.reveal} ${styles.delay2}`} data-reveal="true">
              <p className={styles.whyItemTitle}>Family Atmosphere</p>
              <p className={styles.whyItemText}>Every guest receives warm, dignified, and personal service.</p>
            </div>
            <div className={`${styles.whyItem} ${styles.reveal} ${styles.delay3}`} data-reveal="true">
              <p className={styles.whyItemTitle}>Fast Service</p>
              <p className={styles.whyItemText}>Meals arrive hot and quickly, without compromising quality.</p>
            </div>
            <div className={`${styles.whyItem} ${styles.reveal} ${styles.delay4}`} data-reveal="true">
              <p className={styles.whyItemTitle}>Hygiene First</p>
              <p className={styles.whyItemText}>Clean kitchen, strict standards, and consistent food safety.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.reservationBanner} id="reservation">
        <div className={styles.reservationBg} />
        <div className={styles.reservationContent}>
          <div className={`${styles.reveal}`} data-reveal="true">
            <p className={styles.eyebrow}>Reserve Your Spot</p>
            <h2 className={styles.reservationTitle}>
              Book a Table for <em>An Unforgettable Evening</em>
            </h2>
            <p className={styles.reservationSub}>
              Reserve your table in advance and let us prepare your premium dining experience.
            </p>
            <div className={styles.contactRow}>
              <div>
                <p className={styles.contactLabel}>Phone</p>
                <p className={styles.contactValue}>+265 999 000 000</p>
              </div>
              <div>
                <p className={styles.contactLabel}>WhatsApp</p>
                <p className={styles.contactValue}>+265 888 000 000</p>
              </div>
            </div>
          </div>

          <div className={`${styles.reservationForm} ${styles.reveal} ${styles.delay2}`} data-reveal="true">
            <p className={styles.reservationFormTitle}>Quick Reservation</p>
            <div className={styles.reservationRow}>
              <input
                className={styles.reservationInput}
                type="text"
                placeholder="Your Name"
                value={resForm.name}
                onChange={(event) => setResForm((current) => ({ ...current, name: event.target.value }))}
              />
              <input
                className={styles.reservationInput}
                type="tel"
                placeholder="Phone Number"
                value={resForm.phone}
                onChange={(event) => setResForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </div>
            <div className={styles.reservationRow}>
              <input
                className={styles.reservationInput}
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={resForm.date}
                onChange={(event) => setResForm((current) => ({ ...current, date: event.target.value }))}
              />
              <select
                className={styles.reservationInput}
                value={resForm.time}
                onChange={(event) => setResForm((current) => ({ ...current, time: event.target.value }))}
              >
                <option value="">Select Time</option>
                <option value="17:00">05:00 PM</option>
                <option value="17:30">05:30 PM</option>
                <option value="18:00">06:00 PM</option>
                <option value="18:30">06:30 PM</option>
                <option value="19:00">07:00 PM</option>
                <option value="19:30">07:30 PM</option>
                <option value="20:00">08:00 PM</option>
                <option value="20:30">08:30 PM</option>
              </select>
            </div>
            <div className={styles.reservationField}>
              <select
                className={styles.reservationInput}
                value={resForm.guests}
                onChange={(event) => setResForm((current) => ({ ...current, guests: event.target.value }))}
              >
                <option value="">Party Size</option>
                <option value="1">1 Guest</option>
                <option value="2">2 Guests</option>
                <option value="4">3-4 Guests</option>
                <option value="6">5-6 Guests</option>
                <option value="10">7-10 Guests</option>
                <option value="12">10+ Guests</option>
              </select>
            </div>
            <button
              type="button"
              className={styles.reservationSubmit}
              onClick={onReservationSubmit}
              disabled={booking}
              aria-label="Confirm reservation"
            >
              {booking ? 'Booking...' : 'Confirm Reservation'}
            </button>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.testimonialsSection}`}>
        <div className={`${styles.testimonialsHeader} ${styles.reveal}`} data-reveal="true">
          <p className={styles.eyebrow}>Guest Reviews</p>
          <h2 className={styles.sectionTitle}>
            What Our Guests <em>Say</em>
          </h2>
        </div>
        <div className={styles.testimonialsGrid}>
          <article className={`${styles.testimonialCard} ${styles.reveal}`} data-reveal="true">
            <p className={styles.stars}>★★★★★</p>
            <p className={styles.testimonialText}>
              &quot;The Chambo was absolutely divine. I keep coming back because the quality never drops.&quot;
            </p>
            <p className={styles.testimonialAuthor}>Amara Nkhoma</p>
          </article>
          <article className={`${styles.testimonialCard} ${styles.reveal} ${styles.delay1}`} data-reveal="true">
            <p className={styles.stars}>★★★★★</p>
            <p className={styles.testimonialText}>
              &quot;Our family reunion was hosted perfectly. Warm service, great portions, and elegant atmosphere.&quot;
            </p>
            <p className={styles.testimonialAuthor}>Chisomo Banda</p>
          </article>
          <article className={`${styles.testimonialCard} ${styles.reveal} ${styles.delay2}`} data-reveal="true">
            <p className={styles.stars}>★★★★★</p>
            <p className={styles.testimonialText}>
              &quot;Best Masamba Otendera in Mzuzu. Authentic taste and consistently professional service.&quot;
            </p>
            <p className={styles.testimonialAuthor}>Takondwa Mwale</p>
          </article>
        </div>
      </section>

      <section className={styles.gallerySection}>
        <div className={`${styles.galleryHeader} ${styles.reveal}`} data-reveal="true">
          <p className={styles.eyebrow}>Our Moments</p>
          <h2 className={styles.sectionTitle}>
            A Glimpse Inside <em>The CalmTable</em>
          </h2>
        </div>
        <div className={styles.galleryGrid}>
          {[
            'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=900&q=80',
            'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
            'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=600&q=80',
            'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
            'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80',
          ].map((src, index) => (
            <div key={src} className={styles.galleryItem}>
              <Image src={src} alt={`The CalmTable gallery ${index + 1}`} width={800} height={600} className={styles.galleryImage} />
            </div>
          ))}
        </div>
      </section>

      <footer className={styles.siteFooter}>
        <div className={styles.footerGrid}>
          <div>
            <p className={styles.footerLogo}>The CalmTable</p>
            <p className={styles.footerTagline}>Dine with Dignity</p>
          </div>
          <div>
            <p className={styles.footerTitle}>Navigation</p>
            <div className={styles.footerLinks}>
              <Link href="/">Home</Link>
              <Link href="/menu">Menu</Link>
              <Link href="/book">Book a Table</Link>
              <Link href="/contact">Contact</Link>
            </div>
          </div>
          <div>
            <p className={styles.footerTitle}>Contact</p>
            <p className={styles.footerText}>Near Simso Filling Station, Luwinga, Mzuzu, Malawi</p>
            <p className={styles.footerText}>+265 999 000 000</p>
            <p className={styles.footerText}>hello@calmtable.mw</p>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>© 2026 The CalmTable. All Rights Reserved.</p>
        </div>
      </footer>

      <Link href="/book" className={styles.bookFloat} aria-label="Open reservation page">
        Book a Table
      </Link>
    </div>
  );
}
