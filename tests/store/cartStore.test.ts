/**
 * Tests for cartStore (Zustand store)
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { useCartStore } from '@/store/cartStore';
import type { Product } from '@/types';

// Mock product for testing
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
    // Clear cart before each test
    useCartStore.getState().clearCart();
  });

  describe('addItem', () => {
    it('should add item to cart', () => {
      const { addItem, items, getItemCount } = useCartStore.getState();
      
      addItem(mockProduct, 1);
      
      expect(items.length).toBe(1);
      expect(items[0].product.id).toBe('1');
      expect(items[0].quantity).toBe(1);
      expect(getItemCount()).toBe(1);
    });

    it('should add multiple quantities', () => {
      const { addItem, items } = useCartStore.getState();
      
      addItem(mockProduct, 3);
      
      expect(items[0].quantity).toBe(3);
    });

    it('should increment quantity if item already exists', () => {
      const { addItem, items } = useCartStore.getState();
      
      addItem(mockProduct, 1);
      addItem(mockProduct, 2);
      
      expect(items.length).toBe(1);
      expect(items[0].quantity).toBe(3);
    });

    it('should handle items with size and color', () => {
      const { addItem, items } = useCartStore.getState();
      
      addItem(mockProduct, 1, 'M', 'Red');
      
      expect(items[0].size).toBe('M');
      expect(items[0].color).toBe('Red');
    });

    it('should create separate items for different sizes/colors', () => {
      const { addItem, items } = useCartStore.getState();
      
      addItem(mockProduct, 1, 'M', 'Red');
      addItem(mockProduct, 1, 'L', 'Red');
      addItem(mockProduct, 1, 'M', 'Blue');
      
      expect(items.length).toBe(3);
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', () => {
      const { addItem, removeItem, items } = useCartStore.getState();
      
      addItem(mockProduct, 1);
      expect(items.length).toBe(1);
      
      removeItem('1');
      expect(items.length).toBe(0);
    });
  });

  describe('updateQuantity', () => {
    it('should update item quantity', () => {
      const { addItem, updateQuantity, items } = useCartStore.getState();
      
      addItem(mockProduct, 1);
      updateQuantity('1', 5);
      
      expect(items[0].quantity).toBe(5);
    });

    it('should remove item if quantity is 0', () => {
      const { addItem, updateQuantity, items } = useCartStore.getState();
      
      addItem(mockProduct, 1);
      updateQuantity('1', 0);
      
      expect(items.length).toBe(0);
    });
  });

  describe('updateSalePrice', () => {
    it('should update sale price for item', () => {
      const { addItem, updateSalePrice, items } = useCartStore.getState();
      
      addItem(mockProduct, 1);
      updateSalePrice('1', 800);
      
      expect(items[0].salePrice).toBe(800);
    });

    it('should remove sale price if set to undefined', () => {
      const { addItem, updateSalePrice, items } = useCartStore.getState();
      
      addItem(mockProduct, 1);
      updateSalePrice('1', 800);
      updateSalePrice('1', undefined);
      
      expect(items[0].salePrice).toBeUndefined();
    });
  });

  describe('getTotal', () => {
    it('should calculate total correctly', () => {
      const { addItem, getTotal } = useCartStore.getState();
      
      addItem(mockProduct, 2);
      
      expect(getTotal()).toBe(2000);
    });

    it('should use sale price if available', () => {
      const { addItem, updateSalePrice, getTotal } = useCartStore.getState();
      
      addItem(mockProduct, 2);
      updateSalePrice('1', 800);
      
      expect(getTotal()).toBe(1600); // 800 * 2
    });

    it('should calculate total for multiple items', () => {
      const { addItem, getTotal } = useCartStore.getState();
      
      const product2: Product = { ...mockProduct, id: '2', price: 500 };
      
      addItem(mockProduct, 2);
      addItem(product2, 3);
      
      expect(getTotal()).toBe(3500); // (1000 * 2) + (500 * 3)
    });
  });

  describe('clearCart', () => {
    it('should clear all items from cart', () => {
      const { addItem, clearCart, items, getItemCount } = useCartStore.getState();
      
      addItem(mockProduct, 1);
      addItem({ ...mockProduct, id: '2' }, 1);
      
      expect(items.length).toBe(2);
      
      clearCart();
      
      expect(items.length).toBe(0);
      expect(getItemCount()).toBe(0);
    });
  });

  describe('addCustomItem', () => {
    it('should add custom product to cart', () => {
      const { addCustomItem, items } = useCartStore.getState();
      
      const customData = {
        name: 'Custom Product',
        price: 1500,
        size: 'L',
        description: 'Custom description',
      };
      
      addCustomItem(customData, 1);
      
      expect(items.length).toBe(1);
      expect(items[0].product.isCustom).toBe(true);
      expect(items[0].product.name).toBe('Custom Product');
      expect(items[0].product.price).toBe(1500);
    });

    it('should handle custom products with images', () => {
      const { addCustomItem, items } = useCartStore.getState();
      
      const customData = {
        name: 'Custom Product',
        price: 1500,
        images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
      };
      
      addCustomItem(customData, 1);
      
      expect(items[0].product.images).toEqual(customData.images);
    });

    it('should increment quantity for existing custom product', () => {
      const { addCustomItem, items } = useCartStore.getState();
      
      const customData = {
        name: 'Custom Product',
        price: 1500,
      };
      
      addCustomItem(customData, 1);
      addCustomItem(customData, 2);
      
      expect(items.length).toBe(1);
      expect(items[0].quantity).toBe(3);
    });
  });

  describe('getTotal with sale prices', () => {
    it('should calculate total with mixed sale prices', () => {
      const { addItem, updateSalePrice, getTotal } = useCartStore.getState();
      
      const product2: Product = { ...mockProduct, id: '2', price: 500 };
      
      addItem(mockProduct, 2);
      addItem(product2, 3);
      updateSalePrice('1', 800); // Discount first product
      
      expect(getTotal()).toBe(3100); // (800 * 2) + (500 * 3)
    });

    it('should handle sale price for custom products', () => {
      const { addCustomItem, updateSalePrice, getTotal } = useCartStore.getState();
      
      const customData = {
        name: 'Custom Product',
        price: 1500,
      };
      
      addCustomItem(customData, 2);
      const customItemId = useCartStore.getState().items[0].product.id;
      updateSalePrice(customItemId, 1200);
      
      expect(getTotal()).toBe(2400); // 1200 * 2
    });
  });

  describe('isCustomProduct', () => {
    it('should identify custom products', () => {
      const { addItem, addCustomItem, isCustomProduct } = useCartStore.getState();
      
      addItem(mockProduct, 1);
      expect(isCustomProduct('1')).toBe(false);
      
      addCustomItem({ name: 'Custom', price: 1000 }, 1);
      const customItemId = useCartStore.getState().items.find(
        item => (item.product as any).isCustom
      )?.product.id;
      
      if (customItemId) {
        expect(isCustomProduct(customItemId)).toBe(true);
      }
    });
  });
});

