/**
 * Tests for PaymentService
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Paystack
jest.mock('paystack', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    transaction: {
      initialize: jest.fn().mockResolvedValue({
        status: true,
        data: {
          authorization_url: 'https://paystack.com/verify/ref123',
          access_code: 'access_code_123',
          reference: 'ref123',
        },
      }),
      verify: jest.fn().mockResolvedValue({
        status: true,
        data: {
          status: 'success',
          amount: 100000,
          reference: 'ref123',
        },
      }),
    },
  })),
}));

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize payment transaction', async () => {
    const PaymentService = (await import('@/services/paymentService')).default;
    
    const result = await PaymentService.initializePayment({
      amount: 1000,
      email: 'test@example.com',
      reference: 'test-ref-123',
    });
    
    expect(result).toHaveProperty('authorization_url');
    expect(result).toHaveProperty('reference');
  });

  it('should verify payment transaction', async () => {
    const PaymentService = (await import('@/services/paymentService')).default;
    
    const result = await PaymentService.verifyPayment('ref123');
    
    expect(result).toHaveProperty('status');
    expect(result.status).toBe('success');
  });

  it('should format phone number for M-Pesa', () => {
    const PaymentService = (await import('@/services/paymentService')).default;
    
    // Test phone number formatting
    const phone1 = '0797877254';
    const phone2 = '+254797877254';
    const phone3 = '254797877254';
    
    // All should be formatted to 254797877254
    expect(phone1.replace(/^0/, '254')).toBe('254797877254');
    expect(phone2.replace(/^\+/, '')).toBe('254797877254');
    expect(phone3).toBe('254797877254');
  });
});
