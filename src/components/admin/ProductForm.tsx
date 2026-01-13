"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import type { Category, Product } from "@/types";
import { PRODUCT_COLORS } from "@/lib/utils/colors";

interface ProductFormProps {
  categories: Category[];
  product?: Product | null;
  onSuccess?: () => void;
  onClose?: () => void;
  userRole?: string | null;
}

interface ImagePreview {
  file?: File;
  url: string;
  isUploaded: boolean;
}

export default function ProductForm({
  categories,
  product,
  onSuccess,
  onClose,
  userRole,
}: ProductFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [customColors, setCustomColors] = useState<
    Array<{ name: string; hex: string }>
  >([]);
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#000000");
  const [showAddColorForm, setShowAddColorForm] = useState(false);
  // Color stocks: Record<color, Record<size, quantity>> or Record<color, quantity>
  const [colorStocks, setColorStocks] = useState<
    Record<string, Record<string, string> | string>
  >({});

  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    price: product?.price || "",
    buying_price: product?.buying_price || "",
    sale_price: product?.sale_price || "",
    category_id: product?.category_id || "",
    initial_stock: product ? "" : "",
    size_stocks: {
      S: "",
      M: "",
      L: "",
      XL: "",
      "2XL": "",
      "3XL": "",
      "4XL": "",
      "5XL": "",
    },
    status: product?.status || "active",
    is_flash_sale: product?.is_flash_sale || false,
    flash_sale_start: product?.flash_sale_start
      ? new Date(product.flash_sale_start).toISOString().slice(0, 16)
      : "",
    flash_sale_end: product?.flash_sale_end
      ? new Date(product.flash_sale_end).toISOString().slice(0, 16)
      : "",
  });

  useEffect(() => {
    if (product) {
      // Fetch existing inventory and size-based stock
      const fetchProductInventory = async () => {
        try {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();

          // Fetch general inventory
          const { data: inventory } = await supabase
            .from("inventory")
            .select("stock_quantity")
            .eq("product_id", product.id)
            .single();

          // Fetch size-based inventory
          const { data: productSizes } = await supabase
            .from("product_sizes")
            .select("size, stock_quantity")
            .eq("product_id", product.id);

          // Fetch product colors
          const { data: productColors } = await supabase
            .from("product_colors")
            .select("color")
            .eq("product_id", product.id);

          // Fetch color-based inventory with error handling
          let colorInventory: any[] | null = null;
          try {
            const { data, error } = await supabase
              .from("product_size_colors")
              .select("color, size, stock_quantity")
              .eq("product_id", product.id);

            if (error) {
              console.warn(
                "Could not fetch color stocks from product_size_colors:",
                error
              );
              // Try API route fallback
              try {
                const response = await fetch(
                  `/api/products/${product.id}/color-stocks`
                );
                if (response.ok) {
                  const apiData = await response.json();
                  colorInventory = apiData.colorStocks || null;
                  console.log(
                    "Successfully fetched color stocks via API fallback"
                  );
                } else {
                  console.warn("API fallback also failed:", response.status);
                }
              } catch (apiError) {
                console.warn("API fallback error:", apiError);
              }
            } else {
              colorInventory = data;
            }
          } catch (err) {
            console.error("Error fetching color inventory:", err);
            // Try API route fallback
            try {
              const response = await fetch(
                `/api/products/${product.id}/color-stocks`
              );
              if (response.ok) {
                const apiData = await response.json();
                colorInventory = apiData.colorStocks || null;
                console.log(
                  "Successfully fetched color stocks via API fallback"
                );
              }
            } catch (apiError) {
              console.warn("API fallback error:", apiError);
            }
          }

          // Set selected colors
          if (productColors && productColors.length > 0) {
            setSelectedColors(productColors.map((pc: any) => pc.color));
          }

          // Build color_stocks object from fetched data
          const colorStocksData: Record<
            string,
            Record<string, string> | string
          > = {};
          if (colorInventory && colorInventory.length > 0) {
            console.log(
              `📦 Loading color stocks for product ${product.id}:`,
              colorInventory.length,
              "entries found"
            );
            // Check if product has sizes (if any entry has a non-null size)
            const hasSizes = colorInventory.some((ci: any) => ci.size !== null);

            if (hasSizes) {
              // Build size+color matrix
              colorInventory.forEach((ci: any) => {
                if (!colorStocksData[ci.color]) {
                  colorStocksData[ci.color] = {};
                }
                (colorStocksData[ci.color] as Record<string, string>)[
                  ci.size || ""
                ] = ci.stock_quantity.toString();
              });
              console.log(
                `✅ Built size+color matrix:`,
                Object.keys(colorStocksData).length,
                "colors"
              );
            } else {
              // Simple color-only quantities
              colorInventory.forEach((ci: any) => {
                colorStocksData[ci.color] = ci.stock_quantity.toString();
              });
              console.log(
                `✅ Built color-only quantities:`,
                Object.keys(colorStocksData).length,
                "colors"
              );
            }
          } else {
            console.log(
              `ℹ️ No color inventory found for product ${product.id} (this is normal if product has no color stocks)`
            );
          }
          // Always set colorStocks, even if empty (ensures state is initialized)
          setColorStocks(colorStocksData);
          console.log(
            `✅ Color stocks state set:`,
            Object.keys(colorStocksData).length,
            "colors"
          );

          // Build size_stocks object from fetched data
          const sizeStocks: {
            S: string;
            M: string;
            L: string;
            XL: string;
            "2XL": string;
            "3XL": string;
            "4XL": string;
            "5XL": string;
          } = {
            S: "",
            M: "",
            L: "",
            XL: "",
            "2XL": "",
            "3XL": "",
            "4XL": "",
            "5XL": "",
          };

          if (productSizes) {
            productSizes.forEach((size: any) => {
              const sizeKey = size.size as
                | "S"
                | "M"
                | "L"
                | "XL"
                | "2XL"
                | "3XL"
                | "4XL"
                | "5XL";
              if (
                sizeKey === "S" ||
                sizeKey === "M" ||
                sizeKey === "L" ||
                sizeKey === "XL" ||
                sizeKey === "2XL" ||
                sizeKey === "3XL" ||
                sizeKey === "4XL" ||
                sizeKey === "5XL"
              ) {
                sizeStocks[sizeKey] = (size.stock_quantity || 0).toString();
              }
            });
          }

          setFormData({
            name: product.name || "",
            description: product.description || "",
            price: product.price || "",
            buying_price: product.buying_price || "",
            sale_price: product.sale_price || "",
            category_id: product.category_id || "",
            initial_stock: inventory?.stock_quantity?.toString() || "",
            size_stocks: sizeStocks,
            status: product.status || "active",
            is_flash_sale: product.is_flash_sale || false,
            flash_sale_start: product.flash_sale_start
              ? new Date(product.flash_sale_start).toISOString().slice(0, 16)
              : "",
            flash_sale_end: product.flash_sale_end
              ? new Date(product.flash_sale_end).toISOString().slice(0, 16)
              : "",
          });

          // Set existing images as previews
          if (product.images && product.images.length > 0) {
            setImagePreviews(
              product.images.map((url) => ({
                url,
                isUploaded: true,
              }))
            );
          }
        } catch (error) {
          console.error("Error fetching product inventory:", error);
          // Ensure colorStocks is initialized even on error
          setColorStocks({});
          // Fallback to basic form data if fetch fails
          setFormData({
            name: product.name || "",
            description: product.description || "",
            price: product.price || "",
            buying_price: product.buying_price || "",
            sale_price: product.sale_price || "",
            category_id: product.category_id || "",
            initial_stock: "",
            size_stocks: {
              S: "",
              M: "",
              L: "",
              XL: "",
              "2XL": "",
              "3XL": "",
              "4XL": "",
              "5XL": "",
            },
            status: product.status || "active",
            is_flash_sale: product.is_flash_sale || false,
            flash_sale_start: product.flash_sale_start
              ? new Date(product.flash_sale_start).toISOString().slice(0, 16)
              : "",
            flash_sale_end: product.flash_sale_end
              ? new Date(product.flash_sale_end).toISOString().slice(0, 16)
              : "",
          });
        }
      };

      fetchProductInventory();
    } else {
      setImagePreviews([]);
    }
  }, [product]);

  // Auto-calculate size stocks from color stocks when colors are selected
  useEffect(() => {
    // Only calculate if colors are selected and color stocks exist
    if (selectedColors.length > 0 && Object.keys(colorStocks).length > 0) {
      const calculatedSizeStocks: {
        S: string;
        M: string;
        L: string;
        XL: string;
        "2XL": string;
        "3XL": string;
        "4XL": string;
        "5XL": string;
      } = {
        S: "",
        M: "",
        L: "",
        XL: "",
        "2XL": "",
        "3XL": "",
        "4XL": "",
        "5XL": "",
      };

      const validSizes = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

      // Sum up all color stocks for each size
      Object.entries(colorStocks).forEach(([color, value]) => {
        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          // Size+color combinations: { "Red": { "M": "5", "L": "3" } }
          Object.entries(value).forEach(([size, qty]) => {
            if (validSizes.includes(size)) {
              const currentQty =
                parseInt(
                  calculatedSizeStocks[
                    size as keyof typeof calculatedSizeStocks
                  ] || "0"
                ) || 0;
              const colorQty = parseInt(qty.toString() || "0") || 0;
              calculatedSizeStocks[size as keyof typeof calculatedSizeStocks] =
                (currentQty + colorQty).toString();
            }
          });
        }
        // Note: Color-only quantities (without sizes) don't contribute to size breakdown
      });

      // Update formData with calculated size stocks
      setFormData((prev) => ({
        ...prev,
        size_stocks: calculatedSizeStocks,
      }));

      // Also update initial_stock to be the sum of all sizes
      const totalStock = Object.values(calculatedSizeStocks).reduce(
        (sum, val) => sum + (parseInt(val.toString()) || 0),
        0
      );
      if (totalStock > 0) {
        setFormData((prev) => ({
          ...prev,
          initial_stock: totalStock.toString(),
        }));
      }
    }
  }, [colorStocks, selectedColors]);

  // Cleanup: revoke object URLs when component unmounts or modal closes
  useEffect(() => {
    if (!isOpen) {
      imagePreviews.forEach((preview) => {
        if (preview.file && !preview.isUploaded) {
          URL.revokeObjectURL(preview.url);
        }
      });
    }
  }, [isOpen]);

  // Auto-open modal when a product is passed (for editing)
  useEffect(() => {
    if (product) {
      // Open modal when product is set (for editing from table)
      setIsOpen(true);
    }
  }, [product?.id]); // Only trigger when product ID changes

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

  const moveImage = (index: number, direction: "up" | "down") => {
    setImagePreviews((prev) => {
      const newPreviews = [...prev];
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= newPreviews.length) return prev;
      [newPreviews[index], newPreviews[newIndex]] = [
        newPreviews[newIndex],
        newPreviews[index],
      ];
      return newPreviews;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const hasDatabase =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL !== "placeholder";

      if (!hasDatabase) {
        // Preview mode - simulate success
        alert(
          product
            ? "Product updated successfully! (Preview Mode)"
            : "Product created successfully! (Preview Mode)"
        );
        if (onSuccess) onSuccess();
        setIsOpen(false);
        if (onClose) onClose();
        return;
      }

      // Validate required fields
      if (!formData.name || !formData.name.trim()) {
        alert("Product name is required");
        setLoading(false);
        return;
      }

      if (!formData.price || parseFloat(formData.price.toString()) <= 0) {
        alert("Valid price is required");
        setLoading(false);
        return;
      }

      // Validate stock quantity
      const initialStockValue =
        parseInt(formData.initial_stock.toString()) || 0;
      if (initialStockValue < 0) {
        alert("Stock quantity cannot be negative");
        setLoading(false);
        return;
      }

      // Get image URLs from previews
      const images = imagePreviews.map((preview) => preview.url);

      // Prepare size stocks object (only include sizes with values)
      // If colors are selected, recalculate size stocks from color stocks
      let sizeStocks: Record<string, number> = {};

      if (selectedColors.length > 0 && Object.keys(colorStocks).length > 0) {
        // Recalculate size stocks from color stocks
        const validSizes = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
        Object.entries(colorStocks).forEach(([color, value]) => {
          if (
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value)
          ) {
            // Size+color combinations: { "Red": { "M": "5", "L": "3" } }
            Object.entries(value).forEach(([size, qty]) => {
              if (validSizes.includes(size)) {
                const currentQty = sizeStocks[size] || 0;
                const colorQty = parseInt(qty.toString() || "0") || 0;
                sizeStocks[size] = currentQty + colorQty;
              }
            });
          }
        });
      } else {
        // Use form data when no colors are selected
        Object.entries(formData.size_stocks).forEach(([size, value]) => {
          const numValue = parseInt(value.toString()) || 0;
          if (numValue > 0) {
            sizeStocks[size] = numValue;
          }
        });
      }

      const hasSizeStocks = Object.keys(sizeStocks).length > 0;

      // Prepare color stocks object
      const colorStocksData: Record<string, Record<string, number> | number> =
        {};
      // Check if color stocks have sizes (size+color combinations) or if size stocks exist
      const hasSizes =
        hasSizeStocks ||
        Object.values(colorStocks).some(
          (value) =>
            typeof value === "object" &&
            value !== null &&
            !Array.isArray(value) &&
            Object.keys(value).length > 0
        );

      Object.entries(colorStocks).forEach(([color, value]) => {
        if (hasSizes && typeof value === "object") {
          // Size+color combinations
          const sizeQuantities: Record<string, number> = {};
          Object.entries(value).forEach(([size, qty]) => {
            const numValue = parseInt(qty.toString()) || 0;
            if (numValue > 0) {
              sizeQuantities[size] = numValue;
            }
          });
          if (Object.keys(sizeQuantities).length > 0) {
            colorStocksData[color] = sizeQuantities;
          }
        } else if (!hasSizes && typeof value === "string") {
          // Color-only quantities
          const numValue = parseInt(value) || 0;
          if (numValue > 0) {
            colorStocksData[color] = numValue;
          }
        }
      });

      const hasColorStocks = Object.keys(colorStocksData).length > 0;

      // Log what we're capturing
      console.log("📦 Product Form - Captured Data:", {
        name: formData.name,
        price: formData.price,
        buying_price: formData.buying_price,
        initial_stock: {
          raw: formData.initial_stock,
          parsed: initialStockValue,
          type: typeof formData.initial_stock,
        },
        size_stocks: {
          raw: formData.size_stocks,
          processed: sizeStocks,
          sum: Object.values(sizeStocks).reduce((sum, val) => sum + val, 0),
        },
        has_images: images.length > 0,
      });

      // Log what we're sending for debugging
      console.log("📦 Product Form Data Being Sent:", {
        initial_stock: initialStockValue,
        initial_stock_raw: formData.initial_stock,
        size_stocks: hasSizeStocks ? sizeStocks : null,
        size_stocks_sum: Object.values(sizeStocks).reduce(
          (sum, val) => sum + val,
          0
        ),
        total_expected: initialStockValue,
      });

      // Validate that if sizes are provided, they sum to total stock
      if (hasSizeStocks && initialStockValue > 0) {
        const sizeSum = Object.values(sizeStocks).reduce(
          (sum, val) => sum + val,
          0
        );
        if (sizeSum !== initialStockValue) {
          const proceed = confirm(
            `Warning: Size breakdown (${sizeSum}) doesn't match total stock (${initialStockValue}).\n\n` +
              `The total stock quantity will be saved as ${initialStockValue}.\n\n` +
              `Continue anyway?`
          );
          if (!proceed) {
            setLoading(false);
            return;
          }
        }
      }

      // For sellers, preserve existing buying_price if editing, otherwise set to null
      let buyingPriceValue: number | null = null;
      if (userRole === "admin") {
        // Admins can set/change buying_price
        buyingPriceValue = formData.buying_price
          ? parseFloat(formData.buying_price.toString())
          : null;
      } else if (
        product?.id &&
        product?.buying_price !== null &&
        product?.buying_price !== undefined
      ) {
        // Sellers editing existing product: preserve existing buying_price
        buyingPriceValue =
          typeof product.buying_price === "number"
            ? product.buying_price
            : typeof product.buying_price === "string"
            ? parseFloat(product.buying_price) || null
            : null;
      }
      // For sellers creating new product: buying_price remains null

      const requestBody = {
        ...formData,
        id: product?.id,
        price: parseFloat(formData.price.toString()),
        buying_price: buyingPriceValue,
        sale_price: formData.sale_price
          ? parseFloat(formData.sale_price.toString())
          : null,
        initial_stock: initialStockValue,
        size_stocks: hasSizeStocks ? sizeStocks : null,
        colors: selectedColors.length > 0 ? selectedColors : null,
        color_stocks: hasColorStocks ? colorStocksData : null,
        images,
        flash_sale_start:
          formData.is_flash_sale && formData.flash_sale_start
            ? new Date(formData.flash_sale_start).toISOString()
            : null,
        flash_sale_end:
          formData.is_flash_sale && formData.flash_sale_end
            ? new Date(formData.flash_sale_end).toISOString()
            : null,
      };

      console.log("📤 Sending to API:", {
        initial_stock: requestBody.initial_stock,
        size_stocks: requestBody.size_stocks,
        has_images: requestBody.images.length > 0,
      });

      const response = await fetch("/api/products", {
        method: product ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save product");
      }

      const responseData = await response.json();

      // Check for warnings (e.g., inventory creation failed)
      if (responseData.warning) {
        console.warn("Product saved with warning:", responseData.warning);
        // Still show success, but log the warning
      }

      // Show success modal
      setShowSuccessModal(true);

      // Auto-close success modal after 2 seconds and refresh
      setTimeout(() => {
        setShowSuccessModal(false);
        setIsOpen(false);
        // Reset custom colors and form state
        setCustomColors([]);
        setSelectedColors([]);
        setColorStocks({});
        setShowAddColorForm(false);
        setNewColorName("");
        setNewColorHex("#000000");
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }, 2000);
    } catch (error) {
      console.error("Error saving product:", error);
      alert(error instanceof Error ? error.message : "Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setIsOpen(true);
    if (!product) {
      // Reset form for new product
      setFormData({
        name: "",
        description: "",
        price: "",
        buying_price: "",
        sale_price: "",
        category_id: "",
        initial_stock: "",
        size_stocks: {
          S: "",
          M: "",
          L: "",
          XL: "",
          "2XL": "",
          "3XL": "",
          "4XL": "",
          "5XL": "",
        },
        status: "active",
        is_flash_sale: false,
        flash_sale_start: "",
        flash_sale_end: "",
      });
      setImagePreviews([]);
      setSelectedColors([]);
      setColorStocks({});
      setCustomColors([]);
      setShowAddColorForm(false);
      setNewColorName("");
      setNewColorHex("#000000");
    }
  };

  return (
    <>
      <button
        id="product-edit-button"
        onClick={openModal}
        className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark hover:shadow-lg transition-all hover:scale-105"
      >
        {product ? "✏️ Edit Product" : "+ Add Product"}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {product ? "Edit Product" : "Add New Product"}
              </h2>
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (onClose) onClose();
                }}
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

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Basic Information */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Basic Information
                  </h3>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2.5 text-base border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Enter product name"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={4}
                    className="w-full px-3 py-2.5 text-base border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Enter product description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category_id}
                    onChange={(e) =>
                      setFormData({ ...formData, category_id: e.target.value })
                    }
                    className="w-full px-3 py-2.5 text-base border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as "active" | "inactive",
                      })
                    }
                    className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {/* Pricing */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 mt-4">
                    Pricing
                  </h3>
                </div>

                {userRole === "admin" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Buying Price (KES)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.buying_price}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          buying_price: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 text-base border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="Cost price"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      The price you paid to purchase this product
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Selling Price (KES) *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="0.00"
                  />
                  {userRole === "admin" &&
                    formData.buying_price &&
                    formData.price && (
                      <p className="text-xs text-green-600 mt-1">
                        Profit: KES{" "}
                        {(
                          (parseFloat(formData.price.toString()) || 0) -
                          (parseFloat(formData.buying_price.toString()) || 0)
                        ).toLocaleString("en-KE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        (
                        {Math.round(
                          (((parseFloat(formData.price.toString()) || 0) -
                            (parseFloat(formData.buying_price.toString()) ||
                              0)) /
                            (parseFloat(formData.buying_price.toString()) ||
                              1)) *
                            100
                        )}
                        % margin)
                      </p>
                    )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Flash Sale Price (KES)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.sale_price}
                    onChange={(e) =>
                      setFormData({ ...formData, sale_price: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Optional"
                  />
                  {formData.sale_price && formData.price && (
                    <p className="text-xs text-gray-500 mt-1">
                      Discount:{" "}
                      {Math.round(
                        (1 -
                          parseFloat(formData.sale_price.toString()) /
                            parseFloat(formData.price.toString())) *
                          100
                      )}
                      %
                    </p>
                  )}
                  {userRole === "admin" &&
                    formData.sale_price &&
                    formData.buying_price && (
                      <p className="text-xs text-green-600 mt-1">
                        Profit on Sale: KES{" "}
                        {(
                          (parseFloat(formData.sale_price.toString()) || 0) -
                          (parseFloat(formData.buying_price.toString()) || 0)
                        ).toLocaleString("en-KE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    )}
                </div>

                {/* Flash Sale */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 mt-4">
                    Flash Sale
                  </h3>
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_flash_sale}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_flash_sale: e.target.checked,
                        })
                      }
                      className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm font-semibold text-gray-700">
                      Enable Flash Sale
                    </span>
                  </label>
                </div>

                {formData.is_flash_sale && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Flash Sale Start Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.flash_sale_start}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            flash_sale_start: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2.5 text-base border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Flash Sale End Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.flash_sale_end}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            flash_sale_end: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2.5 text-base border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </>
                )}

                {/* Images */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 mt-4">
                    Product Images
                  </h3>

                  {/* File Upload Area */}
                  <div className="mb-4">
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
                      className="w-full px-6 py-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                          <span className="text-sm font-medium text-gray-700">
                            Uploading images...
                          </span>
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-8 h-8 text-gray-400"
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
                          <span className="text-sm font-medium text-gray-700">
                            Click to upload images
                          </span>
                          <span className="text-xs text-gray-500">
                            PNG, JPG, WEBP up to 10MB each
                          </span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Image Previews */}
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative group">
                          <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border-2 border-gray-200">
                            <Image
                              src={preview.url}
                              alt={`Product image ${index + 1}`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 50vw, 25vw"
                            />
                            {/* Main Image Badge */}
                            {index === 0 && (
                              <div className="absolute top-2 left-2 bg-primary text-white text-xs font-semibold px-2 py-1 rounded-full">
                                Main
                              </div>
                            )}
                            {/* Remove Button */}
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              title="Remove image"
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
                            {/* Upload Status */}
                            {!preview.isUploaded && preview.file && (
                              <div className="absolute bottom-2 left-2 right-2 bg-yellow-500 text-white text-xs font-medium px-2 py-1 rounded text-center">
                                Pending Upload
                              </div>
                            )}
                          </div>
                          {/* Reorder Buttons */}
                          {imagePreviews.length > 1 && (
                            <div className="absolute bottom-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {index > 0 && (
                                <button
                                  type="button"
                                  onClick={() => moveImage(index, "up")}
                                  className="bg-white/90 hover:bg-white text-gray-700 rounded p-1 shadow-sm"
                                  title="Move up"
                                >
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 15l7-7 7 7"
                                    />
                                  </svg>
                                </button>
                              )}
                              {index < imagePreviews.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => moveImage(index, "down")}
                                  className="bg-white/90 hover:bg-white text-gray-700 rounded p-1 shadow-sm"
                                  title="Move down"
                                >
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 9l-7 7-7-7"
                                    />
                                  </svg>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-3">
                    Upload multiple images. The first image will be used as the
                    main product image. You can reorder images by using the
                    arrow buttons.
                  </p>
                </div>

                {/* Stock */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 mt-4">
                    Stock Management
                  </h3>
                  <div className="md:col-span-2 mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Total Stock Quantity *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.initial_stock}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          initial_stock: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 text-base border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="Enter total stock quantity"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Total number of pieces available for this product
                    </p>
                  </div>

                  {/* Size-based Stock Breakdown */}
                  <div className="md:col-span-2">
                    <h4 className="text-md font-semibold text-gray-800 mb-3">
                      Stock Breakdown by Size (Optional)
                    </h4>
                    <p className="text-xs text-gray-500 mb-4">
                      {selectedColors.length > 0 &&
                      Object.keys(colorStocks).length > 0
                        ? "Automatically calculated from color stocks. Edit color quantities below to change these values."
                        : "Break down the total stock by size. The sum of all sizes should equal the total stock quantity above."}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
                      {(
                        [
                          "S",
                          "M",
                          "L",
                          "XL",
                          "2XL",
                          "3XL",
                          "4XL",
                          "5XL",
                        ] as const
                      ).map((size) => {
                        const isReadOnly =
                          selectedColors.length > 0 &&
                          Object.keys(colorStocks).length > 0;
                        return (
                          <div key={size}>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                              Size {size}
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={
                                formData.size_stocks[
                                  size as keyof typeof formData.size_stocks
                                ]
                              }
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  size_stocks: {
                                    ...formData.size_stocks,
                                    [size]: e.target.value,
                                  },
                                })
                              }
                              readOnly={isReadOnly}
                              className={`w-full px-3 py-2.5 text-base border-2 rounded-lg ${
                                isReadOnly
                                  ? "border-gray-300 bg-gray-50 text-gray-600 cursor-not-allowed"
                                  : "border-gray-200 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                              }`}
                              placeholder="0"
                              title={
                                isReadOnly
                                  ? "Calculated from color stocks - edit colors below to change"
                                  : ""
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-gray-500">
                        Total pieces:{" "}
                        <span className="font-semibold text-gray-900">
                          {parseInt(formData.initial_stock.toString()) || 0}
                        </span>
                      </p>
                      {(() => {
                        const sizeSum = Object.values(
                          formData.size_stocks
                        ).reduce(
                          (sum, val) => sum + (parseInt(val.toString()) || 0),
                          0
                        );
                        const totalStock =
                          parseInt(formData.initial_stock.toString()) || 0;
                        const difference = totalStock - sizeSum;

                        if (sizeSum > 0 && totalStock > 0) {
                          if (difference === 0) {
                            return (
                              <p className="text-xs text-green-600 font-medium">
                                ✓ Size breakdown matches total stock
                              </p>
                            );
                          } else if (difference > 0) {
                            return (
                              <p className="text-xs text-yellow-600 font-medium">
                                ⚠ Size breakdown: {sizeSum} pieces. Missing{" "}
                                {difference} pieces to match total stock.
                              </p>
                            );
                          } else {
                            return (
                              <p className="text-xs text-red-600 font-medium">
                                ✗ Size breakdown: {sizeSum} pieces. Exceeds
                                total stock by {Math.abs(difference)} pieces.
                              </p>
                            );
                          }
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Color Selection */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-md font-semibold text-gray-800">
                    Available Colors (Optional)
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAddColorForm(!showAddColorForm)}
                    className="px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-1"
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
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Add Color
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Select the colors available for this product
                </p>

                {/* Add New Color Form */}
                {showAddColorForm && (
                  <div className="mb-4 p-4 bg-white rounded-lg border-2 border-primary/30">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Color Name
                        </label>
                        <input
                          type="text"
                          value={newColorName}
                          onChange={(e) => setNewColorName(e.target.value)}
                          placeholder="e.g., Burgundy"
                          className="w-full px-3 py-2.5 text-base border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                          Color Preview
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={newColorHex}
                            onChange={(e) => setNewColorHex(e.target.value)}
                            className="w-12 h-10 border-2 border-gray-200 rounded-lg cursor-pointer"
                          />
                          <input
                            type="text"
                            value={newColorHex}
                            onChange={(e) => setNewColorHex(e.target.value)}
                            placeholder="#000000"
                            className="flex-1 px-3 py-2.5 text-base border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-mono"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (newColorName.trim()) {
                              const colorName = newColorName.trim();
                              // Check if color already exists
                              const allColors = [
                                ...PRODUCT_COLORS,
                                ...customColors,
                              ];
                              const colorExists = allColors.some(
                                (c) =>
                                  c.name.toLowerCase() ===
                                  colorName.toLowerCase()
                              );

                              if (!colorExists) {
                                const newColor = {
                                  name: colorName,
                                  hex: newColorHex,
                                };
                                setCustomColors([...customColors, newColor]);
                                // Immediately select the new color
                                setSelectedColors([
                                  ...selectedColors,
                                  colorName,
                                ]);
                                // Initialize color_stocks entry for this color
                                const hasSizes = Object.keys(
                                  formData.size_stocks
                                ).some(
                                  (size) =>
                                    formData.size_stocks[
                                      size as keyof typeof formData.size_stocks
                                    ] !== ""
                                );
                                if (hasSizes) {
                                  setColorStocks({
                                    ...colorStocks,
                                    [colorName]: {},
                                  });
                                } else {
                                  setColorStocks({
                                    ...colorStocks,
                                    [colorName]: "",
                                  });
                                }
                                // Reset form
                                setNewColorName("");
                                setNewColorHex("#000000");
                                setShowAddColorForm(false);
                              } else {
                                alert(`Color "${colorName}" already exists.`);
                              }
                            } else {
                              alert("Please enter a color name.");
                            }
                          }}
                          className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors text-sm"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddColorForm(false);
                            setNewColorName("");
                            setNewColorHex("#000000");
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {/* Standard Colors */}
                  {PRODUCT_COLORS.map((color) => (
                    <label
                      key={color.name}
                      className="flex items-center gap-2 p-2 rounded-lg border-2 border-gray-200 hover:border-primary/50 cursor-pointer transition-colors bg-white"
                    >
                      <input
                        type="checkbox"
                        checked={selectedColors.includes(color.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedColors([...selectedColors, color.name]);
                            // Initialize color_stocks entry for this color
                            const hasSizes = Object.keys(
                              formData.size_stocks
                            ).some(
                              (size) =>
                                formData.size_stocks[
                                  size as keyof typeof formData.size_stocks
                                ] !== ""
                            );
                            if (hasSizes) {
                              setColorStocks({
                                ...colorStocks,
                                [color.name]: {},
                              });
                            } else {
                              setColorStocks({
                                ...colorStocks,
                                [color.name]: "",
                              });
                            }
                          } else {
                            setSelectedColors(
                              selectedColors.filter((c) => c !== color.name)
                            );
                            // Remove color from color_stocks
                            const newColorStocks = { ...colorStocks };
                            delete newColorStocks[color.name];
                            setColorStocks(newColorStocks);
                          }
                        }}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                      />
                      <div
                        className="w-5 h-5 rounded-full border border-gray-300 shadow-sm"
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {color.name}
                      </span>
                    </label>
                  ))}
                  {/* Custom Colors */}
                  {customColors.map((color) => (
                    <label
                      key={color.name}
                      className="flex items-center gap-2 p-2 rounded-lg border-2 border-primary/30 hover:border-primary/50 cursor-pointer transition-colors bg-white"
                    >
                      <input
                        type="checkbox"
                        checked={selectedColors.includes(color.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedColors([...selectedColors, color.name]);
                            // Initialize color_stocks entry for this color
                            const hasSizes = Object.keys(
                              formData.size_stocks
                            ).some(
                              (size) =>
                                formData.size_stocks[
                                  size as keyof typeof formData.size_stocks
                                ] !== ""
                            );
                            if (hasSizes) {
                              setColorStocks({
                                ...colorStocks,
                                [color.name]: {},
                              });
                            } else {
                              setColorStocks({
                                ...colorStocks,
                                [color.name]: "",
                              });
                            }
                          } else {
                            setSelectedColors(
                              selectedColors.filter((c) => c !== color.name)
                            );
                            // Remove color from color_stocks
                            const newColorStocks = { ...colorStocks };
                            delete newColorStocks[color.name];
                            setColorStocks(newColorStocks);
                          }
                        }}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-2"
                      />
                      <div
                        className="w-5 h-5 rounded-full border border-gray-300 shadow-sm"
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {color.name}
                      </span>
                    </label>
                  ))}
                </div>
                {selectedColors.length > 0 && (
                  <p className="text-xs text-gray-600 mt-3">
                    Selected: {selectedColors.join(", ")}
                  </p>
                )}
              </div>

              {/* Color Stock Quantities */}
              {selectedColors.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 mt-4">
                  <h4 className="text-md font-semibold text-gray-800 mb-3">
                    Stock Quantities by Color
                  </h4>
                  <p className="text-xs text-gray-500 mb-4">
                    Specify the quantity available for each color. If the
                    product has sizes, enter quantities for each size+color
                    combination.
                  </p>

                  {(() => {
                    const hasSizes = Object.keys(formData.size_stocks).some(
                      (size) =>
                        formData.size_stocks[
                          size as keyof typeof formData.size_stocks
                        ] !== ""
                    );
                    const sizes = hasSizes
                      ? ([
                          "S",
                          "M",
                          "L",
                          "XL",
                          "2XL",
                          "3XL",
                          "4XL",
                          "5XL",
                        ] as const)
                      : [];

                    return (
                      <div className="space-y-4">
                        {selectedColors.map((colorName) => {
                          const allColors = [
                            ...PRODUCT_COLORS,
                            ...customColors,
                          ];
                          const colorInfo = allColors.find(
                            (c) => c.name === colorName
                          );
                          const colorHex = colorInfo?.hex || "#CCCCCC";

                          return (
                            <div
                              key={colorName}
                              className="bg-white rounded-lg p-4 border border-gray-200"
                            >
                              <div className="flex items-center gap-3 mb-3">
                                <div
                                  className="w-6 h-6 rounded-full border border-gray-300 shadow-sm"
                                  style={{ backgroundColor: colorHex }}
                                  title={colorName}
                                />
                                <span className="text-sm font-semibold text-gray-800">
                                  {colorName}
                                </span>
                              </div>

                              {hasSizes ? (
                                // Size+Color matrix
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2">
                                  {sizes.map((size) => {
                                    const currentValue =
                                      (
                                        colorStocks[colorName] as Record<
                                          string,
                                          string
                                        >
                                      )?.[size] || "";

                                    return (
                                      <div key={size}>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                          {size}
                                        </label>
                                        <input
                                          type="number"
                                          min="0"
                                          value={currentValue}
                                          onChange={(e) => {
                                            const newColorStocks = {
                                              ...colorStocks,
                                            };
                                            if (!newColorStocks[colorName]) {
                                              newColorStocks[colorName] = {};
                                            }
                                            (
                                              newColorStocks[
                                                colorName
                                              ] as Record<string, string>
                                            )[size] = e.target.value;
                                            setColorStocks(newColorStocks);
                                          }}
                                          className="w-full px-2 py-2 text-base border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                          placeholder="0"
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                // Color-only quantity
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Quantity
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={
                                      (colorStocks[colorName] as string) || ""
                                    }
                                    onChange={(e) => {
                                      setColorStocks({
                                        ...colorStocks,
                                        [colorName]: e.target.value,
                                      });
                                    }}
                                    className="w-full px-3 py-2.5 text-base border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    placeholder="Enter quantity"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    // Reset custom colors when canceling
                    setCustomColors([]);
                    setShowAddColorForm(false);
                    setNewColorName("");
                    setNewColorHex("#000000");
                    if (onClose) onClose();
                  }}
                  className="w-full sm:w-auto px-6 py-3 bg-gray-200 text-gray-700 rounded-lg sm:rounded-none font-semibold hover:bg-gray-300 transition-all text-base order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || uploadingImages}
                  className="w-full sm:flex-1 px-6 py-3 bg-primary text-white rounded-lg sm:rounded-none font-semibold hover:bg-primary-dark hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base order-1 sm:order-2"
                >
                  {loading
                    ? "Saving..."
                    : uploadingImages
                    ? "Uploading Images..."
                    : product
                    ? "Update Product"
                    : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 text-center animate-scale-in">
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
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              {product ? "Product Updated!" : "Product Created!"}
            </h3>
            <p className="text-gray-600">
              {product
                ? "Your product has been updated successfully."
                : "Your product has been created successfully and is now available."}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
