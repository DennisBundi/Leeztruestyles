/**
 * Tests for Payments API - Initiate endpoint
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { mockOrder, mockOrderItems } from '../../fixtures/orders';
import { mockUser } from '../../fixtures/users';

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: mockUser.id, email: mockUser.email } },
      error: null,
    }),
  },
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  update: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  single: jest.fn(),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

jest.mock('@/services/paymentService', () => ({
  PaymentService: {
    initiateMpesaPayment: jest.fn(),
    initiateCardPayment: jest.fn(),
  },
}));

jest.mock('@/services/inventoryService', () => ({
  InventoryService: {
    reserveStock: jest.fn(),
    releaseStock: jest.fn(),
  },
}));

jest.mock('@/lib/rateLimit', () => ({
  rateLimit: jest.fn(() => true),
}));

describe('Payments API - Initiate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/payments/initiate', () => {
    it('should initiate M-Pesa payment successfully', async () => {
      const { PaymentService } = require('@/services/paymentService');
      const { InventoryService } = require('@/services/inventoryService');

      // Mock order fetch
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockOrder, status: 'pending' },
        error: null,
      });

      // Mock order items fetch
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: mockOrderItems,
        error: null,
      });

      // Mock inventory reservation
      InventoryService.reserveStock.mockResolvedValue(true);

      // Mock payment service
      PaymentService.initiateMpesaPayment.mockResolvedValue({
        success: true,
        reference: 'MPESA-REF-123',
        message: 'Payment initiated',
      });

      // Mock order update
      mockSupabaseClient.update.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const { POST } = await import('@/app/api/payments/initiate/route');

      const paymentData = {
        order_id: mockOrder.id,
        amount: 2000,
        method: 'mpesa',
        phone: '+254712345678',
      };

      const request = new NextRequest('http://localhost:3000/api/payments/initiate', {
        method: 'POST',
        body: JSON.stringify(paymentData),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.reference).toBe('MPESA-REF-123');
      expect(PaymentService.initiateMpesaPayment).toHaveBeenCalled();
      expect(InventoryService.reserveStock).toHaveBeenCalled();
    });

    it('should initiate card payment successfully', async () => {
      const { PaymentService } = require('@/services/paymentService');
      const { InventoryService } = require('@/services/inventoryService');

      // Mock order fetch
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockOrder, status: 'pending' },
        error: null,
      });

      // Mock order items fetch
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: mockOrderItems,
        error: null,
      });

      // Mock inventory reservation
      InventoryService.reserveStock.mockResolvedValue(true);

      // Mock payment service
      PaymentService.initiateCardPayment.mockResolvedValue({
        success: true,
        reference: 'CARD-REF-123',
        authorization_url: 'https://paystack.com/authorize',
        message: 'Payment initialized',
      });

      // Mock order update
      mockSupabaseClient.update.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const { POST } = await import('@/app/api/payments/initiate/route');

      const paymentData = {
        order_id: mockOrder.id,
        amount: 2000,
        method: 'card',
        email: 'customer@example.com',
      };

      const request = new NextRequest('http://localhost:3000/api/payments/initiate', {
        method: 'POST',
        body: JSON.stringify(paymentData),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.reference).toBe('CARD-REF-123');
      expect(data.authorization_url).toBe('https://paystack.com/authorize');
      expect(PaymentService.initiateCardPayment).toHaveBeenCalled();
    });

    it('should require phone number for M-Pesa payment', async () => {
      const { POST } = await import('@/app/api/payments/initiate/route');

      const paymentData = {
        order_id: mockOrder.id,
        amount: 2000,
        method: 'mpesa',
        // Missing phone
      };

      const request = new NextRequest('http://localhost:3000/api/payments/initiate', {
        method: 'POST',
        body: JSON.stringify(paymentData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Phone number required for M-Pesa payment');
    });

    it('should require email for card payment', async () => {
      const { POST } = await import('@/app/api/payments/initiate/route');

      const paymentData = {
        order_id: mockOrder.id,
        amount: 2000,
        method: 'card',
        // Missing email
      };

      const request = new NextRequest('http://localhost:3000/api/payments/initiate', {
        method: 'POST',
        body: JSON.stringify(paymentData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email required for card payment');
    });

    it('should enforce rate limiting', async () => {
      const { rateLimit } = require('@/lib/rateLimit');
      rateLimit.mockReturnValue(false); // Rate limit exceeded

      const { POST } = await import('@/app/api/payments/initiate/route');

      const paymentData = {
        order_id: mockOrder.id,
        amount: 2000,
        method: 'mpesa',
        phone: '+254712345678',
      };

      const request = new NextRequest('http://localhost:3000/api/payments/initiate', {
        method: 'POST',
        body: JSON.stringify(paymentData),
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Too many requests');
    });

    it('should return 404 if order not found', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Order not found' },
      });

      const { POST } = await import('@/app/api/payments/initiate/route');

      const paymentData = {
        order_id: 'non-existent-order',
        amount: 2000,
        method: 'mpesa',
        phone: '+254712345678',
      };

      const request = new NextRequest('http://localhost:3000/api/payments/initiate', {
        method: 'POST',
        body: JSON.stringify(paymentData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Order not found');
    });

    it('should reject payment for non-pending orders', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockOrder, status: 'completed' },
        error: null,
      });

      const { POST } = await import('@/app/api/payments/initiate/route');

      const paymentData = {
        order_id: mockOrder.id,
        amount: 2000,
        method: 'mpesa',
        phone: '+254712345678',
      };

      const request = new NextRequest('http://localhost:3000/api/payments/initiate', {
        method: 'POST',
        body: JSON.stringify(paymentData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Order is not pending payment');
    });

    it('should reserve inventory before payment', async () => {
      const { PaymentService } = require('@/services/paymentService');
      const { InventoryService } = require('@/services/inventoryService');

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockOrder, status: 'pending' },
        error: null,
      });

      mockSupabaseClient.select.mockResolvedValueOnce({
        data: mockOrderItems,
        error: null,
      });

      InventoryService.reserveStock.mockResolvedValue(true);

      PaymentService.initiateMpesaPayment.mockResolvedValue({
        success: true,
        reference: 'MPESA-REF-123',
      });

      mockSupabaseClient.update.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const { POST } = await import('@/app/api/payments/initiate/route');

      const paymentData = {
        order_id: mockOrder.id,
        amount: 2000,
        method: 'mpesa',
        phone: '+254712345678',
      };

      const request = new NextRequest('http://localhost:3000/api/payments/initiate', {
        method: 'POST',
        body: JSON.stringify(paymentData),
        headers: { 'Content-Type': 'application/json' },
      });

      await POST(request);

      // Verify inventory was reserved for each order item
      expect(InventoryService.reserveStock).toHaveBeenCalledTimes(mockOrderItems.length);
    });

    it('should release inventory on payment failure', async () => {
      const { PaymentService } = require('@/services/paymentService');
      const { InventoryService } = require('@/services/inventoryService');

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockOrder, status: 'pending' },
        error: null,
      });

      mockSupabaseClient.select.mockResolvedValueOnce({
        data: mockOrderItems,
        error: null,
      });

      InventoryService.reserveStock.mockResolvedValue(true);

      PaymentService.initiateMpesaPayment.mockResolvedValue({
        success: false,
        error: 'Payment failed',
      });

      const { POST } = await import('@/app/api/payments/initiate/route');

      const paymentData = {
        order_id: mockOrder.id,
        amount: 2000,
        method: 'mpesa',
        phone: '+254712345678',
      };

      const request = new NextRequest('http://localhost:3000/api/payments/initiate', {
        method: 'POST',
        body: JSON.stringify(paymentData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      // Verify inventory was released
      expect(InventoryService.releaseStock).toHaveBeenCalledTimes(mockOrderItems.length);
    });

    it('should handle insufficient stock', async () => {
      const { InventoryService } = require('@/services/inventoryService');

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockOrder, status: 'pending' },
        error: null,
      });

      mockSupabaseClient.select.mockResolvedValueOnce({
        data: mockOrderItems,
        error: null,
      });

      InventoryService.reserveStock.mockResolvedValue(false);

      const { POST } = await import('@/app/api/payments/initiate/route');

      const paymentData = {
        order_id: mockOrder.id,
        amount: 2000,
        method: 'mpesa',
        phone: '+254712345678',
      };

      const request = new NextRequest('http://localhost:3000/api/payments/initiate', {
        method: 'POST',
        body: JSON.stringify(paymentData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Insufficient stock');
    });

    it('should validate request schema', async () => {
      const { POST } = await import('@/app/api/payments/initiate/route');

      const invalidData = {
        order_id: 'invalid-uuid',
        amount: -100,
        method: 'invalid-method',
      };

      const request = new NextRequest('http://localhost:3000/api/payments/initiate', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('should update order with payment reference and status', async () => {
      const { PaymentService } = require('@/services/paymentService');
      const { InventoryService } = require('@/services/inventoryService');

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockOrder, status: 'pending' },
        error: null,
      });

      mockSupabaseClient.select.mockResolvedValueOnce({
        data: mockOrderItems,
        error: null,
      });

      InventoryService.reserveStock.mockResolvedValue(true);

      PaymentService.initiateMpesaPayment.mockResolvedValue({
        success: true,
        reference: 'MPESA-REF-123',
      });

      mockSupabaseClient.update.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const { POST } = await import('@/app/api/payments/initiate/route');

      const paymentData = {
        order_id: mockOrder.id,
        amount: 2000,
        method: 'mpesa',
        phone: '+254712345678',
      };

      const request = new NextRequest('http://localhost:3000/api/payments/initiate', {
        method: 'POST',
        body: JSON.stringify(paymentData),
        headers: { 'Content-Type': 'application/json' },
      });

      await POST(request);

      // Verify order was updated with payment reference and status
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_reference: 'MPESA-REF-123',
          payment_method: 'mpesa',
          status: 'processing',
        })
      );
    });
  });
});

