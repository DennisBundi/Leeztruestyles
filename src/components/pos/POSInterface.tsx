'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { Product } from '@/types';
import POSProductGrid from './POSProductGrid';
import POSCart from './POSCart';

// Dummy products for POS
const dummyProducts = [
  {
    id: '1',
    name: 'Elegant Summer Dress',
    price: 2500,
    images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=200'],
    available_stock: 15,
    category_id: 'cat1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    description: 'Beautiful floral print dress',
  },
  {
    id: '2',
    name: 'Classic Denim Jacket',
    price: 3200,
    images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=200'],
    available_stock: 8,
    category_id: 'cat2',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    description: 'Timeless denim jacket',
  },
  {
    id: '3',
    name: 'Designer Handbag',
    price: 5500,
    images: ['https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=200'],
    available_stock: 5,
    category_id: 'cat3',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    description: 'Luxury handbag',
  },
  {
    id: '4',
    name: 'High-Waisted Jeans',
    price: 2800,
    images: ['https://images.unsplash.com/photo-1542272604-787c3835535d?w=200'],
    available_stock: 12,
    category_id: 'cat4',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    description: 'Comfortable jeans',
  },
  {
    id: '5',
    name: 'Silk Scarf',
    price: 1200,
    images: ['https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=200'],
    available_stock: 20,
    category_id: 'cat5',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    description: 'Elegant silk scarf',
  },
  {
    id: '6',
    name: 'Leather Ankle Boots',
    price: 4200,
    images: ['https://images.unsplash.com/photo-1605812860427-4014434f3048?w=200'],
    available_stock: 7,
    category_id: 'cat6',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    description: 'Stylish ankle boots',
  },
  {
    id: '7',
    name: 'Casual T-Shirt',
    price: 1500,
    images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200'],
    available_stock: 25,
    category_id: 'cat7',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    description: 'Comfortable t-shirt',
  },
  {
    id: '8',
    name: 'Wool Winter Coat',
    price: 6800,
    images: ['https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=200'],
    available_stock: 4,
    category_id: 'cat8',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    description: 'Warm winter coat',
  },
];

interface POSInterfaceProps {
  employeeId?: string;
  employeeCode?: string;
}

export default function POSInterface({ employeeId, employeeCode }: POSInterfaceProps) {
  const [products, setProducts] = useState<(Product & { available_stock?: number })[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    // Use dummy data for preview
    setProducts(dummyProducts);
    setLoading(false);
  }, []);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Selection */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search and Filters */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search products by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  autoFocus
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              >
                <option value="all">All Categories</option>
                <option value="cat1">Dresses</option>
                <option value="cat2">Jackets</option>
                <option value="cat3">Accessories</option>
                <option value="cat4">Bottoms</option>
                <option value="cat6">Shoes</option>
                <option value="cat7">Tops</option>
                <option value="cat8">Coats</option>
              </select>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-gray-600 text-lg">No products found</p>
              <p className="text-gray-400 text-sm mt-2">Try a different search term</p>
            </div>
          ) : (
            <POSProductGrid products={filteredProducts} />
          )}
        </div>

        {/* Cart */}
        <div className="lg:col-span-1">
          <POSCart employeeId={employeeId} employeeCode={employeeCode} />
        </div>
      </div>
    </div>
  );
}

