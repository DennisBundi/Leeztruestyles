/**
 * Tests for Categories API routes
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { mockCategory, mockCategories } from '../fixtures/categories';
import { mockUser } from '../fixtures/users';

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
  insert: jest.fn(() => mockSupabaseClient),
  update: jest.fn(() => mockSupabaseClient),
  delete: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  single: jest.fn(),
  order: jest.fn(() => mockSupabaseClient),
  limit: jest.fn(() => mockSupabaseClient),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

jest.mock('@/lib/auth/roles', () => ({
  getUserRole: jest.fn().mockResolvedValue('admin'),
}));

describe('Categories API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/categories', () => {
    it('should return list of categories', async () => {
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: mockCategories,
        error: null,
      });

      const { GET } = await import('@/app/api/categories/route');
      const request = new NextRequest('http://localhost:3000/api/categories');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('categories');
      expect(Array.isArray(data.categories)).toBe(true);
      expect(data.categories.length).toBe(mockCategories.length);
    });

    it('should handle database errors', async () => {
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const { GET } = await import('@/app/api/categories/route');
      const request = new NextRequest('http://localhost:3000/api/categories');

      const response = await GET(request);

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/categories', () => {
    it('should create category for admin', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockCategory,
        error: null,
      });

      const { POST } = await import('@/app/api/categories/route');

      const categoryData = {
        name: 'New Category',
        slug: 'new-category',
        description: 'A new category',
      };

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        body: JSON.stringify(categoryData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('category');
      expect(data.category.name).toBe('New Category');
    });

    it('should require authentication', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const { POST } = await import('@/app/api/categories/route');

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', slug: 'test' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should require admin or manager role', async () => {
      const { getUserRole } = require('@/lib/auth/roles');
      getUserRole.mockResolvedValueOnce('seller');

      const { POST } = await import('@/app/api/categories/route');

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', slug: 'test' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(403);
    });

    it('should validate required fields', async () => {
      const { POST } = await import('@/app/api/categories/route');

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });
  });

  describe('PUT /api/categories', () => {
    it('should update category', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { ...mockCategory, name: 'Updated Category' },
        error: null,
      });

      const { PUT } = await import('@/app/api/categories/route');

      const updateData = {
        id: mockCategory.id,
        name: 'Updated Category',
        slug: 'updated-category',
      };

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.category.name).toBe('Updated Category');
    });

    it('should require category ID', async () => {
      const { PUT } = await import('@/app/api/categories/route');

      const request = new NextRequest('http://localhost:3000/api/categories', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Test' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await PUT(request);

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/categories', () => {
    it('should delete category if not in use', async () => {
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      mockSupabaseClient.delete.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const { DELETE } = await import('@/app/api/categories/route');
      const request = new NextRequest('http://localhost:3000/api/categories?id=cat-123');

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should prevent deletion if category is in use', async () => {
      mockSupabaseClient.select.mockResolvedValueOnce({
        data: [{ id: 'product-1', name: 'Product 1' }],
        error: null,
      });

      const { DELETE } = await import('@/app/api/categories/route');
      const request = new NextRequest('http://localhost:3000/api/categories?id=cat-123');

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot delete category');
      expect(data.details).toContain('in use');
    });

    it('should require category ID', async () => {
      const { DELETE } = await import('@/app/api/categories/route');
      const request = new NextRequest('http://localhost:3000/api/categories');

      const response = await DELETE(request);

      expect(response.status).toBe(400);
    });
  });
});

