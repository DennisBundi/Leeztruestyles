/**
 * Tests for Footer component
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import Footer from '@/components/navigation/Footer';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('Footer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render footer with contact information', () => {
    render(<Footer />);
    
    expect(screen.getByText(/contact us/i)).toBeInTheDocument();
    expect(screen.getByText(/leeztruestyles44@gmail.com/i)).toBeInTheDocument();
    expect(screen.getByText(/\+254 797 877 254/i)).toBeInTheDocument();
  });

  it('should have clickable email link', () => {
    render(<Footer />);
    
    const emailLink = screen.getByRole('link', { name: /leeztruestyles44@gmail.com/i });
    expect(emailLink).toHaveAttribute('href', 'mailto:leeztruestyles44@gmail.com');
  });

  it('should have clickable phone link', () => {
    render(<Footer />);
    
    const phoneLink = screen.getByRole('link', { name: /\+254 797 877 254/i });
    expect(phoneLink).toHaveAttribute('href', 'tel:+254797877254');
  });

  it('should render navigation links', () => {
    render(<Footer />);
    
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /products/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /about us/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /contact/i })).toBeInTheDocument();
  });

  it('should render legal links', () => {
    render(<Footer />);
    
    expect(screen.getByRole('link', { name: /terms of service/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument();
  });

  it('should render copyright notice', () => {
    render(<Footer />);
    
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`${currentYear}`))).toBeInTheDocument();
    expect(screen.getByText(/all rights reserved/i)).toBeInTheDocument();
  });

  it('should not render on admin routes', () => {
    jest.mock('next/navigation', () => ({
      usePathname: () => '/dashboard',
    }));

    const { usePathname } = require('next/navigation');
    usePathname.mockReturnValue('/dashboard');

    const { container } = render(<Footer />);
    expect(container.firstChild).toBeNull();
  });
});
