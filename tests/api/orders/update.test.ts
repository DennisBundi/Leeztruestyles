/**
 * Tests for Orders API - Update endpoint
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { mockOrder } from '../../fixtures/orders';
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
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

jest.mock('@/lib/auth/roles', () => ({
  getUserRole: jest.fn().mockResolvedValue('admin'),
}));

describe('Orders API - Update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PUT /api/orders/update', () => {
    it('should update order status', async () => {
      mockSupabaseClient.update.mockResolvedValueOnce({
        data: [{ ...mockOrder, status: 'completed' }],
        error: null,
      });

      const { PUT } = await import('@/app/api/orders/update/route');

      const updateData = {
        order_id: mockOrder.id,
        status: 'completed',
      };

      const request = new NextRequest('http://localhost:3000/api/orders/update', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
        })
      );
    });

    it('should update payment method', async () => {
      mockSupabaseClient.update.mockResolvedValueOnce({
        data: [{ ...mockOrder, payment_method: 'cash' }],
        error: null,
      });

      const { PUT } = await import('@/app/api/orders/update/route');

      const updateData = {
        order_id: mockOrder.id,
        payment_method: 'cash',
      };

      const request = new NextRequest('http://localhost:3000/api/orders/update', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);

      expect(response.status).toBe(200);
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method: 'cash',
        })
      );
    });

    it('should update seller_id', async () => {
      mockSupabaseClient.update.mockResolvedValueOnce({
        data: [{ ...mockOrder, seller_id: 'new-seller-123' }],
        error: null,
      });

      const { PUT } = await import('@/app/api/orders/update/route');

      const updateData = {
        order_id: mockOrder.id,
        seller_id: 'new-seller-123',
      };

      const request = new NextRequest('http://localhost:3000/api/orders/update', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);

      expect(response.status).toBe(200);
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          seller_id: 'new-seller-123',
        })
      );
    });

    it('should update social_platform', async () => {
      mockSupabaseClient.update.mockResolvedValueOnce({
        data: [{ ...mockOrder, social_platform: 'instagram' }],
        error: null,
      });

      const { PUT } = await import('@/app/api/orders/update/route');

      const updateData = {
        order_id: mockOrder.id,
        social_platform: 'instagram',
      };

      const request = new NextRequest('http://localhost:3000/api/orders/update', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);

      expect(response.status).toBe(200);
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          social_platform: 'instagram',
        })
      );
    });

    it('should update multiple fields at once', async () => {
      mockSupabaseClient.update.mockResolvedValueOnce({
        data: [
          {
            ...mockOrder,
            status: 'processing',
            payment_method: 'mpesa',
            social_platform: 'whatsapp',
          },
        ],
        error: null,
      });

      const { PUT } = await import('@/app/api/orders/update/route');

      const updateData = {
        order_id: mockOrder.id,
        status: 'processing',
        payment_method: 'mpesa',
        social_platform: 'whatsapp',
      };

      const request = new NextRequest('http://localhost:3000/api/orders/update', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);

      expect(response.status).toBe(200);
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'processing',
          payment_method: 'mpesa',
          social_platform: 'whatsapp',
        })
      );
    });

    it('should require authentication', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const { PUT } = await import('@/app/api/orders/update/route');

      const updateData = {
        order_id: mockOrder.id,
        status: 'completed',
      };

      const request = new NextRequest('http://localhost:3000/api/orders/update', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);

      expect(response.status).toBe(401);
    });

    it('should require user role', async () => {
      const { getUserRole } = require('@/lib/auth/roles');
      getUserRole.mockResolvedValueOnce(null);

      const { PUT } = await import('@/app/api/orders/update/route');

      const updateData = {
        order_id: mockOrder.id,
        status: 'completed',
      };

      const request = new NextRequest('http://localhost:3000/api/orders/update', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);

      expect(response.status).toBe(403);
    });

    it('should validate order_id is UUID', async () => {
      const { PUT } = await import('@/app/api/orders/update/route');

      const updateData = {
        order_id: 'invalid-id',
        status: 'completed',
      };

      const request = new NextRequest('http://localhost:3000/api/orders/update', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('should validate status enum', async () => {
      const { PUT } = await import('@/app/api/orders/update/route');

      const updateData = {
        order_id: mockOrder.id,
        status: 'invalid-status',
      };

      const request = new NextRequest('http://localhost:3000/api/orders/update', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('should handle missing social_platform column gracefully', async () => {
      // First attempt fails with social_platform error
      mockSupabaseClient.update.mockResolvedValueOnce({
        data: null,
        error: { message: 'column "social_platform" does not exist' },
      });

      // Retry without social_platform succeeds
      mockSupabaseClient.update.mockResolvedValueOnce({
        data: [{ ...mockOrder }],
        error: null,
      });

      const { PUT } = await import('@/app/api/orders/update/route');

      const updateData = {
        order_id: mockOrder.id,
        status: 'completed',
        social_platform: 'instagram',
      };

      const request = new NextRequest('http://localhost:3000/api/orders/update', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.warning).toContain('Social platform column not found');
    });

    it('should remove null/undefined seller_id from update', async () => {
      mockSupabaseClient.update.mockResolvedValueOnce({
        data: [{ ...mockOrder }],
        error: null,
      });

      const { PUT } = await import('@/app/api/orders/update/route');

      const updateData = {
        order_id: mockOrder.id,
        seller_id: null,
        status: 'completed',
      };

      const request = new NextRequest('http://localhost:3000/api/orders/update', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);

      expect(response.status).toBe(200);
      // seller_id should not be in the update payload
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(
        expect.not.objectContaining({
          seller_id: null,
        })
      );
    });

    it('should handle database errors', async () => {
      mockSupabaseClient.update.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection error' },
      });

      const { PUT } = await import('@/app/api/orders/update/route');

      const updateData = {
        order_id: mockOrder.id,
        status: 'completed',
      };

      const request = new NextRequest('http://localhost:3000/api/orders/update', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update order');
    });
  });
});

