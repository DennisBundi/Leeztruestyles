import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { InventoryService } from '@/services/inventoryService';
import { getUserRole } from '@/lib/auth/roles';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const deductRequestSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().positive().int(),
  order_id: z.string().uuid().optional(),
  size: z.string().optional(), // Optional size for size-based inventory deduction
  color: z.string().optional(), // Optional color for color-based inventory deduction
});

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has seller role or higher
    const userRole = await getUserRole(user.id);
    if (!userRole || (userRole !== 'admin' && userRole !== 'manager' && userRole !== 'seller')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validated = deductRequestSchema.parse(body);

    // Get employee record for seller tracking
    const { data: employee } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .single();

    // Check stock with fallback priority - try all possible inventory sources
    // This mirrors the priority logic in InventoryService.deductStock
    let availableStock = 0;
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminClient = createAdminClient();
    
    if (validated.size && validated.color) {
      // Priority 1: Try size+color combination
      const { data: colorSizeRecord } = await adminClient
        .from('product_size_colors')
        .select('stock_quantity, reserved_quantity')
        .eq('product_id', validated.product_id)
        .eq('size', validated.size)
        .eq('color', validated.color)
        .single();
      
      if (colorSizeRecord) {
        availableStock = Math.max(0, (colorSizeRecord.stock_quantity || 0) - (colorSizeRecord.reserved_quantity || 0));
      } else {
        // Fallback 1: Try size-only
        const { data: sizeRecord } = await adminClient
          .from('product_sizes')
          .select('stock_quantity, reserved_quantity')
          .eq('product_id', validated.product_id)
          .eq('size', validated.size)
          .single();
        
        if (sizeRecord) {
          availableStock = Math.max(0, (sizeRecord.stock_quantity || 0) - (sizeRecord.reserved_quantity || 0));
        } else {
          // Fallback 2: Try color-only
          const { data: colorRecord } = await adminClient
            .from('product_size_colors')
            .select('stock_quantity, reserved_quantity')
            .eq('product_id', validated.product_id)
            .eq('color', validated.color)
            .is('size', null)
            .single();
          
          if (colorRecord) {
            availableStock = Math.max(0, (colorRecord.stock_quantity || 0) - (colorRecord.reserved_quantity || 0));
          } else {
            // Fallback 3: Try general inventory
            availableStock = await InventoryService.getStock(validated.product_id);
          }
        }
      }
    } else if (validated.color && !validated.size) {
      // Priority 1: Try color-only
      const { data: colorRecord } = await adminClient
        .from('product_size_colors')
        .select('stock_quantity, reserved_quantity')
        .eq('product_id', validated.product_id)
        .eq('color', validated.color)
        .is('size', null)
        .single();
      
      if (colorRecord) {
        availableStock = Math.max(0, (colorRecord.stock_quantity || 0) - (colorRecord.reserved_quantity || 0));
      } else {
        // Fallback: Try general inventory
        availableStock = await InventoryService.getStock(validated.product_id);
      }
    } else if (validated.size && !validated.color) {
      // Priority 1: Try size-only
      const { data: sizeRecord } = await adminClient
        .from('product_sizes')
        .select('stock_quantity, reserved_quantity')
        .eq('product_id', validated.product_id)
        .eq('size', validated.size)
        .single();
      
      if (sizeRecord) {
        availableStock = Math.max(0, (sizeRecord.stock_quantity || 0) - (sizeRecord.reserved_quantity || 0));
      } else {
        // Fallback: Try general inventory
        availableStock = await InventoryService.getStock(validated.product_id);
      }
    } else {
      // No size/color specified, check general stock
      availableStock = await InventoryService.getStock(validated.product_id);
    }
    
    console.log('Inventory deduction request:', {
      product_id: validated.product_id,
      quantity: validated.quantity,
      size: validated.size || 'none',
      color: validated.color || 'none',
      available_stock: availableStock,
      employee_id: employee?.id,
    });
    
    if (availableStock < validated.quantity) {
      console.error('Insufficient stock:', {
        available: availableStock,
        requested: validated.quantity,
        size: validated.size,
        color: validated.color,
      });
      return NextResponse.json(
        { 
          error: `Insufficient inventory. Available: ${availableStock}, Requested: ${validated.quantity}`,
          available: availableStock,
          requested: validated.quantity
        },
        { status: 400 }
      );
    }

    // Use InventoryService.deductStock for all cases - it handles:
    // - size+color combinations (product_size_colors)
    // - color only (product_size_colors with NULL size)
    // - size only (product_sizes)
    // - general inventory (inventory table)
    const success = await InventoryService.deductStock(
      validated.product_id,
      validated.quantity,
      employee?.id,
      validated.size,
      validated.color
    );

    if (!success) {
      // Re-check stock to see what happened
      let stockAfterAttempt = 0;
      if (validated.size && validated.color) {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const adminClient = createAdminClient();
        const { data: record } = await adminClient
          .from('product_size_colors')
          .select('stock_quantity, reserved_quantity')
          .eq('product_id', validated.product_id)
          .eq('size', validated.size)
          .eq('color', validated.color)
          .single();
        if (record) {
          stockAfterAttempt = Math.max(0, (record.stock_quantity || 0) - (record.reserved_quantity || 0));
        }
      } else if (validated.color && !validated.size) {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const adminClient = createAdminClient();
        const { data: record } = await adminClient
          .from('product_size_colors')
          .select('stock_quantity, reserved_quantity')
          .eq('product_id', validated.product_id)
          .eq('color', validated.color)
          .is('size', null)
          .single();
        if (record) {
          stockAfterAttempt = Math.max(0, (record.stock_quantity || 0) - (record.reserved_quantity || 0));
        }
      } else if (validated.size && !validated.color) {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const adminClient = createAdminClient();
        const { data: record } = await adminClient
          .from('product_sizes')
          .select('stock_quantity, reserved_quantity')
          .eq('product_id', validated.product_id)
          .eq('size', validated.size)
          .single();
        if (record) {
          stockAfterAttempt = Math.max(0, (record.stock_quantity || 0) - (record.reserved_quantity || 0));
        }
      } else {
        stockAfterAttempt = await InventoryService.getStock(validated.product_id);
      }
      
      console.error('Deduction failed:', {
        product_id: validated.product_id,
        quantity: validated.quantity,
        size: validated.size || 'none',
        color: validated.color || 'none',
        stock_before: availableStock,
        stock_after: stockAfterAttempt,
        success: false,
      });
      
      // If deduction failed after stock check, it might be a race condition or database issue
      return NextResponse.json(
        { 
          error: 'Failed to deduct stock. This may be due to concurrent updates or database permissions. Please try again.',
          available: stockAfterAttempt,
          requested: validated.quantity
        },
        { status: 400 }
      );
    }

    // Verify deduction was successful by checking the specific size/color stock
    let stockAfterDeduction = 0;
    if (validated.size && validated.color) {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const adminClient = createAdminClient();
      const { data: record } = await adminClient
        .from('product_size_colors')
        .select('stock_quantity, reserved_quantity')
        .eq('product_id', validated.product_id)
        .eq('size', validated.size)
        .eq('color', validated.color)
        .single();
      if (record) {
        stockAfterDeduction = Math.max(0, (record.stock_quantity || 0) - (record.reserved_quantity || 0));
      }
    } else if (validated.color && !validated.size) {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const adminClient = createAdminClient();
      const { data: record } = await adminClient
        .from('product_size_colors')
        .select('stock_quantity, reserved_quantity')
        .eq('product_id', validated.product_id)
        .eq('color', validated.color)
        .is('size', null)
        .single();
      if (record) {
        stockAfterDeduction = Math.max(0, (record.stock_quantity || 0) - (record.reserved_quantity || 0));
      }
    } else if (validated.size && !validated.color) {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const adminClient = createAdminClient();
      const { data: record } = await adminClient
        .from('product_sizes')
        .select('stock_quantity, reserved_quantity')
        .eq('product_id', validated.product_id)
        .eq('size', validated.size)
        .single();
      if (record) {
        stockAfterDeduction = Math.max(0, (record.stock_quantity || 0) - (record.reserved_quantity || 0));
      }
    } else {
      stockAfterDeduction = await InventoryService.getStock(validated.product_id);
    }
    
    console.log('Deduction successful:', {
      product_id: validated.product_id,
      quantity: validated.quantity,
      size: validated.size || 'none',
      color: validated.color || 'none',
      stock_before: availableStock,
      stock_after: stockAfterDeduction,
      deducted: availableStock - stockAfterDeduction,
    });

    // If order_id is provided, update the order with seller_id
    if (validated.order_id && employee) {
      await supabase
        .from('orders')
        .update({ seller_id: employee.id })
        .eq('id', validated.order_id);
    }

    return NextResponse.json({
      success: true,
      message: 'Stock deducted successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Inventory deduction error:', error);
    return NextResponse.json(
      { error: 'Failed to deduct stock' },
      { status: 500 }
    );
  }
}

