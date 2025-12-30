/**
 * Tests for Products API routes
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'user-1', email: 'admin@test.com' } },
      error: null,
    }),
  },
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  insert: jest.fn(() => mockSupabaseClient),
  update: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  single: jest.fn(),
  order: jest.fn(() => mockSupabaseClient),
  limit: jest.fn(() => mockSupabaseClient),
  rpc: jest.fn(),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => mockSupabaseClient),
}));

jest.mock('@/lib/auth/roles', () => ({
  getUserRole: jest.fn().mockResolvedValue('admin'),
}));

describe('Products API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/products', () => {
    it('should create product for admin user', async () => {
      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: [{ id: 'prod-1', name: 'Test Product', price: 1000 }],
        error: null,
      });
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'prod-1', name: 'Test Product', price: 1000 },
        error: null,
      });
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: true,
        error: null,
      });

      const { POST } = await import('@/app/api/products/route');
      
      const productData = {
        name: 'Test Product',
        price: 1000,
        description: 'Test description',
        initial_stock: 10,
      };

      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify(productData),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('product');
      expect(data.product.name).toBe('Test Product');
    });

    it('should allow seller to create product', async () => {
      const { getUserRole } = require('@/lib/auth/roles');
      getUserRole.mockResolvedValueOnce('seller');

      mockSupabaseClient.insert.mockResolvedValueOnce({
        data: [{ id: 'prod-2', name: 'Seller Product', price: 800 }],
        error: null,
      });
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'prod-2', name: 'Seller Product', price: 800 },
        error: null,
      });
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: true,
        error: null,
      });

      const { POST } = await import('@/app/api/products/route');
      
      const productData = {
        name: 'Seller Product',
        price: 800,
        description: 'Seller created product',
        initial_stock: 5,
      };

      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify(productData),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(200);
    });

    it('should return 403 for unauthorized user', async () => {
      const { getUserRole } = require('@/lib/auth/roles');
      getUserRole.mockResolvedValueOnce(null);

      const { POST } = await import('@/app/api/products/route');
      
      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', price: 1000 }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(403);
    });

    it('should validate required fields', async () => {
      const { POST } = await import('@/app/api/products/route');
      
      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'POST',
        body: JSON.stringify({}), // Missing required fields
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/products', () => {
    it('should return list of products', async () => {
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: [
          { id: '1', name: 'Product 1', price: 1000 },
          { id: '2', name: 'Product 2', price: 2000 },
        ],
        error: null,
      });

      const { GET } = await import('@/app/api/products/route');
      const request = new NextRequest('http://localhost:3000/api/products');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('products');
      expect(Array.isArray(data.products)).toBe(true);
    });

    it('should filter products by category', async () => {
      mockSupabaseClient.eq.mockResolvedValueOnce({
        data: [{ id: '1', name: 'Product 1', category_id: 'cat-1' }],
        error: null,
      });

      const { GET } = await import('@/app/api/products/route');
      const request = new NextRequest('http://localhost:3000/api/products?category=cat-1');
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('category_id', 'cat-1');
    });
  });

  describe('PUT /api/products', () => {
    it('should update product for admin', async () => {
      mockSupabaseClient.update.mockResolvedValueOnce({
        data: [{ id: 'prod-1', name: 'Updated Product', price: 1200 }],
        error: null,
      });
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'prod-1', name: 'Updated Product', price: 1200 },
        error: null,
      });
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: true,
        error: null,
      });

      const { PUT } = await import('@/app/api/products/route');
      
      const updateData = {
        id: 'prod-1',
        name: 'Updated Product',
        price: 1200,
      };

      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await PUT(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.product.name).toBe('Updated Product');
    });

    it('should allow seller to update product', async () => {
      const { getUserRole } = require('@/lib/auth/roles');
      getUserRole.mockResolvedValueOnce('seller');

      mockSupabaseClient.update.mockResolvedValueOnce({
        data: [{ id: 'prod-1', name: 'Seller Updated Product' }],
        error: null,
      });
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'prod-1', name: 'Seller Updated Product' },
        error: null,
      });

      const { PUT } = await import('@/app/api/products/route');
      
      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'PUT',
        body: JSON.stringify({ id: 'prod-1', name: 'Seller Updated Product' }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await PUT(request);
      
      expect(response.status).toBe(200);
    });

    it('should prevent seller from updating buying_price', async () => {
      const { getUserRole } = require('@/lib/auth/roles');
      getUserRole.mockResolvedValueOnce('seller');

      mockSupabaseClient.update.mockResolvedValueOnce({
        data: [{ id: 'prod-1', buying_price: null }], // Should remain unchanged
        error: null,
      });
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { id: 'prod-1', buying_price: null },
        error: null,
      });

      const { PUT } = await import('@/app/api/products/route');
      
      const request = new NextRequest('http://localhost:3000/api/products', {
        method: 'PUT',
        body: JSON.stringify({ 
          id: 'prod-1', 
          name: 'Test',
          buying_price: 500, // Seller trying to set buying price
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = await PUT(request);
      
      expect(response.status).toBe(200);
      // buying_price should not be updated by seller
    });
  });
});
