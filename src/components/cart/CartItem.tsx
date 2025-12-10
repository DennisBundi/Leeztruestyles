'use client';

import Image from 'next/image';
import { useCartStore } from '@/store/cartStore';
import type { CartItem as CartItemType } from '@/types';

interface CartItemProps {
  item: CartItemType;
}

export default function CartItem({ item }: CartItemProps) {
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);

  return (
    <div className="flex gap-4 p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-all animate-fade-in">
      <div className="relative w-24 h-24 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden flex-shrink-0">
        {item.product.images && item.product.images.length > 0 ? (
          <Image
            src={item.product.images[0]}
            alt={item.product.name}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold mb-1 text-gray-900 truncate">{item.product.name}</h3>
              <div className="text-sm mb-3">
                {(item.product as any).is_flash_sale && (item.product as any).sale_price ? (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900 font-semibold">
                      KES {((item.product as any).sale_price || 0).toLocaleString()}
                    </span>
                    <span className="text-gray-400 line-through">
                      KES {(item.product.price || 0).toLocaleString()}
                    </span>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                      SALE
                    </span>
                  </div>
                ) : (
                  <p className="text-gray-500">
                    KES {(item.product.price || 0).toLocaleString()} each
                  </p>
                )}
              </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
            <button
              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
              className="w-8 h-8 rounded-none border border-gray-200 hover:bg-white hover:border-primary transition-colors flex items-center justify-center font-semibold text-gray-600"
            >
              −
            </button>
            <span className="w-8 text-center font-semibold text-gray-900">{item.quantity}</span>
            <button
              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
              className="w-8 h-8 rounded-none border border-gray-200 hover:bg-white hover:border-primary transition-colors flex items-center justify-center font-semibold text-gray-600"
            >
              +
            </button>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-bold text-lg text-primary">
              KES {(() => {
                const product = item.product as any;
                const price = product.sale_price && product.is_flash_sale 
                  ? product.sale_price 
                  : product.price;
                return ((price || 0) * item.quantity).toLocaleString();
              })()}
            </span>
            <button
              onClick={() => {
                if (confirm('Remove this item from cart?')) {
                  removeItem(item.product.id);
                }
              }}
              className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-none transition-all group flex items-center gap-2 font-medium text-sm"
              aria-label="Remove item"
              title="Remove from cart"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="hidden sm:inline">Remove</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

