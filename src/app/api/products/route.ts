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
      const validSizes = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
      const filtered: Record<string, number> = {};
      Object.entries(val).forEach(([size, qty]) => {
        if (validSizes.includes(size) && typeof qty === "number" && qty > 0) {
          filtered[size] = qty;
        }
      });
      return Object.keys(filtered).length > 0 ? filtered : null;
    }),
  colors: z.array(z.string()).nullable().optional().transform((val) => val && val.length > 0 ? val : null),
  color_stocks: z.union([
    z.record(z.string(), z.record(z.string(), z.number().int().min(0))), // Size+color: { "Red": { "M": 5, "L": 3 } }
    z.record(z.string(), z.number().int().min(0)), // Color only: { "Red": 10, "Blue": 5 }
  ]).nullable().optional().transform((val) => {
    if (!val || typeof val !== 'object') return null;
    // Filter out zero values
    const filtered: Record<string, any> = {};
    Object.entries(val).forEach(([color, value]) => {
      if (typeof value === 'object') {
        // Size+color combinations
        const sizeQuantities: Record<string, number> = {};
        Object.entries(value).forEach(([size, qty]) => {
          if (typeof qty === 'number' && qty > 0) {
            sizeQuantities[size] = qty;
          }
        });
        if (Object.keys(sizeQuantities).length > 0) {
          filtered[color] = sizeQuantities;
        }
      } else if (typeof value === 'number' && value > 0) {
        // Color-only quantity
        filtered[color] = value;
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
    if (!userRole || (userRole !== "admin" && userRole !== "manager" && userRole !== "seller")) {
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

    // Use admin client to bypass RLS since we've already verified the user's role
    const adminSupabase = createAdminClient();
    const { data: product, error: productError } = await adminSupabase
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
    let sizeStocks = validated.size_stocks || null;
    const colorStocks = validated.color_stocks || null;

    // If color_stocks is provided, calculate size_stocks from color_stocks
    if (colorStocks && typeof colorStocks === "object") {
      const calculatedSizeStocks: Record<string, number> = {};
      const validSizes = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

      Object.entries(colorStocks).forEach(([color, value]) => {
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          // Size+color combinations: { "Red": { "M": 5, "L": 3 } }
          Object.entries(value).forEach(([size, qty]) => {
            if (validSizes.includes(size) && typeof qty === "number" && qty > 0) {
              const currentQty = calculatedSizeStocks[size] || 0;
              calculatedSizeStocks[size] = currentQty + qty;
            }
          });
        }
        // Note: Color-only quantities (without sizes) don't contribute to size breakdown
      });

      // Use calculated size stocks if any were calculated
      if (Object.keys(calculatedSizeStocks).length > 0) {
        sizeStocks = calculatedSizeStocks;
        console.log(
          `📊 Calculated size stocks from color stocks for new product:`,
          calculatedSizeStocks
        );
      }
    }

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
      color_stocks: colorStocks,
    });

    // Prepare size_stocks and color_stocks as JSONB for the function
    // Supabase expects JSONB to be passed as a JSON object, not a string
    // Try calling RPC function - first without color_stocks (older function signature)
    let inventoryResult: any = null;
    let inventoryError: any = null;

    // First, try with color_stocks if provided
    if (colorStocks) {
      const { data, error } = await supabase.rpc(
        "initialize_product_inventory",
        {
          p_product_id: product.id,
          p_initial_stock: initialStock,
          p_size_stocks: sizeStocks,
          p_color_stocks: colorStocks,
        }
      );
      inventoryResult = data;
      inventoryError = error;

      // If function doesn't support color_stocks, try without it
      if (inventoryError?.code === "PGRST202" && inventoryError?.message?.includes("p_color_stocks")) {
        // Function doesn't support color_stocks parameter, try without it
        const { data: data2, error: error2 } = await supabase.rpc(
          "initialize_product_inventory",
          {
            p_product_id: product.id,
            p_initial_stock: initialStock,
            p_size_stocks: sizeStocks,
          }
        );
        inventoryResult = data2;
        inventoryError = error2;
      }
    } else {
      // No color_stocks, use standard function signature
      const { data, error } = await supabase.rpc(
        "initialize_product_inventory",
        {
          p_product_id: product.id,
          p_initial_stock: initialStock,
          p_size_stocks: sizeStocks,
        }
      );
      inventoryResult = data;
      inventoryError = error;
    }

    // If function fails, try direct insert as fallback
    if (inventoryError || !inventoryResult) {
      // Only log if it's not a known expected error (like function signature mismatch)
      const isExpectedError = inventoryError?.code === "PGRST202" || 
                             inventoryError?.message?.includes("schema cache");
      if (!isExpectedError) {
        console.warn(
          `⚠️ Inventory function failed for product ${product.id}, trying direct insert fallback...`,
          inventoryError?.message || "Function returned false"
        );
      }

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
                ([size, qty]) => ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"].includes(size) && qty > 0
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

        // Insert colors if provided
        if (validated.colors && Array.isArray(validated.colors) && validated.colors.length > 0) {
          // Delete existing colors first
          await adminSupabase
            .from("product_colors")
            .delete()
            .eq("product_id", product.id);

          // Insert new colors
          const colorInserts = validated.colors.map((color) => ({
            product_id: product.id,
            color: color,
          }));

          const { error: colorsError } = await adminSupabase
            .from("product_colors")
            .insert(colorInserts);

          if (colorsError) {
            console.warn(
              `⚠️ Failed to insert colors for product ${product.id}:`,
              colorsError
            );
            // Continue anyway - product was created
          }
        }

        // Insert color_stocks (product_size_colors) if provided
        if (colorStocks && typeof colorStocks === "object") {
          try {
            // Check if table exists first
            const { error: tableCheckError } = await adminSupabase
              .from("product_size_colors")
              .select("id")
              .limit(0);

            if (tableCheckError) {
              // Table doesn't exist - skip silently (expected if migration not run)
              if (process.env.NODE_ENV === "development") {
                console.log(
                  `ℹ️ product_size_colors table not found. Skipping color stock insertion.`
                );
              }
            } else {
              // Delete existing color-based inventory first
              const { error: deleteError } = await adminSupabase
                .from("product_size_colors")
                .delete()
                .eq("product_id", product.id);

              if (deleteError && deleteError.code !== "PGRST205") {
                console.warn(
                  `⚠️ Failed to delete existing color stocks for product ${product.id}:`,
                  deleteError.message
                );
              }

            const sizeColorInserts: Array<{
              product_id: string;
              size: string | null;
              color: string;
              stock_quantity: number;
              reserved_quantity: number;
            }> = [];

            const validSizes = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

            Object.entries(colorStocks).forEach(([color, value]) => {
              if (typeof value === "object" && value !== null && !Array.isArray(value)) {
                // Size+color combinations: { "Red": { "M": 5, "L": 3 } }
                Object.entries(value).forEach(([size, qty]) => {
                  if (validSizes.includes(size) && typeof qty === "number" && qty > 0) {
                    sizeColorInserts.push({
                      product_id: product.id,
                      size: size,
                      color: color,
                      stock_quantity: qty,
                      reserved_quantity: 0,
                    });
                  }
                });
              } else if (typeof value === "number" && value > 0) {
                // Color-only quantity: { "Red": 10 }
                sizeColorInserts.push({
                  product_id: product.id,
                  size: null,
                  color: color,
                  stock_quantity: value,
                  reserved_quantity: 0,
                });
              }
            });

            if (sizeColorInserts.length > 0) {
              console.log(
                `📦 Attempting to insert ${sizeColorInserts.length} color stock records:`,
                sizeColorInserts.slice(0, 3) // Log first 3 for debugging
              );

              const { error: sizeColorError, data: insertedData } = await adminSupabase
                .from("product_size_colors")
                .insert(sizeColorInserts)
                .select();

              if (sizeColorError) {
                // Only log unexpected errors
                if (sizeColorError.code !== "PGRST205") {
                  console.warn(
                    `⚠️ Failed to insert color stocks for product ${product.id}:`,
                    sizeColorError.message
                  );
                }
                // Continue anyway - product was created
              } else if (process.env.NODE_ENV === "development") {
                console.log(
                  `✅ Successfully inserted ${sizeColorInserts.length} color stock records for product ${product.id}`
                );
              }
            }
            }
          } catch (colorStockError) {
            // Only log in development
            if (process.env.NODE_ENV === "development") {
              console.warn(
                `⚠️ Error handling color stocks for product ${product.id}:`,
                colorStockError instanceof Error ? colorStockError.message : colorStockError
              );
            }
            // Continue anyway - product was created
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

    // Handle colors separately (RPC function may not handle them)
    // This ensures colors are always inserted even if RPC function succeeds
    if (validated.colors && Array.isArray(validated.colors) && validated.colors.length > 0) {
      try {
        const adminSupabase = createAdminClient();

        // Delete existing colors first
        await adminSupabase
          .from("product_colors")
          .delete()
          .eq("product_id", product.id);

        // Insert new colors
        const colorInserts = validated.colors.map((color) => ({
          product_id: product.id,
          color: color,
        }));

        const { error: colorsError } = await adminSupabase
          .from("product_colors")
          .insert(colorInserts);

        if (colorsError) {
          // Only log unexpected errors
          if (colorsError.code !== "PGRST205") {
            console.warn(
              `⚠️ Failed to insert colors for product ${product.id}:`,
              colorsError.message
            );
          }
        }
      } catch (error) {
        // Only log in development
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `⚠️ Error handling colors for product ${product.id}:`,
            error instanceof Error ? error.message : error
          );
        }
      }
    }

    // Handle product_size_colors if color_stocks is provided and RPC function didn't handle it
    // (Only if RPC function failed or doesn't support color_stocks)
    if (colorStocks && typeof colorStocks === "object" && (inventoryError || !inventoryResult)) {
      try {
        const adminSupabase = createAdminClient();

        // Check if table exists by attempting a select (will fail gracefully if table doesn't exist)
        const { error: tableCheckError } = await adminSupabase
          .from("product_size_colors")
          .select("id")
          .limit(0);

        if (tableCheckError) {
          // Table doesn't exist - this is expected if migration hasn't been run
          // Silently skip color stock insertion (product was created successfully)
          // Only log in development
          if (process.env.NODE_ENV === "development") {
            console.log(
              `ℹ️ product_size_colors table not found. Skipping color stock insertion. Run migration to enable color-based inventory.`
            );
          }
          // Continue - product was created successfully
        } else {
          // Delete existing color-based inventory first
          const { error: deleteError } = await adminSupabase
            .from("product_size_colors")
            .delete()
            .eq("product_id", product.id);

          if (deleteError) {
            // Only log unexpected errors (not "table not found" errors)
            if (deleteError.code !== "PGRST205") {
              console.warn(
                `⚠️ Failed to delete existing color stocks for product ${product.id}:`,
                deleteError.message
              );
            }
          }

          const sizeColorInserts: Array<{
          product_id: string;
          size: string | null;
          color: string;
          stock_quantity: number;
          reserved_quantity: number;
        }> = [];

        const validSizes = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

        Object.entries(colorStocks).forEach(([color, value]) => {
          if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            // Size+color combinations: { "Red": { "M": 5, "L": 3 } }
            Object.entries(value).forEach(([size, qty]) => {
              if (validSizes.includes(size) && typeof qty === "number" && qty > 0) {
                sizeColorInserts.push({
                  product_id: product.id,
                  size: size,
                  color: color,
                  stock_quantity: qty,
                  reserved_quantity: 0,
                });
              }
            });
          } else if (typeof value === "number" && value > 0) {
            // Color-only quantity: { "Red": 10 }
            sizeColorInserts.push({
              product_id: product.id,
              size: null,
              color: color,
              stock_quantity: value,
              reserved_quantity: 0,
            });
          }
        });

          if (sizeColorInserts.length > 0) {
            const { error: sizeColorError } = await adminSupabase
              .from("product_size_colors")
              .insert(sizeColorInserts);

            if (sizeColorError) {
              // Only log unexpected errors (not "table not found" errors)
              if (sizeColorError.code !== "PGRST205") {
                console.warn(
                  `⚠️ Failed to insert color stocks for product ${product.id}:`,
                  sizeColorError.message
                );
              }
            } else if (process.env.NODE_ENV === "development") {
              console.log(
                `✅ Successfully inserted ${sizeColorInserts.length} color stock records for product ${product.id}`
              );
            }
          }
        }
      } catch (error) {
        // Only log unexpected errors
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `⚠️ Error handling color stocks for product ${product.id}:`,
            error instanceof Error ? error.message : error
          );
        }
      }
    }

    return NextResponse.json({ product });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Product validation error:", error.errors);
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("❌ Product creation error:", error);
    console.error("❌ Error stack:", error instanceof Error ? error.stack : "No stack trace");
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : "Unknown",
    });

    return NextResponse.json(
      {
        error: "Failed to create product",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined,
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
    if (!userRole || (userRole !== "admin" && userRole !== "manager" && userRole !== "seller")) {
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
    // Only allow admins to update buying_price
    if (updateData.buying_price !== undefined && userRole === "admin") {
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

    // Use admin client to bypass RLS since we've already verified the user's role
    const adminSupabase = createAdminClient();
    const { data: product, error: productError } = await adminSupabase
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
      updateData.size_stocks !== undefined ||
      updateData.color_stocks !== undefined
    ) {
      const initialStock = updateData.initial_stock || 0;
      let sizeStocks = updateData.size_stocks || null;
      const colorStocks = updateData.color_stocks || null;

      // If color_stocks is provided, calculate size_stocks from color_stocks
      if (colorStocks && typeof colorStocks === "object") {
        const calculatedSizeStocks: Record<string, number> = {};
        const validSizes = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

        Object.entries(colorStocks).forEach(([color, value]) => {
          if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            // Size+color combinations: { "Red": { "M": 5, "L": 3 } }
            Object.entries(value).forEach(([size, qty]) => {
              if (validSizes.includes(size) && typeof qty === "number" && qty > 0) {
                const currentQty = calculatedSizeStocks[size] || 0;
                calculatedSizeStocks[size] = currentQty + qty;
              }
            });
          }
          // Note: Color-only quantities (without sizes) don't contribute to size breakdown
        });

        // Use calculated size stocks if any were calculated
        if (Object.keys(calculatedSizeStocks).length > 0) {
          sizeStocks = calculatedSizeStocks;
          console.log(
            `📊 Calculated size stocks from color stocks for product ${product.id}:`,
            calculatedSizeStocks
          );
        }
      }

      console.log(
        `Updating inventory for product ${product.id} with stock: ${initialStock}`,
        sizeStocks ? `and sizes: ${JSON.stringify(sizeStocks)}` : "",
        colorStocks ? `and colors: ${JSON.stringify(colorStocks)}` : ""
      );

      // Try RPC function first (use admin client for better compatibility)
      let inventoryResult: any = null;
      let inventoryError: any = null;

      // Try with color_stocks if provided
      if (colorStocks) {
        const { data, error } = await adminSupabase.rpc(
          "initialize_product_inventory",
          {
            p_product_id: product.id,
            p_initial_stock: initialStock,
            p_size_stocks: sizeStocks,
            p_color_stocks: colorStocks,
          }
        );
        inventoryResult = data;
        inventoryError = error;

        // If function doesn't support color_stocks, try without it
        if (inventoryError?.code === "PGRST202" && inventoryError?.message?.includes("p_color_stocks")) {
          const { data: data2, error: error2 } = await adminSupabase.rpc(
            "initialize_product_inventory",
            {
              p_product_id: product.id,
              p_initial_stock: initialStock,
              p_size_stocks: sizeStocks,
            }
          );
          inventoryResult = data2;
          inventoryError = error2;
        }
      } else {
        // No color_stocks, use standard function signature
        const { data, error } = await adminSupabase.rpc(
          "initialize_product_inventory",
          {
            p_product_id: product.id,
            p_initial_stock: initialStock,
            p_size_stocks: sizeStocks,
          }
        );
        inventoryResult = data;
        inventoryError = error;
      }

      // If RPC fails, use fallback direct insert
      if (inventoryError || !inventoryResult) {
        const isExpectedError = inventoryError?.code === "PGRST202" || 
                               inventoryError?.message?.includes("schema cache");
        if (!isExpectedError) {
          console.warn(
            `⚠️ Inventory function failed for product ${product.id}, trying direct update fallback...`,
            inventoryError?.message || "Function returned false"
          );
        }

        // Fallback: Update inventory directly using admin client
        try {
          // Update main inventory record
          const { error: updateError } = await adminSupabase
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

          if (updateError) {
            console.error(
              `❌ Direct inventory update failed for product ${product.id}:`,
              updateError
            );
          }

          // Update size breakdown if provided
          // If color_stocks exist, size_stocks should already be calculated from them above
          if (sizeStocks && typeof sizeStocks === "object") {
            const sizeEntries = Object.entries(sizeStocks);
            if (sizeEntries.length > 0) {
              // Delete existing sizes first
              await adminSupabase
                .from("product_sizes")
                .delete()
                .eq("product_id", product.id);

              // Insert new sizes (these are calculated from color stocks if color_stocks was provided)
              const sizeInserts = sizeEntries
                .filter(
                  ([size, qty]) => ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"].includes(size) && qty > 0
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
                    `⚠️ Failed to update size breakdown for product ${product.id}:`,
                    sizesError
                  );
                } else {
                  console.log(
                    `✅ Updated size breakdown for product ${product.id} (calculated from color stocks)`
                  );
                }
              }
            }
          }

          // Update color_stocks (product_size_colors) if provided
          if (colorStocks && typeof colorStocks === "object") {
            try {
              // Check if table exists first
              const { error: tableCheckError } = await adminSupabase
                .from("product_size_colors")
                .select("id")
                .limit(0);

              if (tableCheckError) {
                if (process.env.NODE_ENV === "development") {
                  console.log(
                    `ℹ️ product_size_colors table not found. Skipping color stock update.`
                  );
                }
              } else {
                // Delete existing color-based inventory first
                const { error: deleteError } = await adminSupabase
                  .from("product_size_colors")
                  .delete()
                  .eq("product_id", product.id);

                if (deleteError && deleteError.code !== "PGRST205") {
                  console.warn(
                    `⚠️ Failed to delete existing color stocks for product ${product.id}:`,
                    deleteError.message
                  );
                }

                const sizeColorInserts: Array<{
                  product_id: string;
                  size: string | null;
                  color: string;
                  stock_quantity: number;
                  reserved_quantity: number;
                }> = [];

                const validSizes = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

                Object.entries(colorStocks).forEach(([color, value]) => {
                  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
                    // Size+color combinations: { "Red": { "M": 5, "L": 3 } }
                    Object.entries(value).forEach(([size, qty]) => {
                      if (validSizes.includes(size) && typeof qty === "number" && qty > 0) {
                        sizeColorInserts.push({
                          product_id: product.id,
                          size: size,
                          color: color,
                          stock_quantity: qty,
                          reserved_quantity: 0,
                        });
                      }
                    });
                  } else if (typeof value === "number" && value > 0) {
                    // Color-only quantity: { "Red": 10 }
                    sizeColorInserts.push({
                      product_id: product.id,
                      size: null,
                      color: color,
                      stock_quantity: value,
                      reserved_quantity: 0,
                    });
                  }
                });

                if (sizeColorInserts.length > 0) {
                  const { error: sizeColorError } = await adminSupabase
                    .from("product_size_colors")
                    .insert(sizeColorInserts);

                  if (sizeColorError) {
                    if (sizeColorError.code !== "PGRST205") {
                      console.warn(
                        `⚠️ Failed to update color stocks for product ${product.id}:`,
                        sizeColorError.message
                      );
                    }
                  } else if (process.env.NODE_ENV === "development") {
                    console.log(
                      `✅ Successfully updated ${sizeColorInserts.length} color stock records for product ${product.id}`
                    );
                  }
                }
              }
            } catch (colorStockError) {
              if (process.env.NODE_ENV === "development") {
                console.warn(
                  `⚠️ Error handling color stocks for product ${product.id}:`,
                  colorStockError instanceof Error ? colorStockError.message : colorStockError
                );
              }
            }
          }

          console.log(
            `✅ Successfully updated inventory (via fallback) for product ${product.id} with stock: ${initialStock}`
          );
        } catch (fallbackError) {
          console.error(
            `❌ Fallback inventory update failed for product ${product.id}:`,
            fallbackError
          );
        }
      } else {
        console.log(`✅ Successfully updated inventory (via function) for product ${product.id}`);
      }
    }

    // Update colors if provided
    if (updateData.colors !== undefined) {
      // Reuse adminSupabase instance created earlier

      // Delete existing colors first
      await adminSupabase
        .from("product_colors")
        .delete()
        .eq("product_id", product.id);

      // Insert new colors if provided
      if (updateData.colors && Array.isArray(updateData.colors) && updateData.colors.length > 0) {
        const colorInserts = updateData.colors.map((color: string) => ({
          product_id: product.id,
          color: color,
        }));

        const { error: colorsError } = await adminSupabase
          .from("product_colors")
          .insert(colorInserts);

        if (colorsError) {
          console.warn(
            `⚠️ Failed to update colors for product ${product.id}:`,
            colorsError
          );
          // Continue anyway - product was updated
        } else {
          console.log(`Successfully updated colors for product ${product.id}`);
        }
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
    
    // Check if user is admin/manager (for admin dashboard, show all products)
    let isAdminOrManager = false;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { getUserRole } = await import('@/lib/auth/roles');
        const userRole = await getUserRole(user.id);
        isAdminOrManager = userRole === 'admin' || userRole === 'manager';
        console.log('🔐 User role check:', { userId: user.id, role: userRole, isAdminOrManager });
      } else {
        console.log('🔐 No authenticated user found');
      }
    } catch (error) {
      // If auth check fails, continue with normal filtering
      console.log('⚠️ Could not check user role, using default filtering:', error);
    }

    // Fetch all products with their categories
    // For admin/manager, fetch all products regardless of status
    // For marketplace users, we'll filter by status later if needed
    let productsQuery = supabase
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
    
    // Only filter by status for non-admin users (marketplace)
    // Admins should see all products including inactive ones
    if (!isAdminOrManager) {
      productsQuery = productsQuery.eq("status", "active");
    }
    
    const { data: products, error: productsError } = await productsQuery;

    if (productsError) {
      console.error("❌ Products fetch error:", productsError);
      return NextResponse.json(
        { error: "Failed to fetch products", details: productsError.message },
        { status: 500 }
      );
    }

    console.log("📦 Products fetched from Supabase:", {
      count: products?.length || 0,
      productIds: products?.slice(0, 5).map((p: any) => ({ id: p.id, name: p.name })) || [],
    });

    // Fetch inventory for all products
    const productIds = (products || []).map((p) => p.id);
    let inventoryMap = new Map();
    let colorMap = new Map<string, string[]>();
    let colorStocksMap = new Map<string, Record<string, Record<string, number> | number>>();

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

      // Fetch product colors (if table exists)
      try {
        const { data: productColors, error: colorsError } = await supabase
          .from("product_colors")
          .select("product_id, color")
          .in("product_id", productIds);

        // Build color map
        if (productColors && !colorsError) {
          productColors.forEach((pc: any) => {
            const existing = colorMap.get(pc.product_id) || [];
            colorMap.set(pc.product_id, [...existing, pc.color]);
          });
        } else if (colorsError) {
          // Table might not exist yet - log but don't fail
          console.log('⚠️ Could not fetch product colors (table may not exist yet):', colorsError.message);
        }
      } catch (colorError) {
        // Handle case where product_colors table doesn't exist
        console.log('⚠️ Product colors table may not exist yet:', colorError instanceof Error ? colorError.message : 'Unknown error');
        // Continue without colors - this is not a critical error
      }

      // Fetch color-based inventory (if table exists)
      try {
        const { data: colorInventory, error: colorInventoryError } = await supabase
          .from("product_size_colors")
          .select("product_id, color, size, stock_quantity")
          .in("product_id", productIds);

        // Build color_stocks map
        if (colorInventory && !colorInventoryError) {
          colorInventory.forEach((ci: any) => {
            if (!colorStocksMap.has(ci.product_id)) {
              colorStocksMap.set(ci.product_id, {});
            }
            const productColorStocks = colorStocksMap.get(ci.product_id)!;
            
            if (ci.size !== null) {
              // Size+color combination
              if (!productColorStocks[ci.color] || typeof productColorStocks[ci.color] === 'number') {
                productColorStocks[ci.color] = {};
              }
              (productColorStocks[ci.color] as Record<string, number>)[ci.size] = ci.stock_quantity;
            } else {
              // Color-only quantity
              productColorStocks[ci.color] = ci.stock_quantity;
            }
          });
        } else if (colorInventoryError) {
          // Table might not exist yet - log but don't fail
          console.log('⚠️ Could not fetch color inventory (table may not exist yet):', colorInventoryError.message);
        }
      } catch (colorInventoryError) {
        // Handle case where product_size_colors table doesn't exist
        console.log('⚠️ Color inventory table may not exist yet:', colorInventoryError instanceof Error ? colorInventoryError.message : 'Unknown error');
        // Continue without color inventory - this is not a critical error
      }

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
      const colors = colorMap.get(product.id) || [];
      const colorStocks = colorStocksMap.get(product.id) || null;
      // If no inventory record exists, stock is 0 (not undefined)
      const stockValue = inv?.available ?? inv?.stock ?? 0;
      const result = {
        ...product,
        category: product.categories?.name || null,
        stock: stockValue, // Return available stock (stock_quantity - reserved_quantity)
        stock_quantity: inv?.stock ?? 0, // Also include total stock for reference
        available_stock: inv?.available ?? 0, // Explicit available stock field
        colors: colors, // Product colors
        color_stocks: colorStocks, // Color-based inventory quantities
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

    // Filter out products with 0 stock for marketplace users
    // Admin/Manager users see all products regardless of stock
    const finalProducts = isAdminOrManager 
      ? productsWithInventory 
      : productsWithInventory.filter((p: any) => p.stock > 0);

    console.log("✅ Returning products:", {
      products_from_db: products?.length || 0,
      products_with_inventory_data: productsWithInventory.length,
      returned: finalProducts.length,
      filtered_out: isAdminOrManager ? 0 : productsWithInventory.length - finalProducts.length,
      user_type: isAdminOrManager ? 'admin/manager' : 'marketplace',
      sample_products: finalProducts.slice(0, 3).map((p: any) => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        has_inventory: p.stock_quantity > 0 || p.stock > 0,
      })),
    });

    return NextResponse.json({ products: finalProducts });
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
