/**
 * Tests for Image Upload API
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { mockUser, mockEmployee } from '../../fixtures/users';

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
  eq: jest.fn(() => mockSupabaseClient),
  single: jest.fn(),
};

const mockAdminClient = {
  ...mockSupabaseClient,
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      getPublicUrl: jest.fn(),
    })),
  },
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => mockAdminClient),
}));

describe('Image Upload API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/upload/image', () => {
    it('should upload image successfully', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockEmployee,
        error: null,
      });

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', mockFile);

      const storageBucket = mockAdminClient.storage.from('product-images');
      (storageBucket.upload as jest.Mock).mockResolvedValueOnce({
        data: { path: 'products/test123.jpg' },
        error: null,
      });

      (storageBucket.getPublicUrl as jest.Mock).mockReturnValueOnce({
        data: { publicUrl: 'https://example.com/image.jpg' },
      });

      const { POST } = await import('@/app/api/upload/image/route');

      const request = new NextRequest('http://localhost:3000/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('url');
      expect(data).toHaveProperty('path');
    });

    it('should require authentication', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const { POST } = await import('@/app/api/upload/image/route');

      const formData = new FormData();
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      formData.append('file', mockFile);

      const request = new NextRequest('http://localhost:3000/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should require employee role', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      const { POST } = await import('@/app/api/upload/image/route');

      const formData = new FormData();
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      formData.append('file', mockFile);

      const request = new NextRequest('http://localhost:3000/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Only employees can upload images');
    });

    it('should validate file type', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockEmployee,
        error: null,
      });

      const { POST } = await import('@/app/api/upload/image/route');

      const formData = new FormData();
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      formData.append('file', mockFile);

      const request = new NextRequest('http://localhost:3000/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid file type');
    });

    it('should validate file size', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockEmployee,
        error: null,
      });

      const { POST } = await import('@/app/api/upload/image/route');

      // Create a file larger than 10MB
      const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });
      const formData = new FormData();
      formData.append('file', largeFile);

      const request = new NextRequest('http://localhost:3000/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('File size exceeds');
    });

    it('should require file', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockEmployee,
        error: null,
      });

      const { POST } = await import('@/app/api/upload/image/route');

      const formData = new FormData();

      const request = new NextRequest('http://localhost:3000/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No file provided');
    });

    it('should handle upload errors', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockEmployee,
        error: null,
      });

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', mockFile);

      const storageBucket = mockAdminClient.storage.from('product-images');
      (storageBucket.upload as jest.Mock).mockResolvedValueOnce({
        data: null,
        error: { message: 'Upload failed' },
      });

      const { POST } = await import('@/app/api/upload/image/route');

      const request = new NextRequest('http://localhost:3000/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to upload image');
    });
  });
});

