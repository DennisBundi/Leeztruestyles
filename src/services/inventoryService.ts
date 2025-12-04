import { createClient } from '@/lib/supabase/server';
import type { Inventory } from '@/types';

export class InventoryService {
  /**
   * Get current stock for a product
   */
  static async getStock(productId: string): Promise<number> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('inventory')
      .select('stock_quantity, reserved_quantity')
      .eq('product_id', productId)
      .single();

    if (error || !data) {
      return 0;
    }

    return data.stock_quantity - data.reserved_quantity;
  }

  /**
   * Reserve stock (for pending orders)
   */
  static async reserveStock(
    productId: string,
    quantity: number
  ): Promise<boolean> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('reserve_inventory', {
      p_product_id: productId,
      p_quantity: quantity,
    });

    if (error) {
      console.error('Stock reservation error:', error);
      return false;
    }

    return data;
  }

  /**
   * Release reserved stock (for cancelled orders)
   */
  static async releaseStock(
    productId: string,
    quantity: number
  ): Promise<boolean> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('release_inventory', {
      p_product_id: productId,
      p_quantity: quantity,
    });

    if (error) {
      console.error('Stock release error:', error);
      return false;
    }

    return data;
  }

  /**
   * Deduct stock atomically (for completed sales)
   * This is critical for POS and online sales synchronization
   */
  static async deductStock(
    productId: string,
    quantity: number,
    sellerId?: string
  ): Promise<boolean> {
    const supabase = await createClient();

    // Use a database function to ensure atomicity
    const { data, error } = await supabase.rpc('deduct_inventory', {
      p_product_id: productId,
      p_quantity: quantity,
    });

    if (error) {
      console.error('Stock deduction error:', error);
      return false;
    }

    return data;
  }

  /**
   * Get inventory for multiple products
   */
  static async getBulkStock(productIds: string[]): Promise<Record<string, number>> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('inventory')
      .select('product_id, stock_quantity, reserved_quantity')
      .in('product_id', productIds);

    if (error || !data) {
      return {};
    }

    const stockMap: Record<string, number> = {};
    data.forEach((item) => {
      stockMap[item.product_id] = item.stock_quantity - item.reserved_quantity;
    });

    return stockMap;
  }

  /**
   * Initialize inventory for a new product
   */
  static async initializeInventory(
    productId: string,
    initialStock: number = 0
  ): Promise<boolean> {
    const supabase = await createClient();

    const { error } = await supabase.from('inventory').insert({
      product_id: productId,
      stock_quantity: initialStock,
      reserved_quantity: 0,
    });

    if (error) {
      console.error('Inventory initialization error:', error);
      return false;
    }

    return true;
  }

  /**
   * Update inventory stock quantity
   */
  static async updateStock(
    productId: string,
    newStock: number
  ): Promise<boolean> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('inventory')
      .update({
        stock_quantity: newStock,
        last_updated: new Date().toISOString(),
      })
      .eq('product_id', productId);

    if (error) {
      console.error('Stock update error:', error);
      return false;
    }

    return true;
  }
}

