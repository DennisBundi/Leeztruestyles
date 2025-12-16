'use client';

import Image from 'next/image';
import { useCartStore } from '@/store/cartStore';
import type { CartItem } from '@/types';
import { useState, useEffect } from 'react';
import { PRODUCT_COLORS, getColorHex } from '@/lib/utils/colors';

interface OrderSummaryProps {
  items: CartItem[];
  total: number;
}

interface ProductSizes {
  [productId: string]: Array<{
    size: string;
    available: number;
  }>;
}

export default function OrderSummary({ items, total }: OrderSummaryProps) {
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const updateSize = useCartStore((state) => state.updateSize);
  const updateColor = useCartStore((state) => state.updateColor);
  const [productSizes, setProductSizes] = useState<ProductSizes>({});
  const [loadingSizes, setLoadingSizes] = useState<{ [key: string]: boolean }>({});
  const [productColors, setProductColors] = useState<{ [productId: string]: string[] }>({});

  // Fetch sizes and colors for each product
  useEffect(() => {
    const fetchProductData = async () => {
      const sizesMap: ProductSizes = {};
      const colorsMap: { [productId: string]: string[] } = {};
      
      for (const item of items) {
        // Skip if already loading or loaded
        if (loadingSizes[item.product.id] || (productSizes[item.product.id] && productColors[item.product.id])) {
          continue;
        }

        setLoadingSizes(prev => ({ ...prev, [item.product.id]: true }));

        try {
          // Fetch sizes
          const sizesResponse = await fetch(`/api/products/${item.product.id}/sizes`);
          if (sizesResponse.ok) {
            const sizesData = await sizesResponse.json();
            if (sizesData.sizes && sizesData.sizes.length > 0) {
              sizesMap[item.product.id] = sizesData.sizes.map((s: any) => ({
                size: s.size,
                available: s.available,
              }));
            }
          }

          // Fetch product details to get colors
          const productResponse = await fetch(`/api/products?id=${item.product.id}`);
          if (productResponse.ok) {
            const productData = await productResponse.json();
            if (productData.products && productData.products.length > 0) {
              const product = productData.products[0];
              if (product.colors && Array.isArray(product.colors) && product.colors.length > 0) {
                colorsMap[item.product.id] = product.colors;
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching data for product ${item.product.id}:`, error);
        } finally {
          setLoadingSizes(prev => {
            const newState = { ...prev };
            delete newState[item.product.id];
            return newState;
          });
        }
      }

      if (Object.keys(sizesMap).length > 0) {
        setProductSizes(prev => ({ ...prev, ...sizesMap }));
      }
      if (Object.keys(colorsMap).length > 0) {
        setProductColors(prev => ({ ...prev, ...colorsMap }));
      }
    };

    fetchProductData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]); // Re-fetch if items change
  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100 sticky top-4 animate-slide-up">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Order Summary</h2>

      <div className="space-y-4 mb-6 max-h-96 overflow-y-auto pr-2">
        {items.map((item) => (
          <div key={item.product.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
            <div className="relative w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden flex-shrink-0">
              {item.product.images && item.product.images.length > 0 ? (
                <Image
                  src={item.product.images[0]}
                  alt={item.product.name}
                  fill
                  className="object-cover"
                  sizes="80px"
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
              <div className="font-semibold text-gray-900 truncate">{item.product.name}</div>
              <div className="text-sm mt-1 mb-2">
                {(item.product as any).is_flash_sale && (item.product as any).sale_price ? (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900 font-semibold">
                      KES {((item.product as any).sale_price || 0).toLocaleString()}
                    </span>
                    <span className="text-gray-400 line-through text-xs">
                      KES {(item.product.price || 0).toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-600">
                    KES {(item.product.price || 0).toLocaleString()} each
                  </span>
                )}
              </div>
              
              {/* Size Selection */}
              {productSizes[item.product.id] && productSizes[item.product.id].length > 0 && (
                <div className="mb-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Size <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={item.size || ''}
                    onChange={(e) => updateSize(item.product.id, e.target.value || undefined)}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select Size</option>
                    {productSizes[item.product.id].map((sizeOption) => (
                      <option
                        key={sizeOption.size}
                        value={sizeOption.size}
                        disabled={sizeOption.available <= 0}
                      >
                        {sizeOption.size} {sizeOption.available <= 0 ? '(Out of Stock)' : `(${sizeOption.available} available)`}
                      </option>
                    ))}
                  </select>
                  {!item.size && (
                    <p className="text-xs text-red-600 mt-1">Please select a size</p>
                  )}
                </div>
              )}

              {/* Color Selection */}
              {productColors[item.product.id] && productColors[item.product.id].length > 0 && (
                <div className="mb-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {productColors[item.product.id].map((color) => {
                      const isSelected = item.color === color;
                      const colorHex = getColorHex(color);
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => updateColor(item.product.id, isSelected ? undefined : color)}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border-2 text-xs font-medium transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div
                            className="w-4 h-4 rounded-full border border-gray-300 shadow-sm"
                            style={{ backgroundColor: colorHex }}
                            title={color}
                          />
                          <span>{color}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Quantity Controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="w-7 h-7 rounded-none border border-gray-200 hover:bg-gray-50 hover:border-primary transition-colors flex items-center justify-center font-semibold text-gray-600 text-sm"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-semibold text-gray-900 text-sm">{item.quantity}</span>
                  <button
                    onClick={() => {
                      try {
                        updateQuantity(item.product.id, item.quantity + 1);
                      } catch (error) {
                        if (error instanceof Error) {
                          alert(error.message);
                        } else {
                          alert('Failed to update quantity. Please try again.');
                        }
                      }
                    }}
                    className="w-7 h-7 rounded-none border border-gray-200 hover:bg-gray-50 hover:border-primary transition-colors flex items-center justify-center font-semibold text-gray-600 text-sm"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end justify-between">
            <div className="font-bold text-primary text-lg">
              KES {(() => {
                const product = item.product as any;
                const price = product.sale_price && product.is_flash_sale 
                  ? product.sale_price 
                  : product.price;
                return ((price || 0) * item.quantity).toLocaleString();
              })()}
            </div>
              <button
                onClick={() => {
                  if (confirm(`Remove ${item.product.name} from cart?`)) {
                    removeItem(item.product.id);
                  }
                }}
                className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-none transition-all group-hover:opacity-100 opacity-0 flex items-center gap-1 text-xs font-medium"
                aria-label="Remove item"
                title="Remove from cart"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="hidden sm:inline">Remove</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t-2 border-gray-200 pt-6 space-y-3">
        <div className="flex justify-between text-gray-700">
          <span className="font-medium">Subtotal</span>
          <span className="font-semibold">KES {(total || 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-gray-700">
          <span className="font-medium">Shipping</span>
          <span className="font-semibold text-green-600">Free</span>
        </div>
        <div className="border-t-2 border-primary pt-3 flex justify-between text-xl font-bold text-gray-900">
          <span>Total</span>
          <span className="text-primary">KES {(total || 0).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

