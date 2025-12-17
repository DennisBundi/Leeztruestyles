import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserRole } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const sizeKeySchema = z.enum(['S','M','L','XL','2XL','3XL','4XL','5XL']);
const colorStocksSchema = z.record(
  z.string(),
  z.union([
    z.number().int().nonnegative(),
    z.record(sizeKeySchema, z.number().int().nonnegative())
  ])
);

const updateInventorySchema = z.object({
  product_id: z.string().uuid(),
  stock_quantity: z.number().int().nonnegative().default(0),
  size_stocks: z.record(sizeKeySchema, z.number().int().nonnegative()).optional(),
  color_stocks: colorStocksSchema.optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = await getUserRole(user.id);
    if (role !== 'admin' && role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validated = updateInventorySchema.parse(body);

    const admin = createAdminClient();

    // Try RPC first (for environments where function is updated)
    const rpcResult = await admin.rpc('initialize_product_inventory', {
      p_product_id: validated.product_id,
      p_initial_stock: validated.stock_quantity,
      p_size_stocks: validated.size_stocks || null,
      p_color_stocks: validated.color_stocks || null,
    });

    if (!rpcResult.error) {
      const { data: inventoryRecord } = await admin
        .from('inventory')
        .select('stock_quantity, reserved_quantity, last_updated')
        .eq('product_id', validated.product_id)
        .single();

      return NextResponse.json({
        success: true,
        inventory: inventoryRecord || null,
      });
    }

    // If RPC is missing or signature mismatch, fallback to manual updates
    const rpcError = rpcResult.error;
    const signatureMissing =
      rpcError?.code === 'PGRST202' ||
      (rpcError?.message || '').toLowerCase().includes('could not find the function');

    if (!signatureMissing) {
      console.error('Inventory update RPC error:', rpcError);
      return NextResponse.json(
        { error: 'Failed to update inventory', details: rpcError.message },
        { status: 500 }
      );
    }

    console.warn('initialize_product_inventory not found or signature mismatch; applying manual inventory update.');

    // 1) Upsert general inventory
    const { error: invError } = await admin
      .from('inventory')
      .upsert(
        {
          product_id: validated.product_id,
          stock_quantity: validated.stock_quantity,
          reserved_quantity: 0,
          last_updated: new Date().toISOString(),
        },
        { onConflict: 'product_id' }
      );
    if (invError) {
      console.error('Manual inventory upsert failed:', invError);
      return NextResponse.json(
        { error: 'Failed to update inventory', details: invError.message },
        { status: 500 }
      );
    }

    // 2) Upsert size stocks
    if (validated.size_stocks) {
      const sizeEntries = Object.entries(validated.size_stocks);
      // delete existing sizes
      await admin.from('product_sizes').delete().eq('product_id', validated.product_id);
      if (sizeEntries.length > 0) {
        const sizePayload = sizeEntries.map(([size, qty]) => ({
          product_id: validated.product_id,
          size,
          stock_quantity: qty,
          reserved_quantity: 0,
        }));
        const { error: sizeError } = await admin.from('product_sizes').insert(sizePayload);
        if (sizeError) {
          console.error('Manual size insert failed:', sizeError);
          return NextResponse.json(
            { error: 'Failed to update size inventory', details: sizeError.message },
            { status: 500 }
          );
        }
      }
    }

    // 3) Upsert color stocks (color-only and size+color)
    if (validated.color_stocks) {
      // delete existing
      await admin.from('product_size_colors').delete().eq('product_id', validated.product_id);

      const inserts: Array<{
        product_id: string;
        color: string;
        size: string | null;
        stock_quantity: number;
        reserved_quantity: number;
      }> = [];

      Object.entries(validated.color_stocks).forEach(([color, val]) => {
        if (typeof val === 'number') {
          inserts.push({
            product_id: validated.product_id,
            color,
            size: null,
            stock_quantity: val,
            reserved_quantity: 0,
          });
        } else {
          Object.entries(val).forEach(([sz, qty]) => {
            inserts.push({
              product_id: validated.product_id,
              color,
              size: sz,
              stock_quantity: qty,
              reserved_quantity: 0,
            });
          });
        }
      });

      if (inserts.length > 0) {
        const { error: colorError } = await admin.from('product_size_colors').insert(inserts);
        if (colorError) {
          console.error('Manual color inventory insert failed:', colorError);
          return NextResponse.json(
            { error: 'Failed to update color inventory', details: colorError.message },
            { status: 500 }
          );
        }
      }
    }

    // Fetch updated inventory snapshot
    const { data: inventoryRecord } = await admin
      .from('inventory')
      .select('stock_quantity, reserved_quantity, last_updated')
      .eq('product_id', validated.product_id)
      .single();

    return NextResponse.json({
      success: true,
      inventory: inventoryRecord || null,
      warning: 'Used manual inventory update because initialize_product_inventory was not found',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Inventory update error:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory' },
      { status: 500 }
    );
  }
}

