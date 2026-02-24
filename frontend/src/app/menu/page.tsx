// Menu gallery page with category tabs, dietary filtering, and loading states.
'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { useAuth } from '@/components/auth-provider';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { useCart } from '@/components/cart-provider';
import { MenuDishCard } from '@/components/menu-dish-card';
import { SectionHeading } from '@/components/section-heading';
import { SkeletonCard } from '@/components/skeleton-card';
import { StarRatingInput } from '@/components/star-rating';
import { createReview, fetchMenuItems } from '@/lib/services';
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
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { addItem, setIsOpen } = useCart();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [reviewMenuItemId, setReviewMenuItemId] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadMenuItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchMenuItems({
        category: activeCategory,
        dietaryTags: selectedDietary,
      });
      setItems(data);
      if (!reviewMenuItemId && data.length > 0) {
        setReviewMenuItemId(data[0].id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load menu.');
    } finally {
      setLoading(false);
    }
  }, [activeCategory, reviewMenuItemId, selectedDietary]);

  useEffect(() => {
    void loadMenuItems();
  }, [loadMenuItems]);

  const emptyMessage = useMemo(() => {
    if (selectedDietary.length > 0) {
      return 'No dishes match the selected dietary filters.';
    }

    if (activeCategory !== 'all') {
      return 'No dishes are currently available in this category.';
    }

    return 'No menu items available right now.';
  }, [activeCategory, selectedDietary]);
  const canCustomerActions = Boolean(isAuthenticated && user && !user.is_staff);

  function toggleDietary(tag: string) {
    setSelectedDietary((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    );
  }

  async function handleSubmitReview() {
    if (!reviewMenuItemId) {
      toast.error('Select a menu item first.');
      return;
    }
    if (!reviewComment.trim()) {
      toast.error('Please add a short review comment.');
      return;
    }

    try {
      setSubmittingReview(true);
      await createReview({
        menu_item: reviewMenuItemId,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setReviewComment('');
      setReviewRating(5);
      toast.success('Review submitted.');
      await loadMenuItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  }

  return (
    <div className="page-shell py-10">
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
            <MenuDishCard
              key={item.id}
              item={item}
              onAddToCart={(dish) => {
                if (!isAuthenticated) {
                  toast.error('Create an account or sign in to add items to cart.');
                  router.push('/login?next=/menu');
                  return;
                }
                if (user?.is_staff) {
                  toast.error('Staff accounts cannot place customer orders.');
                  return;
                }
                addItem(dish);
                setIsOpen(true);
                toast.success(`${dish.name} added to cart.`);
              }}
            />
          ))}
        </motion.section>
      )}

      {!isAuthenticated && !loading && items.length > 0 && (
        <Card elevated className="mt-8 space-y-2">
          <h2 className="font-heading text-2xl text-tableBrown">Customer Reviews</h2>
          <p className="text-sm text-tableBrown/85">
            Sign in as a customer to place bookings, checkout orders, and leave verified reviews.
          </p>
          <div>
            <Link
              href="/login?next=/menu"
              className="inline-flex rounded-full bg-tableBrown px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-tableBrownLight"
            >
              Sign In to Continue
            </Link>
          </div>
        </Card>
      )}

      {isAuthenticated && user?.is_staff && !loading && items.length > 0 && (
        <Card elevated className="mt-8">
          <p className="text-sm text-tableBrown/85">
            Staff accounts cannot submit menu reviews. Use a customer account to review dishes.
          </p>
        </Card>
      )}

      {canCustomerActions && !loading && items.length > 0 && (
        <Card elevated className="mt-8 space-y-4">
          <h2 className="font-heading text-2xl text-tableBrown">Leave a Review</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="review-menu-item" className="text-sm font-medium text-tableBrown">
                Menu Item
              </label>
              <select
                id="review-menu-item"
                value={reviewMenuItemId ?? ''}
                onChange={(event) => setReviewMenuItemId(Number(event.target.value))}
                className="h-11 w-full rounded-xl border border-woodAccent bg-white px-3 text-sm text-tableBrown"
              >
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-tableBrown">Rating</p>
              <div className="pt-2">
                <StarRatingInput value={reviewRating} onChange={setReviewRating} />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="review-comment" className="text-sm font-medium text-tableBrown">
              Comment
            </label>
            <textarea
              id="review-comment"
              rows={4}
              value={reviewComment}
              onChange={(event) => setReviewComment(event.target.value)}
              className="w-full rounded-xl border border-woodAccent bg-white px-3 py-2 text-sm text-tableBrown"
              placeholder="Tell us about your dining experience."
            />
          </div>
          <Button onClick={handleSubmitReview} disabled={submittingReview} aria-label="Submit review">
            {submittingReview ? 'Submitting...' : 'Submit Review'}
          </Button>
        </Card>
      )}
    </div>
  );
}
