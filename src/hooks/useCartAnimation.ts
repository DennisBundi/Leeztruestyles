import { useCallback } from 'react';

interface AnimationData {
  productImage: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  id: string;
}

export type CartTargetType = 'floating' | 'pos';

export interface UseCartAnimationReturn {
  calculatePositions: (sourceElement: HTMLElement, targetType?: CartTargetType, targetSelector?: string) => AnimationData | null;
}

export function useCartAnimation(): UseCartAnimationReturn {
  const calculatePositions = useCallback((
    sourceElement: HTMLElement, 
    targetType: CartTargetType = 'floating',
    targetSelector?: string
  ): AnimationData | null => {
    if (typeof window === 'undefined') return null;

    // Get source position (button center)
    const buttonRect = sourceElement.getBoundingClientRect();
    const fromX = buttonRect.left + buttonRect.width / 2;
    const fromY = buttonRect.top + buttonRect.height / 2;

    let toX: number;
    let toY: number;

    if (targetType === 'pos' && targetSelector) {
      // For POS cart, find the cart element by selector
      const cartElement = document.querySelector(targetSelector) as HTMLElement;
      if (!cartElement) {
        // Fallback: try to find by data attribute
        const fallbackCart = document.querySelector('[data-pos-cart]') as HTMLElement;
        if (fallbackCart) {
          const cartRect = fallbackCart.getBoundingClientRect();
          toX = cartRect.left + cartRect.width / 2;
          toY = cartRect.top + cartRect.height / 2;
        } else {
          return null;
        }
      } else {
        const cartRect = cartElement.getBoundingClientRect();
        toX = cartRect.left + cartRect.width / 2;
        toY = cartRect.top + cartRect.height / 2;
      }
    } else {
      // Default: floating cart button (marketplace)
      // Cart button is at: fixed bottom-6 left-6 (24px from edges)
      // Button size: p-4 (16px padding) + icon (24px) = ~56px total
      const cartButtonSize = 56; // Approximate size of the cart button
      const cartButtonPadding = 24; // bottom-6 = 24px, left-6 = 24px
      toX = cartButtonPadding + cartButtonSize / 2;
      toY = window.innerHeight - cartButtonPadding - cartButtonSize / 2;
    }

    // Generate unique ID for this animation
    const id = `cart-animation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      productImage: '', // Will be set by the component
      fromX,
      fromY,
      toX,
      toY,
      id,
    };
  }, []);

  return {
    calculatePositions,
  };
}

