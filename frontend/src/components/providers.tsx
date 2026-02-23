// Client-side providers for app-wide interactive services.
'use client';

import type { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <>
      {children}
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
    </>
  );
}
