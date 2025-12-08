import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/auth/roles';
import { z } from 'zod';

const categorySchema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    description: z.string().optional().nullable(),
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
        console.log('Category creation request body:', body);

        const validated = categorySchema.parse(body);
        console.log('Validated category data:', validated);

        // Create category
        const { data: category, error: categoryError } = await supabase
            .from('categories')
            .insert({
                name: validated.name,
                slug: validated.slug,
                description: validated.description || null,
            })
            .select()
            .single();

        if (categoryError || !category) {
            console.error('Category creation error:', categoryError);
            return NextResponse.json(
                { error: 'Failed to create category', details: categoryError?.message || 'Unknown error' },
                { status: 500 }
            );
        }

        return NextResponse.json({ category });
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('Category validation error:', error.errors);
            return NextResponse.json(
                { error: 'Invalid request data', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Category creation error:', error);
        return NextResponse.json(
            { error: 'Failed to create category', details: error instanceof Error ? error.message : 'Unknown error' },
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
            return NextResponse.json({ error: 'Category ID required' }, { status: 400 });
        }

        const { data: category, error: categoryError } = await supabase
            .from('categories')
            .update({
                name: updateData.name,
                slug: updateData.slug,
                description: updateData.description || null,
            })
            .eq('id', id)
            .select()
            .single();

        if (categoryError || !category) {
            console.error('Category update error:', categoryError);
            return NextResponse.json(
                { error: 'Failed to update category', details: categoryError?.message || 'Unknown error' },
                { status: 500 }
            );
        }

        return NextResponse.json({ category });
    } catch (error) {
        console.error('Category update error:', error);
        return NextResponse.json(
            { error: 'Failed to update category', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: categories, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (error) {
            console.error('Categories fetch error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch categories' },
                { status: 500 }
            );
        }

        return NextResponse.json({ categories });
    } catch (error) {
        console.error('Categories fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch categories' },
            { status: 500 }
        );
    }
}
