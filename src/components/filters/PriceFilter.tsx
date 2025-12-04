'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function PriceFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');

  // Sync state with URL params when they change
  useEffect(() => {
    setMinPrice(searchParams.get('minPrice') || '');
    setMaxPrice(searchParams.get('maxPrice') || '');
  }, [searchParams]);

  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (minPrice) {
      params.set('minPrice', minPrice);
    } else {
      params.delete('minPrice');
    }
    if (maxPrice) {
      params.set('maxPrice', maxPrice);
    } else {
      params.delete('maxPrice');
    }
    params.delete('page'); // Reset to page 1 by removing page param
    router.push(`/products?${params.toString()}`);
  };

  const handleClear = () => {
    setMinPrice('');
    setMaxPrice('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('minPrice');
    params.delete('maxPrice');
    params.delete('page');
    router.push(`/products?${params.toString()}`);
  };

  const hasFilters = minPrice || maxPrice;

  return (
    <div className="flex items-center gap-2">
      <label className="font-medium text-gray-700">Price:</label>
      <div className="flex items-center gap-2 bg-white border-2 border-gray-200 rounded-xl p-1 shadow-sm">
        <input
          type="number"
          placeholder="Min"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleApply();
            }
          }}
          className="w-20 px-3 py-2 border-0 focus:outline-none focus:ring-0 text-sm"
          min="0"
          step="0.01"
        />
        <span className="text-gray-400">-</span>
        <input
          type="number"
          placeholder="Max"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleApply();
            }
          }}
          className="w-20 px-3 py-2 border-0 focus:outline-none focus:ring-0 text-sm"
          min="0"
          step="0.01"
        />
      </div>
      <button
        onClick={handleApply}
        className="px-5 py-2.5 bg-primary text-white rounded-none hover:bg-primary-dark hover:shadow-lg transition-all hover:scale-105 font-semibold"
      >
        Apply
      </button>
      {hasFilters && (
        <button
          onClick={handleClear}
          className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-none hover:bg-gray-300 transition-all font-semibold text-sm"
        >
          Clear
        </button>
      )}
    </div>
  );
}

