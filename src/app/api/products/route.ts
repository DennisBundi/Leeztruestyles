import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/auth/roles';
import { z } from 'zod';

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable().transform(val => val || null),
  price: z.number().positive(),
  sale_price: z.union([z.number().positive(), z.null(), z.literal('')]).optional().transform(val => val === '' || val === null ? null : val),
  category_id: z.string().optional().nullable().transform(val => val || null),
  initial_stock: z.union([z.number().int().min(0), z.string()]).optional().transform(val => {
    if (typeof val === 'string') return parseInt(val) || 0;
    return val || 0;
  }),
  images: z.array(z.string()).optional().default([]),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  is_flash_sale: z.boolean().optional().default(false),
  flash_sale_start: z.string().optional().nullable().transform(val => val || null),
  flash_sale_end: z.string().optional().nullable().transform(val => val || null),
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

    const userRole = await getUserRole(user.id);
    if (!userRole || (userRole !== 'admin' && userRole !== 'manager')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    console.log('Product creation request body:', body);

    const validated = productSchema.parse(body);
    console.log('Validated product data:', validated);

    // Create product with all fields
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        name: validated.name,
        description: validated.description || null,
        price: validated.price,
        sale_price: validated.sale_price || null,
        category_id: validated.category_id || null,
        images: validated.images || [],
        status: validated.status || 'active',
        is_flash_sale: validated.is_flash_sale || false,
        flash_sale_start: validated.flash_sale_start || null,
        flash_sale_end: validated.flash_sale_end || null,
      })
      .select()
      .single();

    if (productError || !product) {
      console.error('Product creation error:', productError);
      return NextResponse.json(
        { error: 'Failed to create product', details: productError?.message || 'Unknown error' },
        { status: 500 }
      );
    }

    //Initialize inventory using database function (bypasses RLS)
    const initialStock = validated.initial_stock || 0;
    console.log(`Initializing inventory for product ${product.id} with stock: ${initialStock}`);

    const { data: inventoryResult, error: inventoryError } = await supabase
      .rpc('initialize_product_inventory', {
        p_product_id: product.id,
        p_initial_stock: initialStock
      });

    if (inventoryError || !inventoryResult) {
      console.error(`Failed to create inventory for product ${product.id}:`, inventoryError);
      // Continue anyway - product was created
    } else {
      console.log(`Successfully created inventory for product ${product.id}`);
    }

    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Product validation error:', error.errors);
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Product creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = await getUserRole(user.id);
    if (!userRole || (userRole !== 'admin' && userRole !== 'manager')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    // Build update object with all fields
    const updatePayload: any = {
      name: updateData.name,
      description: updateData.description || null,
      price: updateData.price,
      category_id: updateData.category_id || null,
    };

    // Add optional fields if present
    if (updateData.sale_price !== undefined) {
      updatePayload.sale_price = updateData.sale_price || null;
    }
    if (updateData.images !== undefined) {
      updatePayload.images = updateData.images;
    }
    if (updateData.status !== undefined) {
      updatePayload.status = updateData.status;
    }
    if (updateData.is_flash_sale !== undefined) {
      updatePayload.is_flash_sale = updateData.is_flash_sale;
    }
    if (updateData.flash_sale_start !== undefined) {
      updatePayload.flash_sale_start = updateData.flash_sale_start || null;
    }
    if (updateData.flash_sale_end !== undefined) {
      updatePayload.flash_sale_end = updateData.flash_sale_end || null;
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (productError || !product) {
      console.error('Product update error:', productError);
      return NextResponse.json(
        { error: 'Failed to update product', details: productError?.message || 'Unknown error' },
        { status: 500 }
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Product update error:', error);
    return NextResponse.json(
      { error: 'Failed to update product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Fetch all products with their categories
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        *,
        categories (
          id,
          name,
          slug
        )
      `)
      .order('created_at', { ascending: false });

    if (productsError) {
      console.error('Products fetch error:', productsError);
      return NextResponse.json(
        { error: 'Failed to fetch products', details: productsError.message },
        { status: 500 }
      );
    }

    // Fetch inventory for all products
    const productIds = (products || []).map((p) => p.id);
    let inventoryMap = new Map();

    if (productIds.length > 0) {
      const { data: inventory, error: inventoryError } = await supabase
        .from('inventory')
        .select('product_id, stock_quantity, reserved_quantity')
        .in('product_id', productIds);

      if (inventory && !inventoryError) {
        inventory.forEach((inv: any) => {
          const available = Math.max(
            0,
            (inv.stock_quantity || 0) - (inv.reserved_quantity || 0)
          );
          inventoryMap.set(inv.product_id, {
            stock: inv.stock_quantity || 0,
            available,
          });
        });
      }
    }

    // Combine products with inventory data
    const productsWithInventory = (products || []).map((product: any) => {
      const inv = inventoryMap.get(product.id);
      return {
        ...product,
        category: product.categories?.name || null,
        stock: inv?.available ?? inv?.stock ?? 0, // Return available stock (stock_quantity - reserved_quantity)
        stock_quantity: inv?.stock ?? 0, // Also include total stock for reference
        available_stock: inv?.available ?? 0, // Explicit available stock field
        image: product.images && product.images.length > 0 ? product.images[0] : null,
      };
    });

    return NextResponse.json({ products: productsWithInventory });
  } catch (error) {
    console.error('Products fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = await getUserRole(user.id);
    if (!userRole || userRole !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete products' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('id');

    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    // Delete product (inventory will be deleted automatically via CASCADE)
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (deleteError) {
      console.error('Product deletion error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete product', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Product deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
