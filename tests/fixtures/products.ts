/**
 * Test fixtures for products
 */

import type { Product } from '@/types';

export const mockProduct: Product = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Test Product',
  description: 'A test product description',
  price: 1000,
  category_id: 'cat-123',
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  available_stock: 10,
  images: ['https://example.com/image1.jpg'],
};

export const mockProductWithSizes: Product = {
  ...mockProduct,
  id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Product with Sizes',
};

export const mockProductWithColors: Product = {
  ...mockProduct,
  id: '550e8400-e29b-41d4-a716-446655440002',
  name: 'Product with Colors',
};

export const mockProductOutOfStock: Product = {
  ...mockProduct,
  id: '550e8400-e29b-41d4-a716-446655440003',
  name: 'Out of Stock Product',
  available_stock: 0,
};

export const mockFlashSaleProduct: Product = {
  ...mockProduct,
  id: '550e8400-e29b-41d4-a716-446655440004',
  name: 'Flash Sale Product',
  is_flash_sale: true,
  sale_price: 800,
  discount_percent: 20,
};

export const mockProducts: Product[] = [
  mockProduct,
  mockProductWithSizes,
  mockProductWithColors,
  mockFlashSaleProduct,
];

