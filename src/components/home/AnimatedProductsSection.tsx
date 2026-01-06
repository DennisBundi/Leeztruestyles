"use client";

import AnimatedProductCard from "./AnimatedProductCard";
import type { Product } from "@/types";

interface AnimatedProductsSectionProps {
  products: (Product & {
    available_stock?: number;
    sale_price?: number;
    discount_percent?: number;
    is_flash_sale?: boolean;
    flash_sale_end_date?: Date;
  })[];
}

export default function AnimatedProductsSection({ products }: AnimatedProductsSectionProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <div className="mt-16">
      <h3 className="text-2xl md:text-3xl font-semibold mb-8 text-white/90">
        Latest Arrivals
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {products.slice(0, 3).map((product, index) => (
          <AnimatedProductCard
            key={product.id}
            product={product}
            delay={index * 0.15}
          />
        ))}
      </div>
    </div>
  );
}

