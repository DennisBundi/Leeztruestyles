/**
 * Tests for color utility functions
 */

import { describe, it, expect } from '@jest/globals';
import { PRODUCT_COLORS, getColorByName, getColorHex } from '@/lib/utils/colors';

describe('Color Utilities', () => {
  describe('PRODUCT_COLORS', () => {
    it('should contain predefined colors', () => {
      expect(PRODUCT_COLORS.length).toBeGreaterThan(0);
      expect(PRODUCT_COLORS.some(c => c.name === 'Black')).toBe(true);
      expect(PRODUCT_COLORS.some(c => c.name === 'White')).toBe(true);
      expect(PRODUCT_COLORS.some(c => c.name === 'Red')).toBe(true);
    });

    it('should have valid hex codes', () => {
      PRODUCT_COLORS.forEach(color => {
        expect(color.hex).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });
  });

  describe('getColorByName', () => {
    it('should find color by name (case insensitive)', () => {
      const color = getColorByName('black');
      expect(color).toBeDefined();
      expect(color?.name).toBe('Black');
      expect(color?.hex).toBe('#000000');
    });

    it('should find color with exact case', () => {
      const color = getColorByName('Red');
      expect(color).toBeDefined();
      expect(color?.name).toBe('Red');
    });

    it('should return undefined for non-existent color', () => {
      const color = getColorByName('NonExistentColor');
      expect(color).toBeUndefined();
    });
  });

  describe('getColorHex', () => {
    it('should return hex code for existing color', () => {
      expect(getColorHex('black')).toBe('#000000');
      expect(getColorHex('White')).toBe('#FFFFFF');
      expect(getColorHex('red')).toBe('#FF0000');
    });

    it('should return default gray for non-existent color', () => {
      expect(getColorHex('NonExistentColor')).toBe('#CCCCCC');
    });

    it('should be case insensitive', () => {
      expect(getColorHex('BLACK')).toBe('#000000');
      expect(getColorHex('Black')).toBe('#000000');
      expect(getColorHex('black')).toBe('#000000');
    });
  });
});

