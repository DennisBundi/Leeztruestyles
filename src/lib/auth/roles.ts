import { createClient } from '@/lib/supabase/server';
import type { Employee } from '@/types';

export type UserRole = 'admin' | 'manager' | 'seller';

export async function getUserRole(userId: string): Promise<UserRole | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('employees')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.role as UserRole;
}

export async function getEmployee(userId: string): Promise<Employee | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Employee;
}

export function hasRole(userRole: UserRole | null, requiredRole: UserRole): boolean {
  if (!userRole) return false;

  const roleHierarchy: Record<UserRole, number> = {
    admin: 3,
    manager: 2,
    seller: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export function canAccessAdmin(userRole: UserRole | null): boolean {
  return hasRole(userRole, 'admin') || hasRole(userRole, 'manager') || hasRole(userRole, 'seller');
}

export function canAccessPOS(userRole: UserRole | null): boolean {
  return hasRole(userRole, 'admin') || hasRole(userRole, 'manager') || hasRole(userRole, 'seller');
}

export type DashboardSection = 'dashboard' | 'products' | 'orders' | 'inventory' | 'employees' | 'payments' | 'pos' | 'profile' | 'settings';

export function canAccessSection(userRole: UserRole | null, section: DashboardSection): boolean {
  if (!userRole) return false;

  // Sellers can only access: orders, pos, profile, settings (NOT payments)
  if (userRole === 'seller') {
    return ['orders', 'pos', 'profile', 'settings'].includes(section);
  }

  // Admin and manager can access these sections
  if (['orders', 'payments', 'pos', 'profile', 'settings'].includes(section)) {
    return true;
  }

  // Only admin and manager can access these sections
  if (['dashboard', 'products', 'inventory'].includes(section)) {
    return userRole === 'admin' || userRole === 'manager';
  }

  // Only admin can access employees section
  if (section === 'employees') {
    return userRole === 'admin';
  }

  return false;
}

export function getAllowedSections(userRole: UserRole | null): DashboardSection[] {
  if (!userRole) return [];

  const allSections: DashboardSection[] = ['dashboard', 'products', 'orders', 'inventory', 'employees', 'payments', 'pos', 'profile', 'settings'];
  
  return allSections.filter(section => canAccessSection(userRole, section));
}

