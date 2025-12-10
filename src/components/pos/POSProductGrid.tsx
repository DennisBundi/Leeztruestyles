'use client';

import Image from 'next/image';
import { useCartStore } from '@/store/cartStore';
import type { Product } from '@/types';

interface POSProductGridProps {
  products: (Product & { available_stock?: number })[];
}

export default function POSProductGrid({ products }: POSProductGridProps) {
  const addItem = useCartStore((state) => state.addItem);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => {
        // If available_stock is undefined, treat as in stock (inventory not set up yet)
        const isOutOfStock = product.available_stock !== undefined && product.available_stock <= 0;
        return (
          <button
            key={product.id}
            onClick={() => !isOutOfStock && addItem(product, 1)}
            disabled={isOutOfStock}
            className={`group relative bg-white rounded-none shadow-md text-left hover:shadow-xl transition-all border-2 ${
              isOutOfStock
                ? 'opacity-50 cursor-not-allowed border-gray-200'
                : 'hover:scale-105 cursor-pointer border-transparent hover:border-primary/30 active:scale-95'
            }`}
          >
            {/* Product Image */}
            <div className="aspect-square relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-t-xl overflow-hidden">
              {product.images && product.images.length > 0 ? (
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  unoptimized={product.images[0]?.includes('unsplash.com') || product.images[0]?.includes('unsplash')}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="bg-white/90 text-gray-900 font-semibold px-3 py-1 rounded-full text-xs">
                    Out of Stock
                  </span>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="p-3">
              <div className="font-semibold text-sm mb-1 line-clamp-2 text-gray-900">
                {product.name}
              </div>
              <div className="text-lg font-bold text-primary mb-2">
                KES {(product.price || 0).toLocaleString()}
              </div>
              <div className={`text-xs font-medium ${
                isOutOfStock 
                  ? 'text-red-600' 
                  : product.available_stock === undefined
                    ? 'text-blue-600'
                    : product.available_stock < 10 
                      ? 'text-yellow-600' 
                      : 'text-green-600'
              }`}>
                {isOutOfStock 
                  ? 'Out of Stock' 
                  : product.available_stock === undefined
                    ? 'Stock available'
                    : `${product.available_stock} in stock`}
              </div>
            </div>

            {/* Add Indicator */}
            {!isOutOfStock && (
              <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

