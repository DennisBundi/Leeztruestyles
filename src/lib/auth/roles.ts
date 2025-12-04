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
  return hasRole(userRole, 'admin') || hasRole(userRole, 'manager');
}

export function canAccessPOS(userRole: UserRole | null): boolean {
  return hasRole(userRole, 'admin') || hasRole(userRole, 'manager') || hasRole(userRole, 'seller');
}

