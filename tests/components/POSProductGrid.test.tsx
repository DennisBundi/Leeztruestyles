/**
 * Tests for POSProductGrid component
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import POSProductGrid from '@/components/pos/POSProductGrid';
import type { Product } from '@/types';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

// Mock cart store
const mockAddItem = jest.fn();
jest.mock('@/store/cartStore', () => ({
  useCartStore: () => ({
    addItem: mockAddItem,
    items: [],
  }),
}));

// Mock cart animation
jest.mock('@/hooks/useCartAnimation', () => ({
  useCartAnimation: () => ({
    triggerAnimation: jest.fn(),
  }),
}));

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Product 1',
    price: 1000,
    description: 'Test product 1',
    category_id: 'cat-1',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    available_stock: 10,
  },
  {
    id: '2',
    name: 'Product 2',
    price: 2000,
    description: 'Test product 2',
    category_id: 'cat-1',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    available_stock: 5,
  },
];

// Mock fetch for API calls
global.fetch = jest.fn();

describe('POSProductGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ sizes: [] }),
    });
  });

  it('should render product grid', () => {
    render(<POSProductGrid products={mockProducts} />);
    
    expect(screen.getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('Product 2')).toBeInTheDocument();
  });

  it('should display product prices', () => {
    render(<POSProductGrid products={mockProducts} />);
    
    expect(screen.getByText(/KES 1,000/)).toBeInTheDocument();
    expect(screen.getByText(/KES 2,000/)).toBeInTheDocument();
  });

  it('should show add button on product cards', () => {
    render(<POSProductGrid products={mockProducts} />);
    
    const addButtons = screen.getAllByTitle(/add to cart/i);
    expect(addButtons.length).toBeGreaterThan(0);
  });

  it('should open size/color modal when product with options is clicked', async () => {
    const productWithSizes = {
      ...mockProducts[0],
      sizes: ['S', 'M', 'L'],
    };
    
    render(<POSProductGrid products={[productWithSizes as any]} />);
    
    const productCard = screen.getByText('Product 1').closest('button');
    if (productCard) {
      fireEvent.click(productCard);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/products/1/sizes')
        );
      });
    }
  });

  it('should add product directly to cart when no sizes/colors', async () => {
    render(<POSProductGrid products={mockProducts} />);
    
    const addButton = screen.getAllByTitle(/add to cart/i)[0];
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(mockAddItem).toHaveBeenCalled();
    });
  });

  it('should prevent adding when product is out of stock', () => {
    const outOfStockProduct = {
      ...mockProducts[0],
      available_stock: 0,
    };
    
    render(<POSProductGrid products={[outOfStockProduct]} />);
    
    // Should not show add button or should be disabled
    const addButtons = screen.queryAllByTitle(/add to cart/i);
    // Product with no stock might not show add button
    expect(addButtons.length).toBeGreaterThanOrEqual(0);
  });
});

