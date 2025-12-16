'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import AddToCartButton from '@/components/products/AddToCartButton';
import WhatsAppWidget from '@/components/whatsapp/WhatsAppWidget';
import type { Product } from '@/types';
import { PRODUCT_COLORS } from '@/lib/utils/colors';

// Enhanced product type with color variations (optional, for future use)
interface ProductVariant {
  color: string;
  colorCode: string;
  images: string[];
  stock: number;
}

interface SizeOption {
  size: string;
  available: number;
}

interface EnhancedProduct extends Product {
  available_stock?: number;
  categories: { name: string };
  variants?: ProductVariant[];
  sizes?: SizeOption[];
  colors?: string[];
}

interface ProductDetailClientProps {
  product: EnhancedProduct;
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  // If available_stock is undefined, treat as in stock (inventory not set up yet)
  const availableStock = product.available_stock ?? undefined;
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(
    product.colors && product.colors.length > 0 ? product.colors[0] : null
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(
    product.sizes && product.sizes.length > 0 ? product.sizes[0].size : null
  );
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [thumbnailScrollRefState, setThumbnailScrollRef] = useState<HTMLDivElement | null>(null);

  // Get current variant based on selected color (for backward compatibility with variants)
  const currentVariant = product.variants?.find((v) => v.color === selectedColor);
  const displayImages = currentVariant?.images || product.images || [];
  
  // Calculate current stock based on selected size
  let currentStock = availableStock;
  if (selectedSize && product.sizes) {
    const selectedSizeOption = product.sizes.find((s) => s.size === selectedSize);
    if (selectedSizeOption) {
      currentStock = selectedSizeOption.available;
    }
  } else if (currentVariant) {
    currentStock = currentVariant.stock;
  }

  // Calculate display price (use sale_price if available and on flash sale)
  const isOnSale = product.is_flash_sale && product.sale_price !== null && product.sale_price !== undefined;
  // Ensure displayPrice is always a number, never null/undefined
  const displayPrice = isOnSale && product.sale_price 
    ? (product.sale_price ? Number(product.sale_price) : 0)
    : (product.price ? Number(product.price) : 0);
  const originalPrice = isOnSale ? (product.price ? Number(product.price) : null) : null;

  // Minimum swipe distance (in pixels)
  const minSwipeDistance = 50;

  // Handle touch start
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  // Handle touch move
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  // Handle touch end (swipe detection)
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && displayImages && displayImages.length > 1) {
      setSelectedImage((prev) => (prev + 1) % displayImages.length);
    }
    if (isRightSwipe && displayImages && displayImages.length > 1) {
      setSelectedImage((prev) => (prev - 1 + displayImages.length) % displayImages.length);
    }
  };

  // Navigate to next image
  const nextImage = () => {
    if (displayImages && displayImages.length > 1) {
      setSelectedImage((prev) => (prev + 1) % displayImages.length);
    }
  };

  // Navigate to previous image
  const prevImage = () => {
    if (displayImages && displayImages.length > 1) {
      setSelectedImage((prev) => (prev - 1 + displayImages.length) % displayImages.length);
    }
  };

  // Scroll thumbnails
  const scrollThumbnails = (direction: 'left' | 'right') => {
    const container = thumbnailScrollRefState;
    if (container) {
      const scrollAmount = 200;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Keyboard navigation for image modal
  useEffect(() => {
    if (!isImageModalOpen || !displayImages || displayImages.length <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setModalImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
      } else if (e.key === 'ArrowRight') {
        setModalImageIndex((prev) => (prev + 1) % displayImages.length);
      } else if (e.key === 'Escape') {
        setIsImageModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImageModalOpen, displayImages]);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-600">
        <Link href="/" className="hover:text-primary">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/products" className="hover:text-primary">Products</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-fade-in">
        {/* Product Images */}
        <div className="space-y-4">
          {/* Main Image with Navigation */}
          <div className="relative">
            <div 
              className="aspect-square relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl overflow-hidden shadow-lg group cursor-zoom-in"
              onClick={() => {
                if (displayImages.length > 0) {
                  setIsImageModalOpen(true);
                  setModalImageIndex(selectedImage);
                }
              }}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {displayImages && displayImages.length > 0 ? (
                <>
                  <Image
                    src={displayImages[selectedImage] || displayImages[0]}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500 select-none"
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    draggable={false}
                    unoptimized={(displayImages[selectedImage] || displayImages[0])?.includes('unsplash.com') || (displayImages[selectedImage] || displayImages[0])?.includes('unsplash')}
                  />
                  {/* Flash Sale Badge */}
                  {isOnSale && (
                    <div className="absolute top-4 left-4 z-20 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-pulse">
                      {Math.round(((product.price - displayPrice) / product.price) * 100)}% OFF
                    </div>
                  )}
                  {/* Zoom indicator */}
                  <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                    </svg>
                  </div>
                  
                  {/* Image Counter */}
                  {displayImages.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm font-medium">
                      {selectedImage + 1} / {displayImages.length}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Navigation Arrows */}
            {displayImages && displayImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white backdrop-blur-sm rounded-full p-3 shadow-lg transition-all hover:scale-110 z-10"
                  aria-label="Previous image"
                >
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white backdrop-blur-sm rounded-full p-3 shadow-lg transition-all hover:scale-110 z-10"
                  aria-label="Next image"
                >
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>
          
          {/* Scrollable Thumbnail Images */}
          {displayImages && displayImages.length > 1 && (
            <div className="relative">
              {/* Scroll Left Button */}
              {displayImages.length > 4 && (
                <button
                  onClick={() => scrollThumbnails('left')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-all"
                  aria-label="Scroll thumbnails left"
                >
                  <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              
              {/* Thumbnail Container */}
              <div
                ref={setThumbnailScrollRef}
                className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {displayImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedImage(index);
                      // Scroll thumbnail into view
                      if (thumbnailScrollRefState) {
                        const thumbnail = thumbnailScrollRefState.children[index] as HTMLElement;
                        thumbnail?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                      }
                    }}
                    className={`relative flex-shrink-0 w-20 h-20 bg-gray-100 rounded-xl overflow-hidden border-2 transition-all snap-center ${
                      selectedImage === index
                        ? 'border-primary shadow-md scale-105'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                      draggable={false}
                    />
                  </button>
                ))}
              </div>

              {/* Scroll Right Button */}
              {displayImages.length > 4 && (
                <button
                  onClick={() => scrollThumbnails('right')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-all"
                  aria-label="Scroll thumbnails right"
                >
                  <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Product Details */}
        <div className="space-y-6 animate-slide-up">
          <div>
            {product.categories && (
              <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium mb-3">
                {product.categories.name}
              </span>
            )}
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">{product.name}</h1>
          </div>

          <div className="flex items-center gap-4 pb-6 border-b border-gray-200">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-5xl font-bold text-primary">
                  KES {(displayPrice || 0).toLocaleString()}
                </span>
                {originalPrice && (
                  <span className="text-xl text-gray-400 line-through">
                    KES {(originalPrice || 0).toLocaleString()}
                  </span>
                )}
              </div>
              {isOnSale && (
                <span className="text-sm text-red-600 font-semibold mt-1">
                  Save {Math.round(((product.price - displayPrice) / product.price) * 100)}%
                </span>
              )}
            </div>
            <span
              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                currentStock > 0
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {currentStock > 0
                ? `✓ ${currentStock} in stock`
                : '✗ Out of stock'}
            </span>
          </div>

          {/* Color Selection */}
          {product.colors && product.colors.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-lg font-semibold text-gray-900">
                  Color: {selectedColor && <span className="text-primary">{selectedColor}</span>}
                </label>
              </div>
              <div className="flex flex-wrap gap-3">
                {product.colors.map((color) => {
                  const colorDef = PRODUCT_COLORS.find((c) => c.name.toLowerCase() === color.toLowerCase());
                  const colorHex = colorDef?.hex || '#808080';
                  
                  return (
                    <button
                      key={color}
                      onClick={() => {
                        setSelectedColor(color);
                        setSelectedImage(0); // Reset to first image when color changes
                      }}
                      className={`relative group flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        selectedColor === color
                          ? 'border-primary shadow-lg scale-105'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div
                        className="w-12 h-12 rounded-full border-2 border-gray-300 shadow-sm"
                        style={{ backgroundColor: colorHex }}
                        title={color}
                      />
                      <span className="text-xs font-medium text-gray-700">{color}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Selection */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="space-y-3">
              <label className="text-lg font-semibold text-gray-900">
                Size: {selectedSize && <span className="text-primary">{selectedSize}</span>}
              </label>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((sizeOption) => {
                  const isAvailable = sizeOption.available > 0;
                  const isSelected = selectedSize === sizeOption.size;
                  
                  return (
                    <button
                      key={sizeOption.size}
                      onClick={() => isAvailable && setSelectedSize(sizeOption.size)}
                      disabled={!isAvailable}
                      className={`px-4 py-2 rounded-lg border-2 font-semibold transition-all ${
                        isSelected
                          ? 'border-primary bg-primary text-white'
                          : isAvailable
                          ? 'border-gray-200 text-gray-700 hover:border-primary hover:text-primary'
                          : 'border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed opacity-50'
                      }`}
                      title={!isAvailable ? 'Out of stock' : `${sizeOption.available} available`}
                    >
                      {sizeOption.size}
                      {isAvailable && (
                        <span className="ml-1 text-xs opacity-75">({sizeOption.available})</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {!selectedSize && (
                <p className="text-sm text-red-600">Please select a size</p>
              )}
            </div>
          )}

          {product.description && (
            <div className="prose max-w-none">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900">Description</h2>
              <p className="text-gray-700 whitespace-pre-line leading-relaxed text-lg">
                {product.description}
              </p>
            </div>
          )}

          {/* Product Features */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="font-semibold mb-4 text-gray-900">Product Features</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-center">
                <svg className="w-5 h-5 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Premium Quality Materials
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Fast Delivery
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Easy Returns & Exchanges
              </li>
              <li className="flex items-center">
                <svg className="w-5 h-5 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Secure Payment Options
              </li>
            </ul>
          </div>

          <AddToCartButton 
            product={{
              ...product,
              sizes: product.sizes, // Pass sizes so AddToCartButton can validate
            }}
            availableStock={currentStock}
            selectedColor={selectedColor}
            selectedSize={selectedSize}
          />

          <div className="pt-6 border-t border-gray-200">
            <WhatsAppWidget
              productName={product.name}
              productUrl={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/products/${product.id}`}
            />
          </div>
        </div>
      </div>

      {/* Full-Screen Image Modal */}
      {isImageModalOpen && displayImages && displayImages.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsImageModalOpen(false)}
        >
          <button
            onClick={() => setIsImageModalOpen(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="relative max-w-7xl w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            {/* Previous Button */}
            {displayImages.length > 1 && (
              <button
                onClick={() => setModalImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length)}
                className="absolute left-4 text-white hover:text-gray-300 transition-colors z-10 bg-black/50 rounded-full p-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Main Image */}
            <div className="relative w-full h-full max-h-[90vh]">
              <Image
                src={displayImages[modalImageIndex]}
                alt={`${product.name} - Image ${modalImageIndex + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>

            {/* Next Button */}
            {displayImages.length > 1 && (
              <button
                onClick={() => setModalImageIndex((prev) => (prev + 1) % displayImages.length)}
                className="absolute right-4 text-white hover:text-gray-300 transition-colors z-10 bg-black/50 rounded-full p-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Image Counter */}
            {displayImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                {modalImageIndex + 1} / {displayImages.length}
              </div>
            )}

            {/* Thumbnail Strip */}
            {displayImages.length > 1 && (
              <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex gap-2 max-w-full overflow-x-auto px-4">
                {displayImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setModalImageIndex(index)}
                    className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 flex-shrink-0 ${
                      modalImageIndex === index ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

