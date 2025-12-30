/**
 * Test fixtures for users and employees
 */

export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  full_name: 'Test User',
  phone: '+254712345678',
  created_at: new Date().toISOString(),
};

export const mockAdminUser = {
  ...mockUser,
  id: 'admin-123',
  email: 'admin@example.com',
  full_name: 'Admin User',
};

export const mockSellerUser = {
  ...mockUser,
  id: 'seller-123',
  email: 'seller@example.com',
  full_name: 'Seller User',
};

export const mockEmployee = {
  id: 'emp-123',
  user_id: 'user-123',
  employee_code: 'EMP001',
  role: 'seller' as const,
  created_at: new Date().toISOString(),
};

export const mockAdminEmployee = {
  ...mockEmployee,
  id: 'admin-emp-123',
  user_id: 'admin-123',
  employee_code: 'ADMIN001',
  role: 'admin' as const,
};

export const mockManagerEmployee = {
  ...mockEmployee,
  id: 'manager-emp-123',
  user_id: 'manager-123',
  employee_code: 'MGR001',
  role: 'manager' as const,
};

