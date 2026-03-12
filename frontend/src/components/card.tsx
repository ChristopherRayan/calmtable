// Card surface used throughout Calm Table feature sections.
import { type HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export function Card({ className, elevated = false, ...props }: CardProps) {
  return (
    <article
      className={cn(
        'rounded-2xl border border-stone-200 dark:border-woodAccent/60 bg-white dark:bg-warmGray p-5',
        elevated && 'shadow-soft dark:shadow-soft',
        className
      )}
      {...props}
    />
  );
}
