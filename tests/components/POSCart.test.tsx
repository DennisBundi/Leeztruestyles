/**
 * Tests for POSCart component
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import POSCart from '@/components/pos/POSCart';
import type { Product } from '@/types';

const mockItems = [
  {
    product: {
      id: '1',
      name: 'Test Product',
      price: 1000,
      description: 'Test',
      category_id: 'cat-1',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Product,
    quantity: 2,
    salePrice: undefined,
  },
];

const mockRemoveItem = jest.fn();
const mockUpdateQuantity = jest.fn();
const mockUpdateSalePrice = jest.fn();
const mockClearCart = jest.fn();
const mockUpdateSize = jest.fn();
const mockUpdateColor = jest.fn();

// Zustand selector-compatible mock
jest.mock('@/store/cartStore', () => ({
  useCartStore: (selector?: (state: any) => any) => {
    const state = {
      items: mockItems,
      removeItem: mockRemoveItem,
      updateQuantity: mockUpdateQuantity,
      updateSalePrice: mockUpdateSalePrice,
      clearCart: mockClearCart,
      updateSize: mockUpdateSize,
      updateColor: mockUpdateColor,
      getTotal: () => 2000,
      isCustomProduct: () => false,
    };
    return selector ? selector(state) : state;
  },
}));

global.fetch = jest.fn();

describe('POSCart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  it('should render cart items', () => {
    render(<POSCart employeeId="emp-1" employeeCode="EMP001" />);
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText(/KES 1,000/)).toBeInTheDocument();
  });

  it('should display item quantity', () => {
    render(<POSCart employeeId="emp-1" employeeCode="EMP001" />);
    // Quantity is displayed as a span, not an input
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should show total amount', () => {
    render(<POSCart employeeId="emp-1" employeeCode="EMP001" />);
    // Total appears in multiple places (total section + button)
    expect(screen.queryAllByText(/KES 2,000/).length).toBeGreaterThan(0);
  });

  it('should allow updating quantity', () => {
    render(<POSCart employeeId="emp-1" employeeCode="EMP001" />);
    // Quantity is updated via +/- buttons
    const incrementButton = screen.getByRole('button', { name: /\+/ });
    fireEvent.click(incrementButton);
    expect(mockUpdateQuantity).toHaveBeenCalled();
  });

  it('should allow setting sale price', () => {
    render(<POSCart employeeId="emp-1" employeeCode="EMP001" />);
    const salePriceInput = screen.getByPlaceholderText(/discount price/i);
    fireEvent.change(salePriceInput, { target: { value: '800' } });
    fireEvent.blur(salePriceInput);
    expect(mockUpdateSalePrice).toHaveBeenCalled();
  });

  it('should show remove item button', () => {
    render(<POSCart employeeId="emp-1" employeeCode="EMP001" />);
    const removeButton = screen.getByRole('button', { name: /remove/i });
    expect(removeButton).toBeInTheDocument();
  });

  it('should remove item when remove button is clicked', () => {
    render(<POSCart employeeId="emp-1" employeeCode="EMP001" />);
    const removeButton = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(removeButton);
    expect(mockRemoveItem).toHaveBeenCalledWith('1');
  });
});
