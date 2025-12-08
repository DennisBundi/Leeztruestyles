'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';

interface InventoryItem {
  id: string;
  product_id: string;
  product_name: string;
  stock_quantity: number;
  reserved_quantity: number;
  available: number;
  category: string;
  last_updated: string;
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStockStatus, setSelectedStockStatus] = useState('all');

  // Fetch inventory from API
  useEffect(() => {
    const fetchInventory = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/inventory');
        if (response.ok) {
          const data = await response.json();
          setInventory(data.inventory || []);

          // Extract unique categories
          const uniqueCategories = Array.from(
            new Set((data.inventory || []).map((item: InventoryItem) => item.category))
          ).filter(Boolean) as string[];
          setCategories(uniqueCategories);
        } else {
          console.error('Failed to fetch inventory');
        }
      } catch (error) {
        console.error('Error fetching inventory:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, []);

  // Filter inventory based on search, category, and stock status
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch = item.product_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

      let matchesStockStatus = true;
      if (selectedStockStatus === 'in_stock') {
        matchesStockStatus = item.available > 10;
      } else if (selectedStockStatus === 'low_stock') {
        matchesStockStatus = item.available > 0 && item.available <= 10;
      } else if (selectedStockStatus === 'out_of_stock') {
        matchesStockStatus = item.available === 0;
      }

      return matchesSearch && matchesCategory && matchesStockStatus;
    });
  }, [searchQuery, selectedCategory, selectedStockStatus, inventory]);

  const lowStockItems = filteredInventory.filter((item) => item.available < 10 && item.available > 0);
  const outOfStockItems = filteredInventory.filter((item) => item.available === 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Inventory Management</h1>
          <p className="text-gray-600">Monitor and manage product stock levels</p>
        </div>
        <Link
          href="/dashboard/products"
          className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark hover:shadow-lg transition-all hover:scale-105"
        >
          Manage Products
        </Link>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-gray-600">Loading inventory...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Alerts */}
          {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lowStockItems.length > 0 && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h2 className="text-xl font-bold text-yellow-800">Low Stock Alert</h2>
                    <span className="ml-auto bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold">
                      {lowStockItems.length}
                    </span>
                  </div>
                  <p className="text-gray-700">Products with less than 10 units in stock</p>
                </div>
              )}

              {outOfStockItems.length > 0 && (
                <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h2 className="text-xl font-bold text-red-800">Out of Stock</h2>
                    <span className="ml-auto bg-red-200 text-red-800 px-3 py-1 rounded-full text-sm font-bold">
                      {outOfStockItems.length}
                    </span>
                  </div>
                  <p className="text-gray-700">Products that need immediate restocking</p>
                </div>
              )}
            </div>
          )}

          {/* Filters */}
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
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <select
                value={selectedStockStatus}
                onChange={(e) => setSelectedStockStatus(e.target.value)}
                className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">All Stock Status</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
            {filteredInventory.length !== inventory.length && (
              <div className="mt-4 text-sm text-gray-600">
                Showing {filteredInventory.length} of {inventory.length} products
              </div>
            )}
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">All Products</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Product</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Category</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Total Stock</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Reserved</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Available</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Last Updated</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center">
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
                    filteredInventory.map((item) => {
                      const isLowStock = item.available < 10 && item.available > 0;
                      const isOutOfStock = item.available === 0;

                      return (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-900">{item.product_name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">{item.category}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-semibold text-gray-900">{item.stock_quantity}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm text-gray-600">{item.reserved_quantity}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`font-bold ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-yellow-600' : 'text-green-600'
                              }`}>
                              {item.available}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">
                              {new Date(item.last_updated).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isOutOfStock
                              ? 'bg-red-100 text-red-700'
                              : isLowStock
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                              }`}>
                              {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Link
                              href={`/dashboard/products/${item.id}/edit`}
                              className="text-primary hover:text-primary-dark font-medium text-sm"
                            >
                              Update Stock
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

