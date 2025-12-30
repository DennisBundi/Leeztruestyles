/**
 * Test fixtures for categories
 */

import type { Category } from '@/types';

export const mockCategory: Category = {
  id: 'cat-123',
  name: 'Test Category',
  slug: 'test-category',
  description: 'A test category',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const mockCategories: Category[] = [
  mockCategory,
  {
    ...mockCategory,
    id: 'cat-456',
    name: 'Another Category',
    slug: 'another-category',
  },
  {
    ...mockCategory,
    id: 'cat-789',
    name: 'Third Category',
    slug: 'third-category',
  },
];

