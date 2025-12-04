import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    let productsQuery = supabase
      .from('products')
      .select('*, categories(*)', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Search by name or description
    if (query) {
      const searchTerm = `%${query}%`;
      // Use or() with PostgREST syntax - format: column.operator.value
      productsQuery = productsQuery.or(
        `name.ilike.${searchTerm},description.ilike.${searchTerm}`
      );
    }

    // Filter by category
    if (category) {
      productsQuery = productsQuery.eq('category_id', category);
    }

    // Filter by price range
    if (minPrice) {
      productsQuery = productsQuery.gte('price', parseFloat(minPrice));
    }
    if (maxPrice) {
      productsQuery = productsQuery.lte('price', parseFloat(maxPrice));
    }

    // Pagination
    productsQuery = productsQuery.range(offset, offset + limit - 1);

    const { data: products, error, count } = await productsQuery;

    if (error) {
      console.error('Product search error:', error);
      return NextResponse.json(
        { error: 'Failed to search products' },
        { status: 500 }
      );
    }

    // Get inventory for products with error handling
    if (products && products.length > 0) {
      const productIds = products.map((p) => p.id);
      const { data: inventory, error: inventoryError } = await supabase
        .from('inventory')
        .select('product_id, stock_quantity, reserved_quantity')
        .in('product_id', productIds);

      if (inventoryError) {
        console.error('Error fetching inventory in search:', inventoryError);
      }

      const inventoryMap = new Map(
        inventory?.map((inv) => [
          inv.product_id,
          Math.max(0, (inv.stock_quantity || 0) - (inv.reserved_quantity || 0)),
        ]) || []
      );

      // Add stock availability to products
      // If inventory is missing, leave available_stock as undefined
      const productsWithStock = products.map((product) => {
        const stock = inventoryMap.get(product.id);
        return {
          ...product,
          available_stock: stock !== undefined ? stock : undefined,
        };
      });

      return NextResponse.json({
        products: productsWithStock,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      });
    }

    return NextResponse.json({
      products: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    });
  } catch (error) {
    console.error('Product search error:', error);
    return NextResponse.json(
      { error: 'Failed to search products' },
      { status: 500 }
    );
  }
}

