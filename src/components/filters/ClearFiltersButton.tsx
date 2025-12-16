'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export default function ClearFiltersButton() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hasFilters = 
    searchParams.get('q') ||
    searchParams.get('category') ||
    searchParams.get('minPrice') ||
    searchParams.get('maxPrice') ||
    searchParams.get('color');

  if (!hasFilters) {
    return null;
  }

  const handleClear = () => {
    router.push('/products');
  };

  return (
    <button
      onClick={handleClear}
      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-none hover:bg-gray-200 transition-all font-medium text-sm flex items-center gap-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
      Clear All Filters
    </button>
  );
}

