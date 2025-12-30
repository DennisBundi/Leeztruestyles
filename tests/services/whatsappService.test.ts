/**
 * Tests for WhatsAppService
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { WhatsAppService } from '@/services/whatsappService';

// Mock environment variables
const originalEnv = process.env;

describe('WhatsAppService', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_WHATSAPP_BUSINESS_PHONE: '254797877254',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('formatPhoneForWhatsApp', () => {
    it('should format phone number correctly', () => {
      // This is a private method, so we test it indirectly through public methods
      const link = WhatsAppService.generateGeneralInquiryLink();
      expect(link).toContain('254797877254');
    });

    it('should handle phone number with + prefix', () => {
      process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_PHONE = '+254797877254';
      const link = WhatsAppService.generateGeneralInquiryLink();
      expect(link).toContain('254797877254');
      expect(link).not.toContain('+');
    });

    it('should handle phone number with spaces', () => {
      process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_PHONE = '+254 797 877 254';
      const link = WhatsAppService.generateGeneralInquiryLink();
      expect(link).toContain('254797877254');
      expect(link).not.toContain(' ');
    });

    it('should remove leading zero from Kenyan numbers', () => {
      process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_PHONE = '0797877254';
      const link = WhatsAppService.generateGeneralInquiryLink();
      expect(link).toContain('254797877254');
    });
  });

  describe('generateGeneralInquiryLink', () => {
    it('should generate correct WhatsApp link', () => {
      const link = WhatsAppService.generateGeneralInquiryLink();
      
      expect(link).toContain('https://wa.me/');
      expect(link).toContain('254797877254');
      expect(link).toContain('?text=');
      expect(link).toContain(encodeURIComponent('Hello! I\'m interested in your products. Could you please help me?'));
    });

    it('should use default phone number if env var not set', () => {
      delete process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_PHONE;
      const link = WhatsAppService.generateGeneralInquiryLink();
      expect(link).toContain('254797877254');
    });
  });

  describe('generateProductInquiryLink', () => {
    it('should generate correct product inquiry link', () => {
      const productName = 'Test Product';
      const productUrl = 'https://example.com/products/1';
      
      const link = WhatsAppService.generateProductInquiryLink(productName, productUrl);
      
      expect(link).toContain('https://wa.me/');
      expect(link).toContain('254797877254');
      expect(link).toContain('?text=');
      expect(link).toContain(encodeURIComponent(productName));
      expect(link).toContain(encodeURIComponent(productUrl));
    });

    it('should include product name and URL in message', () => {
      const productName = 'Fashion Dress';
      const productUrl = 'https://leeztruestyles.com/products/dress-1';
      
      const link = WhatsAppService.generateProductInquiryLink(productName, productUrl);
      const decodedLink = decodeURIComponent(link);
      
      expect(decodedLink).toContain(productName);
      expect(decodedLink).toContain(productUrl);
    });
  });

  describe('sendMessage', () => {
    it('should format phone number correctly when sending message', async () => {
      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      process.env.WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
      process.env.WHATSAPP_PHONE_NUMBER_ID = 'test_id';
      process.env.WHATSAPP_ACCESS_TOKEN = 'test_token';

      const result = await WhatsAppService.sendMessage('+254797877254', 'Test message');

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ error: { message: 'Invalid phone number' } }),
      });

      process.env.WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
      process.env.WHATSAPP_PHONE_NUMBER_ID = 'test_id';
      process.env.WHATSAPP_ACCESS_TOKEN = 'test_token';

      const result = await WhatsAppService.sendMessage('+254797877254', 'Test message');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

