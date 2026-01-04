'use client';

import { useCartStore } from '@/store/cartStore';
import type { Product } from '@/types';
import { useState } from 'react';
import { useCartAnimationContext } from '@/components/cart/CartAnimationProvider';

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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/a6b56f29-184e-4c99-a482-c4f03762c624',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AddToCartButton.tsx:15',message:'Component render start',data:{productId:product.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  const addItem = useCartStore((state) => state.addItem);
  const items = useCartStore((state) => state.items);
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/a6b56f29-184e-4c99-a482-c4f03762c624',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AddToCartButton.tsx:22',message:'Cart store hooks initialized',data:{itemsCount:items.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  
  // Safely get animation context - don't fail if not available
  let triggerAnimation: ((product: Product, sourceElement: HTMLElement) => void) | null = null;
  try {
    const context = useCartAnimationContext();
    triggerAnimation = context.triggerAnimation;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a6b56f29-184e-4c99-a482-c4f03762c624',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AddToCartButton.tsx:30',message:'Animation context obtained',data:{hasTriggerAnimation:!!triggerAnimation},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  } catch (error) {
    // Animation context not available, but we can still add to cart
    console.warn('CartAnimationContext not available, animation will be skipped');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a6b56f29-184e-4c99-a482-c4f03762c624',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AddToCartButton.tsx:36',message:'Animation context error',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
  }
  
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  // Get current quantity in cart for this product (with same size/color)
  const currentCartItem = items.find(
    (item) =>
      item.product.id === product.id &&
      item.size === selectedSize &&
      item.color === selectedColor
  );
  const currentCartQuantity = currentCartItem ? currentCartItem.quantity : 0;

  // Calculate available stock (consider size-specific stock if size is selected)
  let stockLimit: number | undefined = availableStock;
  const productSizes = (product as any).sizes;
  if (selectedSize && productSizes && Array.isArray(productSizes)) {
    const sizeOption = productSizes.find((s: any) => s.size === selectedSize);
    if (sizeOption && sizeOption.available !== undefined) {
      stockLimit = sizeOption.available;
    }
  }

  // If availableStock is undefined, treat as in stock (inventory not set up yet)
  // If it's 0 or less, then it's out of stock
  const isOutOfStock = stockLimit !== undefined && stockLimit <= 0;
  // Max quantity is the available stock minus what's already in cart
  const maxAvailable = stockLimit !== undefined ? stockLimit - currentCartQuantity : 10;
  const maxQuantity = stockLimit !== undefined ? Math.min(maxAvailable, 10) : 10;

  // Calculate display price (use sale_price if available and on flash sale)
  const isOnSale = product.is_flash_sale && product.sale_price !== null && product.sale_price !== undefined;
  const displayPrice = isOnSale && product.sale_price ? product.sale_price : product.price;


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
              const maxAllowed = stockLimit !== undefined 
                ? Math.min(stockLimit - currentCartQuantity, 10)
                : 10;
              setQuantity(Math.min(maxAllowed, Math.max(1, val)));
            }}
            className="w-20 text-center border-0 bg-transparent font-semibold text-gray-900 focus:outline-none"
          />
          <button
            onClick={() => {
              const maxAllowed = stockLimit !== undefined 
                ? Math.min(stockLimit - currentCartQuantity, 10)
                : 10;
              setQuantity(Math.min(maxAllowed, quantity + 1));
            }}
            disabled={quantity >= maxQuantity}
            className="w-10 h-10 rounded-none border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white hover:border-primary transition-all font-semibold text-gray-600"
          >
            +
          </button>
        </div>
      </div>

      <button
        onMouseDown={(e) => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/a6b56f29-184e-4c99-a482-c4f03762c624',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AddToCartButton.tsx:128',message:'Button mousedown event',data:{productId:product.id,disabled:isOutOfStock || quantity > maxQuantity,computedStyle:window.getComputedStyle(e.currentTarget).pointerEvents},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
        }}
        onClick={(e) => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/a6b56f29-184e-4c99-a482-c4f03762c624',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AddToCartButton.tsx:133',message:'Button click event fired',data:{productId:product.id,isOutOfStock,quantity,maxQuantity},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          
          if (isOutOfStock || quantity > maxQuantity) {
            if (stockLimit !== undefined && currentCartQuantity + quantity > stockLimit) {
              alert(
                `Only ${stockLimit} ${stockLimit === 1 ? 'item is' : 'items are'} available for this product. ` +
                `${currentCartQuantity > 0 ? `You already have ${currentCartQuantity} in your cart. ` : ''}` +
                `You cannot add ${quantity} more ${quantity === 1 ? 'item' : 'items'}.`
              );
            }
            return;
          }
          
          // Validate size selection if product has sizes
          const productHasSizes = (product as any).sizes && (product as any).sizes.length > 0;
          if (productHasSizes && !selectedSize) {
            alert('Please select a size before adding to cart');
            return;
          }
          
          try {
            // Create product with sale price for cart if on sale
            const productForCart = {
              ...product,
              price: displayPrice, // Use sale price if on sale
              available_stock: stockLimit, // Pass stock limit for validation
              sizes: productSizes, // Pass sizes for size-based validation
            };

            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/a6b56f29-184e-4c99-a482-c4f03762c624',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AddToCartButton.tsx:157',message:'Before addItem call',data:{productId:product.id,quantity,selectedSize,selectedColor},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
            
            addItem(productForCart, quantity, selectedSize || undefined, selectedColor || undefined);
            
            // #region agent log
            const newItems = useCartStore.getState().items;
            fetch('http://127.0.0.1:7242/ingest/a6b56f29-184e-4c99-a482-c4f03762c624',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AddToCartButton.tsx:162',message:'After addItem call',data:{productId:product.id,newItemsCount:newItems.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
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
            
            setAdded(true);
            setTimeout(() => setAdded(false), 2000);
          } catch (error) {
            // Handle stock validation error from cart store
            if (error instanceof Error) {
              alert(error.message);
            } else {
              alert('Failed to add item to cart. Please try again.');
            }
          }
        }}
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

