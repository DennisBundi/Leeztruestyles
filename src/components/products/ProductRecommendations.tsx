'use client';

import { useEffect, useState } from 'react';
import ProductCard from '@/components/products/ProductCard';
import type { Product } from '@/types';

interface RecommendationProduct {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  images: string[];
  is_flash_sale: boolean;
  category_id: string | null;
}

function toProduct(r: RecommendationProduct): Product & { sale_price?: number } {
  return {
    id: r.id,
    name: r.name,
    description: null,
    price: r.price,
    sale_price: r.sale_price ?? undefined,
    images: r.images,
    category_id: r.category_id,
    is_flash_sale: r.is_flash_sale,
    created_at: '',
    updated_at: '',
  };
}

interface Props {
  productId: string;
  title?: string;
}

export default function ProductRecommendations({ productId, title = 'You May Also Like' }: Props) {
  const [recommendations, setRecommendations] = useState<RecommendationProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/products/${productId}/recommendations`)
      .then((r) => r.json())
      .then((data) => setRecommendations(data.recommendations ?? []))
      .catch(() => setRecommendations([]))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return (
      <div className="py-8">
        <div className="h-7 w-48 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="flex gap-4 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-48 h-72 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {recommendations.map((r) => (
          <div key={r.id} className="flex-shrink-0 w-56">
            <ProductCard product={toProduct(r)} />
          </div>
        ))}
      </div>
    </div>
  );
}
