// Cart context provider for persistent menu selections and checkout actions.
'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { createOrder } from '@/lib/services';
import type { MenuItem, Order } from '@/lib/types';

const CART_STORAGE_KEY = 'cart_items';

export interface CartItem {
  menu_item_id: number;
  name: string;
  price: string;
  image_url: string;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  totalAmount: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addItem: (item: MenuItem) => void;
  updateQuantity: (menuItemId: number, quantity: number) => void;
  removeItem: (menuItemId: number) => void;
  clearCart: () => void;
  checkout: () => Promise<Order>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      setItems(JSON.parse(raw) as CartItem[]);
    } catch (_error) {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: MenuItem) => {
    if (!item.is_available) {
      return;
    }

    setItems((current) => {
      const existing = current.find((entry) => entry.menu_item_id === item.id);
      if (existing) {
        return current.map((entry) =>
          entry.menu_item_id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry
        );
      }

      return [
        ...current,
        {
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          image_url: item.image_url,
          quantity: 1,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((menuItemId: number) => {
    setItems((current) => current.filter((item) => item.menu_item_id !== menuItemId));
  }, []);

  const updateQuantity = useCallback((menuItemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(menuItemId);
      return;
    }
    setItems((current) =>
      current.map((item) => (item.menu_item_id === menuItemId ? { ...item, quantity } : item))
    );
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const checkout = useCallback(async (): Promise<Order> => {
    const payload = {
      items: items.map((item) => ({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
      })),
    };
    const order = await createOrder(payload);
    clearCart();
    return order;
  }, [clearCart, items]);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );
  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [items]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount,
      totalAmount,
      isOpen,
      setIsOpen,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      checkout,
    }),
    [addItem, checkout, clearCart, isOpen, itemCount, items, removeItem, totalAmount, updateQuantity]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider.');
  }
  return context;
}
