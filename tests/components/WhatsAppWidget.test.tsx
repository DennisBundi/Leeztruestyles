/**
 * Tests for WhatsAppWidget component
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import WhatsAppWidget from '@/components/whatsapp/WhatsAppWidget';

// Mock WhatsAppService
jest.mock('@/services/whatsappService', () => ({
  WhatsAppService: {
    generateProductInquiryLink: jest.fn((name, url) => 
      `https://wa.me/254797877254?text=${encodeURIComponent(`Hello! I'm interested in: ${name}\n\nView product: ${url}\n\nCould you please provide more information about this item?`)}`
    ),
    generateGeneralInquiryLink: jest.fn(() => 
      'https://wa.me/254797877254?text=' + encodeURIComponent('Hello! I\'m interested in your products. Could you please help me?')
    ),
  },
}));

describe('WhatsAppWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render WhatsApp widget button', () => {
    render(<WhatsAppWidget />);
    
    const widget = screen.getByLabelText('Contact us on WhatsApp');
    expect(widget).toBeInTheDocument();
    expect(widget).toHaveAttribute('href');
  });

  it('should use general inquiry link when no product is provided', () => {
    render(<WhatsAppWidget />);
    
    const link = screen.getByLabelText('Contact us on WhatsApp');
    expect(link).toHaveAttribute('href', expect.stringContaining('wa.me/254797877254'));
    expect(link).toHaveAttribute('href', expect.stringContaining('Hello! I\'m interested in your products'));
  });

  it('should use product inquiry link when product is provided', () => {
    render(
      <WhatsAppWidget 
        productName="Test Product"
        productUrl="https://example.com/products/test"
      />
    );
    
    const link = screen.getByLabelText('Contact us on WhatsApp');
    expect(link).toHaveAttribute('href', expect.stringContaining('wa.me/254797877254'));
    expect(link).toHaveAttribute('href', expect.stringContaining('Test Product'));
    expect(link).toHaveAttribute('href', expect.stringContaining('example.com/products/test'));
  });

  it('should open link in new tab', () => {
    render(<WhatsAppWidget />);
    
    const link = screen.getByLabelText('Contact us on WhatsApp');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should have correct styling classes', () => {
    render(<WhatsAppWidget />);
    
    const link = screen.getByLabelText('Contact us on WhatsApp');
    expect(link).toHaveClass('fixed', 'bottom-6', 'right-6', 'z-50', 'bg-green-500');
  });

  it('should display WhatsApp icon', () => {
    render(<WhatsAppWidget />);
    
    const link = screen.getByLabelText('Contact us on WhatsApp');
    const svg = link.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});

