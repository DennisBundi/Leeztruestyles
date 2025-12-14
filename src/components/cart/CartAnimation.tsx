'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface CartAnimationProps {
  productImage: string;
  productName: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  onComplete: () => void;
}

export default function CartAnimation({
  productImage,
  productName,
  fromX,
  fromY,
  toX,
  toY,
  onComplete,
}: CartAnimationProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Trigger animation on mount
    requestAnimationFrame(() => {
      setIsAnimating(true);
    });

    // Complete animation after duration
    const timer = setTimeout(() => {
      onComplete();
    }, 700); // Match CSS animation duration

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Calculate the distance and angle for the animation
  const deltaX = toX - fromX;
  const deltaY = toY - fromY;

  return (
    <div
      className="fixed pointer-events-none z-[100]"
      style={{
        left: `${fromX}px`,
        top: `${fromY}px`,
        transform: isAnimating
          ? `translate(${deltaX}px, ${deltaY}px) scale(0.8)`
          : 'translate(0, 0) scale(1)',
        opacity: isAnimating ? 0.3 : 1,
        transition: 'transform 700ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 700ms ease-out',
      }}
    >
      <div className="w-[60px] h-[60px] rounded-full overflow-hidden border-2 border-white shadow-lg bg-white">
        {productImage ? (
          <Image
            src={productImage}
            alt={productName}
            width={60}
            height={60}
            className="object-cover w-full h-full"
            unoptimized={productImage?.includes('unsplash.com') || productImage?.includes('unsplash')}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <svg
              className="w-8 h-8 text-gray-400"
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
      </div>
    </div>
  );
}

