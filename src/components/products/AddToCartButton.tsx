'use client';

import { useCartStore } from '@/store/cartStore';
import type { Product } from '@/types';
import { useState } from 'react';

interface AddToCartButtonProps {
  product: Product;
  availableStock?: number;
  selectedColor?: string | null;
  selectedSize?: string | null;
}

export default function AddToCartButton({
  product,
  availableStock,
  selectedColor,
  selectedSize,
}: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  // If availableStock is undefined, treat as in stock (inventory not set up yet)
  // If it's 0 or less, then it's out of stock
  const isOutOfStock = availableStock !== undefined && availableStock <= 0;
  const maxQuantity = availableStock !== undefined ? Math.min(availableStock, 10) : 10;

  // Calculate display price (use sale_price if available and on flash sale)
  const isOnSale = product.is_flash_sale && product.sale_price !== null && product.sale_price !== undefined;
  const displayPrice = isOnSale && product.sale_price ? product.sale_price : product.price;

  const handleAddToCart = () => {
    if (isOutOfStock || quantity > maxQuantity) return;

    // Create product with sale price for cart if on sale
    const productForCart = {
      ...product,
      price: displayPrice, // Use sale price if on sale
    };

    addItem(productForCart, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Selected Options Display */}
      {(selectedColor || selectedSize) && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-gray-700">Selected Options:</p>
          <div className="flex flex-wrap gap-2">
            {selectedColor && (
              <span className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700">
                Color: {selectedColor}
              </span>
            )}
            {selectedSize && (
              <span className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700">
                Size: {selectedSize}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <label className="font-semibold text-gray-900">Quantity:</label>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
            className="w-10 h-10 rounded-none border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:border-primary transition-all font-semibold text-gray-600"
          >
            −
          </button>
          <input
            type="number"
            min="1"
            max={maxQuantity}
            value={quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 1;
              setQuantity(Math.min(maxQuantity, Math.max(1, val)));
            }}
            className="w-20 text-center border-0 bg-transparent font-semibold text-gray-900 focus:outline-none"
          />
          <button
            onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
            disabled={quantity >= maxQuantity}
            className="w-10 h-10 rounded-none border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:border-primary transition-all font-semibold text-gray-600"
          >
            +
          </button>
        </div>
      </div>

      <button
        onClick={handleAddToCart}
        disabled={isOutOfStock || quantity > maxQuantity}
        className={`w-full py-4 px-6 rounded-none font-semibold text-lg transition-all ${
          isOutOfStock || quantity > maxQuantity
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : added
            ? 'bg-green-600 text-white shadow-lg'
            : 'bg-primary text-white hover:bg-primary-dark hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
        }`}
      >
        {added
          ? '✓ Added to Cart!'
          : isOutOfStock
          ? 'Out of Stock'
          : `Add to Cart - KES ${((displayPrice || 0) * quantity).toLocaleString()}`}
      </button>
    </div>
  );
}

