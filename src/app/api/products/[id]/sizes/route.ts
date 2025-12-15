import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const productId = params.id;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Fetch size-based inventory for the product
    const { data: productSizes, error: sizesError } = await supabase
      .from('product_sizes')
      .select('size, stock_quantity, reserved_quantity')
      .eq('product_id', productId)
      .order('size', { ascending: true });

    if (sizesError) {
      console.error('Error fetching product sizes:', sizesError);
      return NextResponse.json(
        { error: 'Failed to fetch product sizes', details: sizesError.message },
        { status: 500 }
      );
    }

    // Format sizes with available stock
    const sizes = (productSizes || []).map((size: any) => ({
      size: size.size,
      available: Math.max(0, (size.stock_quantity || 0) - (size.reserved_quantity || 0)),
      stock_quantity: size.stock_quantity || 0,
      reserved_quantity: size.reserved_quantity || 0,
    }));

    return NextResponse.json({ sizes });
  } catch (error) {
    console.error('Product sizes API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}




