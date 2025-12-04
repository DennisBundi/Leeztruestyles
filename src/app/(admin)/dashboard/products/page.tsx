'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ProductForm from '@/components/admin/ProductForm';
import CategoryForm from '@/components/admin/CategoryForm';
import type { Product, Category } from '@/types';

// Dummy categories for preview
const dummyCategories: Category[] = [
  { id: 'cat1', name: 'Dresses', slug: 'dresses', description: 'Beautiful dresses for every occasion' },
  { id: 'cat2', name: 'Jackets', slug: 'jackets', description: 'Stylish jackets and outerwear' },
  { id: 'cat3', name: 'Accessories', slug: 'accessories', description: 'Fashion accessories' },
  { id: 'cat4', name: 'Bottoms', slug: 'bottoms', description: 'Pants, skirts, and shorts' },
  { id: 'cat5', name: 'Shoes', slug: 'shoes', description: 'Footwear for all occasions' },
];

// Dummy products for preview
const dummyProducts: (Product & { category?: string; stock?: number; image?: string })[] = [
  {
    id: '1',
    name: 'Elegant Summer Dress',
    category: 'Dresses',
    price: 2500,
    sale_price: 2000,
    stock: 15,
    image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=100',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=100'],
    category_id: 'cat1',
    description: 'Beautiful floral print dress',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_flash_sale: true,
    flash_sale_start: new Date().toISOString(),
    flash_sale_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    name: 'Classic Denim Jacket',
    category: 'Jackets',
    price: 3200,
    stock: 8,
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=100',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=100'],
    category_id: 'cat2',
    description: 'Timeless denim jacket',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_flash_sale: false,
  },
  {
    id: '3',
    name: 'Designer Handbag',
    category: 'Accessories',
    price: 5500,
    sale_price: 4500,
    stock: 5,
    image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=100',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=100'],
    category_id: 'cat3',
    description: 'Luxury handbag',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_flash_sale: true,
    flash_sale_start: new Date().toISOString(),
    flash_sale_end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    name: 'High-Waisted Jeans',
    category: 'Bottoms',
    price: 2800,
    stock: 12,
    image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=100',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1542272604-787c3835535d?w=100'],
    category_id: 'cat4',
    description: 'Comfortable jeans',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_flash_sale: false,
  },
  {
    id: '5',
    name: 'Silk Scarf',
    category: 'Accessories',
    price: 1200,
    stock: 20,
    image: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=100',
    status: 'active',
    images: ['https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=100'],
    category_id: 'cat3',
    description: 'Elegant silk scarf',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_flash_sale: false,
  },
  {
    id: '6',
    name: 'Leather Ankle Boots',
    category: 'Shoes',
    price: 4200,
    stock: 7,
    image: 'https://images.unsplash.com/photo-1605812860427-4014434f3048?w=100',
    status: 'inactive',
    images: ['https://images.unsplash.com/photo-1605812860427-4014434f3048?w=100'],
    category_id: 'cat5',
    description: 'Stylish ankle boots',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_flash_sale: false,
  },
];

export default function ProductsPage() {
  const [products, setProducts] = useState(dummyProducts);
  const [categories, setCategories] = useState(dummyCategories);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Filter products based on search, category, and status
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategoryFilter === 'all' || product.category === selectedCategoryFilter;
      const matchesStatus = selectedStatus === 'all' || product.status === selectedStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [searchQuery, selectedCategoryFilter, selectedStatus, products]);

  const handleProductSuccess = () => {
    // In real app, this would refresh from API
    // For preview, we'll just close the form
    setSelectedProduct(null);
  };

  const handleCategorySuccess = () => {
    // In real app, this would refresh from API
    setSelectedCategory(null);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Products</h1>
          <p className="text-gray-600">Manage your product catalog</p>
        </div>
        <div className="flex gap-3">
          <CategoryForm
            category={selectedCategory}
            onSuccess={handleCategorySuccess}
            onClose={() => setSelectedCategory(null)}
          />
          <ProductForm
            categories={categories}
            product={selectedProduct}
            onSuccess={handleProductSuccess}
            onClose={() => setSelectedProduct(null)}
          />
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        {filteredProducts.length !== products.length && (
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredProducts.length} of {products.length} products
          </div>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Product</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Category</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Price</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Stock</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Flash Sale</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <p className="font-medium">No products found</p>
                      <p className="text-sm mt-1">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">ID: {product.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">{product.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      {product.sale_price ? (
                        <>
                          <span className="font-semibold text-gray-900">
                            KES {product.sale_price.toLocaleString()}
                          </span>
                          <span className="text-sm text-gray-500 line-through">
                            KES {product.price.toLocaleString()}
                          </span>
                        </>
                      ) : (
                        <span className="font-semibold text-gray-900">
                          KES {product.price.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`font-semibold ${
                      product.stock < 10 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {product.is_flash_sale ? (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        🔥 Flash Sale
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      product.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => setSelectedProduct(product as Product)}
                        className="text-primary hover:text-primary-dark font-medium text-sm"
                      >
                        Edit
                      </button>
                      <button className="text-red-600 hover:text-red-700 font-medium text-sm">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

