// Menu gallery page with category tabs, dietary filtering, and loading states.
'use client';

import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { Badge } from '@/components/badge';
import { MenuDishCard } from '@/components/menu-dish-card';
import { SectionHeading } from '@/components/section-heading';
import { SkeletonCard } from '@/components/skeleton-card';
import { fetchMenuItems } from '@/lib/services';
import type { MenuCategory, MenuItem } from '@/lib/types';
import { cn } from '@/lib/utils';

type CategoryFilter = 'all' | MenuCategory;

const categoryFilters: Array<{ label: string; value: CategoryFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Starters', value: 'starters' },
  { label: 'Mains', value: 'mains' },
  { label: 'Desserts', value: 'desserts' },
  { label: 'Drinks', value: 'drinks' },
];

const dietaryOptions = ['vegan', 'vegetarian', 'gluten-free'];

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);

  useEffect(() => {
    async function loadMenuItems() {
      try {
        setLoading(true);
        const data = await fetchMenuItems({
          category: activeCategory,
          dietaryTags: selectedDietary,
        });
        setItems(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load menu.');
      } finally {
        setLoading(false);
      }
    }

    void loadMenuItems();
  }, [activeCategory, selectedDietary]);

  const emptyMessage = useMemo(() => {
    if (selectedDietary.length > 0) {
      return 'No dishes match the selected dietary filters.';
    }

    if (activeCategory !== 'all') {
      return 'No dishes are currently available in this category.';
    }

    return 'No menu items available right now.';
  }, [activeCategory, selectedDietary]);

  function toggleDietary(tag: string) {
    setSelectedDietary((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Digital Menu"
        title="Explore Our Signature Dishes"
        description="Filter by course or dietary preferences to find the perfect dish for your table."
      />

      <div className="sticky top-20 z-30 mt-8 rounded-2xl border border-woodAccent/50 bg-cream/95 p-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          {categoryFilters.map((category) => (
            <button
              key={category.value}
              type="button"
              aria-label={`Filter menu by ${category.label}`}
              className={cn(
                'rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide',
                activeCategory === category.value
                  ? 'bg-tableBrown text-white'
                  : 'bg-warmGray text-tableBrown hover:bg-[#eadfce]'
              )}
              onClick={() => setActiveCategory(category.value)}
            >
              {category.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {dietaryOptions.map((tag) => {
            const isActive = selectedDietary.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-label={`Toggle ${tag} dietary filter`}
                onClick={() => toggleDietary(tag)}
              >
                <Badge tone={isActive ? 'accent' : 'outline'}>{tag}</Badge>
              </button>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="mt-8 rounded-2xl border border-woodAccent/50 bg-warmGray p-8 text-center">
          <p className="text-sm text-tableBrown">{emptyMessage}</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {items.map((item) => (
            <MenuDishCard key={item.id} item={item} />
          ))}
        </motion.section>
      )}
    </div>
  );
}
