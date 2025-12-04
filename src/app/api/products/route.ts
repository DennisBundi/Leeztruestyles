import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/auth/roles';
import { InventoryService } from '@/services/inventoryService';
import { z } from 'zod';

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  category_id: z.string().uuid().optional().nullable(),
  initial_stock: z.number().int().min(0).optional(),
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
    const validated = productSchema.parse(body);

    // Create product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        name: validated.name,
        description: validated.description || null,
        price: validated.price,
        category_id: validated.category_id || null,
        images: [],
      })
      .select()
      .single();

    if (productError || !product) {
      console.error('Product creation error:', productError);
      return NextResponse.json(
        { error: 'Failed to create product' },
        { status: 500 }
      );
    }

    // Initialize inventory
    const initialStock = validated.initial_stock || 0;
    await InventoryService.initializeInventory(product.id, initialStock);

    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Product creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
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

    const { data: product, error: productError } = await supabase
      .from('products')
      .update({
        name: updateData.name,
        description: updateData.description || null,
        price: updateData.price,
        category_id: updateData.category_id || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (productError || !product) {
      console.error('Product update error:', productError);
      return NextResponse.json(
        { error: 'Failed to update product' },
        { status: 500 }
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error('Product update error:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

