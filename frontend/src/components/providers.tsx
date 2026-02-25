// Client-side providers for app-wide interactive services.
'use client';

import { useEffect, type ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from '@/components/auth-provider';
import { CartDrawer } from '@/components/cart-drawer';
import { CartProvider } from '@/components/cart-provider';
import { ThemeProvider } from '@/components/theme-provider';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  useEffect(() => {
    function isExtensionNoise(payload: {
      message?: string;
      filename?: string;
      reason?: unknown;
    }): boolean {
      const message = String(payload.message ?? '');
      const filename = String(payload.filename ?? '');
      const reasonText =
        typeof payload.reason === 'string'
          ? payload.reason
          : payload.reason instanceof Error
            ? payload.reason.message
            : String(payload.reason ?? '');

      return (
        filename.includes('content-all.js') ||
        filename.includes('chrome-extension://') ||
        reasonText.includes('content-all.js') ||
        message.includes('Could not establish connection. Receiving end does not exist') ||
        reasonText.includes('Could not establish connection. Receiving end does not exist') ||
        message.includes("Cannot read properties of null (reading 'removeChild')") ||
        reasonText.includes("Cannot read properties of null (reading 'removeChild')")
      );
    }

    function handleWindowError(event: ErrorEvent) {
      if (isExtensionNoise({ message: event.message, filename: event.filename })) {
        event.preventDefault();
      }
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      if (isExtensionNoise({ reason: event.reason })) {
        event.preventDefault();
      }
    }

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

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
