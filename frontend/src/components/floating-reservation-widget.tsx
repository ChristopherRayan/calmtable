// Floating quick-action widget linking users to reservation flow.
'use client';

import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';

export function FloatingReservationWidget() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="fixed bottom-5 right-5 z-40"
    >
      <Link
        href="/book"
        aria-label="Open reservation page"
        className="inline-flex items-center gap-2 rounded-full bg-tableBrown px-4 py-3 text-sm font-semibold text-white shadow-soft hover:bg-tableBrownLight"
      >
        <CalendarDays size={18} />
        Book a Table
      </Link>
    </motion.div>
  );
}
