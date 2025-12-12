import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEmployee } from "@/lib/auth/roles";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const createOrderSchema = z.object({
  items: z.array(
    z.union([
      // Existing product with product_id
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().positive().int(),
        price: z.number().positive(),
        size: z.string().optional(), // Optional size (S, M, L, XL)
      }),
      // Custom product with product_data
      z.object({
        product_data: z.object({
          name: z.string().min(1),
          price: z.number().positive(),
          size: z.string().optional(),
          category_id: z.string().uuid().optional().nullable(),
          description: z.string().optional().nullable(),
        }),
        quantity: z.number().positive().int(),
        price: z.number().positive(),
      }),
    ])
  ),
  customer_info: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    address: z.string().min(1),
  }),
  sale_type: z.enum(["online", "pos"]).default("online"),
  seller_id: z.string().uuid().optional(), // Optional seller_id for POS orders
  social_platform: z.enum(["tiktok", "instagram", "whatsapp", "walkin"]).optional(), // Required for POS orders
}).refine(
  (data) => {
    // If sale_type is "pos", social_platform is required
    if (data.sale_type === "pos") {
      return data.social_platform !== undefined && data.social_platform !== null;
    }
    return true; // Optional for online orders
  },
  {
    message: "Social platform is required for POS sales",
    path: ["social_platform"],
  }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log the request for debugging
    console.log('Order creation request:', {
      itemsCount: body.items?.length,
      saleType: body.sale_type,
      hasCustomerInfo: !!body.customer_info,
    });
    
    const validated = createOrderSchema.parse(body);

    const supabase = await createClient();

    // Require authentication for order creation
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in to place an order." },
        { status: 401 }
      );
    }

    // Separate existing products and custom products
    const existingProductItems: Array<{
      product_id: string;
      quantity: number;
      price: number;
      size?: string;
    }> = [];
    const customProductItems: Array<{
      product_data: {
        name: string;
        price: number;
        size?: string;
        category_id?: string | null;
        description?: string | null;
      };
      quantity: number;
      price: number;
    }> = [];

    validated.items.forEach((item) => {
      if ("product_id" in item) {
        existingProductItems.push(item);
      } else {
        customProductItems.push(item);
      }
    });

    // Create custom products if any
    let customProductIds: string[] = [];
    if (customProductItems.length > 0) {
      try {
        // Import and call the bulk creation function directly instead of HTTP call
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const adminSupabase = createAdminClient();

        // Create products
        const productsToInsert = customProductItems.map((item) => ({
          name: item.product_data.name,
          description: item.product_data.description || null,
          price: item.product_data.price,
          category_id: item.product_data.category_id || null,
          status: "active",
          images: [],
        }));

        const { data: createdProducts, error: productsError } = await adminSupabase
          .from("products")
          .insert(productsToInsert)
          .select();

        if (productsError || !createdProducts) {
          console.error("Error creating custom products:", productsError);
          throw new Error(
            productsError?.message || "Failed to create custom products"
          );
        }

        // Create inventory records with 0 stock
        const inventoryRecords = createdProducts.map((product) => ({
          product_id: product.id,
          stock_quantity: 0,
          reserved_quantity: 0,
        }));

        await adminSupabase.from("inventory").insert(inventoryRecords);

        // Create size breakdowns if size is provided
        const sizeRecords: Array<{
          product_id: string;
          size: string;
          stock_quantity: number;
          reserved_quantity: number;
        }> = [];

        customProductItems.forEach((item, index) => {
          if (
            item.product_data.size &&
            ["S", "M", "L", "XL"].includes(item.product_data.size)
          ) {
            sizeRecords.push({
              product_id: createdProducts[index].id,
              size: item.product_data.size,
              stock_quantity: 0,
              reserved_quantity: 0,
            });
          }
        });

        if (sizeRecords.length > 0) {
          await adminSupabase.from("product_sizes").insert(sizeRecords);
        }

        customProductIds = createdProducts.map((p) => p.id);
      } catch (error) {
        console.error("Error creating custom products:", error);
        return NextResponse.json(
          {
            error: "Failed to create custom products",
            details: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 }
        );
      }
    }

    // Combine all product IDs (existing + newly created custom products)
    const allProductIds = [
      ...existingProductItems.map((item) => item.product_id),
      ...customProductIds,
    ];

    // Prepare all order items with correct product IDs
    const allOrderItems: Array<{
      product_id: string;
      quantity: number;
      price: number;
      size?: string;
    }> = [];

    // Add existing product items
    existingProductItems.forEach((item) => {
      allOrderItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
      });
    });

    // Add custom product items with their newly created IDs
    customProductItems.forEach((item, index) => {
      if (customProductIds[index]) {
        allOrderItems.push({
          product_id: customProductIds[index],
          quantity: item.quantity,
          price: item.price,
        });
      }
    });

    // Calculate total
    const total = allOrderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // For POS orders, get the employee record to set seller_id
    let sellerId: string | null = null;
    if (validated.sale_type === "pos") {
      // If seller_id is provided in the request, use it
      if (validated.seller_id) {
        sellerId = validated.seller_id;
        console.log('Using seller_id from request:', sellerId);
      } else {
        // Otherwise, try to get the employee record for the current user
        const employee = await getEmployee(user.id);
        if (employee) {
          sellerId = employee.id;
          console.log('Using seller_id from employee record:', sellerId);
        } else {
          console.warn('POS order but no employee record found for user:', user.id);
        }
      }
    }

    // Calculate commission for POS sales (3% of total)
    const commissionRate = 0.03; // 3%
    const commission = validated.sale_type === "pos" && sellerId 
      ? total * commissionRate 
      : 0;

    // Create order with user_id and seller_id (if POS)
    // POS orders are marked as completed immediately since transactions are confirmed at physical location
    const orderData: any = {
      user_id: user.id, // Always set user_id for authenticated users
      sale_type: validated.sale_type,
      total_amount: total,
      status: validated.sale_type === "pos" ? "completed" : "pending", // POS orders are completed immediately
    };

    // Add social_platform if provided
    if (validated.social_platform) {
      orderData.social_platform = validated.social_platform;
    }

    // Set seller_id for POS orders
    if (sellerId) {
      orderData.seller_id = sellerId;
      console.log('Creating order with seller_id:', sellerId, 'commission:', commission);
    } else {
      console.log('Creating order without seller_id (sale_type:', validated.sale_type, ')');
    }

    // Try to insert with commission first, fallback without if column doesn't exist
    let order: any = null;
    let orderError: any = null;

    // First attempt: include commission if it's a POS sale
    if (validated.sale_type === "pos" && sellerId && commission > 0) {
      const orderDataWithCommission = { ...orderData, commission };
      const result = await supabase
        .from("orders")
        .insert(orderDataWithCommission)
        .select()
        .single();
      
      order = result.data;
      orderError = result.error;

      // If error is about missing commission or social_platform column, retry without it
      if (orderError && orderError.message && 
          (orderError.message.includes("commission") || orderError.message.includes("social_platform"))) {
        console.warn("⚠️ Commission or social_platform column not found. Retrying without it. Please run migration: add_social_platform_to_orders.sql");
        // Remove commission and social_platform for retry
        const { commission: _, social_platform: __, ...orderDataWithoutOptional } = orderDataWithCommission;
        const retryResult = await supabase
          .from("orders")
          .insert(orderDataWithoutOptional)
          .select()
          .single();
        order = retryResult.data;
        orderError = retryResult.error;
      }
    } else {
      // No commission needed, insert normally
      const result = await supabase
        .from("orders")
        .insert(orderData)
        .select()
        .single();
      order = result.data;
      orderError = result.error;

      // If error is about missing social_platform column, retry without it
      if (orderError && orderError.message && orderError.message.includes("social_platform")) {
        console.warn("⚠️ Social platform column not found. Retrying without it. Please run migration: add_social_platform_to_orders.sql");
        const { social_platform: _, ...orderDataWithoutSocialPlatform } = orderData;
        const retryResult = await supabase
          .from("orders")
          .insert(orderDataWithoutSocialPlatform)
          .select()
          .single();
        order = retryResult.data;
        orderError = retryResult.error;
      }
    }

    if (orderError || !order) {
      console.error("Order creation error:", orderError);
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    // Create order items
    const orderItems = allOrderItems.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
      size: item.size || null, // Include size if provided
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Order items creation error:", itemsError);
      // Clean up order if items creation fails
      await supabase.from("orders").delete().eq("id", order.id);
      return NextResponse.json(
        { error: "Failed to create order items" },
        { status: 500 }
      );
    }

    // Create or update user record with customer info
    await supabase.from("users").upsert({
      id: user.id,
      email: validated.customer_info.email,
      full_name: validated.customer_info.name,
      phone: validated.customer_info.phone,
    });

    return NextResponse.json({ order_id: order.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      // Format validation errors for better readability
      const formattedErrors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));
      
      return NextResponse.json(
        { 
          error: "Invalid request data", 
          details: formattedErrors,
          rawErrors: error.errors 
        },
        { status: 400 }
      );
    }

    console.error("Order creation error:", error);
    return NextResponse.json(
      { error: "Failed to create order", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
