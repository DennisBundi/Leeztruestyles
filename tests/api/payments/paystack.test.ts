/**
 * Tests for Payments API - Paystack webhook endpoint
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { mockOrderItems } from '../../fixtures/orders';

// Mock Supabase
const mockSupabaseClient = {
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  update: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
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

describe('Payments API - Paystack Webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/payments/paystack', () => {
    it('should handle charge.success event', async () => {
      const { ReconciliationService } = require('@/services/reconciliationService');
      const { InventoryService } = require('@/services/inventoryService');

      ReconciliationService.reconcileTransaction.mockResolvedValue(true);

      mockSupabaseClient.select.mockResolvedValueOnce({
        data: mockOrderItems,
        error: null,
      });

      InventoryService.deductStock.mockResolvedValue(undefined);

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
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(ReconciliationService.reconcileTransaction).toHaveBeenCalledWith(
        'PAYSTACK-REF-123',
        'order-123'
      );
      expect(InventoryService.deductStock).toHaveBeenCalledTimes(mockOrderItems.length);
    });

    it('should handle charge.failed event', async () => {
      mockSupabaseClient.update.mockResolvedValueOnce({
        data: [],
        error: null,
      });

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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Webhook processing failed');
    });
  });
});

