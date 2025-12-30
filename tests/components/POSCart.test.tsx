/**
 * Tests for POSCart component
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import POSCart from '@/components/pos/POSCart';
import type { Product } from '@/types';

// Mock cart store
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

jest.mock('@/store/cartStore', () => ({
  useCartStore: () => ({
    items: mockItems,
    removeItem: mockRemoveItem,
    updateQuantity: mockUpdateQuantity,
    updateSalePrice: mockUpdateSalePrice,
    clearCart: mockClearCart,
    getTotal: () => 2000,
  }),
}));

// Mock fetch
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
    
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
  });

  it('should show total amount', () => {
    render(<POSCart employeeId="emp-1" employeeCode="EMP001" />);
    
    expect(screen.getByText(/KES 2,000/)).toBeInTheDocument();
  });

  it('should allow updating quantity', () => {
    render(<POSCart employeeId="emp-1" employeeCode="EMP001" />);
    
    const quantityInput = screen.getByDisplayValue('2');
    fireEvent.change(quantityInput, { target: { value: '3' } });
    
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

  it('should show empty cart message when no items', () => {
    jest.mock('@/store/cartStore', () => ({
      useCartStore: () => ({
        items: [],
        getTotal: () => 0,
      }),
    }));

    render(<POSCart employeeId="emp-1" employeeCode="EMP001" />);
    
    expect(screen.getByText(/cart is empty/i)).toBeInTheDocument();
  });
});

