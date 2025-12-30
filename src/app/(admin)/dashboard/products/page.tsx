"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ProductForm from "@/components/admin/ProductForm";
import CategoryForm from "@/components/admin/CategoryForm";
import CategoriesPanel from "@/components/admin/CategoriesPanel";
import type { Product, Category } from "@/types";

// Dummy categories for preview
const dummyCategories: Category[] = [
  {
    id: "cat1",
    name: "Dresses",
    slug: "dresses",
    description: "Beautiful dresses for every occasion",
  },
  {
    id: "cat2",
    name: "Jackets",
    slug: "jackets",
    description: "Stylish jackets and outerwear",
  },
  {
    id: "cat3",
    name: "Accessories",
    slug: "accessories",
    description: "Fashion accessories",
  },
  {
    id: "cat4",
    name: "Bottoms",
    slug: "bottoms",
    description: "Pants, skirts, and shorts",
  },
  {
    id: "cat5",
    name: "Shoes",
    slug: "shoes",
    description: "Footwear for all occasions",
  },
];

// Dummy products for preview
const dummyProducts: (Product & {
  category?: string;
  stock?: number;
  image?: string;
})[] = [
  {
    id: "1",
    name: "Elegant Summer Dress",
    category: "Dresses",
    price: 2500,
    sale_price: 2000,
    stock: 15,
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=100",
    status: "active",
    images: [
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=100",
    ],
    category_id: "cat1",
    description: "Beautiful floral print dress",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_flash_sale: true,
    flash_sale_start: new Date().toISOString(),
    flash_sale_end: new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString(),
  },
  {
    id: "2",
    name: "Classic Denim Jacket",
    category: "Jackets",
    price: 3200,
    stock: 8,
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=100",
    status: "active",
    images: ["https://images.unsplash.com/photo-1551028719-00167b16eac5?w=100"],
    category_id: "cat2",
    description: "Timeless denim jacket",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_flash_sale: false,
  },
  {
    id: "3",
    name: "Designer Handbag",
    category: "Accessories",
    price: 5500,
    sale_price: 4500,
    stock: 5,
    image: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=100",
    status: "active",
    images: [
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=100",
    ],
    category_id: "cat3",
    description: "Luxury handbag",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_flash_sale: true,
    flash_sale_start: new Date().toISOString(),
    flash_sale_end: new Date(
      Date.now() + 3 * 24 * 60 * 60 * 1000
    ).toISOString(),
  },
  {
    id: "4",
    name: "High-Waisted Jeans",
    category: "Bottoms",
    price: 2800,
    stock: 12,
    image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=100",
    status: "active",
    images: ["https://images.unsplash.com/photo-1542272604-787c3835535d?w=100"],
    category_id: "cat4",
    description: "Comfortable jeans",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_flash_sale: false,
  },
  {
    id: "5",
    name: "Silk Scarf",
    category: "Accessories",
    price: 1200,
    stock: 20,
    image: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=100",
    status: "active",
    images: [
      "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=100",
    ],
    category_id: "cat3",
    description: "Elegant silk scarf",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_flash_sale: false,
  },
  {
    id: "6",
    name: "Leather Ankle Boots",
    category: "Shoes",
    price: 4200,
    stock: 7,
    image: "https://images.unsplash.com/photo-1605812860427-4014434f3048?w=100",
    status: "inactive",
    images: [
      "https://images.unsplash.com/photo-1605812860427-4014434f3048?w=100",
    ],
    category_id: "cat5",
    description: "Stylish ankle boots",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_flash_sale: false,
  },
];

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<
    (Product & {
      category?: string;
      stock?: number;
      image?: string;
      colors?: string[];
    })[]
  >([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedColorFilter, setSelectedColorFilter] = useState("all");
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    product: { id: string; name: string } | null;
  }>({ isOpen: false, product: null });
  const [successModal, setSuccessModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showCategoriesPanel, setShowCategoriesPanel] = useState(false);
  const [copiedProductId, setCopiedProductId] = useState<string | null>(null);

  // Fetch user role for conditional rendering
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const response = await fetch("/api/auth/role");
        const { role } = await response.json();
        setUserRole(role);
      } catch (error) {
        console.error("Error checking role:", error);
      }
    };
    checkRole();
  }, []);

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const response = await fetch("/api/products");
        const data = await response.json();

        if (response.ok) {
          console.log("📦 API Response - Products fetched:", {
            count: data.products?.length || 0,
            hasError: !!data.error,
            error: data.error,
            details: data.details,
          });

          // Log stock information for debugging
          if (data.products && data.products.length > 0) {
            const stockInfo = data.products.map((p: any) => ({
              id: p.id,
              name: p.name,
              stock: p.stock,
              stock_quantity: p.stock_quantity,
              available_stock: p.available_stock,
              has_inventory: p.stock !== undefined,
            }));
            console.log("📊 Stock Information:", stockInfo.slice(0, 5)); // Log first 5
          } else {
            console.warn(
              "⚠️ API returned empty products array. Check server logs for details."
            );
          }

          setProducts(data.products || []);
        } else {
          console.error("❌ Failed to fetch products:", {
            status: response.status,
            error: data.error,
            details: data.details,
          });
          // Set empty array if API fails - show empty state
          setProducts([]);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        // Set empty array if fetch fails - show empty state
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const response = await fetch("/api/categories");
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
        } else {
          console.error("Failed to fetch categories");
          // Fall back to dummy categories if API fails
          setCategories(dummyCategories);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        // Fall back to dummy categories if fetch fails
        setCategories(dummyCategories);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Extract unique colors from all products
  const availableColors = useMemo(() => {
    const colorSet = new Set<string>();
    products.forEach((product: any) => {
      if (product.colors && Array.isArray(product.colors)) {
        product.colors.forEach((color: string) => colorSet.add(color));
      }
    });
    return Array.from(colorSet).sort();
  }, [products]);

  // Filter products based on search, category, status, and color
  const LOW_STOCK_THRESHOLD = 5;

  const getStockStatus = (stock?: number) => {
    if (stock === undefined || stock === null) return "unknown";
    if (stock === 0) return "out";
    if (stock <= LOW_STOCK_THRESHOLD) return "low";
    return "in";
  };

  const filteredProducts = useMemo(() => {
    return products
      .filter((product: any) => {
        // Enhanced search: search across name, description, ID, and category
        const searchLower = searchQuery.toLowerCase().trim();
        let matchesSearch = true;
        
        if (searchLower) {
          const searchInName = product.name?.toLowerCase().includes(searchLower) || false;
          const searchInDescription = product.description?.toLowerCase().includes(searchLower) || false;
          const searchInId = product.id?.toLowerCase().includes(searchLower) || false;
          const searchInCategory = product.category?.toLowerCase().includes(searchLower) || false;
          // Also search in price as string (e.g., "2500" or "KES 2500")
          const searchInPrice = product.price?.toString().includes(searchLower) || 
                               product.sale_price?.toString().includes(searchLower) || false;
          
          matchesSearch = searchInName || searchInDescription || searchInId || searchInCategory || searchInPrice;
        }
        
        const matchesCategory =
          selectedCategoryFilter === "all" ||
          product.category === selectedCategoryFilter;
        const matchesStatus =
          selectedStatus === "all" || product.status === selectedStatus;
        const matchesColor =
          selectedColorFilter === "all" ||
          (product.colors &&
            Array.isArray(product.colors) &&
            product.colors.includes(selectedColorFilter));
        return (
          matchesSearch && matchesCategory && matchesStatus && matchesColor
        );
      })
      .map((product: any) => {
        const stock =
          product.stock ?? product.available_stock ?? product.stock_quantity;
        return { ...product, stock, stock_status: getStockStatus(stock) };
      });
  }, [
    searchQuery,
    selectedCategoryFilter,
    selectedStatus,
    selectedColorFilter,
    products,
  ]);

  // Function to copy product link to clipboard
  const copyProductLink = async (productId: string) => {
    try {
      const productUrl = `${window.location.origin}/products/${productId}`;
      await navigator.clipboard.writeText(productUrl);
      setCopiedProductId(productId);
      setTimeout(() => setCopiedProductId(null), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
      alert("Failed to copy link. Please try again.");
    }
  };

  const handleProductSuccess = async () => {
    // Refresh products list
    try {
      const response = await fetch("/api/products");
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error("Error refreshing products:", error);
    }
    setSelectedProduct(null);
  };

  const handleCategorySuccess = async () => {
    // Refresh categories list
    try {
      const response = await fetch("/api/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Error refreshing categories:", error);
    }
    setSelectedCategory(null);
  };

  const handleDeleteProduct = (productId: string, productName: string) => {
    setDeleteModal({
      isOpen: true,
      product: { id: productId, name: productName },
    });
  };

  const confirmDelete = async () => {
    if (!deleteModal.product) return;

    setDeleting(true);
    try {
      const response = await fetch(
        `/api/products?id=${deleteModal.product.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete product");
      }

      // Close delete modal
      setDeleteModal({ isOpen: false, product: null });

      // Refresh products list
      const productsResponse = await fetch("/api/products");
      if (productsResponse.ok) {
        const data = await productsResponse.json();
        setProducts(data.products || []);
      }

      // Show success modal
      setSuccessModal(true);
      setTimeout(() => setSuccessModal(false), 2500);
    } catch (error) {
      console.error("Error deleting product:", error);
      alert(
        error instanceof Error ? error.message : "Failed to delete product"
      );
      setDeleteModal({ isOpen: false, product: null });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Products</h1>
          <p className="text-gray-600">Manage your product catalog</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setShowCategoriesPanel(!showCategoriesPanel)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            {showCategoriesPanel ? "Hide Categories" : "Show Categories"}
          </button>
          <ProductForm
            categories={categories}
            product={selectedProduct}
            onSuccess={handleProductSuccess}
            onClose={() => setSelectedProduct(null)}
            userRole={userRole}
          />
        </div>
      </div>

      {/* Categories Panel */}
      {showCategoriesPanel && (
        <CategoriesPanel
          categories={categories}
          loading={loadingCategories}
          onRefresh={handleCategorySuccess}
          onClose={() => setShowCategoriesPanel(false)}
        />
      )}

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
          {availableColors.length > 0 && (
            <select
              value={selectedColorFilter}
              onChange={(e) => setSelectedColorFilter(e.target.value)}
              className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All Colors</option>
              {availableColors.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          )}
        </div>
        {filteredProducts.length !== products.length && (
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredProducts.length} of {products.length} products
          </div>
        )}
      </div>

      {/* Products Table - Desktop Only */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  Product
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  Category
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                  Price
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                  Stock
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                  Flash Sale
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadingProducts ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="ml-3 text-gray-600">
                        Loading products...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <svg
                        className="w-16 h-16 mx-auto mb-4 text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                      <p className="font-medium text-lg text-gray-700 mb-2">
                        No products found
                      </p>
                      {products.length === 0 ? (
                        <p className="text-sm text-gray-500 mb-4">
                          Your product catalog is empty. Start by adding your
                          first product.
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 mb-4">
                          No products match your current search or filters. Try
                          adjusting your search criteria.
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  // Check if product has buying_price (only for admin users)
                  const hasBuyingPrice =
                    userRole === "admin"
                      ? product.buying_price !== null &&
                        product.buying_price !== undefined &&
                        product.buying_price > 0
                      : true; // For non-admin users, always show as normal

                  return (
                    <tr
                      key={product.id}
                      className={`transition-colors ${
                        userRole === "admin" && !hasBuyingPrice
                          ? "bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-400"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                            <Image
                              src={
                                product.image ||
                                "/images/placeholder-product.jpg"
                              }
                              alt={product.name}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {product.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {product.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          {product.sale_price ? (
                            <>
                              <span className="font-semibold text-gray-900">
                                KES {(product.sale_price || 0).toLocaleString()}
                              </span>
                              <span className="text-sm text-gray-500 line-through">
                                KES {(product.price || 0).toLocaleString()}
                              </span>
                            </>
                          ) : (
                            <span className="font-semibold text-gray-900">
                              KES {(product.price || 0).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {product.stock !== undefined ? (
                          <span
                            className={`font-semibold ${
                              product.stock_status === "out"
                                ? "text-red-600"
                                : product.stock_status === "low"
                                ? "text-yellow-600"
                                : "text-green-600"
                            }`}
                          >
                            {product.stock}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
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
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            product.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {product.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => copyProductLink(product.id)}
                            className="p-2 text-gray-600 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Copy product link"
                          >
                            {copiedProductId === product.id ? (
                              <svg
                                className="w-5 h-5 text-green-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                                />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() =>
                              setSelectedProduct(product as Product)
                            }
                            className="text-primary hover:text-primary-dark font-medium text-sm"
                          >
                            Edit
                          </button>
                          {userRole === "admin" && (
                            <button
                              onClick={() =>
                                handleDeleteProduct(product.id, product.name)
                              }
                              className="text-red-600 hover:text-red-700 font-medium text-sm"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Products Cards - Mobile Only */}
      <div className="block md:hidden space-y-4">
        {loadingProducts ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-gray-600">Loading products...</span>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <div className="text-gray-500">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <p className="font-medium text-lg text-gray-700 mb-2">
                No products found
              </p>
              {products.length === 0 ? (
                <p className="text-sm text-gray-500 mb-4">
                  Your product catalog is empty. Start by adding your first product.
                </p>
              ) : (
                <p className="text-sm text-gray-500 mb-4">
                  No products match your current search or filters. Try adjusting your search criteria.
                </p>
              )}
            </div>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const hasBuyingPrice =
              userRole === "admin"
                ? product.buying_price !== null &&
                  product.buying_price !== undefined &&
                  product.buying_price > 0
                : true;

            return (
              <div
                key={product.id}
                className={`bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden ${
                  userRole === "admin" && !hasBuyingPrice
                    ? "border-l-4 border-l-yellow-400 bg-yellow-50"
                    : ""
                }`}
              >
                {/* Product Image */}
                <div className="relative w-full h-48 bg-gray-100">
                  <Image
                    src={
                      product.image ||
                      "/images/placeholder-product.jpg"
                    }
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="100vw"
                  />
                </div>

                {/* Product Info */}
                <div className="p-4 space-y-3">
                  {/* Name and ID */}
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500">ID: {product.id}</p>
                  </div>

                  {/* Category */}
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Category:{" "}
                    </span>
                    <span className="text-sm text-gray-600">
                      {product.category}
                    </span>
                  </div>

                  {/* Price */}
                  <div>
                    {product.sale_price ? (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg text-gray-900">
                          KES {(product.sale_price || 0).toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-500 line-through">
                          KES {(product.price || 0).toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <span className="font-semibold text-lg text-gray-900">
                        KES {(product.price || 0).toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Stock, Flash Sale, Status Row */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                    {/* Stock */}
                    <div className="flex-1 min-w-[100px]">
                      <span className="text-xs text-gray-500 block mb-1">
                        Stock
                      </span>
                      {product.stock !== undefined ? (
                        <span
                          className={`font-semibold text-sm ${
                            product.stock_status === "out"
                              ? "text-red-600"
                              : product.stock_status === "low"
                              ? "text-yellow-600"
                              : "text-green-600"
                          }`}
                        >
                          {product.stock}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">N/A</span>
                      )}
                    </div>

                    {/* Flash Sale */}
                    <div className="flex-1 min-w-[100px]">
                      <span className="text-xs text-gray-500 block mb-1">
                        Flash Sale
                      </span>
                      {product.is_flash_sale ? (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                          🔥 Active
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </div>

                    {/* Status */}
                    <div className="flex-1 min-w-[100px]">
                      <span className="text-xs text-gray-500 block mb-1">
                        Status
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          product.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {product.status}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => copyProductLink(product.id)}
                      className="flex-1 px-3 py-2 text-gray-600 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium border border-gray-200"
                      title="Copy product link"
                    >
                      {copiedProductId === product.id ? (
                        <>
                          <svg
                            className="w-4 h-4 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span className="text-green-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                            />
                          </svg>
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setSelectedProduct(product as Product)}
                      className="flex-1 px-3 py-2 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-dark transition-colors"
                    >
                      Edit
                    </button>
                    {userRole === "admin" && (
                      <button
                        onClick={() =>
                          handleDeleteProduct(product.id, product.name)
                        }
                        className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
              Delete Product?
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to delete{" "}
              <strong>"{deleteModal.product?.name}"</strong>? This action cannot
              be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal({ isOpen: false, product: null })}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-scale-in">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Product Deleted!
            </h3>
            <p className="text-gray-600">
              The product has been successfully removed from your inventory.
            </p>
          </div>
        </div>
      )}

      {/* Copy Link Toast */}
      {copiedProductId && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2 transform transition-all duration-300 ease-in-out animate-fade-in">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="font-semibold">
            Product link copied to clipboard!
          </span>
        </div>
      )}
    </div>
  );
}
