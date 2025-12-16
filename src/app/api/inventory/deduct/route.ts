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

    // If size is specified, deduct from specific size in product_sizes
    if (validated.size) {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const adminClient = createAdminClient();
      
      // Check stock for specific size
      const { data: sizeRecord, error: sizeError } = await adminClient
        .from('product_sizes')
        .select('stock_quantity, reserved_quantity')
        .eq('product_id', validated.product_id)
        .eq('size', validated.size)
        .single();
      
      if (sizeError || !sizeRecord) {
        return NextResponse.json(
          { 
            error: `Size ${validated.size} not found for this product`,
            available: 0,
            requested: validated.quantity
          },
          { status: 400 }
        );
      }
      
      const availableStock = Math.max(0, (sizeRecord.stock_quantity || 0) - (sizeRecord.reserved_quantity || 0));
      
      if (availableStock < validated.quantity) {
        return NextResponse.json(
          { 
            error: `Insufficient stock for size ${validated.size}. Available: ${availableStock}, Requested: ${validated.quantity}`,
            available: availableStock,
            requested: validated.quantity
          },
          { status: 400 }
        );
      }
      
      // Deduct from specific size
      const { error: deductError } = await adminClient
        .from('product_sizes')
        .update({
          stock_quantity: (sizeRecord.stock_quantity || 0) - validated.quantity,
          last_updated: new Date().toISOString(),
        })
        .eq('product_id', validated.product_id)
        .eq('size', validated.size);
      
      if (deductError) {
        console.error('Error deducting from size-based inventory:', deductError);
        return NextResponse.json(
          { error: 'Failed to deduct stock from size-based inventory' },
          { status: 500 }
        );
      }
      
      // Also deduct from general inventory (or use InventoryService which handles color)
      const success = await InventoryService.deductStock(
        validated.product_id,
        validated.quantity,
        employee?.id,
        validated.size,
        validated.color
      );
      
      if (!success) {
        console.warn('Warning: Size-based deduction succeeded but general inventory deduction failed');
      }
      
      return NextResponse.json({
        success: true,
        message: `Stock deducted successfully from size ${validated.size}`,
      });
    }
    
    // No size specified, use general deduction
    // Check current stock before attempting deduction
    const currentStock = await InventoryService.getStock(validated.product_id);
    
    console.log('Inventory deduction request:', {
      product_id: validated.product_id,
      quantity: validated.quantity,
      current_stock: currentStock,
      employee_id: employee?.id,
    });
    
    if (currentStock < validated.quantity) {
      console.error('Insufficient stock:', {
        available: currentStock,
        requested: validated.quantity,
      });
      return NextResponse.json(
        { 
          error: `Insufficient inventory. Available: ${currentStock}, Requested: ${validated.quantity}`,
          available: currentStock,
          requested: validated.quantity
        },
        { status: 400 }
      );
    }

    // Deduct stock atomically
    const success = await InventoryService.deductStock(
      validated.product_id,
      validated.quantity,
      employee?.id,
      validated.size,
      validated.color
    );

    if (!success) {
      // Re-check stock to see what happened
      const stockAfterAttempt = await InventoryService.getStock(validated.product_id);
      console.error('Deduction failed:', {
        product_id: validated.product_id,
        quantity: validated.quantity,
        stock_before: currentStock,
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

    // Verify deduction was successful
    const stockAfterDeduction = await InventoryService.getStock(validated.product_id);
    console.log('Deduction successful:', {
      product_id: validated.product_id,
      quantity: validated.quantity,
      stock_before: currentStock,
      stock_after: stockAfterDeduction,
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

