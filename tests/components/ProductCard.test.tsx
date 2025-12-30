/**
 * Tests for ProductCard component
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProductCard from '@/components/products/ProductCard';
import type { Product } from '@/types';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/products',
}));

// Mock cart store
jest.mock('@/store/cartStore', () => ({
  useCartStore: () => ({
    addItem: jest.fn(),
    items: [],
    getItemCount: () => 0,
  }),
}));

// Mock cart animation
jest.mock('@/hooks/useCartAnimation', () => ({
  useCartAnimation: () => ({
    triggerAnimation: jest.fn(),
  }),
}));

const mockProduct: Product = {
  id: 'test-product-1',
  name: 'Test Product',
  price: 5000,
  description: 'A test product description',
  category_id: 'cat-1',
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  images: ['https://example.com/image1.jpg'],
  available_stock: 10,
};

describe('ProductCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render product name and price', () => {
    render(<ProductCard product={mockProduct} />);
    
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText(/KES 5,000/)).toBeInTheDocument();
  });

  it('should display product image', () => {
    render(<ProductCard product={mockProduct} />);
    
    const image = screen.getByAltText('Test Product');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', expect.stringContaining('image1.jpg'));
  });

  it('should show out of stock message when stock is 0', () => {
    const outOfStockProduct = { ...mockProduct, available_stock: 0 };
    render(<ProductCard product={outOfStockProduct} />);
    
    expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
  });

  it('should show flash sale badge when product is on sale', () => {
    const saleProduct = {
      ...mockProduct,
      is_flash_sale: true,
      sale_price: 4000,
      discount_percent: 20,
    };
    render(<ProductCard product={saleProduct as any} />);
    
    expect(screen.getByText(/20% OFF/i)).toBeInTheDocument();
  });

  it('should display sale price when product has discount', () => {
    const saleProduct = {
      ...mockProduct,
      sale_price: 4000,
      discount_percent: 20,
    };
    render(<ProductCard product={saleProduct as any} />);
    
    expect(screen.getByText(/KES 4,000/)).toBeInTheDocument();
    expect(screen.getByText(/KES 5,000/)).toBeInTheDocument(); // Original price should be strikethrough
  });

  it('should link to product detail page', () => {
    render(<ProductCard product={mockProduct} />);
    
    const link = screen.getByRole('link', { name: /test product/i });
    expect(link).toHaveAttribute('href', '/products/test-product-1');
  });

  it('should show add to cart button when product has stock', () => {
    render(<ProductCard product={mockProduct} />);
    
    const addButton = screen.getByRole('button', { name: /add to cart/i });
    expect(addButton).toBeInTheDocument();
  });

  it('should disable add to cart button when out of stock', () => {
    const outOfStockProduct = { ...mockProduct, available_stock: 0 };
    render(<ProductCard product={outOfStockProduct} />);
    
    const addButton = screen.queryByRole('button', { name: /add to cart/i });
    expect(addButton).not.toBeInTheDocument();
  });
});

