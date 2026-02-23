// Root application layout with fonts, navigation, and shared providers.
import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';

import { Navigation } from '@/components/navigation';
import { Providers } from '@/components/providers';

import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export const metadata: Metadata = {
  title: 'Calm Table',
  description: 'Premium dining and reservation experience for Calm Table.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="bg-cream font-body text-[#2B1D16] antialiased">
        <Providers>
          <Navigation />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
