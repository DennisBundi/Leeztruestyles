/**
 * Tests for orderId utility functions
 */

import { describe, it, expect } from '@jest/globals';
import { formatOrderId, formatOrderIdSequential } from '@/lib/utils/orderId';

describe('Order ID Utilities', () => {
  describe('formatOrderId', () => {
    it('should format UUID to readable order ID', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const formatted = formatOrderId(uuid);
      
      expect(formatted).toBe('LEEZT-440000');
      expect(formatted).toMatch(/^LEEZT-[A-Z0-9]{6}$/);
    });

    it('should handle empty string', () => {
      const formatted = formatOrderId('');
      expect(formatted).toBe('N/A');
    });

    it('should handle null/undefined', () => {
      expect(formatOrderId(null as any)).toBe('N/A');
      expect(formatOrderId(undefined as any)).toBe('N/A');
    });

    it('should extract last 6 characters after removing dashes', () => {
      const uuid = '12345678-1234-1234-1234-123456789ABC';
      const formatted = formatOrderId(uuid);
      
      expect(formatted).toBe('LEEZT-789ABC');
    });

    it('should convert to uppercase', () => {
      const uuid = '550e8400-e29b-41d4-a716-44665544abcd';
      const formatted = formatOrderId(uuid);
      
      expect(formatted).toBe('LEEZT-ABCD');
      expect(formatted).toBe(formatted.toUpperCase());
    });
  });

  describe('formatOrderIdSequential', () => {
    it('should format sequential order number', () => {
      const formatted = formatOrderIdSequential(1);
      expect(formatted).toBe('LEEZT-0001');
    });

    it('should pad with zeros', () => {
      expect(formatOrderIdSequential(42)).toBe('LEEZT-0042');
      expect(formatOrderIdSequential(123)).toBe('LEEZT-0123');
      expect(formatOrderIdSequential(9999)).toBe('LEEZT-9999');
    });

    it('should handle zero', () => {
      expect(formatOrderIdSequential(0)).toBe('N/A');
    });

    it('should handle null/undefined', () => {
      expect(formatOrderIdSequential(null as any)).toBe('N/A');
      expect(formatOrderIdSequential(undefined as any)).toBe('N/A');
    });
  });
});

