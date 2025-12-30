/**
 * Tests for Auth API routes
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Mock auth roles
jest.mock('@/lib/auth/roles', () => ({
  getUserRole: jest.fn(),
}));

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/auth/role', () => {
    it('should return user role for authenticated user', async () => {
      const { getUserRole } = require('@/lib/auth/roles');
      getUserRole.mockResolvedValueOnce('admin');

      const { createClient } = require('@/lib/supabase/server');
      createClient.mockResolvedValueOnce({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      });

      const { GET } = await import('@/app/api/auth/role/route');
      const request = new NextRequest('http://localhost:3000/api/auth/role');
      
      const response = await GET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('role', 'admin');
    });

    it('should return 401 for unauthenticated user', async () => {
      const { createClient } = require('@/lib/supabase/server');
      createClient.mockResolvedValueOnce({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      });

      const { GET } = await import('@/app/api/auth/role/route');
      const request = new NextRequest('http://localhost:3000/api/auth/role');
      
      const response = await GET(request);
      
      expect(response.status).toBe(401);
    });
  });
});

