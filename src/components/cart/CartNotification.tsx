"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/store/cartStore";
import type { Product } from "@/types";

interface CartNotificationProps {
  product: Product | null;
  quantity: number;
  onClose: () => void;
}

export default function CartNotification({
  product,
  quantity,
  onClose,
}: CartNotificationProps) {
  const getItemCount = useCartStore((state) => state.getItemCount);
  const totalItems = getItemCount();

  if (!product) return null;

  const displayPrice =
    (product as any).sale_price && (product as any).is_flash_sale
      ? (product as any).sale_price
      : product.price;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className="bg-white rounded-none shadow-2xl border-2 border-primary/20 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg">Added to Cart!</h3>
            <p className="text-white/90 text-sm">
              {quantity} {quantity === 1 ? "item" : "items"} added
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-white/80 transition-colors"
            aria-label="Close notification"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Product Info */}
        <div className="p-6">
          <div className="flex gap-4">
            {product.images && product.images.length > 0 && (
              <div className="relative w-20 h-20 bg-gray-100 rounded-none overflow-hidden flex-shrink-0">
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                {product.name}
              </h4>
              <p className="text-sm text-gray-600 mb-2">
                Quantity: {quantity}
              </p>
              <p className="text-lg font-bold text-primary">
                KES {(displayPrice * quantity).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Cart Summary */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600">Cart Total:</span>
              <span className="text-lg font-bold text-gray-900">
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Link
                href="/checkout"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-primary text-white rounded-none font-semibold hover:bg-primary-dark transition-colors text-center"
              >
                Checkout
              </Link>
              <Link
                href="/products"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-none font-semibold hover:bg-gray-200 transition-colors text-center"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

