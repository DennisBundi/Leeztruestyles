import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Fetch all inventory with product details
        const { data: inventory, error: inventoryError } = await supabase
            .from('inventory')
            .select(`
        *,
        products (
          id,
          name,
          category_id,
          categories (
            name
          )
        )
      `)
            .order('last_updated', { ascending: false });

        if (inventoryError) {
            console.error('Inventory fetch error:', inventoryError);
            return NextResponse.json(
                { error: 'Failed to fetch inventory', details: inventoryError.message },
                { status: 500 }
            );
        }

        // Transform the data for the frontend
        const inventoryData = (inventory || []).map((item: any) => ({
            id: item.id,
            product_id: item.product_id,
            product_name: item.products?.name || 'Unknown Product',
            category: item.products?.categories?.name || 'Uncategorized',
            stock_quantity: item.stock_quantity || 0,
            reserved_quantity: item.reserved_quantity || 0,
            available: Math.max(0, (item.stock_quantity || 0) - (item.reserved_quantity || 0)),
            last_updated: item.last_updated,
        }));

        return NextResponse.json({ inventory: inventoryData });
    } catch (error) {
        console.error('Inventory fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch inventory', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
