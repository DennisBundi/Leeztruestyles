// Core Entity Types

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sale_price?: number | null;
  images: string[];
  category_id: string | null;
  created_at: string;
  updated_at: string;
  is_flash_sale?: boolean;
  flash_sale_start?: string | null;
  flash_sale_end?: string | null;
  status?: 'active' | 'inactive';
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface Inventory {
  id: string;
  product_id: string;
  stock_quantity: number;
  reserved_quantity: number;
  last_updated: string;
}

export interface Order {
  id: string;
  user_id: string | null;
  seller_id: string | null; // Employee ID for POS sales
  sale_type: 'online' | 'pos';
  total_amount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  payment_method: 'mpesa' | 'card' | 'cash';
  payment_reference: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
}

export interface Employee {
  id: string;
  user_id: string;
  role: 'admin' | 'manager' | 'seller';
  employee_code: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  order_id: string;
  payment_provider: 'paystack';
  provider_reference: string;
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'reversed';
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// Payment Types
export interface PaymentRequest {
  order_id: string;
  amount: number;
  method: 'mpesa' | 'card';
  phone?: string; // Required for M-Pesa
  email?: string; // Required for card
}

export interface PaymentResponse {
  success: boolean;
  reference?: string;
  authorization_url?: string;
  message?: string;
  error?: string;
}

// Cart Types
export interface CartItem {
  product: Product;
  quantity: number;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

