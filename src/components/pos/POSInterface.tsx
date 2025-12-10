'use client';

import { useState, useEffect } from 'react';
import type { Product } from '@/types';
import POSProductGrid from './POSProductGrid';
import POSCart from './POSCart';

interface POSInterfaceProps {
  employeeId?: string;
  employeeCode?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function POSInterface({ employeeId, employeeCode }: POSInterfaceProps) {
  const [products, setProducts] = useState<(Product & { available_stock?: number })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      
      const data = await response.json();
      
      // Transform products to match Product type with available_stock
      // The API returns products with 'available_stock' field (stock_quantity - reserved_quantity)
      const productsWithStock = (data.products || []).map((product: any) => {
        return {
          id: product.id,
          name: product.name,
          description: product.description || '',
          price: parseFloat(product.price),
          images: product.images || [],
          category_id: product.category_id,
          created_at: product.created_at,
          updated_at: product.updated_at,
          available_stock: product.available_stock !== undefined ? product.available_stock : (product.stock !== undefined ? product.stock : undefined),
          status: product.status,
          sale_price: product.sale_price,
        };
      });
      
      setProducts(productsWithStock);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err instanceof Error ? err.message : 'Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const handleOrderComplete = () => {
    // Refresh products after order completion to update inventory
    fetchProducts();
  };

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
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading products from inventory...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <svg className="w-16 h-16 text-red-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-600 text-lg font-semibold mb-2">Error loading products</p>
              <p className="text-gray-600 text-sm mb-4">{error}</p>
              <button
                onClick={fetchProducts}
                className="px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors"
              >
                Retry
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-gray-600 text-lg">No products found</p>
              <p className="text-gray-400 text-sm mt-2">
                {searchQuery || selectedCategory !== 'all' 
                  ? 'Try a different search term or category' 
                  : 'No products available in inventory'}
              </p>
            </div>
          ) : (
            <POSProductGrid products={filteredProducts} />
          )}
        </div>

        {/* Cart */}
        <div className="lg:col-span-1">
          <POSCart 
            employeeId={employeeId} 
            employeeCode={employeeCode}
            onOrderComplete={handleOrderComplete}
          />
        </div>
      </div>
    </div>
  );
}

