'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useCartStore } from '@/store/cartStore';
import type { Product } from '@/types';
import { useCartAnimationContext } from '@/components/cart/CartAnimationProvider';
import ProductSizeColorModal from './ProductSizeColorModal';

interface POSProductGridProps {
  products: (Product & { available_stock?: number })[];
}

export default function POSProductGrid({ products }: POSProductGridProps) {
  const addItem = useCartStore((state) => state.addItem);
  const { triggerAnimation } = useCartAnimationContext();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showSizeColorModal, setShowSizeColorModal] = useState(false);
  const [availableSizes, setAvailableSizes] = useState<Array<{ size: string; available: number }>>([]);

  // Filter out products with 0 stock - only show products with stock > 0
  const availableProducts = products.filter((product) => {
    // If available_stock is undefined, treat as in stock (inventory not set up yet)
    // If available_stock is 0 or less, filter it out
    return product.available_stock === undefined || product.available_stock > 0;
  });

  const handleProductClick = async (product: Product, button: HTMLElement) => {
    // Get product colors first
    const productColors = (product as any).colors || [];

    // Fetch available sizes for the product
    let sizesWithStock: Array<{ size: string; available: number }> = [];
    try {
      const response = await fetch(`/api/products/${product.id}/sizes`);
      if (response.ok) {
        const data = await response.json();
        sizesWithStock = (data.sizes || []).filter(
          (s: any) => s.available > 0
        );
        setAvailableSizes(sizesWithStock);
      }
    } catch (error) {
      console.error("Error fetching product sizes:", error);
      setAvailableSizes([]);
    }

    // If product has sizes or colors, show modal; otherwise add directly
    if (sizesWithStock.length > 0 || productColors.length > 0) {
      setSelectedProduct(product);
      setShowSizeColorModal(true);
    } else {
      // No sizes/colors, add directly to cart
      addItem(product, 1);
      triggerAnimation(product, button, 'pos', '[data-pos-cart]');
    }
  };

  const handleSizeColorConfirm = (size?: string, color?: string) => {
    if (selectedProduct) {
      addItem(selectedProduct, 1, size, color);
      // Trigger animation - find the button that was clicked
      const button = document.querySelector(`[data-product-id="${selectedProduct.id}"]`) as HTMLElement;
      if (button) {
        triggerAnimation(selectedProduct, button, 'pos', '[data-pos-cart]');
      }
    }
    setShowSizeColorModal(false);
    setSelectedProduct(null);
  };

  return (
    <>
      <ProductSizeColorModal
        isOpen={showSizeColorModal}
        onClose={() => {
          setShowSizeColorModal(false);
          setSelectedProduct(null);
        }}
        onConfirm={handleSizeColorConfirm}
        product={selectedProduct}
        availableSizes={availableSizes}
        availableColors={(selectedProduct as any)?.colors || []}
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {availableProducts.map((product) => {
          return (
            <button
              key={product.id}
              data-product-id={product.id}
              onClick={(e) => {
                const button = e.currentTarget;
                handleProductClick(product, button);
              }}
              className="group relative bg-white rounded-none shadow-md text-left hover:shadow-xl transition-all border-2 hover:scale-105 cursor-pointer border-transparent hover:border-primary/30 active:scale-95"
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
                product.available_stock === undefined
                  ? 'text-blue-600'
                  : product.available_stock < 10 
                    ? 'text-yellow-600' 
                    : 'text-green-600'
              }`}>
                {product.available_stock === undefined
                  ? 'Stock available'
                  : `${product.available_stock} in stock`}
              </div>
            </div>

            {/* Add Indicator */}
            <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </button>
        );
      })}
    </div>
    </>
  );
}

