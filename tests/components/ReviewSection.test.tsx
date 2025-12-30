/**
 * Tests for ReviewSection component
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, waitFor, act } from '@testing-library/react';
import ReviewSection from '@/components/home/ReviewSection';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
}));

describe('ReviewSection', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render review section with header', () => {
    render(<ReviewSection />);
    
    expect(screen.getByText('CUSTOMER REVIEWS')).toBeInTheDocument();
    expect(screen.getByText('What Our Customers Say')).toBeInTheDocument();
    expect(screen.getByText(/Don't just take our word for it/)).toBeInTheDocument();
  });

  it('should display reviews on desktop (3 at a time)', () => {
    render(<ReviewSection />);
    
    // Should show first 3 reviews
    expect(screen.getByText(/Absolutely love my purchase!/)).toBeInTheDocument();
    expect(screen.getByText(/Best fashion store in Kenya!/)).toBeInTheDocument();
    expect(screen.getByText(/The clothes fit perfectly/)).toBeInTheDocument();
  });

  it('should display one review on mobile', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    render(<ReviewSection />);
    
    // Should show first review
    expect(screen.getByText(/Absolutely love my purchase!/)).toBeInTheDocument();
  });

  it('should auto-rotate reviews every 3 seconds', async () => {
    render(<ReviewSection />);
    
    // Initially shows first review (Sarah M.)
    expect(screen.getByText('Sarah M.')).toBeInTheDocument();
    
    // Fast-forward 3 seconds
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    
    await waitFor(() => {
      // Should now show second set of reviews
      expect(screen.getByText('James K.')).toBeInTheDocument();
    });
  });

  it('should navigate to next review when next button is clicked', () => {
    render(<ReviewSection />);
    
    const nextButton = screen.getByLabelText('Next review');
    
    act(() => {
      nextButton.click();
    });
    
    // Should show next review
    expect(screen.getByText('James K.')).toBeInTheDocument();
  });

  it('should navigate to previous review when prev button is clicked', () => {
    render(<ReviewSection />);
    
    const nextButton = screen.getByLabelText('Next review');
    const prevButton = screen.getByLabelText('Previous review');
    
    // Go to next first
    act(() => {
      nextButton.click();
    });
    
    // Then go back
    act(() => {
      prevButton.click();
    });
    
    // Should be back to first review
    expect(screen.getByText('Sarah M.')).toBeInTheDocument();
  });

  it('should navigate to specific review when dot is clicked', () => {
    render(<ReviewSection />);
    
    // Get all dot buttons (4 dots for desktop: 0-3 positions)
    const dots = screen.getAllByLabelText(/Go to review set/);
    
    // Click second dot
    act(() => {
      dots[1].click();
    });
    
    // Should show reviews at position 1
    expect(screen.getByText('James K.')).toBeInTheDocument();
  });

  it('should display all 6 reviews with correct information', () => {
    render(<ReviewSection />);
    
    // Check all review names are present (may need to navigate)
    const names = [
      'Sarah M.',
      'James K.',
      'Grace W.',
      'Peter N.',
      'Mary A.',
      'David T.',
    ];
    
    names.forEach((name) => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });

  it('should display 5-star ratings for all reviews', () => {
    render(<ReviewSection />);
    
    // Get all star icons (5 stars per review, 3 reviews visible = 15 stars)
    const stars = screen.getAllByRole('img', { hidden: true });
    const filledStars = stars.filter((star) => 
      star.classList.contains('text-yellow-400')
    );
    
    // Should have multiple filled stars (at least 5 for first review)
    expect(filledStars.length).toBeGreaterThanOrEqual(5);
  });

  it('should loop back to first review after last review', () => {
    render(<ReviewSection />);
    
    const nextButton = screen.getByLabelText('Next review');
    
    // Navigate to last position (3 for desktop)
    act(() => {
      nextButton.click(); // Position 1
      nextButton.click(); // Position 2
      nextButton.click(); // Position 3
      nextButton.click(); // Should loop to position 0
    });
    
    // Should be back to first review
    expect(screen.getByText('Sarah M.')).toBeInTheDocument();
  });

  it('should have smooth transition animations', () => {
    const { container } = render(<ReviewSection />);
    
    const carousel = container.querySelector('.transition-transform');
    expect(carousel).toHaveClass('duration-700', 'ease-in-out');
  });
});
