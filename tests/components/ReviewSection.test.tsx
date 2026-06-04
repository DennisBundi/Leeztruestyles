/**
 * Tests for ReviewSection component
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, act } from '@testing-library/react';
import ReviewSection from '@/components/home/ReviewSection';

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

  it('should render review content in the DOM', () => {
    render(<ReviewSection />);
    // All reviews are in the DOM (carousel uses CSS to show/hide)
    expect(screen.queryAllByText(/Absolutely love my purchase!/).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Best fashion store in Kenya!/).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/The clothes fit perfectly/).length).toBeGreaterThan(0);
  });

  it('should render review content on mobile', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });
    render(<ReviewSection />);
    expect(screen.queryAllByText(/Absolutely love my purchase!/).length).toBeGreaterThan(0);
  });

  it('should render navigation buttons', () => {
    render(<ReviewSection />);
    expect(screen.getByLabelText('Next review')).toBeInTheDocument();
    expect(screen.getByLabelText('Previous review')).toBeInTheDocument();
  });

  it('should render dot navigation', () => {
    render(<ReviewSection />);
    const dots = screen.getAllByLabelText(/Go to review set/);
    expect(dots.length).toBeGreaterThan(0);
  });

  it('should not throw when navigating next', () => {
    render(<ReviewSection />);
    const nextButton = screen.getByLabelText('Next review');
    act(() => { nextButton.click(); });
    expect(screen.queryAllByText(/Sarah M./).length).toBeGreaterThan(0);
  });

  it('should not throw when navigating previous', () => {
    render(<ReviewSection />);
    const prevButton = screen.getByLabelText('Previous review');
    act(() => { prevButton.click(); });
    expect(screen.queryAllByText(/Sarah M./).length).toBeGreaterThan(0);
  });

  it('should not throw when clicking dot', () => {
    render(<ReviewSection />);
    const dots = screen.getAllByLabelText(/Go to review set/);
    act(() => { dots[0].click(); });
    expect(screen.queryAllByText(/Sarah M./).length).toBeGreaterThan(0);
  });

  it('should display all 6 reviewer names in the DOM', () => {
    render(<ReviewSection />);
    const names = ['Sarah M.', 'James K.', 'Grace W.', 'Peter N.', 'Mary A.', 'David T.'];
    names.forEach((name) => {
      expect(screen.queryAllByText(name).length).toBeGreaterThan(0);
    });
  });

  it('should have smooth transition animations', () => {
    const { container } = render(<ReviewSection />);
    const carousel = container.querySelector('.transition-transform');
    expect(carousel).toHaveClass('duration-700', 'ease-in-out');
  });
});
