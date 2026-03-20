/**
 * Tests for auth role utilities
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { mockEmployee, mockAdminEmployee, mockManagerEmployee } from '../../fixtures/users';

// Mock Supabase
const mockSupabaseClient = {
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  single: jest.fn(),
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

describe('Auth Role Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserRole', () => {
    it('should return user role from employees table', async () => {
      const { getUserRole } = await import('@/lib/auth/roles');

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: { role: 'seller' },
        error: null,
      });

      const role = await getUserRole('user-123');

      expect(role).toBe('seller');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('should return null if user has no role', async () => {
      const { getUserRole } = await import('@/lib/auth/roles');

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      const role = await getUserRole('user-123');

      expect(role).toBeNull();
    });
  });

  describe('getEmployee', () => {
    it('should return employee record', async () => {
      const { getEmployee } = await import('@/lib/auth/roles');

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: mockEmployee,
        error: null,
      });

      const employee = await getEmployee('user-123');

      expect(employee).toEqual(mockEmployee);
    });

    it('should return null if employee not found', async () => {
      const { getEmployee } = await import('@/lib/auth/roles');

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      });

      const employee = await getEmployee('user-123');

      expect(employee).toBeNull();
    });
  });

  describe('hasRole', () => {
    it('should check if user has required role', async () => {
      const { hasRole } = await import('@/lib/auth/roles');

      expect(hasRole('admin', 'admin')).toBe(true);
      expect(hasRole('admin', 'manager')).toBe(true);
      expect(hasRole('admin', 'seller')).toBe(true);
      expect(hasRole('manager', 'admin')).toBe(false);
      expect(hasRole('manager', 'manager')).toBe(true);
      expect(hasRole('manager', 'seller')).toBe(true);
      expect(hasRole('seller', 'admin')).toBe(false);
      expect(hasRole('seller', 'manager')).toBe(false);
      expect(hasRole('seller', 'seller')).toBe(true);
    });

    it('should return false for null role', async () => {
      const { hasRole } = await import('@/lib/auth/roles');

      expect(hasRole(null, 'seller')).toBe(false);
    });
  });

  describe('canAccessAdmin', () => {
    it('should allow admin, manager, and seller', async () => {
      const { canAccessAdmin } = await import('@/lib/auth/roles');

      expect(canAccessAdmin('admin')).toBe(true);
      expect(canAccessAdmin('manager')).toBe(true);
      expect(canAccessAdmin('seller')).toBe(true);
      expect(canAccessAdmin(null)).toBe(false);
    });
  });

  describe('canAccessPOS', () => {
    it('should allow admin, manager, and seller', async () => {
      const { canAccessPOS } = await import('@/lib/auth/roles');

      expect(canAccessPOS('admin')).toBe(true);
      expect(canAccessPOS('manager')).toBe(true);
      expect(canAccessPOS('seller')).toBe(true);
      expect(canAccessPOS(null)).toBe(false);
    });
  });

  describe('canAccessSection', () => {
    it('should restrict sellers from certain sections', async () => {
      const { canAccessSection } = await import('@/lib/auth/roles');

      // Sellers can access (matches AdminNav seller permissions)
      expect(canAccessSection('seller', 'orders')).toBe(true);
      expect(canAccessSection('seller', 'products')).toBe(true);
      expect(canAccessSection('seller', 'pos')).toBe(true);
      expect(canAccessSection('seller', 'profile')).toBe(true);
      expect(canAccessSection('seller', 'settings')).toBe(true);

      // Sellers can access dashboard (scoped seller view)
      expect(canAccessSection('seller', 'dashboard')).toBe(true);

      // Sellers cannot access
      expect(canAccessSection('seller', 'inventory')).toBe(false);
      expect(canAccessSection('seller', 'employees')).toBe(false);
      expect(canAccessSection('seller', 'payments')).toBe(false);
      expect(canAccessSection('seller', 'reviews')).toBe(false);
      expect(canAccessSection('seller', 'loyalty')).toBe(false);
    });

    it('should allow admin and manager to access most sections', async () => {
      const { canAccessSection } = await import('@/lib/auth/roles');

      expect(canAccessSection('admin', 'dashboard')).toBe(true);
      expect(canAccessSection('admin', 'products')).toBe(true);
      expect(canAccessSection('admin', 'inventory')).toBe(true);
      expect(canAccessSection('admin', 'employees')).toBe(true);
      expect(canAccessSection('admin', 'payments')).toBe(true);
      expect(canAccessSection('admin', 'reviews')).toBe(true);
      expect(canAccessSection('admin', 'loyalty')).toBe(true);

      expect(canAccessSection('manager', 'dashboard')).toBe(true);
      expect(canAccessSection('manager', 'products')).toBe(true);
      expect(canAccessSection('manager', 'inventory')).toBe(true);
      expect(canAccessSection('manager', 'payments')).toBe(true);
      expect(canAccessSection('manager', 'reviews')).toBe(true);
      expect(canAccessSection('manager', 'loyalty')).toBe(true);
      expect(canAccessSection('manager', 'employees')).toBe(false);
    });

    it('should restrict employees section to admin only', async () => {
      const { canAccessSection } = await import('@/lib/auth/roles');

      expect(canAccessSection('admin', 'employees')).toBe(true);
      expect(canAccessSection('manager', 'employees')).toBe(false);
      expect(canAccessSection('seller', 'employees')).toBe(false);
    });
  });

  describe('canAccessSection - importation', () => {
    it('should allow admin to access importation section', async () => {
      const { canAccessSection } = await import('@/lib/auth/roles');

      expect(canAccessSection('admin', 'importation')).toBe(true);
    });

    it('should allow manager to access importation section', async () => {
      const { canAccessSection } = await import('@/lib/auth/roles');

      expect(canAccessSection('manager', 'importation')).toBe(true);
    });

    it('should deny seller access to importation section', async () => {
      const { canAccessSection } = await import('@/lib/auth/roles');

      expect(canAccessSection('seller', 'importation')).toBe(false);
    });
  });

  describe('getAllowedSections', () => {
    it('should return allowed sections for each role', async () => {
      const { getAllowedSections } = await import('@/lib/auth/roles');

      const adminSections = getAllowedSections('admin');
      expect(adminSections).toContain('dashboard');
      expect(adminSections).toContain('employees');
      expect(adminSections).toContain('reviews');
      expect(adminSections).toContain('loyalty');
      expect(adminSections.length).toBeGreaterThan(5);

      const managerSections = getAllowedSections('manager');
      expect(managerSections).toContain('reviews');
      expect(managerSections).toContain('loyalty');
      expect(managerSections).not.toContain('employees');

      const sellerSections = getAllowedSections('seller');
      expect(sellerSections).toContain('orders');
      expect(sellerSections).toContain('products');
      expect(sellerSections).toContain('pos');
      expect(sellerSections).not.toContain('employees');
      expect(sellerSections).toContain('dashboard');
      expect(sellerSections).not.toContain('reviews');
      expect(sellerSections).not.toContain('loyalty');

      expect(getAllowedSections(null)).toEqual([]);
    });
  });
});

