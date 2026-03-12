// Authenticated customer page for order history and downloadable PDF receipts.
'use client';

import { format, parseISO } from 'date-fns';
import { Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { SectionHeading } from '@/components/section-heading';
import { SkeletonCard } from '@/components/skeleton-card';
import { fetchOrders, downloadOrderReceipt } from '@/lib/services';
import { formatKwacha } from '@/lib/currency';
import type { Order } from '@/lib/types';

function statusLabel(status: Order['status']) {
  return status.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function MyOrdersPage() {
  const router = useRouter();
  const { isAuthenticated, loading, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login?next=/my-orders');
      return;
    }

    if (!isAuthenticated || user?.is_staff) {
      return;
    }

    async function loadOrders() {
      try {
        setPageLoading(true);
        const data = await fetchOrders();
        setOrders(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to load orders.');
      } finally {
        setPageLoading(false);
      }
    }

    void loadOrders();
  }, [isAuthenticated, loading, router, user?.is_staff]);

  async function onDownloadReceipt(order: Order) {
    try {
      setDownloading(order.order_number);
      const blob = await downloadOrderReceipt(order.order_number);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `CalmTable-Receipt-${order.order_number}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to download receipt.');
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="page-shell py-10">
      <SectionHeading
        eyebrow="Account"
        title="My Orders"
        description="Track all your orders and download branded receipt PDFs anytime."
      />

      {pageLoading && (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      )}

      {!pageLoading && orders.length === 0 && (
        <Card elevated className="mt-6 text-center text-sm text-tableBrown/80 dark:text-white/80">
          No orders yet. Add dishes from the menu and checkout to place your first order.
        </Card>
      )}

      {!pageLoading && orders.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mt-8 space-y-6">
          {orders.map((order) => (
            <Card key={order.order_number} elevated className="group relative overflow-hidden border border-[#8c5c29]/20 bg-warmGray/10 backdrop-blur-sm p-0 shadow-xl transition-all hover:border-[#8c5c29]/40 hover:shadow-2xl dark:bg-white/5">
              {/* Receipt Header Decor */}
              <div className="h-1.5 w-full bg-[#8c5c29] dark:bg-amber-500" />

              <div className="p-6">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8c5c29] dark:text-amber-400">Official Receipt</span>
                      <span className="h-px w-8 bg-[#8c5c29]/30 dark:bg-amber-500/30" />
                    </div>
                    <h2 className="font-heading text-3xl font-bold text-[#8c5c29] dark:text-amber-400">#{order.order_number}</h2>
                    <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.1em] text-ink/40 dark:text-white/40">
                      Placed on {format(parseISO(order.created_at), 'dd MMM yyyy • HH:mm')}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className={`mb-2 inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${order.status === 'completed'
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-amber-500/10 text-amber-500'
                      }`}>
                      {statusLabel(order.status)}
                    </div>
                    <div className="font-heading text-2xl font-bold text-ink/80 dark:text-white/80">{formatKwacha(order.total_amount)}</div>
                  </div>
                </div>

                <div className="space-y-4 border-y border-dashed border-[#8c5c29]/20 py-6 dark:border-white/10">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 text-sm"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-ink/80 dark:text-white/80">{item.item_name || item.menu_item_name}</span>
                        <span className="text-[11px] text-ink/50 dark:text-white/50">Quantity: {item.quantity}</span>
                      </div>
                      <span className="font-heading text-base font-bold text-[#8c5c29] dark:text-amber-400">{formatKwacha(item.subtotal || item.line_total)}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                  <p className="max-w-[180px] text-[10px] uppercase tracking-[0.05em] text-ink/30 dark:text-white/30">
                    Thank you for dining with us. This is a computer generated receipt.
                  </p>
                  <Button
                    type="button"
                    className="rounded-lg bg-[#8c5c29] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-white shadow-lg transition-all hover:bg-[#734a21] hover:shadow-amber-900/20 active:scale-95"
                    onClick={() => void onDownloadReceipt(order)}
                    disabled={downloading === order.order_number}
                  >
                    <Download size={14} className="mr-2" />
                    {downloading === order.order_number ? 'Generating...' : 'Download PDF'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </motion.div>
      )}
    </div>
  );
}
