// Client-side providers for app-wide interactive services.
'use client';

import type { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from '@/components/auth-provider';
import { CartDrawer } from '@/components/cart-drawer';
import { CartProvider } from '@/components/cart-provider';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <CartProvider>
        {children}
        <CartDrawer />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#F5F0EA',
              color: '#2B1D16',
              border: '1px solid #D2B48C',
            },
          }}
        />
      </CartProvider>
    </AuthProvider>
  );
}
