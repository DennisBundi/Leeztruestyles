import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, CartItem } from '@/types';

// Extended Product type for custom products with temporary IDs
export interface CustomProductData {
  name: string;
  price: number;
  size?: string;
  category_id?: string;
  description?: string;
  social_platform?: string; // Social platform where the sale originated
}

export interface ExtendedProduct extends Product {
  isCustom?: boolean;
  customData?: CustomProductData;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product | ExtendedProduct, quantity?: number, size?: string) => void;
  addCustomItem: (customData: CustomProductData, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateSize: (productId: string, size: string | undefined) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  isCustomProduct: (productId: string) => boolean;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity = 1, size) => {
        const items = get().items;
        // Check if item with same product ID and size exists
        const existingItem = items.find(
          (item) => item.product.id === product.id && item.size === size
        );

        if (existingItem) {
          set({
            items: items.map((item) =>
              item.product.id === product.id && item.size === size
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          });
        } else {
          set({
            items: [...items, { product, quantity, size }],
          });
        }
      },
      addCustomItem: (customData, quantity = 1) => {
        // Create temporary product with temp ID
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const customProduct: ExtendedProduct = {
          id: tempId,
          name: customData.name,
          description: customData.description || null,
          price: customData.price,
          images: [],
          category_id: customData.category_id || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          isCustom: true,
          customData: customData,
        };

        // Check if same custom product already exists (by name and price)
        const items = get().items;
        const existingCustomItem = items.find(
          (item) =>
            (item.product as ExtendedProduct).isCustom &&
            item.product.name === customData.name &&
            item.product.price === customData.price
        );

        if (existingCustomItem) {
          set({
            items: items.map((item) =>
              item.product.id === existingCustomItem.product.id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          });
        } else {
          set({
            items: [...items, { product: customProduct, quantity }],
          });
        }
      },
      removeItem: (productId) => {
        set({
          items: get().items.filter((item) => item.product.id !== productId),
        });
      },
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        set({
          items: get().items.map((item) =>
            item.product.id === productId ? { ...item, quantity } : item
          ),
        });
      },
      updateSize: (productId, size) => {
        set({
          items: get().items.map((item) =>
            item.product.id === productId ? { ...item, size } : item
          ),
        });
      },
      clearCart: () => {
        set({ items: [] });
      },
      getTotal: () => {
        return get().items.reduce(
          (total, item) => {
            const product = item.product as any; // Extended product type
            const price = product.sale_price && product.is_flash_sale 
              ? product.sale_price 
              : product.price;
            return total + price * item.quantity;
          },
          0
        );
      },
      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
      isCustomProduct: (productId: string) => {
        const items = get().items;
        const item = items.find((item) => item.product.id === productId);
        return item ? (item.product as ExtendedProduct).isCustom === true : false;
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);

