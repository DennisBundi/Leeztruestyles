"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { Product } from "@/types";
import { PRODUCT_COLORS, getColorHex } from "@/lib/utils/colors";

interface ProductOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (size?: string, color?: string) => void;
  product: Product | null;
  availableSizes?: Array<{ size: string; available: number }>;
  availableColors?: string[];
}

export default function ProductOptionsModal({
  isOpen,
  onClose,
  onConfirm,
  product,
  availableSizes = [],
  availableColors = [],
}: ProductOptionsModalProps) {
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [loadingSizes, setLoadingSizes] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      // Fetch available sizes for the product
      fetchProductSizes();
      // Reset selections when modal opens
      setSelectedSize("");
      setSelectedColor("");
    }
  }, [isOpen, product]);

  const fetchProductSizes = async () => {
    if (!product) return;
    
    setLoadingSizes(true);
    try {
      const response = await fetch(`/api/products/${product.id}/sizes`);
      if (response.ok) {
        const data = await response.json();
        // Filter to only show sizes with available stock
        const sizesWithStock = (data.sizes || []).filter(
          (s: any) => s.available > 0
        );
        // If no sizes with stock, show all sizes (product might not have size-based inventory)
        // This will be handled by the parent component
      }
    } catch (error) {
      console.error("Error fetching product sizes:", error);
    } finally {
      setLoadingSizes(false);
    }
  };

  const handleConfirm = () => {
    // Validate size if product has sizes
    if (availableSizes.length > 0 && !selectedSize) {
      alert("Please select a size before adding to cart");
      return;
    }
    onConfirm(selectedSize || undefined, selectedColor || undefined);
    onClose();
  };

  if (!isOpen || !product) return null;

  // If product has colors from the API, use them; otherwise use availableColors prop
  const productColors = (product as any).colors || availableColors;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Select Options</h2>
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

        {/* Product Preview */}
        <div className="flex gap-4 mb-6">
          <div className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
            {product.images && product.images.length > 0 ? (
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                className="object-cover"
                sizes="80px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
            <p className="text-lg font-bold text-primary">
              KES {(product.price || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Size Selection */}
        {availableSizes.length > 0 ? (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Size {availableSizes.length > 0 && <span className="text-red-500">*</span>}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {availableSizes.map((sizeOption) => {
                const isAvailable = sizeOption.available > 0;
                const isSelected = selectedSize === sizeOption.size;
                return (
                  <button
                    key={sizeOption.size}
                    type="button"
                    onClick={() => isAvailable && setSelectedSize(sizeOption.size)}
                    disabled={!isAvailable}
                    className={`px-3 py-2 rounded-lg border-2 font-semibold text-sm transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : isAvailable
                        ? "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                        : "border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed opacity-50"
                    }`}
                  >
                    {sizeOption.size}
                    {isAvailable && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        ({sizeOption.available})
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Color Selection */}
        {productColors && productColors.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {productColors.map((color: string) => {
                const isSelected = selectedColor === color;
                const colorHex = getColorHex(color);

                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`px-4 py-2 rounded-lg border-2 font-semibold text-sm transition-all flex items-center gap-2 ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-full border border-gray-300"
                      style={{ backgroundColor: colorHex }}
                    />
                    {color}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
            type="button"
            onClick={handleConfirm}
            disabled={availableSizes.length > 0 && !selectedSize}
            className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}


