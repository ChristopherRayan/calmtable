// Root layout wrapper for Calm Table frontend pages.
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Calm Table',
  description: 'Restaurant web experience for Calm Table.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
