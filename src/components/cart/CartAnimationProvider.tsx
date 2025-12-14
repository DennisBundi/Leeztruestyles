'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import CartAnimation from './CartAnimation';
import { useCartAnimation } from '@/hooks/useCartAnimation';
import type { Product } from '@/types';

interface AnimationState {
  id: string;
  productImage: string;
  productName: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

interface CartAnimationContextType {
  triggerAnimation: (product: Product, sourceElement: HTMLElement, targetType?: 'floating' | 'pos', targetSelector?: string) => void;
}

const CartAnimationContext = createContext<CartAnimationContextType | undefined>(undefined);

export function useCartAnimationContext() {
  const context = useContext(CartAnimationContext);
  if (!context) {
    throw new Error('useCartAnimationContext must be used within CartAnimationProvider');
  }
  return context;
}

interface CartAnimationProviderProps {
  children: ReactNode;
}

export default function CartAnimationProvider({ children }: CartAnimationProviderProps) {
  const [animations, setAnimations] = useState<AnimationState[]>([]);
  const { calculatePositions } = useCartAnimation();

  const triggerAnimation = useCallback(
    (product: Product, sourceElement: HTMLElement, targetType: 'floating' | 'pos' = 'floating', targetSelector?: string) => {
      const positions = calculatePositions(sourceElement, targetType, targetSelector);
      if (!positions) return;

      // Get product image (first image or placeholder)
      const productImage = product.images && product.images.length > 0 
        ? product.images[0] 
        : '';

      const animation: AnimationState = {
        id: positions.id,
        productImage,
        productName: product.name,
        fromX: positions.fromX,
        fromY: positions.fromY,
        toX: positions.toX,
        toY: positions.toY,
      };

      setAnimations((prev) => [...prev, animation]);
    },
    [calculatePositions]
  );

  const removeAnimation = useCallback((id: string) => {
    setAnimations((prev) => prev.filter((anim) => anim.id !== id));
  }, []);

  return (
    <CartAnimationContext.Provider value={{ triggerAnimation }}>
      {children}
      {animations.map((animation) => (
        <CartAnimation
          key={animation.id}
          productImage={animation.productImage}
          productName={animation.productName}
          fromX={animation.fromX}
          fromY={animation.fromY}
          toX={animation.toX}
          toY={animation.toY}
          onComplete={() => removeAnimation(animation.id)}
        />
      ))}
    </CartAnimationContext.Provider>
  );
}

