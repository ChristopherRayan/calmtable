// Premium menu gallery page with featured dish, category rail, and cart-ready cards.
'use client';

import Image from 'next/image';
import { ArrowRight, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { FloatingReservationWidget } from '@/components/floating-reservation-widget';
import { useAuth } from '@/components/auth-provider';
import { useCart } from '@/components/cart-provider';
import { fetchMenuItems } from '@/lib/services';
import { formatKwacha } from '@/lib/currency';
import { shouldSkipImageOptimization } from '@/lib/image';
import type { MenuItem } from '@/lib/types';
import { cn } from '@/lib/utils';

import styles from './page.module.css';

type DisplayCategory = 'all' | 'starch' | 'nsima' | 'snacks' | 'beverages' | 'extras';

const categoryTabs: Array<{ label: string; value: DisplayCategory }> = [
  { label: 'All', value: 'all' },
  { label: 'Starch Meals', value: 'starch' },
  { label: 'Nsima & Rice', value: 'nsima' },
  { label: 'Snacks', value: 'snacks' },
  { label: 'Beverages', value: 'beverages' },
  { label: 'Extras', value: 'extras' },
];

const fallbackImages: Array<{ keywords: string[]; url: string }> = [
  {
    keywords: ['chambo', 'butterfish', 'fish'],
    url: 'https://images.unsplash.com/photo-1519984388953-d2406bc725e1?w=1400&q=80',
  },
  {
    keywords: ['goat', 'beef', 'chicken', 'stew', 'braii'],
    url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1400&q=80',
  },
  {
    keywords: ['chapati', 'samoosa', 'doughnut', 'wrap'],
    url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=1400&q=80',
  },
  {
    keywords: ['tea', 'coffee', 'milk', 'water', 'drink', 'ice-cream'],
    url: 'https://images.unsplash.com/photo-1543253687-c931c8e01820?w=1400&q=80',
  },
];

function normalize(value: string) {
  return value.toLowerCase();
}

function resolveDisplayCategory(item: MenuItem): DisplayCategory {
  const normalizedName = normalize(item.name);
  const normalizedDescription = normalize(item.description);
  const combined = `${normalizedName} ${normalizedDescription}`;

  if (item.category === 'drinks') {
    return 'beverages';
  }

  if (
    combined.includes('chapati') ||
    combined.includes('samoosa') ||
    combined.includes('doughnut') ||
    combined.includes('wrap')
  ) {
    return 'snacks';
  }

  if (combined.includes('beans') || combined.includes('masamba') || combined.includes('veggies')) {
    return 'nsima';
  }

  if (
    combined.includes('extra relish') ||
    normalizedName === 'nsima (piece)' ||
    normalizedName === 'rice' ||
    normalizedName === 'chips' ||
    normalizedName === 'boiled irish'
  ) {
    return 'extras';
  }

  if (item.category === 'desserts' || combined.includes('ice-cream')) {
    return 'beverages';
  }

  return 'starch';
}

function resolveImageUrl(item: MenuItem) {
  if (item.image_url) {
    return item.image_url;
  }

  const haystack = normalize(`${item.name} ${item.description}`);
  const fallback = fallbackImages.find((entry) =>
    entry.keywords.some((keyword) => haystack.includes(keyword))
  );
  return fallback?.url ?? '';
}

function buildBadges(item: MenuItem) {
  const badges: Array<{ className: string; label: string }> = [];
  const tags = item.dietary_tags.map((tag) => normalize(tag));

  if (tags.includes('vegan') || tags.includes('vegetarian')) {
    badges.push({ className: styles.badgeVegan, label: tags.includes('vegan') ? 'Vegan' : 'Vegetarian' });
  }
  if (tags.includes('gluten-free')) {
    badges.push({ className: styles.badgeGf, label: 'Gluten-Free' });
  }
  if (tags.includes('spicy')) {
    badges.push({ className: styles.badgeSpicy, label: 'Spicy' });
  }

  if (badges.length === 0 && normalize(item.name).includes('extra relish')) {
    badges.push({ className: styles.badgeGf, label: 'Extra Relish' });
  }

  if (badges.length === 0 && item.ordered_count > 4) {
    badges.push({ className: styles.badgeSpicy, label: 'Best Seller' });
  }

  return badges;
}

export default function MenuPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { addItem } = useCart();
  const [activeCategory, setActiveCategory] = useState<DisplayCategory>('all');
  const { items, loading: isLoading } = useMenuItems();

  const featuredItem = useMemo(() => {
    return items.find((item) => item.is_featured) ?? items[0] ?? null;
  }, [items]);

  const visibleItems = useMemo(() => {
    if (activeCategory === 'all') {
      return items;
    }
    return items.filter((item) => resolveDisplayCategory(item) === activeCategory);
  }, [activeCategory, items]);

  function handleAddToCart(item: MenuItem) {
    if (!isAuthenticated) {
      toast.error('Sign in as a customer to place orders.');
      router.push('/login?next=/menu');
      return;
    }

    if (user?.is_staff) {
      toast.error('Staff accounts cannot checkout. Use a customer account.');
      return;
    }

    if (!item.is_available) {
      toast.error('This dish is currently unavailable.');
      return;
    }

    addItem(item);
    toast.success(`${item.name} added to order.`);
  }

  return (
    <div className={styles.page}>
      {featuredItem && (
        <section className={styles.featuredWrap}>
          <article className={styles.featuredCard}>
            <div className={styles.featuredImageWrap}>
              {resolveImageUrl(featuredItem) ? (
                <Image
                  src={resolveImageUrl(featuredItem)}
                  alt={featuredItem.name}
                  fill
                  priority
                  className={styles.cardImage}
                  sizes="100vw"
                  unoptimized={shouldSkipImageOptimization(resolveImageUrl(featuredItem))}
                />
              ) : (
                <div className={styles.cardPlaceholder}>
                  <p className={styles.cardPlaceholderText}>Dish image managed in admin</p>
                </div>
              )}
            </div>
            <div className={styles.featuredBody}>
              <p className={styles.featuredEyebrow}>Chef&apos;s Signature</p>
              <p className={styles.featuredName}>
                {featuredItem.name}
                <em>{formatKwacha(featuredItem.price)}</em>
              </p>
              <button type="button" className={styles.featuredCta} onClick={() => handleAddToCart(featuredItem)}>
                Add Signature Dish
                <ArrowRight size={14} />
              </button>
            </div>
          </article>
        </section>
      )}

      <section className={styles.categoryBar}>
        {categoryTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            aria-label={`Filter by ${tab.label}`}
            className={cn(
              styles.categoryButton,
              activeCategory === tab.value && styles.categoryButtonActive
            )}
            onClick={() => setActiveCategory(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </section>

      <section className={styles.menuSection}>
        {isLoading && (
          <div className={styles.menuGrid}>
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className={styles.skeletonCard} />
            ))}
          </div>
        )}

        {!isLoading && visibleItems.length === 0 && (
          <div className={styles.emptyState}>
            No dishes currently available in this category.
          </div>
        )}

        {!isLoading && visibleItems.length > 0 && (
          <div className={styles.menuGrid}>
            {visibleItems.map((item) => {
              const resolvedImage = resolveImageUrl(item);
              const badges = buildBadges(item);
              return (
                <article key={item.id} className={styles.menuCard}>
                  <span className={styles.cardCorner} aria-hidden />
                  <div className={styles.cardImageWrap}>
                    {resolvedImage ? (
                      <Image
                        src={resolvedImage}
                        alt={item.name}
                        fill
                        className={styles.cardImage}
                        sizes="(max-width: 1024px) 50vw, 33vw"
                        unoptimized={shouldSkipImageOptimization(resolvedImage)}
                      />
                    ) : (
                      <div className={styles.cardPlaceholder}>
                        <p className={styles.cardPlaceholderText}>Image managed in admin</p>
                      </div>
                    )}
                    {item.is_available ? (
                      <button
                        type="button"
                        className={styles.addToCartButton}
                        onClick={() => handleAddToCart(item)}
                        aria-label={`Add ${item.name} to order`}
                      >
                        <Plus size={14} />
                        Add to Order
                      </button>
                    ) : (
                      <div className={styles.soldOut}>
                        <span className={styles.soldOutText}>Sold Out</span>
                      </div>
                    )}
                  </div>

                  <div className={styles.cardBody}>
                    {badges.length > 0 && (
                      <div className={styles.badgeRow}>
                        {badges.map((badge) => (
                          <span key={`${item.id}-${badge.label}`} className={cn(styles.badge, badge.className)}>
                            {badge.label}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className={styles.cardName}>{item.name}</p>
                    <p className={styles.cardSub}>{item.description}</p>
                    <div className={styles.cardFooter}>
                      <span className={styles.cardPrice}>{formatKwacha(item.price)}</span>
                      <button
                        type="button"
                        className={styles.cardLink}
                        onClick={() => handleAddToCart(item)}
                        aria-label={`Order ${item.name}`}
                      >
                        {item.is_available ? 'Order' : 'View Dish'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer className="page-shell border-t border-woodAccent/20 py-6">
        <div className="flex flex-col gap-3 text-[11px] uppercase tracking-[0.1em] text-muted md:flex-row md:items-center md:justify-between">
          <p>© 2026 The CalmTable. Dine with Dignity.</p>
          <div className="flex gap-5 text-woodAccent/60">
            <span>Instagram</span>
            <span>Facebook</span>
            <span>TikTok</span>
          </div>
        </div>
      </footer>

      <FloatingReservationWidget />
    </div>
  );
}

function useMenuItems() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const data = await fetchMenuItems();
        if (active) {
          setItems(data);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load menu.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    void load();

    return () => {
      active = false;
    };
  }, []);

  return { items, loading };
}
