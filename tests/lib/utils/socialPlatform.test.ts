/**
 * Tests for social platform utility functions
 */

import { describe, it, expect } from '@jest/globals';
import { getPlatformDisplayName, getPlatformColor, getPlatformGradient } from '@/lib/utils/socialPlatform';

describe('Social Platform Utilities', () => {
  describe('getPlatformDisplayName', () => {
    it('should return formatted display names', () => {
      expect(getPlatformDisplayName('tiktok')).toBe('TikTok');
      expect(getPlatformDisplayName('instagram')).toBe('Instagram');
      expect(getPlatformDisplayName('whatsapp')).toBe('WhatsApp');
      expect(getPlatformDisplayName('walkin')).toBe('Walk-in');
    });

    it('should be case insensitive', () => {
      expect(getPlatformDisplayName('TIKTOK')).toBe('TikTok');
      expect(getPlatformDisplayName('Instagram')).toBe('Instagram');
    });

    it('should return original string for unknown platform', () => {
      expect(getPlatformDisplayName('unknown')).toBe('unknown');
    });
  });

  describe('getPlatformColor', () => {
    it('should return brand colors', () => {
      expect(getPlatformColor('tiktok')).toBe('#000000');
      expect(getPlatformColor('instagram')).toBe('#E4405F');
      expect(getPlatformColor('whatsapp')).toBe('#25D366');
      expect(getPlatformColor('walkin')).toBe('#6366F1');
    });

    it('should be case insensitive', () => {
      expect(getPlatformColor('TIKTOK')).toBe('#000000');
      expect(getPlatformColor('WhatsApp')).toBe('#25D366');
    });

    it('should return default gray for unknown platform', () => {
      expect(getPlatformColor('unknown')).toBe('#6B7280');
    });
  });

  describe('getPlatformGradient', () => {
    it('should return gradient strings', () => {
      const tiktokGradient = getPlatformGradient('tiktok');
      expect(tiktokGradient).toContain('linear-gradient');
      expect(tiktokGradient).toContain('#000000');
    });

    it('should return Instagram gradient', () => {
      const instagramGradient = getPlatformGradient('instagram');
      expect(instagramGradient).toContain('linear-gradient');
      expect(instagramGradient).toContain('#833AB4');
    });

    it('should be case insensitive', () => {
      const gradient1 = getPlatformGradient('whatsapp');
      const gradient2 = getPlatformGradient('WHATSAPP');
      expect(gradient1).toBe(gradient2);
    });

    it('should return default gradient for unknown platform', () => {
      const gradient = getPlatformGradient('unknown');
      expect(gradient).toContain('linear-gradient');
      expect(gradient).toContain('#6B7280');
    });
  });
});

