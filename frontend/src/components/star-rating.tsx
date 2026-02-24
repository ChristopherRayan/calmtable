// Star rating display and input controls for menu reviews.
'use client';

import { Star } from 'lucide-react';

import { cn } from '@/lib/utils';

interface StarRatingDisplayProps {
  rating: number;
  className?: string;
}

export function StarRatingDisplay({ rating, className }: StarRatingDisplayProps) {
  const rounded = Math.round(rating);
  return (
    <div className={cn('inline-flex items-center gap-1', className)} aria-label={`Average rating ${rating.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          size={14}
          className={cn(index < rounded ? 'fill-[#D9A441] text-[#D9A441]' : 'text-woodAccent')}
        />
      ))}
      <span className="ml-1 text-xs font-medium text-tableBrown/80">{rating.toFixed(1)}</span>
    </div>
  );
}

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
}

export function StarRatingInput({ value, onChange }: StarRatingInputProps) {
  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Rate this item from 1 to 5">
      {Array.from({ length: 5 }).map((_, index) => {
        const ratingValue = index + 1;
        const isActive = ratingValue <= value;
        return (
          <button
            key={ratingValue}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={`${ratingValue} star${ratingValue > 1 ? 's' : ''}`}
            onClick={() => onChange(ratingValue)}
            className="transition-transform hover:scale-105"
          >
            <Star size={18} className={cn(isActive ? 'fill-[#D9A441] text-[#D9A441]' : 'text-woodAccent')} />
          </button>
        );
      })}
    </div>
  );
}
