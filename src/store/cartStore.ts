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
  images?: string[]; // Product images for custom products
}

export interface ExtendedProduct extends Product {
  isCustom?: boolean;
  customData?: CustomProductData;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product | ExtendedProduct, quantity?: number, size?: string, color?: string) => void;
  addCustomItem: (customData: CustomProductData, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateSize: (productId: string, size: string | undefined) => void;
  updateColor: (productId: string, color: string | undefined) => void;
  updateSalePrice: (productId: string, salePrice: number | undefined) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  isCustomProduct: (productId: string) => boolean;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity = 1, size, color) => {
        const items = get().items;
        // Check if item with same product ID, size, and color exists
        const existingItem = items.find(
          (item) => 
            item.product.id === product.id && 
            item.size === size && 
            item.color === color
        );

        // Calculate total quantity that would be in cart after adding
        const currentQuantity = existingItem ? existingItem.quantity : 0;
        const newTotalQuantity = currentQuantity + quantity;

        // Check available stock (priority: size+color > color only > size only > general)
        const availableStock = (product as any).available_stock;
        const productSizes = (product as any).sizes;
        const colorStocks = (product as any).color_stocks;
        
        let stockLimit: number | undefined = availableStock;
        
        // Priority 1: If both size and color are specified, check color_stocks
        if (size && color && colorStocks && typeof colorStocks === 'object') {
          const colorStock = colorStocks[color];
          if (colorStock && typeof colorStock === 'object') {
            const sizeColorStock = colorStock[size];
            if (typeof sizeColorStock === 'number') {
              stockLimit = sizeColorStock;
            }
          }
        }
        // Priority 2: If only color is specified (no size), check color_stocks
        else if (color && !size && colorStocks && typeof colorStocks === 'object') {
          const colorStock = colorStocks[color];
          if (typeof colorStock === 'number') {
            stockLimit = colorStock;
          }
        }
        // Priority 3: If only size is selected and product has size-based inventory, use size stock
        else if (size && productSizes && Array.isArray(productSizes)) {
          const sizeOption = productSizes.find((s: any) => s.size === size);
          if (sizeOption && sizeOption.available !== undefined) {
            stockLimit = sizeOption.available;
          }
        }

        // Validate stock if available stock is defined
        if (stockLimit !== undefined && newTotalQuantity > stockLimit) {
          const available = stockLimit;
          const alreadyInCart = currentQuantity;
          throw new Error(
            `Only ${available} ${available === 1 ? 'item is' : 'items are'} available for this product. ` +
            `${alreadyInCart > 0 ? `You already have ${alreadyInCart} in your cart. ` : ''}` +
            `You cannot add ${quantity} more ${quantity === 1 ? 'item' : 'items'}.`
          );
        }

        if (existingItem) {
          set({
            items: items.map((item) =>
              item.product.id === product.id && 
              item.size === size && 
              item.color === color
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          });
        } else {
          set({
            items: [...items, { product, quantity, size, color }],
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
          images: customData.images || [], // Use images from customData
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

        const items = get().items;
        const item = items.find((item) => item.product.id === productId);
        if (!item) return;

        // Check available stock
        const availableStock = (item.product as any).available_stock;
        const productSizes = (item.product as any).sizes;
        
        let stockLimit: number | undefined = availableStock;
        
        // If size is selected and product has size-based inventory, use size stock
        if (item.size && productSizes && Array.isArray(productSizes)) {
          const sizeOption = productSizes.find((s: any) => s.size === item.size);
          if (sizeOption && sizeOption.available !== undefined) {
            stockLimit = sizeOption.available;
          }
        }

        // Validate stock if available stock is defined
        if (stockLimit !== undefined && quantity > stockLimit) {
          const available = stockLimit;
          throw new Error(
            `Only ${available} ${available === 1 ? 'item is' : 'items are'} available for this product. ` +
            `You cannot increase the quantity to ${quantity}.`
          );
        }

        set({
          items: items.map((item) =>
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
      updateColor: (productId, color) => {
        set({
          items: get().items.map((item) =>
            item.product.id === productId ? { ...item, color } : item
          ),
        });
      },
      updateSalePrice: (productId, salePrice) => {
        set({
          items: get().items.map((item) =>
            item.product.id === productId ? { ...item, salePrice } : item
          ),
        });
      },
      clearCart: () => {
        set({ items: [] });
      },
      getTotal: () => {
        return get().items.reduce(
          (total, item) => {
            // Use salePrice if set (for POS discounts), otherwise use product price
            const price = item.salePrice ?? item.product.price;
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
      skipHydration: true, // Prevent hydration mismatch
    }
  )
);

// Manually rehydrate on client side to prevent hydration errors
if (typeof window !== 'undefined') {
  useCartStore.persist.rehydrate();
}

