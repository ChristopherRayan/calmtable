// Client-side providers for app-wide interactive services.
'use client';

import type { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from '@/components/auth-provider';
import { CartDrawer } from '@/components/cart-drawer';
import { CartProvider } from '@/components/cart-provider';
import { ThemeProvider } from '@/components/theme-provider';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          {children}
          <CartDrawer />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'rgb(var(--warm-gray-rgb))',
                color: 'rgb(var(--ink-rgb))',
                border: '1px solid rgb(var(--wood-accent-rgb) / 0.35)',
              },
            }}
          />
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
