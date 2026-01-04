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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/a6b56f29-184e-4c99-a482-c4f03762c624',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProductCard.tsx:21',message:'Component render start',data:{productId:product.id,productName:product.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  const addItem = useCartStore((state) => state.addItem);
  const items = useCartStore((state) => state.items);
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/a6b56f29-184e-4c99-a482-c4f03762c624',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProductCard.tsx:25',message:'Cart store hooks initialized',data:{itemsCount:items.length,addItemExists:!!addItem},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
  // Safely get animation context - don't fail if not available
  let triggerAnimation: ((product: Product, sourceElement: HTMLElement) => void) | null = null;
  try {
    const context = useCartAnimationContext();
    triggerAnimation = context.triggerAnimation;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a6b56f29-184e-4c99-a482-c4f03762c624',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProductCard.tsx:32',message:'Animation context obtained',data:{hasTriggerAnimation:!!triggerAnimation},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  } catch (error) {
    // Animation context not available, but we can still add to cart
    console.warn('CartAnimationContext not available, animation will be skipped');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a6b56f29-184e-4c99-a482-c4f03762c624',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProductCard.tsx:37',message:'Animation context error',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  }
  
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [availableSizes, setAvailableSizes] = useState<Array<{ size: string; available: number }>>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Check if button exists in DOM after mount
  useEffect(() => {
    // #region agent log
    const button = document.querySelector(`[data-product-card-id="${product.id}"]`) as HTMLButtonElement;
    fetch('http://127.0.0.1:7242/ingest/a6b56f29-184e-4c99-a482-c4f03762c624',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProductCard.tsx:38',message:'useEffect - Button DOM check',data:{productId:product.id,buttonExists:!!button,buttonRefExists:!!buttonRef.current,buttonDisabled:button?.disabled,buttonPointerEvents:button?window.getComputedStyle(button).pointerEvents:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
  }, [product.id]);
  
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a6b56f29-184e-4c99-a482-c4f03762c624',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProductCard.tsx:47',message:'Button click event fired',data:{productId:product.id,eventType:e.type,buttonId:e.currentTarget.getAttribute('data-product-card-id')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/a6b56f29-184e-4c99-a482-c4f03762c624',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProductCard.tsx:104',message:'Before addItem call',data:{productId:product.id,availableStock,displayPrice},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        
        const productForCart = {
          ...product,
          price: displayPrice,
          available_stock: availableStock,
        };
        addItem(productForCart);
        
        // #region agent log
        const newItems = useCartStore.getState().items;
        fetch('http://127.0.0.1:7242/ingest/a6b56f29-184e-4c99-a482-c4f03762c624',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProductCard.tsx:112',message:'After addItem call',data:{productId:product.id,newItemsCount:newItems.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        
        // Trigger cart animation if available
        try {
          if (triggerAnimation) {
            const button = e.currentTarget;
            triggerAnimation(productForCart, button);
          }
        } catch (animError) {
          // Animation failed but item was added - continue
          console.warn('Animation failed:', animError);
        }
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
      
      // Trigger cart animation if available
      try {
        if (triggerAnimation) {
          const button = document.querySelector(`[data-product-card-id="${product.id}"]`) as HTMLElement;
          if (button) {
            triggerAnimation(productForCart, button);
          }
        }
      } catch (animError) {
        // Animation failed but item was added - continue
        console.warn('Animation failed:', animError);
      }
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('Failed to add item to cart. Please try again.');
      }
    }
  };

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/a6b56f29-184e-4c99-a482-c4f03762c624',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProductCard.tsx:217',message:'Component render - returning JSX',data:{productId:product.id,isOutOfStock,showOptionsModal},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
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
          data-product-card-id={product.id}
          ref={(el) => {
            buttonRef.current = el;
            // #region agent log
            try {
              fetch('http://127.0.0.1:7242/ingest/a6b56f29-184e-4c99-a482-c4f03762c624',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProductCard.tsx:324',message:'Button ref callback called',data:{productId:product.id,elExists:!!el,isOutOfStock},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            } catch (e) {
              console.error('Ref callback log error:', e);
            }
            // #endregion
            if (el) {
              // #region agent log
              try {
                const rect = el.getBoundingClientRect();
                const computed = window.getComputedStyle(el);
                const elementAtPoint = document.elementFromPoint(rect.left + rect.width/2, rect.top + rect.height/2);
                fetch('http://127.0.0.1:7242/ingest/a6b56f29-184e-4c99-a482-c4f03762c624',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProductCard.tsx:332',message:'Button ref callback - DOM state check',data:{productId:product.id,disabled:isOutOfStock,pointerEvents:computed.pointerEvents,zIndex:computed.zIndex,position:computed.position,visibility:computed.visibility,opacity:computed.opacity,elementAtPoint:elementAtPoint?.tagName,elementAtPointId:elementAtPoint?.id,buttonRect:{left:rect.left,top:rect.top,width:rect.width,height:rect.height}},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
              } catch (e) {
                console.error('Ref callback DOM check error:', e);
              }
              // #endregion
            }
          }}
          onClick={(e) => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/a6b56f29-184e-4c99-a482-c4f03762c624',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProductCard.tsx:328',message:'Button onClick handler called directly',data:{productId:product.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            handleAddToCartClick(e);
          }}
          onMouseDown={(e) => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/a6b56f29-184e-4c99-a482-c4f03762c624',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProductCard.tsx:295',message:'Button mousedown event',data:{productId:product.id,disabled:isOutOfStock,computedStyle:window.getComputedStyle(e.currentTarget).pointerEvents},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
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
    </>
  );
}
