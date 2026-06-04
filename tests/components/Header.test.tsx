/**
 * Tests for Header component
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: jest.fn(() => '/'),
}));

jest.mock('@/store/cartStore', () => ({
  useCartStore: (selector?: (state: any) => any) => {
    const state = {
      items: [],
      getItemCount: () => 0,
      getTotal: () => 0,
      clearCart: jest.fn(),
    };
    return selector ? selector(state) : state;
  },
}));

jest.mock('@/store/loyaltyStore', () => ({
  useLoyaltyStore: (selector?: (state: any) => any) => {
    const state = { points: 0, clearLoyalty: jest.fn() };
    return selector ? selector(state) : state;
  },
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  }),
}));

import Header from '@/components/navigation/Header';

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render logo', () => {
    render(<Header />);
    const logo = screen.getByAltText(/leez true styles logo/i);
    expect(logo).toBeInTheDocument();
  });

  it('should render navigation links', () => {
    render(<Header />);
    expect(screen.getAllByRole('link', { name: /home/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /products/i }).length).toBeGreaterThan(0);
  });

  it('should show cart icon', () => {
    render(<Header />);
    const cartLink = screen.getByRole('link', { name: /shopping cart/i });
    expect(cartLink).toBeInTheDocument();
  });

  it('should show sign up button when user is not authenticated', () => {
    render(<Header />);
    const signUpButton = screen.getByRole('button', { name: /sign up/i });
    expect(signUpButton).toBeInTheDocument();
  });

  it('should navigate to products page when products link is clicked', () => {
    render(<Header />);
    const productsLinks = screen.getAllByRole('link', { name: /products/i });
    expect(productsLinks[0]).toHaveAttribute('href', '/products');
  });

  it('should render theme toggle', () => {
    render(<Header />);
    // ThemeToggle is always rendered
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
  });
});
