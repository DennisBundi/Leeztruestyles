"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/products/ProductCard";
import type { Product } from "@/types";

interface AnimatedProductCardProps {
  product: Product & {
    available_stock?: number;
    sale_price?: number;
    discount_percent?: number;
    is_flash_sale?: boolean;
    flash_sale_end_date?: Date;
  };
  delay?: number; // Animation delay in seconds
}

export default function AnimatedProductCard({ product, delay = 0 }: AnimatedProductCardProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay to ensure component is mounted before animation starts
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50 + delay * 1000);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`transform transition-all duration-700 ease-out ${
        isVisible
          ? "translate-x-0 opacity-100"
          : "translate-x-[100%] opacity-0"
      }`}
    >
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <ProductCard product={product} />
      </div>
    </div>
  );
}

