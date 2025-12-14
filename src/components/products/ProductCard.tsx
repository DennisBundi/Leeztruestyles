"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types";
import { useCartStore } from "@/store/cartStore";
import { useCartAnimationContext } from "@/components/cart/CartAnimationProvider";

interface ProductCardProps {
  product: Product & {
    available_stock?: number;
    sale_price?: number;
    discount_percent?: number;
    is_flash_sale?: boolean;
    flash_sale_end_date?: Date;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const { triggerAnimation } = useCartAnimationContext();
  // If available_stock is undefined, treat as in stock (inventory not set up yet)
  // If it's 0 or less, then it's out of stock
  const isOutOfStock =
    product.available_stock !== undefined && product.available_stock <= 0;
  const isOnSale = product.is_flash_sale && product.sale_price !== undefined;
  // Ensure displayPrice is always a number, never null/undefined
  const displayPrice = isOnSale
    ? product.sale_price
      ? Number(product.sale_price)
      : 0
    : product.price
    ? Number(product.price)
    : 0;
  const originalPrice = isOnSale
    ? product.price
      ? Number(product.price)
      : null
    : null;

  return (
    <div className="group relative bg-white rounded-none shadow-sm overflow-hidden hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-primary/20 animate-fade-in">
      {/* Flash Sale Badge */}
      {isOnSale && (
        <div className="absolute top-4 left-4 z-20 bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg animate-pulse">
          {product.discount_percent}% OFF
        </div>
      )}

      <Link href={`/products/${product.id}`}>
        <div className="aspect-square relative bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
          {product.images && product.images.length > 0 ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              unoptimized={
                product.images[0]?.includes("unsplash.com") ||
                product.images[0]?.includes("unsplash")
              }
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <svg
                className="w-16 h-16"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
              <span className="bg-white/90 text-gray-900 font-semibold px-4 py-2 rounded-full text-sm">
                Out of Stock
              </span>
            </div>
          )}
          {/* Quick view overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <span className="bg-white/90 text-primary font-semibold px-4 py-2 rounded-full text-sm transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
              Quick View
            </span>
          </div>
        </div>
      </Link>
      <div className="p-3 sm:p-4 md:p-5">
        <Link href={`/products/${product.id}`}>
          <h3 className="font-semibold text-sm sm:text-base md:text-lg mb-1.5 sm:mb-2 line-clamp-2 hover:text-primary transition-colors text-gray-900">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              <span className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-primary">
                KES {(displayPrice || 0).toLocaleString()}
              </span>
              {originalPrice && (
                <span className="text-xs sm:text-sm text-gray-400 line-through">
                  KES {(originalPrice || 0).toLocaleString()}
                </span>
              )}
            </div>
            {isOnSale && product.discount_percent && (
              <span className="text-xs text-red-600 font-semibold mt-0.5 sm:mt-1">
                Save {product.discount_percent}%
              </span>
            )}
          </div>
          {product.available_stock !== undefined &&
            product.available_stock > 0 && (
              <span className="text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-100 text-green-700 rounded-full font-medium ml-1 sm:ml-2 flex-shrink-0">
                {product.available_stock} left
              </span>
            )}
        </div>
        <button
          onClick={(e) => {
            // Create product with sale price for cart
            const productForCart = {
              ...product,
              price: displayPrice, // Use sale price if on sale
            };
            addItem(productForCart);
            
            // Trigger cart animation
            const button = e.currentTarget;
            triggerAnimation(productForCart, button);
            
            // Visual feedback
            if (button) {
              button.classList.add("animate-scale-in");
              setTimeout(
                () => button.classList.remove("animate-scale-in"),
                200
              );
            }
          }}
          disabled={isOutOfStock}
          className={`w-full py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 rounded-none text-xs sm:text-sm md:text-base font-semibold transition-all duration-200 ${
            isOutOfStock
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : isOnSale
              ? "bg-gradient-to-r from-red-500 to-pink-500 text-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              : "bg-primary text-white hover:bg-primary-dark hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          }`}
        >
          {isOutOfStock ? "Out of Stock" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}
