// Landing page with animated hero, best-ordered dishes, and venue details.
'use client';

import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Clock3, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { Button } from '@/components/button';
import { FeaturedDishCard } from '@/components/featured-dish-card';
import { FloatingReservationWidget } from '@/components/floating-reservation-widget';
import { SectionHeading } from '@/components/section-heading';
import { SkeletonCard } from '@/components/skeleton-card';
import { fetchBestOrderedMenuItems } from '@/lib/services';
import type { MenuItem } from '@/lib/types';

export default function HomePage() {
  const [bestOrderedItems, setBestOrderedItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBestOrderedItems() {
      try {
        setLoading(true);
        const data = await fetchBestOrderedMenuItems();
        setBestOrderedItems(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to load best ordered dishes.');
      } finally {
        setLoading(false);
      }
    }

    void loadBestOrderedItems();
  }, []);

  return (
    <>
      <section className="relative isolate flex min-h-[88vh] items-end overflow-hidden">
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1800&q=80')",
          }}
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="page-shell w-full pb-14"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-woodAccent">The CalmTable</p>
          <h1 className="mt-3 w-full max-w-[980px] font-heading text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
            Modern fine dining with a calm atmosphere and unforgettable flavors.
          </h1>
          <p className="mt-4 w-full max-w-[820px] text-sm text-woodAccent/90 sm:text-base">
            Join us tonight for handcrafted dishes, curated wines, and warm service in the heart of the city.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button
              aria-label="Book your table now"
              onClick={() => {
                window.location.href = '/book';
              }}
            >
              Book a Table
            </Button>
            <Button
              variant="secondary"
              aria-label="Browse the menu"
              onClick={() => {
                window.location.href = '/menu';
              }}
            >
              View Menu
            </Button>
          </div>
        </motion.div>
      </section>

      <section className="page-shell py-12">
        <SectionHeading
          eyebrow="Crowd Favorites"
          title="Best Ordered Dishes"
          description="The most loved picks chosen repeatedly by our guests."
        />

        <div className="mt-7 overflow-x-auto pb-2">
          <div className="flex gap-4">
            {loading &&
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="min-w-[280px] max-w-[320px]">
                  <SkeletonCard />
                </div>
              ))}

            {!loading &&
              bestOrderedItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <FeaturedDishCard item={item} />
                </motion.div>
              ))}

            {!loading && bestOrderedItems.length === 0 && (
              <p className="rounded-xl border border-woodAccent/60 bg-warmGray px-4 py-3 text-sm text-tableBrown">
                No best ordered dishes available right now.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="border-y border-woodAccent/40 bg-warmGray/70">
        <div className="page-shell grid gap-8 py-12 lg:grid-cols-2">
          <div className="space-y-4">
            <SectionHeading
              eyebrow="Visit Us"
              title="Opening Hours & Location"
              description={`Today is ${format(new Date(), 'EEEE, MMMM d')}. We are open daily between 5:00 PM and 10:00 PM.`}
            />
            <div className="space-y-3 text-sm text-muted">
              <p className="flex items-center gap-2">
                <Clock3 size={16} className="text-tableBrown" />
                Daily: 5:00 PM - 10:00 PM
              </p>
              <p className="flex items-center gap-2">
                <MapPin size={16} className="text-tableBrown" />
                Near Simso Filling Station, Luwinga, Mzuzu, Malawi
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-woodAccent/60 bg-warmGray shadow-soft">
            <iframe
              title="Calm Table map location"
              src="https://maps.google.com/maps?q=Simso%20Filling%20Station%2C%20Luwinga%2C%20Mzuzu%2C%20Malawi&t=&z=15&ie=UTF8&iwloc=&output=embed"
              className="h-[320px] w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      <FloatingReservationWidget />
    </>
  );
}
