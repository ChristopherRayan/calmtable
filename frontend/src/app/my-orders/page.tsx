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
        <Card elevated className="mt-6 text-center text-sm text-tableBrown/80">
          No orders yet. Add dishes from the menu and checkout to place your first order.
        </Card>
      )}

      {!pageLoading && orders.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
          {orders.map((order) => (
            <Card key={order.order_number} elevated className="space-y-4 border border-woodAccent/30 bg-warmGray/95">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-2xl text-tableBrown">#{order.order_number}</h2>
                  <p className="text-xs uppercase tracking-[0.08em] text-muted">
                    {format(parseISO(order.created_at), 'dd MMM yyyy, HH:mm')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-woodAccent/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-tableBrown">
                    {statusLabel(order.status)}
                  </span>
                  <span className="font-heading text-xl text-woodAccent">{formatKwacha(order.total_amount)}</span>
                </div>
              </div>

              <div className="space-y-2">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-woodAccent/15 pb-2 text-sm last:border-b-0"
                  >
                    <span className="text-ink">{item.item_name || item.menu_item_name}</span>
                    <span className="text-muted">x{item.quantity}</span>
                    <span className="font-medium text-tableBrown">{formatKwacha(item.subtotal || item.line_total)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => void onDownloadReceipt(order)}
                  disabled={downloading === order.order_number}
                  aria-label={`Download receipt for order ${order.order_number}`}
                >
                  <Download size={14} />
                  {downloading === order.order_number ? 'Preparing PDF...' : 'Download Receipt'}
                </Button>
              </div>
            </Card>
          ))}
        </motion.div>
      )}
    </div>
  );
}
