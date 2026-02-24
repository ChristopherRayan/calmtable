// Root application layout with fonts, navigation, and shared providers.
import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';

import { Navigation } from '@/components/navigation';
import { Providers } from '@/components/providers';

import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export const metadata: Metadata = {
  title: 'The CalmTable',
  description: 'Premium dining and reservation experience for The CalmTable.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable}`}
      data-theme="dark"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var stored = localStorage.getItem('calmtable-theme');
                  var theme = stored === 'light' ? 'light' : 'dark';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="bg-cream font-body text-ink antialiased">
        <Providers>
          <Navigation />
          <main className="pt-20">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
