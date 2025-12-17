'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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

type SizeStocks = Record<string, number>;
type ColorStocks = Record<string, number | Record<string, number>>;

export default function InventoryPage() {
  const router = useRouter();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStockStatus, setSelectedStockStatus] = useState('all');
  const [updateOpen, setUpdateOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedProductName, setSelectedProductName] = useState<string>('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [generalStock, setGeneralStock] = useState<string>('0');
  const [sizeStocks, setSizeStocks] = useState<SizeStocks>({});
  const [colorStocks, setColorStocks] = useState<ColorStocks>({});

  const displayValue = (v?: number) => (v === 0 || v === undefined || v === null ? '' : String(v));
  const toInt = (v: string) => Math.max(0, parseInt(v || '0', 10) || 0);

  // Check role and redirect sellers (only once)
  useEffect(() => {
    let mounted = true;
    const checkRole = async () => {
      try {
        const response = await fetch('/api/auth/role');
        const { role } = await response.json();
        if (mounted && role === 'seller') {
          router.replace('/dashboard/orders');
        }
      } catch (error) {
        console.error('Error checking role:', error);
      }
    };
    checkRole();
    return () => { mounted = false; };
  }, [router]);

  const refreshInventory = useCallback(async () => {
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
  }, []);

  // Fetch inventory from API on mount
  useEffect(() => {
    refreshInventory();
  }, [refreshInventory]);

  // Filter inventory based on search, category, and stock status
  // By default (when 'all' is selected), only show products with stock > 0 (not out of stock)
  // When 'out_of_stock' filter is selected, show only out-of-stock products
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch = item.product_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

      let matchesStockStatus = true;
      if (selectedStockStatus === 'in_stock') {
        matchesStockStatus = item.available > 5;
      } else if (selectedStockStatus === 'low_stock') {
        matchesStockStatus = item.available > 0 && item.available <= 5;
      } else if (selectedStockStatus === 'out_of_stock') {
        matchesStockStatus = item.available === 0;
      } else if (selectedStockStatus === 'all') {
        // By default, only show products that are NOT out of stock (stock > 0)
        matchesStockStatus = item.available > 0;
      }

      return matchesSearch && matchesCategory && matchesStockStatus;
    });
  }, [searchQuery, selectedCategory, selectedStockStatus, inventory]);

  const lowStockItems = filteredInventory.filter((item) => item.available < 5 && item.available > 0);
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

      {/* Update Inventory Modal */}
      {updateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 relative">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Update Inventory</h2>
                <p className="text-sm text-gray-600">Product: {selectedProductName}</p>
              </div>
              <button
                onClick={() => setUpdateOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {updateError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {updateError}
              </div>
            )}

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 gap-3">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  General Stock (inventory)
                </label>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={displayValue(Number(generalStock))}
                  onChange={(e) => setGeneralStock(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {Object.keys(sizeStocks).length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Size Stocks
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {Object.entries(sizeStocks).map(([size, qty]) => (
                      <div key={size} className="flex items-center gap-2">
                        <span className="w-10 text-sm font-semibold text-gray-700">{size}</span>
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={displayValue(qty)}
                          onChange={(e) =>
                            setSizeStocks((prev) => ({
                              ...prev,
                              [size]: toInt(e.target.value),
                            }))
                          }
                          className="w-20 px-2 py-1 text-sm border-2 border-gray-200 rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Object.keys(colorStocks).length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Color Stocks
                  </label>
                  <div className="space-y-3">
                    {Object.entries(colorStocks).map(([color, value]) => {
                      const isNumber = typeof value === 'number';
                      return (
                        <div key={color} className="rounded-xl border border-gray-200 p-3">
                          <div className="font-semibold text-gray-800 mb-2">{color}</div>
                          {isNumber ? (
                            <input
                              type="number"
                              min={0}
                              inputMode="numeric"
                              value={displayValue(value as number)}
                              onChange={(e) =>
                                setColorStocks((prev) => ({
                                  ...prev,
                                  [color]: toInt(e.target.value),
                                }))
                              }
                              className="w-24 px-2 py-1 text-sm border-2 border-gray-200 rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {Object.entries(value as Record<string, number>).map(([sz, qty]) => (
                                <div key={`${color}-${sz}`} className="flex items-center gap-2">
                                  <span className="w-10 text-sm text-gray-700">{sz}</span>
                                  <input
                                    type="number"
                                    min={0}
                                    inputMode="numeric"
                                    value={displayValue(qty)}
                                    onChange={(e) =>
                                      setColorStocks((prev) => ({
                                        ...prev,
                                        [color]: {
                                          ...(prev[color] as Record<string, number>),
                                          [sz]: toInt(e.target.value),
                                        },
                                      }))
                                    }
                                    className="w-20 px-2 py-1 text-sm border-2 border-gray-200 rounded-md focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setUpdateOpen(false)}
                className="px-4 py-2 rounded-lg border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50"
                disabled={updateLoading}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!selectedProductId) return;
                  setUpdateLoading(true);
                  setUpdateError(null);
                  try {
                    const payload: any = {
                      product_id: selectedProductId,
                        stock_quantity: toInt(generalStock),
                    };
                    if (Object.keys(sizeStocks).length > 0) {
                      payload.size_stocks = sizeStocks;
                    }
                    if (Object.keys(colorStocks).length > 0) {
                      payload.color_stocks = colorStocks;
                    }

                    const resp = await fetch('/api/inventory/update', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload),
                    });

                    if (!resp.ok) {
                      const err = await resp.json().catch(() => ({}));
                      throw new Error(err.details || err.error || 'Failed to update inventory');
                    }

                    // refresh inventory list
                    setUpdateOpen(false);
                    await refreshInventory();
                  } catch (err: any) {
                    setUpdateError(err.message || 'Failed to update inventory');
                  } finally {
                    setUpdateLoading(false);
                  }
                }}
                className="px-5 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark disabled:opacity-60"
                disabled={updateLoading}
              >
                {updateLoading ? 'Updating...' : 'Update Inventory'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                      const isLowStock = item.available < 5 && item.available > 0;
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
                            <button
                              onClick={async () => {
                                setSelectedProductId(item.product_id);
                                setSelectedProductName(item.product_name);
                                setUpdateError(null);
                                setUpdateOpen(true);
                                setUpdateLoading(true);

                                try {
                                  // Fetch product detail and sizes
                                  const [productResp, sizesResp] = await Promise.all([
                                    fetch(`/api/products?id=${item.product_id}`),
                                    fetch(`/api/products/${item.product_id}/sizes`),
                                  ]);

                                  let general = item.stock_quantity;
                                  let sizeData: SizeStocks = {};
                                  let colorData: ColorStocks = {};

                                  if (productResp.ok) {
                                    const prodJson = await productResp.json();
                                    const product = Array.isArray(prodJson) ? prodJson[0] : (prodJson.product || prodJson.products?.[0] || prodJson);
                                    general = product?.stock_quantity ?? product?.stock ?? item.stock_quantity;
                                    if (product?.color_stocks) {
                                      colorData = product.color_stocks;
                                    }
                                  }

                                  if (sizesResp.ok) {
                                    const sizesJson = await sizesResp.json();
                                    if (sizesJson.sizes) {
                                      sizeData = sizesJson.sizes.reduce((acc: SizeStocks, s: any) => {
                                        if (s.size) acc[s.size] = s.stock_quantity ?? 0;
                                        return acc;
                                      }, {});
                                    }
                                  }

                                  setGeneralStock(String(general ?? 0));
                                  setSizeStocks(sizeData);
                                  setColorStocks(colorData);
                                } catch (err) {
                                  console.error('Failed to load product inventory detail', err);
                                  setUpdateError('Failed to load inventory details');
                                } finally {
                                  setUpdateLoading(false);
                                }
                              }}
                              className="text-primary hover:text-primary-dark font-medium text-sm"
                            >
                              Update Stock
                            </button>
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

