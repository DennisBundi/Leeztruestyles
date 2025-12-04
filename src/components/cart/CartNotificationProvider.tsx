"use client";

import { useEffect, useState, useRef } from "react";
import { useCartStore } from "@/store/cartStore";
import CartNotification from "./CartNotification";
import type { Product, CartItem } from "@/types";

export default function CartNotificationProvider() {
  const items = useCartStore((state) => state.items);
  const prevItemsRef = useRef<CartItem[]>([]);
  const [notification, setNotification] = useState<{
    product: Product | null;
    quantity: number;
  } | null>(null);

  useEffect(() => {
    const prevItems = prevItemsRef.current;
    
    // Check if a new item was added
    if (items.length > prevItems.length) {
      const newItem = items[items.length - 1];
      setNotification({
        product: newItem.product,
        quantity: newItem.quantity,
      });

      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);

      prevItemsRef.current = items;
      return () => clearTimeout(timer);
    } 
    // Check if quantity was increased for an existing item
    else if (items.length === prevItems.length && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const currentItem = items[i];
        const prevItem = prevItems[i];
        
        if (
          prevItem &&
          currentItem.product.id === prevItem.product.id &&
          currentItem.quantity > prevItem.quantity
        ) {
          setNotification({
            product: currentItem.product,
            quantity: currentItem.quantity,
          });

          const timer = setTimeout(() => {
            setNotification(null);
          }, 5000);

          prevItemsRef.current = items;
          return () => clearTimeout(timer);
        }
      }
    }

    prevItemsRef.current = items;
  }, [items]);

  if (!notification) return null;

  return (
    <CartNotification
      product={notification.product}
      quantity={notification.quantity}
      onClose={() => setNotification(null)}
    />
  );
}

