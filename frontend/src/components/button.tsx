// Reusable button component with Calm Table visual variants.
import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-tableBrown text-white hover:bg-tableBrownLight focus-visible:outline-tableBrown dark:bg-white/10 dark:text-white dark:hover:bg-white/20 dark:focus-visible:outline-white/50',
  secondary:
    'bg-warmGray text-tableBrown border border-woodAccent hover:bg-woodAccent/15 focus-visible:outline-woodAccent dark:bg-warmGray/20 dark:text-white/90 dark:border-white/20 dark:hover:bg-white/10 dark:focus-visible:outline-white/30',
  ghost: 'bg-transparent text-tableBrown hover:bg-woodAccent/15 focus-visible:outline-tableBrown dark:bg-transparent dark:text-white/90 dark:hover:bg-white/10 dark:focus-visible:outline-white/50',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
});

export { Button };
export type { ButtonProps };
