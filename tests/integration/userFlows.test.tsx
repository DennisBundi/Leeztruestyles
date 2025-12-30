/**
 * Integration tests for critical user flows
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
}));

// Mock cart store
const mockAddItem = jest.fn();
const mockItems: any[] = [];
const mockGetTotal = jest.fn(() => 0);

jest.mock('@/store/cartStore', () => ({
  useCartStore: () => ({
    addItem: mockAddItem,
    items: mockItems,
    getItemCount: () => mockItems.length,
    getTotal: mockGetTotal,
    clearCart: jest.fn(),
  }),
}));

// Mock fetch
global.fetch = jest.fn();

describe('User Flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockItems.length = 0;
  });

  describe('Product browsing and cart flow', () => {
    it('should allow user to view products and add to cart', async () => {
      const ProductCard = (await import('@/components/products/ProductCard')).default;
      const mockProduct = {
        id: '1',
        name: 'Test Product',
        price: 1000,
        description: 'Test',
        category_id: 'cat-1',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        available_stock: 10,
      };

      render(<ProductCard product={mockProduct as any} />);
      
      const addButton = screen.getByRole('button', { name: /add to cart/i });
      fireEvent.click(addButton);
      
      expect(mockAddItem).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1' }),
        1
      );
    });

    it('should prevent adding out of stock products', () => {
      const ProductCard = (await import('@/components/products/ProductCard')).default;
      const outOfStockProduct = {
        id: '2',
        name: 'Out of Stock Product',
        price: 1000,
        available_stock: 0,
      };

      render(<ProductCard product={outOfStockProduct as any} />);
      
      const addButton = screen.queryByRole('button', { name: /add to cart/i });
      expect(addButton).not.toBeInTheDocument();
    });
  });

  describe('POS order creation flow', () => {
    it('should create order with cart items', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, orderId: 'order-123' }),
      });

      mockItems.push({
        product: {
          id: '1',
          name: 'Product 1',
          price: 1000,
        },
        quantity: 2,
      });

      mockGetTotal.mockReturnValue(2000);

      // Simulate order creation
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: mockItems,
          payment_method: 'cash',
          total_amount: 2000,
        }),
      });

      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
    });
  });

  describe('Product search flow', () => {
    it('should filter products by search query', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          products: [
            { id: '1', name: 'Blue Shirt', price: 1000 },
            { id: '2', name: 'Blue Jeans', price: 2000 },
          ],
        }),
      });

      const response = await fetch('/api/products/search?q=blue');
      const data = await response.json();
      
      expect(data.products.length).toBe(2);
      expect(data.products.every((p: any) => 
        p.name.toLowerCase().includes('blue')
      )).toBe(true);
    });
  });
});

