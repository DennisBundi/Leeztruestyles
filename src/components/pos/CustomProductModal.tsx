"use client";

import { useState, useEffect } from "react";
import { useCartAnimationContext } from "@/components/cart/CartAnimationProvider";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CustomProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (product: {
    name: string;
    price: number;
    size?: string;
    category_id?: string;
    description?: string;
    social_platform?: string;
  }) => void;
  categories?: Category[];
}

export default function CustomProductModal({
  isOpen,
  onClose,
  onAdd,
  categories = [],
}: CustomProductModalProps) {
  const { triggerAnimation } = useCartAnimationContext();
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    size: "",
    category_id: "",
    description: "",
    social_platform: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setFormData({
        name: "",
        price: "",
        size: "",
        category_id: "",
        description: "",
        social_platform: "",
      });
      setErrors({});
    }
  }, [isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Product name is required";
    }

    const price = parseFloat(formData.price);
    if (!formData.price || isNaN(price) || price <= 0) {
      newErrors.price = "Valid price is required";
    }

    if (!formData.social_platform) {
      newErrors.social_platform = "Social platform is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);

    const productData = {
      name: formData.name.trim(),
      price: parseFloat(formData.price),
      size: formData.size || undefined,
      category_id: formData.category_id || undefined,
      description: formData.description.trim() || undefined,
      social_platform: formData.social_platform || undefined,
    };

    // Create a mock product object for animation (custom products don't have images)
    const mockProductForAnimation = {
      id: `custom-${Date.now()}`,
      name: productData.name,
      description: productData.description || null,
      price: productData.price,
      images: [], // Custom products don't have images, will show placeholder
      category_id: productData.category_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Trigger animation from submit button to POS cart
    const submitButton = e.currentTarget.querySelector('button[type="submit"]') as HTMLElement;
    if (submitButton) {
      triggerAnimation(mockProductForAnimation, submitButton, 'pos', '[data-pos-cart]');
    }

    onAdd(productData);
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Add Custom Product
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
                errors.name
                  ? "border-red-300 focus:border-red-500"
                  : "border-gray-200 focus:border-primary"
              }`}
              placeholder="Enter product name"
              required
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Price (KES) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: e.target.value })
              }
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
                errors.price
                  ? "border-red-300 focus:border-red-500"
                  : "border-gray-200 focus:border-primary"
              }`}
              placeholder="0.00"
              required
            />
            {errors.price && (
              <p className="text-red-500 text-xs mt-1">{errors.price}</p>
            )}
          </div>

          {/* Size */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Size (Optional)
            </label>
            <select
              value={formData.size}
              onChange={(e) =>
                setFormData({ ...formData, size: e.target.value })
              }
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            >
              <option value="">Select size</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
              <option value="2XL">2XL</option>
              <option value="3XL">3XL</option>
              <option value="4XL">4XL</option>
              <option value="5XL">5XL</option>
            </select>
          </div>

          {/* Category */}
          {categories.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Category (Optional)
              </label>
              <select
                value={formData.category_id}
                onChange={(e) =>
                  setFormData({ ...formData, category_id: e.target.value })
                }
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              placeholder="Enter product description"
            />
          </div>

          {/* Social Platform */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Social Platform <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.social_platform}
              onChange={(e) =>
                setFormData({ ...formData, social_platform: e.target.value })
              }
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
                errors.social_platform
                  ? "border-red-300 focus:border-red-500"
                  : "border-gray-200 focus:border-primary"
              }`}
              required
            >
              <option value="">Select platform...</option>
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="walkin">Walk-in</option>
            </select>
            {errors.social_platform && (
              <p className="text-red-500 text-xs mt-1">{errors.social_platform}</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Adding..." : "Add to Cart"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


