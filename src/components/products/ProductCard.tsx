"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types";
import { useCartStore } from "@/store/cartStore";
import { useCartAnimationContext } from "@/components/cart/CartAnimationProvider";
import ProductOptionsModal from "./ProductOptionsModal";

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
  const items = useCartStore((state) => state.items);
  const { triggerAnimation } = useCartAnimationContext();
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [availableSizes, setAvailableSizes] = useState<Array<{ size: string; available: number }>>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get all product images
  const productImages = product.images && Array.isArray(product.images) 
    ? product.images.filter((img: any) => img && typeof img === 'string' && img.trim() !== '')
    : product.image 
    ? [product.image]
    : product.image_url
    ? [product.image_url]
    : [];

  // Handle image cycling on hover
  useEffect(() => {
    if (isHovered && productImages.length > 1) {
      // Start cycling through images
      intervalRef.current = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % productImages.length);
      }, 2000); // Change image every 2 seconds
    } else {
      // Stop cycling and reset to first image
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setCurrentImageIndex(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isHovered, productImages.length]);
  
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

  const handleAddToCartClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get product colors
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
      setShowOptionsModal(true);
    } else {
      // No sizes/colors, add directly to cart
      // Check inventory before adding
      const currentCartItem = items.find(
        (item) =>
          item.product.id === product.id &&
          !item.size &&
          !item.color
      );
      const currentCartQuantity = currentCartItem ? currentCartItem.quantity : 0;
      const availableStock = product.available_stock;
      
      if (availableStock !== undefined && currentCartQuantity + 1 > availableStock) {
        alert(
          `Only ${availableStock} ${availableStock === 1 ? 'item is' : 'items are'} available for this product. ` +
          `${currentCartQuantity > 0 ? `You already have ${currentCartQuantity} in your cart. ` : ''}` +
          `You cannot add more items.`
        );
        return;
      }
      
      try {
        const productForCart = {
          ...product,
          price: displayPrice,
          available_stock: availableStock,
        };
        addItem(productForCart);
        
        // Trigger cart animation
        const button = e.currentTarget;
        triggerAnimation(productForCart, button);
      } catch (error) {
        if (error instanceof Error) {
          alert(error.message);
        } else {
          alert('Failed to add item to cart. Please try again.');
        }
      }
    }
  };

  const handleOptionsConfirm = (size?: string, color?: string) => {
    // Check inventory before adding
    const currentCartItem = items.find(
      (item) =>
        item.product.id === product.id &&
        item.size === size &&
        item.color === color
    );
    const currentCartQuantity = currentCartItem ? currentCartItem.quantity : 0;
    
    // Calculate available stock (consider size-specific stock if size is selected)
    let stockLimit: number | undefined = product.available_stock;
    if (size && availableSizes.length > 0) {
      const sizeOption = availableSizes.find((s) => s.size === size);
      if (sizeOption && sizeOption.available !== undefined) {
        stockLimit = sizeOption.available;
      }
    }
    
    if (stockLimit !== undefined && currentCartQuantity + 1 > stockLimit) {
      alert(
        `Only ${stockLimit} ${stockLimit === 1 ? 'item is' : 'items are'} available for this product. ` +
        `${currentCartQuantity > 0 ? `You already have ${currentCartQuantity} in your cart. ` : ''}` +
        `You cannot add more items.`
      );
      return;
    }
    
    try {
      const productForCart = {
        ...product,
        price: displayPrice,
        available_stock: stockLimit,
        sizes: availableSizes,
      };
      addItem(productForCart, 1, size, color);
      
      // Trigger cart animation - find the button
      const button = document.querySelector(`[data-product-card-id="${product.id}"]`) as HTMLElement;
      if (button) {
        triggerAnimation(productForCart, button);
      }
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('Failed to add item to cart. Please try again.');
      }
    }
  };

  return (
    <>
      <ProductOptionsModal
        isOpen={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        onConfirm={handleOptionsConfirm}
        product={product}
        availableSizes={availableSizes}
        availableColors={(product as any)?.colors || []}
      />
      <div className="group relative bg-white rounded-none shadow-sm overflow-hidden hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-primary/20 animate-fade-in">
      {/* Flash Sale Badge */}
      {isOnSale && (
        <div className="absolute top-4 left-4 z-20 bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg animate-pulse">
          {product.discount_percent}% OFF
        </div>
      )}

      <Link href={`/products/${product.id}`}>
        <div 
          className="aspect-square relative bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {productImages.length > 0 ? (
            <div className="relative w-full h-full overflow-hidden">
              <div 
                className="flex h-full transition-transform duration-700 ease-in-out"
                style={{
                  transform: `translateX(-${currentImageIndex * 100}%)`,
                  width: `${productImages.length * 100}%`
                }}
              >
                {productImages.map((image, index) => (
                  <div key={index} className="relative flex-shrink-0 w-full h-full" style={{ width: `${100 / productImages.length}%` }}>
                    <Image
                      src={image}
                      alt={`${product.name} - Image ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      unoptimized={
                        image?.includes("unsplash.com") ||
                        image?.includes("unsplash")
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
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
          data-product-card-id={product.id}
          onClick={handleAddToCartClick}
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
    </>
  );
}
