import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRole } from "@/lib/auth/roles";
import { z } from "zod";

export const dynamic = "force-dynamic";

const productSchema = z.object({
  name: z.string().min(1),
  description: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val || null),
  price: z.number().positive(),
  buying_price: z
    .union([z.number().nonnegative(), z.null(), z.literal("")])
    .optional()
    .transform((val) => (val === "" || val === null ? null : val)),
  sale_price: z
    .union([z.number().positive(), z.null(), z.literal("")])
    .optional()
    .transform((val) => (val === "" || val === null ? null : val)),
  category_id: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val || null),
  initial_stock: z
    .union([z.number().int().min(0), z.string()])
    .optional()
    .transform((val) => {
      if (typeof val === "string") return parseInt(val) || 0;
      return val || 0;
    }),
  size_stocks: z
    .record(z.string(), z.number().int().min(0))
    .nullable()
    .optional()
    .transform((val) => {
      if (!val || typeof val !== "object") return null;
      // Filter out zero values and validate sizes
      const validSizes = ["S", "M", "L", "XL"];
      const filtered: Record<string, number> = {};
      Object.entries(val).forEach(([size, qty]) => {
        if (validSizes.includes(size) && typeof qty === "number" && qty > 0) {
          filtered[size] = qty;
        }
      });
      return Object.keys(filtered).length > 0 ? filtered : null;
    }),
  images: z.array(z.string()).optional().default([]),
  status: z.enum(["active", "inactive"]).optional().default("active"),
  is_flash_sale: z.boolean().optional().default(false),
  flash_sale_start: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val || null),
  flash_sale_end: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val || null),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = await getUserRole(user.id);
    if (!userRole || (userRole !== "admin" && userRole !== "manager")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    console.log("Product creation request body:", body);

    const validated = productSchema.parse(body);
    console.log("Validated product data:", validated);

    // Create product with all fields
    // Build insert object dynamically to handle missing columns gracefully
    const productInsert: any = {
      name: validated.name,
      description: validated.description || null,
      price: validated.price,
      sale_price: validated.sale_price || null,
      category_id: validated.category_id || null,
      images: validated.images || [],
      status: validated.status || "active",
      is_flash_sale: validated.is_flash_sale || false,
      flash_sale_start: validated.flash_sale_start || null,
      flash_sale_end: validated.flash_sale_end || null,
    };

    // Only include buying_price if it's provided and is a number
    // Skip if column doesn't exist (migration not run yet)
    if (
      validated.buying_price !== null &&
      validated.buying_price !== undefined &&
      typeof validated.buying_price === "number"
    ) {
      productInsert.buying_price = validated.buying_price;
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .insert(productInsert)
      .select()
      .single();

    if (productError || !product) {
      console.error("Product creation error:", productError);

      // Check if it's a schema cache issue
      if (
        productError?.message?.includes("buying_price") ||
        productError?.code === "PGRST204"
      ) {
        return NextResponse.json(
          {
            error: "Database migration required",
            details:
              "The 'buying_price' column doesn't exist. Please run the migration SQL in Supabase. See FIX_BUYING_PRICE_ERROR.md for instructions.",
            migrationRequired: true,
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          error: "Failed to create product",
          details: productError?.message || "Unknown error",
        },
        { status: 500 }
      );
    }

    //Initialize inventory using database function (bypasses RLS)
    const initialStock = validated.initial_stock || 0;
    const sizeStocks = validated.size_stocks || null;

    console.log("📦 API - Inventory Initialization:", {
      product_id: product.id,
      product_name: validated.name,
      initial_stock: initialStock,
      initial_stock_type: typeof initialStock,
      size_stocks: sizeStocks,
      size_stocks_sum: sizeStocks
        ? Object.values(sizeStocks).reduce(
            (sum: number, val: number) => sum + val,
            0
          )
        : 0,
    });

    // Prepare size_stocks as JSONB for the function
    // Supabase expects JSONB to be passed as a JSON object, not a string
    const { data: inventoryResult, error: inventoryError } = await supabase.rpc(
      "initialize_product_inventory",
      {
        p_product_id: product.id,
        p_initial_stock: initialStock,
        p_size_stocks: sizeStocks,
      }
    );

    // If function fails, try direct insert as fallback
    if (inventoryError || !inventoryResult) {
      console.warn(
        `⚠️ Inventory function failed for product ${product.id}, trying direct insert fallback...`,
        inventoryError
          ? `Error: ${inventoryError.message}`
          : "Function returned false"
      );

      // Fallback: Create inventory directly using admin client (bypasses RLS)
      try {
        const adminSupabase = createAdminClient();

        // Insert main inventory record
        const { error: insertError } = await adminSupabase
          .from("inventory")
          .upsert(
            {
              product_id: product.id,
              stock_quantity: initialStock,
              reserved_quantity: 0,
            },
            {
              onConflict: "product_id",
            }
          );

        if (insertError) {
          console.error(
            `❌ Direct inventory insert also failed for product ${product.id}:`,
            insertError
          );
          return NextResponse.json(
            {
              product,
              warning:
                "Product created but inventory initialization failed. Please check database permissions.",
              inventoryError: insertError.message,
            },
            { status: 201 }
          );
        }

        // Insert size breakdown if provided
        if (sizeStocks && typeof sizeStocks === "object") {
          const sizeEntries = Object.entries(sizeStocks);
          if (sizeEntries.length > 0) {
            // Delete existing sizes first
            await adminSupabase
              .from("product_sizes")
              .delete()
              .eq("product_id", product.id);

            // Insert new sizes
            const sizeInserts = sizeEntries
              .filter(
                ([size, qty]) => ["S", "M", "L", "XL"].includes(size) && qty > 0
              )
              .map(([size, qty]) => ({
                product_id: product.id,
                size,
                stock_quantity: qty,
                reserved_quantity: 0,
              }));

            if (sizeInserts.length > 0) {
              const { error: sizesError } = await adminSupabase
                .from("product_sizes")
                .insert(sizeInserts);

              if (sizesError) {
                console.warn(
                  `⚠️ Failed to insert size breakdown for product ${product.id}:`,
                  sizesError
                );
                // Continue anyway - main inventory was created
              }
            }
          }
        }

        console.log(
          `✅ Successfully created inventory (via fallback) for product ${product.id} with stock: ${initialStock}`
        );
      } catch (fallbackError) {
        console.error(
          `❌ Fallback inventory creation failed for product ${product.id}:`,
          fallbackError
        );
        return NextResponse.json(
          {
            product,
            warning:
              "Product created but inventory initialization failed. Please run FIX_INVENTORY_NOW.sql in Supabase.",
            inventoryError:
              fallbackError instanceof Error
                ? fallbackError.message
                : "Unknown error",
          },
          { status: 201 }
        );
      }
    } else {
      console.log(
        `✅ Successfully created inventory (via function) for product ${product.id} with stock: ${initialStock}`
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Product validation error:", error.errors);
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Product creation error:", error);
    return NextResponse.json(
      {
        error: "Failed to create product",
        details: error instanceof Error ? error.message : "Unknown error",
      },
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = await getUserRole(user.id);
    if (!userRole || (userRole !== "admin" && userRole !== "manager")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Product ID required" },
        { status: 400 }
      );
    }

    // Build update object with all fields
    const updatePayload: any = {
      name: updateData.name,
      description: updateData.description || null,
      price: updateData.price,
      category_id: updateData.category_id || null,
    };

    // Add optional fields if present
    if (updateData.buying_price !== undefined) {
      updatePayload.buying_price = updateData.buying_price || null;
    }
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
      .from("products")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (productError || !product) {
      console.error("Product update error:", productError);
      return NextResponse.json(
        {
          error: "Failed to update product",
          details: productError?.message || "Unknown error",
        },
        { status: 500 }
      );
    }

    // Update inventory if provided
    if (
      updateData.initial_stock !== undefined ||
      updateData.size_stocks !== undefined
    ) {
      const initialStock = updateData.initial_stock || 0;
      const sizeStocks = updateData.size_stocks || null;

      console.log(
        `Updating inventory for product ${product.id} with stock: ${initialStock}`,
        sizeStocks ? `and sizes: ${JSON.stringify(sizeStocks)}` : ""
      );

      // Use the initialize function which handles both create and update
      const { data: inventoryResult, error: inventoryError } =
        await supabase.rpc("initialize_product_inventory", {
          p_product_id: product.id,
          p_initial_stock: initialStock,
          p_size_stocks: sizeStocks,
        });

      if (inventoryError) {
        console.error(
          `Failed to update inventory for product ${product.id}:`,
          inventoryError
        );
        // Continue anyway - product was updated
      } else {
        console.log(`Successfully updated inventory for product ${product.id}`);
      }
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Product update error:", error);
    return NextResponse.json(
      {
        error: "Failed to update product",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Fetch all products with their categories
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select(
        `
        *,
        categories (
          id,
          name,
          slug
        )
      `
      )
      .order("created_at", { ascending: false });

    if (productsError) {
      console.error("Products fetch error:", productsError);
      return NextResponse.json(
        { error: "Failed to fetch products", details: productsError.message },
        { status: 500 }
      );
    }

    // Fetch inventory for all products
    const productIds = (products || []).map((p) => p.id);
    let inventoryMap = new Map();

    if (productIds.length > 0) {
      // Fetch from inventory table (general stock)
      const { data: inventory, error: inventoryError } = await supabase
        .from("inventory")
        .select("product_id, stock_quantity, reserved_quantity")
        .in("product_id", productIds);

      // Fetch from product_sizes table (size-based stock)
      const { data: productSizes, error: sizesError } = await supabase
        .from("product_sizes")
        .select("product_id, stock_quantity, reserved_quantity")
        .in("product_id", productIds);

      // Process general inventory (primary source of stock)
      if (inventory && !inventoryError) {
        inventory.forEach((inv: any) => {
          const available = Math.max(
            0,
            (inv.stock_quantity || 0) - (inv.reserved_quantity || 0)
          );
          inventoryMap.set(inv.product_id, {
            stock: inv.stock_quantity || 0,
            reserved: inv.reserved_quantity || 0,
            available,
          });
        });
      } else if (inventoryError) {
        console.error("Error fetching inventory:", inventoryError);
      }

      // Note: Size-based inventory (product_sizes) is just a breakdown,
      // not additional stock. The main stock comes from inventory table.
      // We fetch sizes for display purposes but don't add them to totals.

      // Log products without inventory for debugging
      const productsWithoutInventory = productIds.filter(
        (id) => !inventoryMap.has(id)
      );
      if (productsWithoutInventory.length > 0) {
        console.warn(
          `⚠️ Products without inventory records: ${productsWithoutInventory.length}`,
          productsWithoutInventory.slice(0, 5) // Log first 5
        );
      }

      // Log inventory summary
      console.log("📦 Inventory Summary:", {
        total_products: productIds.length,
        products_with_inventory: inventoryMap.size,
        products_without_inventory: productsWithoutInventory.length,
        sample_inventory: Array.from(inventoryMap.entries())
          .slice(0, 3)
          .map(([id, inv]: [string, any]) => ({
            product_id: id,
            stock: inv.stock,
            available: inv.available,
          })),
      });
    }

    // Combine products with inventory data
    const productsWithInventory = (products || []).map((product: any) => {
      const inv = inventoryMap.get(product.id);
      // If no inventory record exists, stock is 0 (not undefined)
      const stockValue = inv?.available ?? inv?.stock ?? 0;
      const result = {
        ...product,
        category: product.categories?.name || null,
        stock: stockValue, // Return available stock (stock_quantity - reserved_quantity)
        stock_quantity: inv?.stock ?? 0, // Also include total stock for reference
        available_stock: inv?.available ?? 0, // Explicit available stock field
        image:
          product.images && product.images.length > 0
            ? product.images[0]
            : null,
      };

      // Log if stock is missing for debugging
      if (stockValue === 0 && !inv) {
        console.warn(
          `⚠️ Product ${product.name} (${product.id}) has no inventory record`
        );
      }

      return result;
    });

    console.log("✅ Returning products with inventory:", {
      total: productsWithInventory.length,
      with_stock: productsWithInventory.filter((p: any) => p.stock > 0).length,
      without_stock: productsWithInventory.filter((p: any) => p.stock === 0)
        .length,
    });

    return NextResponse.json({ products: productsWithInventory });
  } catch (error) {
    console.error("Products fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch products",
        details: error instanceof Error ? error.message : "Unknown error",
      },
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = await getUserRole(user.id);
    if (!userRole || userRole !== "admin") {
      return NextResponse.json(
        { error: "Only admins can delete products" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("id");

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID required" },
        { status: 400 }
      );
    }

    // Delete product (inventory will be deleted automatically via CASCADE)
    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (deleteError) {
      console.error("Product deletion error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete product", details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Product deletion error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete product",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
