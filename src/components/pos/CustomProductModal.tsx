"use client";

import { useState, useEffect, useRef } from "react";
import { useCartAnimationContext } from "@/components/cart/CartAnimationProvider";
import Image from "next/image";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ImagePreview {
  file: File;
  url: string;
  isUploaded: boolean;
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
    images?: string[];
  }) => void;
  categories?: Category[];
}

export default function CustomProductModal({
  isOpen,
  onClose,
  onAdd,
  categories = [],
}: CustomProductModalProps) {
  // Safely get animation context - don't fail if not available
  let triggerAnimation: ((product: Product, sourceElement: HTMLElement, targetType?: 'floating' | 'pos', targetSelector?: string) => void) | null = null;
  try {
    const context = useCartAnimationContext();
    triggerAnimation = context.triggerAnimation;
  } catch (error) {
    // Animation context not available, but we can still add to cart
    console.warn('CartAnimationContext not available, animation will be skipped');
  }
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
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // Clear image previews and revoke object URLs
      imagePreviews.forEach((preview) => {
        if (!preview.isUploaded) {
          URL.revokeObjectURL(preview.url);
        }
      });
      setImagePreviews([]);
    }
  }, [isOpen]);

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const hasDatabase =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== "placeholder";

    if (!hasDatabase) {
      // Preview mode - create object URLs for preview
      const newPreviews: ImagePreview[] = Array.from(files).map((file) => ({
        file,
        url: URL.createObjectURL(file),
        isUploaded: false,
      }));
      setImagePreviews((prev) => [...prev, ...newPreviews]);
      return;
    }

    // Real upload via API route (bypasses RLS)
    setUploadingImages(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload/image", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to upload image");
        }

        const { url } = await response.json();

        return {
          file,
          url: url,
          isUploaded: true,
        };
      });

      const uploadedPreviews = await Promise.all(uploadPromises);
      setImagePreviews((prev) => [...prev, ...uploadedPreviews]);
    } catch (error) {
      console.error("Error uploading images:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to upload some images. Please try again."
      );
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setImagePreviews((prev) => {
      const newPreviews = [...prev];
      const removed = newPreviews.splice(index, 1)[0];
      // Revoke object URL if it's a preview
      if (removed.file && !removed.isUploaded) {
        URL.revokeObjectURL(removed.url);
      }
      return newPreviews;
    });
  };

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

    // Extract image URLs from previews
    const imageUrls = imagePreviews.map((preview) => preview.url);

    const productData = {
      name: formData.name.trim(),
      price: parseFloat(formData.price),
      size: formData.size || undefined,
      category_id: formData.category_id || undefined,
      description: formData.description.trim() || undefined,
      social_platform: formData.social_platform || undefined,
      images: imageUrls.length > 0 ? imageUrls : undefined,
    };

    // Create a mock product object for animation
    const mockProductForAnimation = {
      id: `custom-${Date.now()}`,
      name: productData.name,
      description: productData.description || null,
      price: productData.price,
      images: imageUrls, // Use uploaded images if available
      category_id: productData.category_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Trigger animation from submit button to POS cart if available
    try {
      if (triggerAnimation) {
        const submitButton = e.currentTarget.querySelector('button[type="submit"]') as HTMLElement;
        if (submitButton) {
          triggerAnimation(mockProductForAnimation, submitButton, 'pos', '[data-pos-cart]');
        }
      }
    } catch (animError) {
      // Animation failed but item was added - continue
      console.warn('Animation failed:', animError);
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

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Product Images (Optional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleImageUpload(e.target.files)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImages}
              className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadingImages ? (
                <>
                  <svg
                    className="animate-spin h-6 w-6 text-primary"
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
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span className="text-sm text-gray-600">Uploading images...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-6 h-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span className="text-sm text-gray-700 font-medium">
                    Click to upload images
                  </span>
                  <span className="text-xs text-gray-500">
                    PNG, JPG, WEBP up to 10MB each
                  </span>
                </>
              )}
            </button>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square group">
                    <Image
                      src={preview.url}
                      alt={`Preview ${index + 1}`}
                      fill
                      className="object-cover rounded-lg"
                      sizes="(max-width: 768px) 33vw, 150px"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
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
              disabled={loading || uploadingImages}
              className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Adding..."
                : uploadingImages
                ? "Uploading Images..."
                : "Add to Cart"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


