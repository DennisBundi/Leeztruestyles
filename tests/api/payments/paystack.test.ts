/**
 * @jest-environment node
 */
/**
 * Tests for Payments API - Paystack webhook endpoint
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { mockOrderItems } from '../../fixtures/orders';

// Mock crypto to bypass HMAC signature verification
jest.mock('crypto', () => ({
  createHmac: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('valid-signature'),
  })),
}));

// Mock Supabase query builder
// Terminal awaitable: `.single()` and the builder itself when `await`ed via `eq()`
// The builder does NOT have a `then` property so it won't be treated as a thenable
// by Promise.resolve() — instead we wrap eq() to return a TerminalResult

class TerminalResult {
  data: unknown;
  error: unknown;
  // TerminalResult also has `.single()` and `.eq()` so callers can chain further
  single = jest.fn(() => Promise.resolve({ data: null, error: null }));
  // Additional `.eq()` calls return `this` for further chaining
  eq: jest.Mock = jest.fn(() => this);
  limit: jest.Mock = jest.fn(() => this);
  order: jest.Mock = jest.fn(() => this);

  constructor(data: unknown = null, error: unknown = null) {
    this.data = data;
    this.error = error;
  }

  // Thenable: `await terminalResult` resolves to { data, error }
  then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
    return Promise.resolve({ data: this.data, error: this.error }).then(resolve, reject);
  }

  resetMocks() {
    this.single.mockClear();
    this.single.mockResolvedValue({ data: null, error: null });
    this.eq.mockClear();
    this.eq.mockImplementation(() => this);
    this.limit.mockClear();
    this.limit.mockImplementation(() => this);
    this.order.mockClear();
    this.order.mockImplementation(() => this);
  }
}

const defaultTerminal = new TerminalResult();

const mockSupabaseClient = {
  from: jest.fn(),
  select: jest.fn(),
  update: jest.fn(),
  upsert: jest.fn(),
  insert: jest.fn(),
  delete: jest.fn(),
  eq: jest.fn(),
  neq: jest.fn(),
  limit: jest.fn(),
  order: jest.fn(),
  single: jest.fn(() => Promise.resolve({ data: null, error: null })),

  resetMocks() {
    const chainMethods = ['from', 'select', 'update', 'upsert', 'insert', 'delete', 'neq', 'limit', 'order'] as const;
    for (const m of chainMethods) {
      (this[m] as jest.Mock).mockClear();
      (this[m] as jest.Mock).mockImplementation(() => mockSupabaseClient);
    }
    // eq is the terminal: returns a TerminalResult (thenable + has .single())
    (this.eq as jest.Mock).mockClear();
    (this.eq as jest.Mock).mockImplementation(() => defaultTerminal);
    (this.single as jest.Mock).mockClear();
    (this.single as jest.Mock).mockResolvedValue({ data: null, error: null });
    defaultTerminal.resetMocks();
  },
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => mockSupabaseClient),
}));

jest.mock('@/services/reconciliationService', () => ({
  ReconciliationService: {
    reconcileTransaction: jest.fn(),
  },
}));

jest.mock('@/services/inventoryService', () => ({
  InventoryService: {
    deductStock: jest.fn(),
  },
}));

jest.mock('@/services/loyaltyService', () => ({
  LoyaltyService: {
    awardPurchasePoints: jest.fn().mockResolvedValue(0),
    awardReferralPoints: jest.fn().mockResolvedValue(0),
  },
}));

jest.mock('@/lib/email/service', () => ({
  sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
  sendInvoiceEmail: jest.fn().mockResolvedValue(undefined),
}))

describe('Payments API - Paystack Webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PAYSTACK_SECRET_KEY = 'test-secret';
    mockSupabaseClient.resetMocks();
  });

  describe('POST /api/payments/paystack', () => {
    it('should handle charge.success event', async () => {
      const { ReconciliationService } = require('@/services/reconciliationService');
      const { sendInvoiceEmail, sendOrderConfirmation } = require('@/lib/email/service');

      ReconciliationService.reconcileTransaction.mockResolvedValue(true);

      const { POST } = await import('@/app/api/payments/paystack/route');

      const webhookData = {
        event: 'charge.success',
        data: {
          reference: 'PAYSTACK-REF-123',
          metadata: {
            order_id: 'order-123',
          },
          customer: {
            email: 'customer@example.com',
          },
        },
      };

      const request = new NextRequest('http://localhost:3000/api/payments/paystack', {
        method: 'POST',
        body: JSON.stringify(webhookData),
        headers: { 'Content-Type': 'application/json', 'x-paystack-signature': 'valid-signature' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(ReconciliationService.reconcileTransaction).toHaveBeenCalledWith(
        'PAYSTACK-REF-123',
        'order-123'
      );
      expect(sendOrderConfirmation).toHaveBeenCalledWith('order-123', 'customer@example.com');
      expect(sendInvoiceEmail).toHaveBeenCalledWith('order-123', 'customer@example.com');
    });

    it('should handle charge.failed event', async () => {
      const { POST } = await import('@/app/api/payments/paystack/route');

      const webhookData = {
        event: 'charge.failed',
        data: {
          reference: 'PAYSTACK-REF-456',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/payments/paystack', {
        method: 'POST',
        body: JSON.stringify(webhookData),
        headers: { 'Content-Type': 'application/json', 'x-paystack-signature': 'valid-signature' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
        })
      );
    });

    it('should return error if order_id missing in metadata', async () => {
      const { POST } = await import('@/app/api/payments/paystack/route');

      const webhookData = {
        event: 'charge.success',
        data: {
          reference: 'PAYSTACK-REF-123',
          metadata: {},
        },
      };

      const request = new NextRequest('http://localhost:3000/api/payments/paystack', {
        method: 'POST',
        body: JSON.stringify(webhookData),
        headers: { 'Content-Type': 'application/json', 'x-paystack-signature': 'valid-signature' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Order ID not found in metadata');
    });

    it('should handle reconciliation failure', async () => {
      const { ReconciliationService } = require('@/services/reconciliationService');

      ReconciliationService.reconcileTransaction.mockResolvedValue(false);

      const { POST } = await import('@/app/api/payments/paystack/route');

      const webhookData = {
        event: 'charge.success',
        data: {
          reference: 'PAYSTACK-REF-123',
          metadata: {
            order_id: 'order-123',
          },
        },
      };

      const request = new NextRequest('http://localhost:3000/api/payments/paystack', {
        method: 'POST',
        body: JSON.stringify(webhookData),
        headers: { 'Content-Type': 'application/json', 'x-paystack-signature': 'valid-signature' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to reconcile transaction');
    });

    it('should handle unknown events', async () => {
      const { POST } = await import('@/app/api/payments/paystack/route');

      const webhookData = {
        event: 'unknown.event',
        data: {
          reference: 'PAYSTACK-REF-123',
        },
      };

      const request = new NextRequest('http://localhost:3000/api/payments/paystack', {
        method: 'POST',
        body: JSON.stringify(webhookData),
        headers: { 'Content-Type': 'application/json', 'x-paystack-signature': 'valid-signature' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const { POST } = await import('@/app/api/payments/paystack/route');

      const request = new NextRequest('http://localhost:3000/api/payments/paystack', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json', 'x-paystack-signature': 'valid-signature' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Webhook processing failed');
    });
  });
});
