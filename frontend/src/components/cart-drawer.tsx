// Sliding cart drawer with persistent items and order checkout action.
'use client';

import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/button';
import { useCart } from '@/components/cart-provider';
import { formatKwacha } from '@/lib/currency';

export function CartDrawer() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { items, isOpen, setIsOpen, itemCount, totalAmount, removeItem, updateQuantity, checkout } = useCart();
  const [submitting, setSubmitting] = useState(false);

  async function handleCheckout() {
    if (items.length === 0) {
      toast.error('Your cart is empty.');
      return;
    }

    if (!isAuthenticated) {
      setIsOpen(false);
      toast.error('Please sign in as a customer to checkout.');
      router.push('/login?next=/menu');
      return;
    }

    if (user?.is_staff) {
      toast.error('Staff accounts cannot checkout. Use a customer account.');
      return;
    }

    try {
      setSubmitting(true);
      const order = await checkout();
      setIsOpen(false);
      toast.success(`Order #${order.order_number} placed successfully.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create order.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            aria-label="Close cart overlay"
            className="fixed inset-0 z-[70] bg-black/35"
            onClick={() => setIsOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.aside
            className="fixed right-0 top-0 z-[80] flex h-screen w-full max-w-md flex-col border-l border-woodAccent/40 bg-cream shadow-2xl"
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            aria-label="Shopping cart drawer"
          >
            <div className="flex items-center justify-between border-b border-woodAccent/40 px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag size={18} className="text-tableBrown" />
                <h2 className="font-heading text-2xl text-tableBrown">Your Cart</h2>
                <span className="rounded-full bg-warmGray px-2 py-0.5 text-xs font-semibold text-tableBrown">{itemCount}</span>
              </div>
              <button
                type="button"
                aria-label="Close cart"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-woodAccent text-tableBrown"
                onClick={() => setIsOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {!isAuthenticated && (
                <div className="rounded-2xl border border-woodAccent/40 bg-warmGray p-4 text-center text-sm text-tableBrown/80">
                  <p>Sign in as a customer to checkout.</p>
                  <Link
                    href="/login?next=/menu"
                    className="mt-3 inline-flex rounded-full bg-tableBrown px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-tableBrownLight"
                  >
                    Sign In
                  </Link>
                </div>
              )}
              {isAuthenticated && user?.is_staff && (
                <div className="rounded-2xl border border-woodAccent/40 bg-warmGray p-4 text-center text-sm text-tableBrown/80">
                  Staff accounts can view the cart but cannot checkout.
                </div>
              )}
              {items.length === 0 && (
                <div className="rounded-2xl border border-woodAccent/40 bg-warmGray p-4 text-center text-sm text-tableBrown/80">
                  Your cart is empty. Add dishes from the menu.
                </div>
              )}

              {items.map((item) => (
                <div key={item.menu_item_id} className="rounded-2xl border border-woodAccent/40 bg-warmGray p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-tableBrown">{item.name}</p>
                      <p className="text-xs text-tableBrown/80">{formatKwacha(item.price)} each</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${item.name} from cart`}
                      className="text-tableBrown/70 hover:text-[#E07065]"
                      onClick={() => removeItem(item.menu_item_id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 rounded-full border border-woodAccent bg-warmGray px-2 py-1">
                      <button
                        type="button"
                        aria-label={`Decrease quantity for ${item.name}`}
                        onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="min-w-6 text-center text-sm font-semibold text-tableBrown">{item.quantity}</span>
                      <button
                        type="button"
                        aria-label={`Increase quantity for ${item.name}`}
                        onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-tableBrown">{formatKwacha(Number(item.price) * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-woodAccent/40 bg-warmGray/70 px-5 py-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-tableBrown/80">Total</span>
                <span className="font-semibold text-tableBrown">{formatKwacha(totalAmount)}</span>
              </div>
              <Button
                className="w-full"
                onClick={handleCheckout}
                disabled={submitting || items.length === 0 || !isAuthenticated || Boolean(user?.is_staff)}
                aria-label="Proceed to checkout"
              >
                {submitting ? 'Processing...' : 'Checkout'}
              </Button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
