import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Inventory } from '@/types';

export class InventoryService {
  /**
   * Get current stock for a product
   * Aggregates stock from both inventory (general) and product_sizes (size-based) tables
   */
  static async getStock(productId: string): Promise<number> {
    const supabase = await createClient();

    // Get general inventory stock
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('inventory')
      .select('stock_quantity, reserved_quantity')
      .eq('product_id', productId)
      .single();

    let generalStock = 0;
    let generalReserved = 0;
    if (!inventoryError && inventoryData) {
      generalStock = inventoryData.stock_quantity || 0;
      generalReserved = inventoryData.reserved_quantity || 0;
    }

    // Get size-based inventory stock
    const { data: sizeData, error: sizeError } = await supabase
      .from('product_sizes')
      .select('stock_quantity, reserved_quantity')
      .eq('product_id', productId);

    let sizeStock = 0;
    let sizeReserved = 0;
    if (!sizeError && sizeData) {
      sizeStock = sizeData.reduce((sum, item) => sum + (item.stock_quantity || 0), 0);
      sizeReserved = sizeData.reduce((sum, item) => sum + (item.reserved_quantity || 0), 0);
    }

    // Total available stock = (general stock + size stock) - (general reserved + size reserved)
    const totalStock = generalStock + sizeStock;
    const totalReserved = generalReserved + sizeReserved;
    
    return Math.max(0, totalStock - totalReserved);
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
   * Handles general inventory, size-based inventory, and color-based inventory
   * Priority: size+color > color only > size only > general inventory
   */
  static async deductStock(
    productId: string,
    quantity: number,
    sellerId?: string,
    size?: string,
    color?: string
  ): Promise<boolean> {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Priority 1: If both size and color are specified, check product_size_colors
    if (size && color) {
      const { data: colorSizeRecord, error: colorSizeError } = await supabase
        .from('product_size_colors')
        .select('id, stock_quantity, reserved_quantity')
        .eq('product_id', productId)
        .eq('size', size)
        .eq('color', color)
        .single();

      if (!colorSizeError && colorSizeRecord) {
        const availableStock = Math.max(0, (colorSizeRecord.stock_quantity || 0) - (colorSizeRecord.reserved_quantity || 0));
        
        if (availableStock >= quantity) {
          const { error: updateError } = await adminClient
            .from('product_size_colors')
            .update({
              stock_quantity: (colorSizeRecord.stock_quantity || 0) - quantity,
              reserved_quantity: Math.max(0, (colorSizeRecord.reserved_quantity || 0) - quantity),
              updated_at: new Date().toISOString(),
            })
            .eq('id', colorSizeRecord.id)
            .gte('stock_quantity', quantity);

          if (!updateError) {
            console.log(`Successfully deducted ${quantity} from size+color inventory (${size}, ${color})`);
            return true;
          } else {
            console.error('Error deducting from size+color inventory:', updateError);
          }
        } else {
          console.error(`Insufficient stock in size+color inventory. Available: ${availableStock}, Requested: ${quantity}`);
          return false;
        }
      }
    }

    // Priority 2: If only color is specified (no size), check product_size_colors with NULL size
    if (color && !size) {
      const { data: colorRecord, error: colorError } = await supabase
        .from('product_size_colors')
        .select('id, stock_quantity, reserved_quantity')
        .eq('product_id', productId)
        .eq('color', color)
        .is('size', null)
        .single();

      if (!colorError && colorRecord) {
        const availableStock = Math.max(0, (colorRecord.stock_quantity || 0) - (colorRecord.reserved_quantity || 0));
        
        if (availableStock >= quantity) {
          const { error: updateError } = await adminClient
            .from('product_size_colors')
            .update({
              stock_quantity: (colorRecord.stock_quantity || 0) - quantity,
              reserved_quantity: Math.max(0, (colorRecord.reserved_quantity || 0) - quantity),
              updated_at: new Date().toISOString(),
            })
            .eq('id', colorRecord.id)
            .gte('stock_quantity', quantity);

          if (!updateError) {
            console.log(`Successfully deducted ${quantity} from color-only inventory (${color})`);
            return true;
          } else {
            console.error('Error deducting from color-only inventory:', updateError);
          }
        } else {
          console.error(`Insufficient stock in color-only inventory. Available: ${availableStock}, Requested: ${quantity}`);
          return false;
        }
      }
    }

    // Priority 3: If only size is specified (no color), check product_sizes (existing logic)
    if (size && !color) {
      const { data: sizeRecord, error: sizeCheckError } = await supabase
        .from('product_sizes')
        .select('id, stock_quantity, reserved_quantity')
        .eq('product_id', productId)
        .eq('size', size)
        .single();

      if (!sizeCheckError && sizeRecord) {
        const availableStock = Math.max(0, (sizeRecord.stock_quantity || 0) - (sizeRecord.reserved_quantity || 0));
        
        if (availableStock >= quantity) {
          const { error: updateError } = await adminClient
            .from('product_sizes')
            .update({
              stock_quantity: (sizeRecord.stock_quantity || 0) - quantity,
              reserved_quantity: Math.max(0, (sizeRecord.reserved_quantity || 0) - quantity),
              last_updated: new Date().toISOString(),
            })
            .eq('id', sizeRecord.id)
            .gte('stock_quantity', quantity);

          if (!updateError) {
            console.log(`Successfully deducted ${quantity} from size-only inventory (${size})`);
            return true;
          } else {
            console.error('Error deducting from size-only inventory:', updateError);
          }
        } else {
          console.error(`Insufficient stock in size-only inventory. Available: ${availableStock}, Requested: ${quantity}`);
          return false;
        }
      }
    }

    // Priority 4: Fall back to general inventory (existing logic)
    // First, check if we have general inventory
    const { data: inventoryData, error: inventoryCheckError } = await supabase
      .from('inventory')
      .select('stock_quantity, reserved_quantity')
      .eq('product_id', productId)
      .single();

    // If general inventory exists and has stock, try to deduct from it
    if (!inventoryCheckError && inventoryData) {
      const availableGeneralStock = Math.max(0, (inventoryData.stock_quantity || 0) - (inventoryData.reserved_quantity || 0));
      
      if (availableGeneralStock >= quantity) {
        // Try to deduct from general inventory using the database function
        const { data: generalResult, error: generalError } = await supabase.rpc('deduct_inventory', {
          p_product_id: productId,
          p_quantity: quantity,
        });

        if (generalError) {
          console.error('Error calling deduct_inventory function:', generalError);
          // Fall through to try direct update
        } else if (generalResult) {
          console.log('Successfully deducted from general inventory');
          return true;
        }

        // If function failed, try direct update as fallback using admin client to bypass RLS
        const adminClient = createAdminClient();
        const { error: directUpdateError } = await adminClient
          .from('inventory')
          .update({
            stock_quantity: Math.max(0, (inventoryData.stock_quantity || 0) - quantity),
            reserved_quantity: Math.max(0, (inventoryData.reserved_quantity || 0) - quantity),
            last_updated: new Date().toISOString(),
          })
          .eq('product_id', productId)
          .gte('stock_quantity', quantity); // Only update if enough stock

        if (!directUpdateError) {
          console.log('Successfully deducted from general inventory (direct update with admin client)');
          return true;
        } else {
          console.error('Direct update failed:', directUpdateError);
        }
      }
    }

    // If general inventory doesn't exist or doesn't have enough stock,
    // try to deduct from size-based inventory
    const { data: sizeRecords, error: sizeError } = await supabase
      .from('product_sizes')
      .select('id, size, stock_quantity, reserved_quantity')
      .eq('product_id', productId)
      .order('stock_quantity', { ascending: false }); // Start with sizes that have most stock

    if (sizeError) {
      console.error('Error fetching size records:', sizeError);
    }

    if (!sizeRecords || sizeRecords.length === 0) {
      console.error('No inventory found in general or size-based tables for product:', productId);
      return false;
    }

    // Calculate total available size stock
    const totalSizeStock = sizeRecords.reduce(
      (sum, record) => sum + Math.max(0, (record.stock_quantity || 0) - (record.reserved_quantity || 0)),
      0
    );

    if (totalSizeStock < quantity) {
      console.error(`Insufficient stock in size-based inventory. Available: ${totalSizeStock}, Requested: ${quantity}`);
      return false;
    }

    // Deduct from size records, starting with the ones that have the most stock
    let remainingQuantity = quantity;
    for (const sizeRecord of sizeRecords) {
      if (remainingQuantity <= 0) break;

      const availableStock = Math.max(0, (sizeRecord.stock_quantity || 0) - (sizeRecord.reserved_quantity || 0));
      const deductFromThisSize = Math.min(remainingQuantity, availableStock);

      if (deductFromThisSize > 0) {
        // Use admin client to bypass RLS for size-based inventory updates
        const adminClient = createAdminClient();
        const { error: updateError } = await adminClient
          .from('product_sizes')
          .update({
            stock_quantity: (sizeRecord.stock_quantity || 0) - deductFromThisSize,
            reserved_quantity: Math.max(0, (sizeRecord.reserved_quantity || 0) - deductFromThisSize),
            last_updated: new Date().toISOString(),
          })
          .eq('id', sizeRecord.id);

        if (updateError) {
          console.error(`Error deducting from size ${sizeRecord.size}:`, updateError);
          return false;
        }

        console.log(`Deducted ${deductFromThisSize} from size ${sizeRecord.size}`);
        remainingQuantity -= deductFromThisSize;
      }
    }

    // If we still have remaining quantity, it means we couldn't deduct enough
    if (remainingQuantity > 0) {
      console.error(`Could not deduct full quantity from size-based inventory. Remaining: ${remainingQuantity}`);
      return false;
    }

    console.log('Successfully deducted from size-based inventory');
    return true;
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

