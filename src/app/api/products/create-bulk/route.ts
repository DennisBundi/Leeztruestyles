import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRole } from "@/lib/auth/roles";
import { z } from "zod";

export const dynamic = "force-dynamic";

const customProductSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
  size: z.string().optional(),
  category_id: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
});

const createBulkSchema = z.object({
  products: z.array(customProductSchema),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check user role - only admin and seller can create custom products
    const userRole = await getUserRole(user.id);
    if (!userRole || (userRole !== "admin" && userRole !== "seller")) {
      return NextResponse.json(
        { error: "Forbidden. Only admin and seller roles can create custom products." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = createBulkSchema.parse(body);

    if (validated.products.length === 0) {
      return NextResponse.json(
        { error: "No products provided" },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // Create products
    const productsToInsert = validated.products.map((product) => ({
      name: product.name,
      description: product.description || null,
      price: product.price,
      category_id: product.category_id || null,
      status: "active",
      images: [],
    }));

    const { data: createdProducts, error: productsError } = await adminSupabase
      .from("products")
      .insert(productsToInsert)
      .select();

    if (productsError || !createdProducts) {
      console.error("Error creating products:", productsError);
      return NextResponse.json(
        { error: "Failed to create products", details: productsError?.message },
        { status: 500 }
      );
    }

    // Create inventory records with 0 stock for all products
    const inventoryRecords = createdProducts.map((product) => ({
      product_id: product.id,
      stock_quantity: 0,
      reserved_quantity: 0,
    }));

    const { error: inventoryError } = await adminSupabase
      .from("inventory")
      .insert(inventoryRecords);

    if (inventoryError) {
      console.error("Error creating inventory:", inventoryError);
      // Continue anyway - products were created
    }

    // Create size breakdowns if size is provided
    const sizeRecords: Array<{
      product_id: string;
      size: string;
      stock_quantity: number;
      reserved_quantity: number;
    }> = [];

    validated.products.forEach((product, index) => {
      if (product.size && ["S", "M", "L", "XL"].includes(product.size)) {
        sizeRecords.push({
          product_id: createdProducts[index].id,
          size: product.size,
          stock_quantity: 0,
          reserved_quantity: 0,
        });
      }
    });

    if (sizeRecords.length > 0) {
      const { error: sizesError } = await adminSupabase
        .from("product_sizes")
        .insert(sizeRecords);

      if (sizesError) {
        console.error("Error creating size records:", sizesError);
        // Continue anyway - products were created
      }
    }

    // Return created product IDs in the same order
    const productIds = createdProducts.map((p) => p.id);

    return NextResponse.json({
      product_ids: productIds,
      products: createdProducts,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    console.error("Bulk product creation error:", error);
    return NextResponse.json(
      {
        error: "Failed to create products",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}



