/**
 * Tests for cartStore (Zustand store)
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { useCartStore } from '@/store/cartStore';
import type { Product } from '@/types';

const s = () => useCartStore.getState();

const mockProduct: Product = {
  id: '1',
  name: 'Test Product',
  price: 1000,
  description: 'Test description',
  category_id: 'cat1',
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('cartStore', () => {
  beforeEach(() => {
    s().clearCart();
  });

  describe('addItem', () => {
    it('should add item to cart', () => {
      s().addItem(mockProduct, 1);
      const { items, getItemCount } = s();
      expect(items.length).toBe(1);
      expect(items[0].product.id).toBe('1');
      expect(items[0].quantity).toBe(1);
      expect(getItemCount()).toBe(1);
    });

    it('should add multiple quantities', () => {
      s().addItem(mockProduct, 3);
      expect(s().items[0].quantity).toBe(3);
    });

    it('should increment quantity if item already exists', () => {
      s().addItem(mockProduct, 1);
      s().addItem(mockProduct, 2);
      const { items } = s();
      expect(items.length).toBe(1);
      expect(items[0].quantity).toBe(3);
    });

    it('should handle items with size and color', () => {
      s().addItem(mockProduct, 1, 'M', 'Red');
      const { items } = s();
      expect(items[0].size).toBe('M');
      expect(items[0].color).toBe('Red');
    });

    it('should create separate items for different sizes/colors', () => {
      s().addItem(mockProduct, 1, 'M', 'Red');
      s().addItem(mockProduct, 1, 'L', 'Red');
      s().addItem(mockProduct, 1, 'M', 'Blue');
      expect(s().items.length).toBe(3);
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', () => {
      s().addItem(mockProduct, 1);
      expect(s().items.length).toBe(1);
      s().removeItem('1');
      expect(s().items.length).toBe(0);
    });
  });

  describe('updateQuantity', () => {
    it('should update item quantity', () => {
      s().addItem(mockProduct, 1);
      s().updateQuantity('1', 5);
      expect(s().items[0].quantity).toBe(5);
    });

    it('should remove item if quantity is 0', () => {
      s().addItem(mockProduct, 1);
      s().updateQuantity('1', 0);
      expect(s().items.length).toBe(0);
    });
  });

  describe('updateSalePrice', () => {
    it('should update sale price for item', () => {
      s().addItem(mockProduct, 1);
      s().updateSalePrice('1', 800);
      expect(s().items[0].salePrice).toBe(800);
    });

    it('should remove sale price if set to undefined', () => {
      s().addItem(mockProduct, 1);
      s().updateSalePrice('1', 800);
      s().updateSalePrice('1', undefined);
      expect(s().items[0].salePrice).toBeUndefined();
    });
  });

  describe('getTotal', () => {
    it('should calculate total correctly', () => {
      s().addItem(mockProduct, 2);
      expect(s().getTotal()).toBe(2000);
    });

    it('should use sale price if available', () => {
      s().addItem(mockProduct, 2);
      s().updateSalePrice('1', 800);
      expect(s().getTotal()).toBe(1600);
    });

    it('should calculate total for multiple items', () => {
      const product2: Product = { ...mockProduct, id: '2', price: 500 };
      s().addItem(mockProduct, 2);
      s().addItem(product2, 3);
      expect(s().getTotal()).toBe(3500);
    });
  });

  describe('clearCart', () => {
    it('should clear all items from cart', () => {
      s().addItem(mockProduct, 1);
      s().addItem({ ...mockProduct, id: '2' }, 1);
      expect(s().items.length).toBe(2);
      s().clearCart();
      expect(s().items.length).toBe(0);
      expect(s().getItemCount()).toBe(0);
    });
  });

  describe('addCustomItem', () => {
    it('should add custom product to cart', () => {
      s().addCustomItem({ name: 'Custom Product', price: 1500, size: 'L', description: 'Custom description' }, 1);
      const { items } = s();
      expect(items.length).toBe(1);
      expect(items[0].product.isCustom).toBe(true);
      expect(items[0].product.name).toBe('Custom Product');
      expect(items[0].product.price).toBe(1500);
    });

    it('should handle custom products with images', () => {
      const images = ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'];
      s().addCustomItem({ name: 'Custom Product', price: 1500, images }, 1);
      expect(s().items[0].product.images).toEqual(images);
    });

    it('should increment quantity for existing custom product', () => {
      const customData = { name: 'Custom Product', price: 1500 };
      s().addCustomItem(customData, 1);
      s().addCustomItem(customData, 2);
      expect(s().items.length).toBe(1);
      expect(s().items[0].quantity).toBe(3);
    });
  });

  describe('getTotal with sale prices', () => {
    it('should calculate total with mixed sale prices', () => {
      const product2: Product = { ...mockProduct, id: '2', price: 500 };
      s().addItem(mockProduct, 2);
      s().addItem(product2, 3);
      s().updateSalePrice('1', 800);
      expect(s().getTotal()).toBe(3100);
    });

    it('should handle sale price for custom products', () => {
      s().addCustomItem({ name: 'Custom Product', price: 1500 }, 2);
      const customItemId = s().items[0].product.id;
      s().updateSalePrice(customItemId, 1200);
      expect(s().getTotal()).toBe(2400);
    });
  });

  describe('isCustomProduct', () => {
    it('should identify custom products', () => {
      s().addItem(mockProduct, 1);
      expect(s().isCustomProduct('1')).toBe(false);

      s().addCustomItem({ name: 'Custom', price: 1000 }, 1);
      const customItemId = s().items.find(item => (item.product as any).isCustom)?.product.id;
      if (customItemId) {
        expect(s().isCustomProduct(customItemId)).toBe(true);
      }
    });
  });
});
