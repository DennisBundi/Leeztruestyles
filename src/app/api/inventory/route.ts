import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Fetch all products with their categories from Supabase
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select(`
                id,
                name,
                category_id,
                categories (
                    name
                )
            `)
            .order('name', { ascending: true });

        if (productsError) {
            console.error('❌ Products fetch error from Supabase:', productsError);
            return NextResponse.json(
                { error: 'Failed to fetch products', details: productsError.message },
                { status: 500 }
            );
        }

        if (!products || products.length === 0) {
            console.log('ℹ️ No products found in Supabase');
            return NextResponse.json({ inventory: [] });
        }

        console.log(`✅ Fetched ${products.length} products from Supabase`);

        const productIds = products.map((p: any) => p.id);

        // Fetch inventory for all products from Supabase inventory table only
        // (same approach as products page and home page)
        const { data: inventory, error: inventoryError } = await supabase
            .from('inventory')
            .select('id, product_id, stock_quantity, reserved_quantity, last_updated')
            .in('product_id', productIds);

        if (inventoryError) {
            console.error('❌ Inventory fetch error from Supabase:', inventoryError);
            // Continue with empty inventory map if there's an error
        } else {
            console.log(`✅ Fetched inventory data for ${inventory?.length || 0} products from Supabase`);
        }

        // Create map for quick lookup
        const inventoryMap = new Map<string, any>();
        (inventory || []).forEach((item: any) => {
            inventoryMap.set(item.product_id, item);
        });

        // Transform the data for the frontend, using only inventory table data from Supabase
        const inventoryData = products.map((product: any) => {
            const generalInventory = inventoryMap.get(product.id);

            // Use only inventory table stock quantities from Supabase
            const stockQuantity = generalInventory?.stock_quantity || 0;
            const reservedQuantity = generalInventory?.reserved_quantity || 0;
            const available = Math.max(0, stockQuantity - reservedQuantity);

            // Use the last_updated date from inventory if available, otherwise use current date
            const lastUpdated = generalInventory?.last_updated || new Date().toISOString();

            return {
                id: generalInventory?.id || product.id, // Use inventory ID if available, otherwise product ID
                product_id: product.id,
                product_name: product.name || 'Unknown Product',
                category: product.categories?.name || 'Uncategorized',
                stock_quantity: stockQuantity,
                reserved_quantity: reservedQuantity,
                available: available,
                last_updated: lastUpdated,
            };
        }).sort((a, b) => {
            // Sort by last_updated descending (most recently updated first)
            return new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime();
        });

        console.log(`✅ Returning ${inventoryData.length} inventory items to dashboard`);

        return NextResponse.json({ inventory: inventoryData });
    } catch (error) {
        console.error('❌ Inventory fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch inventory', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
