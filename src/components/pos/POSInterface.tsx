'use client';

import { useState, useEffect } from 'react';
import type { Product } from '@/types';
import POSProductGrid from './POSProductGrid';
import POSCart from './POSCart';
import CustomProductModal from './CustomProductModal';
import { useCartStore } from '@/store/cartStore';
import CartAnimationProvider from '@/components/cart/CartAnimationProvider';

interface POSInterfaceProps {
  employeeId?: string;
  employeeCode?: string;
  userRole?: 'admin' | 'manager' | 'seller' | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export default function POSInterface({ employeeId, employeeCode, userRole: initialUserRole }: POSInterfaceProps) {
  const [products, setProducts] = useState<(Product & { available_stock?: number })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCustomProductModal, setShowCustomProductModal] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'manager' | 'seller' | null>(initialUserRole ?? null);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [mounted, setMounted] = useState(false);
  const addCustomItem = useCartStore((state) => state.addCustomItem);
  const cartItems = useCartStore((state) => state.items);
  const getCartTotal = useCartStore((state) => state.getTotal);

  useEffect(() => { setMounted(true); }, []);

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
      // Filter out products with 0 stock - only show products with stock > 0
      const productsWithStock = (data.products || [])
        .filter((product: any) => {
          const stock = product.available_stock !== undefined 
            ? product.available_stock 
            : (product.stock !== undefined ? product.stock : undefined);
          // Only include products with stock > 0 or undefined (inventory not set up)
          return stock === undefined || stock > 0;
        })
        .map((product: any) => {
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
            colors: product.colors || [], // Include colors from API
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
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const response = await fetch('/api/auth/role');
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.role);
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
    }
  };

  const handleAddCustomProduct = (customData: {
    name: string;
    price: number;
    size?: string;
    category_id?: string;
    description?: string;
    social_platform?: string;
    images?: string[];
  }) => {
    addCustomItem(customData, 1);
    setShowCustomProductModal(false);
  };

  const canAddCustomProduct = userRole === 'admin' || userRole === 'seller';

  const handleOrderComplete = () => {
    // Refresh products after order completion to update inventory
    fetchProducts();
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const productPanel = (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="glass-card rounded-2xl shadow-lg p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/10 border-2 border-white/20 text-white placeholder:text-white/30 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-rose-400/50 transition-all"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 bg-white/10 border-2 border-white/20 text-white rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-rose-400/50 transition-all font-medium"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {canAddCustomProduct && (
            <button
              onClick={() => setShowCustomProductModal(true)}
              className="px-4 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors whitespace-nowrap flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Add Custom</span>
              <span className="sm:hidden">Custom</span>
            </button>
          )}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="glass-card rounded-2xl shadow-lg p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-white/60">Loading products from inventory...</p>
        </div>
      ) : error ? (
        <div className="glass-card rounded-2xl shadow-lg p-12 text-center">
          <svg className="w-16 h-16 text-red-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-400 text-lg font-semibold mb-2">Error loading products</p>
          <p className="text-white/60 text-sm mb-4">{error}</p>
          <button onClick={fetchProducts} className="px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors">
            Retry
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="glass-card rounded-2xl shadow-lg p-12 text-center">
          <svg className="w-16 h-16 text-white/20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-white/60 text-lg">No products found</p>
          <p className="text-white/40 text-sm mt-2">
            {searchQuery || selectedCategory !== 'all'
              ? 'Try a different search term or category'
              : 'No products available in inventory'}
          </p>
        </div>
      ) : (
        <POSProductGrid
          products={filteredProducts}
          isAdmin={userRole === 'admin'}
          categories={categories}
          onProductsRefresh={fetchProducts}
          userRole={userRole}
        />
      )}
    </div>
  );

  return (
    <CartAnimationProvider>
      <div className="container mx-auto px-4 py-6">

        {/* ── Desktop layout (lg+): side-by-side ── */}
        <div className="hidden lg:grid grid-cols-3 gap-6">
          <div className="col-span-2">{productPanel}</div>
          <div className="col-span-1">
            <POSCart
              employeeId={employeeId}
              employeeCode={employeeCode}
              onOrderComplete={handleOrderComplete}
            />
          </div>
        </div>

        {/* ── Mobile layout (<lg): tab-style ── */}
        <div className="lg:hidden pb-24">
          {showMobileCart ? (
            <POSCart
              employeeId={employeeId}
              employeeCode={employeeCode}
              onOrderComplete={() => { handleOrderComplete(); setShowMobileCart(false); }}
            />
          ) : (
            productPanel
          )}
        </div>

        {/* ── Mobile sticky bottom bar ── */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-4 py-3 glass border-t border-white/10">
          {showMobileCart ? (
            <button
              onClick={() => setShowMobileCart(false)}
              className="w-full py-3 px-6 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Products
            </button>
          ) : (
            <button
              onClick={() => setShowMobileCart(true)}
              className="w-full py-3 px-6 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>View Cart</span>
                {mounted && cartItems.length > 0 && (
                  <span className="bg-white text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                    {cartItems.length}
                  </span>
                )}
              </div>
              {mounted && cartItems.length > 0 && (
                <span className="font-bold">KES {getCartTotal().toLocaleString()}</span>
              )}
            </button>
          )}
        </div>

      </div>

      {/* Custom Product Modal */}
      <CustomProductModal
        isOpen={showCustomProductModal}
        onClose={() => setShowCustomProductModal(false)}
        onAdd={handleAddCustomProduct}
        categories={categories}
      />
    </CartAnimationProvider>
  );
}

