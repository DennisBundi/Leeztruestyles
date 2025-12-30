/**
 * Tests for Header component
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '@/components/navigation/Header';

// Mock next/navigation
const mockPush = jest.fn();
const mockPathname = jest.fn(() => '/');

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: mockPathname,
}));

// Mock cart store
jest.mock('@/store/cartStore', () => ({
  useCartStore: () => ({
    items: [],
    getItemCount: () => 0,
    getTotal: () => 0,
  }),
}));

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname.mockReturnValue('/');
  });

  it('should render logo', () => {
    render(<Header />);
    
    const logo = screen.getByAltText(/leeztruestyles logo/i);
    expect(logo).toBeInTheDocument();
  });

  it('should render navigation links', () => {
    render(<Header />);
    
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /products/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /contact/i })).toBeInTheDocument();
  });

  it('should show cart icon', () => {
    render(<Header />);
    
    const cartButton = screen.getByRole('button', { name: /cart/i });
    expect(cartButton).toBeInTheDocument();
  });

  it('should display cart item count', () => {
    jest.mock('@/store/cartStore', () => ({
      useCartStore: () => ({
        items: [{ product: { id: '1' }, quantity: 2 }],
        getItemCount: () => 2,
        getTotal: () => 10000,
      }),
    }));

    render(<Header />);
    
    // Cart count should be visible
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should show sign in link when user is not authenticated', () => {
    render(<Header />);
    
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should navigate to products page when products link is clicked', () => {
    render(<Header />);
    
    const productsLink = screen.getByRole('link', { name: /products/i });
    expect(productsLink).toHaveAttribute('href', '/products');
  });
});
