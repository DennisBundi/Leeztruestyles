import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEmployee, getUserRole } from "@/lib/auth/roles";
import { z } from "zod";
import { rateLimit, rateLimitKey, RATE_LIMITS } from "@/lib/rateLimit";
import { safeErrorResponse } from "@/lib/security/errorResponse";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const createOrderSchema = z
  .object({
    items: z.array(
      z.union([
        // Existing product with product_id
        z.object({
          product_id: z.string().uuid(),
          quantity: z.number().positive().int(),
          price: z.number().positive(),
          size: z.string().optional(), // Optional size (S, M, L, XL, 2XL, 3XL, 4XL, 5XL)
          color: z.string().optional(), // Optional color
        }),
        // Custom product with product_data
        z.object({
          product_data: z.object({
            name: z.string().min(1),
            price: z.number().positive(),
            size: z.string().optional(),
            category_id: z.string().uuid().optional().nullable(),
            description: z.string().optional().nullable(),
            images: z.array(z.string().url()).optional(), // Optional images array
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
    social_platform: z
      .enum(["tiktok", "instagram", "whatsapp", "walkin"])
      .optional(), // Required for POS orders
    sale_datetime: z.string().optional(), // Optional custom sale datetime (ISO)
    reward_code: z.string().optional(), // Optional reward code for discount
  })
  .refine(
    (data) => {
      // If sale_type is "pos", social_platform is required
      if (data.sale_type === "pos") {
        return (
          data.social_platform !== undefined && data.social_platform !== null
        );
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

    // Rate limit order creation
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rlKey = rateLimitKey("order", ip, user.id);
    if (!rateLimit(rlKey, RATE_LIMITS.orderCreate.maxRequests, RATE_LIMITS.orderCreate.windowMs)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Validate reward code server-side if provided
    let rewardDiscount = 0;
    let validatedRewardCode: string | null = null;
    if (validated.reward_code && validated.sale_type === "online") {
      const { data: rewardCode, error: codeError } = await supabase
        .from("reward_codes")
        .select("*")
        .eq("code", validated.reward_code.trim().toUpperCase())
        .eq("is_used", false)
        .single();

      if (codeError || !rewardCode) {
        return NextResponse.json(
          { error: "Invalid or already used reward code" },
          { status: 400 }
        );
      }

      if (rewardCode.user_id !== user.id) {
        return NextResponse.json(
          { error: "This reward code does not belong to your account" },
          { status: 403 }
        );
      }

      if (new Date(rewardCode.expires_at) < new Date()) {
        return NextResponse.json(
          { error: "This reward code has expired" },
          { status: 400 }
        );
      }

      // Calculate discount with validation
      const itemSubtotal = validated.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      if (rewardCode.discount_percent) {
        const percent = Math.min(Math.max(rewardCode.discount_percent, 0), 100);
        rewardDiscount = Math.round((percent / 100) * itemSubtotal);
      } else if (rewardCode.discount_amount) {
        rewardDiscount = Math.max(rewardCode.discount_amount, 0);
      }

      // Cap discount to subtotal so total never goes negative
      rewardDiscount = Math.min(rewardDiscount, itemSubtotal);

      validatedRewardCode = rewardCode.code;
    }

    // Optional custom sale datetime for POS (override created_at)
    let saleDateIso: string | null = null;
    if (validated.sale_type === "pos" && validated.sale_datetime) {
      const parsed = new Date(validated.sale_datetime);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "Invalid sale_datetime. Provide a valid ISO datetime." },
          { status: 400 }
        );
      }
      saleDateIso = parsed.toISOString();
    }

    // Separate existing products and custom products
    const existingProductItems: Array<{
      product_id: string;
      quantity: number;
      price: number;
      size?: string;
      color?: string;
    }> = [];
    const customProductItems: Array<{
      product_data: {
        name: string;
        price: number;
        size?: string;
        category_id?: string | null;
        description?: string | null;
        images?: string[];
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
          images: item.product_data.images || [], // Use provided images or empty array
          source: "pos", // Mark as POS-created product
        }));

        const insertProducts = async (records: Record<string, unknown>[]) =>
          adminSupabase.from("products").insert(records).select();

        let { data: createdProducts, error: productsError } =
          await insertProducts(productsToInsert);

        if (productsError && productsError.message) {
          // Retry without columns that may not exist in older schemas
          if (
            productsError.message.includes("source") ||
            productsError.message.includes("images")
          ) {
            logger.warn("Optional columns not found on products table. Retrying without source/images.");
            const fallbackProducts = productsToInsert.map(
              ({ source: _source, images: _images, ...rest }) => rest
            );
            const retryResult = await insertProducts(fallbackProducts);
            createdProducts = retryResult.data;
            productsError = retryResult.error;
          }
        }

        if (productsError || !createdProducts) {
          logger.error("Error creating custom products:", productsError);
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
        logger.error("Error creating custom products:", error);
        return NextResponse.json(
          { error: "Failed to create custom products" },
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
      color?: string;
    }> = [];

    // Add existing product items
    existingProductItems.forEach((item) => {
      allOrderItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        size: item.size,
        color: item.color,
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

    // Validate prices against database for existing products
    // Skip for POS orders — discounts applied at POS are intentional and admin-controlled
    if (existingProductItems.length > 0 && validated.sale_type !== "pos") {
      const productIds = existingProductItems.map((item) => item.product_id);
      const { data: dbProducts, error: priceError } = await supabase
        .from("products")
        .select("id, price")
        .in("id", productIds);

      if (priceError || !dbProducts) {
        return NextResponse.json(
          { error: "Failed to verify product prices" },
          { status: 500 }
        );
      }

      const priceMap = new Map(dbProducts.map((p) => [p.id, p.price]));
      for (const item of existingProductItems) {
        const dbPrice = priceMap.get(item.product_id);
        if (dbPrice === undefined) {
          return NextResponse.json(
            { error: "Product not found" },
            { status: 400 }
          );
        }
        if (Math.abs(item.price - dbPrice) > 0.01) {
          return NextResponse.json(
            { error: "Product price mismatch. Please refresh and try again." },
            { status: 400 }
          );
        }
      }
    }

    // Calculate total (apply reward discount if validated)
    const subtotal = allOrderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const total = Math.max(0, subtotal - rewardDiscount);

    // For POS orders, get the employee record to set seller_id
    let sellerId: string | null = null;
    let sellerEmployee: any = null;
    if (validated.sale_type === "pos") {
      // If seller_id is provided in the request, use it
      if (validated.seller_id) {
        sellerId = validated.seller_id;
        logger.debug("Using seller_id from request:", sellerId);
        // Get the employee record to check their role
        const { data: employeeData } = await supabase
          .from("employees")
          .select("id, role, user_id")
          .eq("id", sellerId)
          .single();
        if (employeeData) {
          sellerEmployee = employeeData;
        }
      } else {
        // Otherwise, try to get the employee record for the current user
        const employee = await getEmployee(user.id);
        if (employee) {
          sellerId = employee.id;
          sellerEmployee = employee;
          logger.debug("Using seller_id from employee record:", sellerId);
        } else {
          logger.warn("POS order but no employee record found for user");
        }
      }
    }

    // Check if the seller (employee) is an admin - admins should not receive commission
    // We check the seller's role, not the user making the request
    const isSellerAdmin = sellerEmployee?.role === "admin";

    // Calculate commission for POS sales (3% of total)
    // Only apply commission if it's a POS sale, has a seller_id, and the seller is NOT an admin
    const commissionRate = 0.03; // 3%
    const commission =
      validated.sale_type === "pos" && sellerId && !isSellerAdmin
        ? total * commissionRate
        : 0;

    logger.debug("Commission calculation:", { isSellerAdmin, commission });

    // Create order with user_id and seller_id (if POS)
    // POS orders are marked as completed immediately since transactions are confirmed at physical location
    const orderData: any = {
      user_id: user.id, // Always set user_id for authenticated users
      sale_type: validated.sale_type,
      total_amount: total,
      status: validated.sale_type === "pos" ? "completed" : "pending", // POS orders are completed immediately
    };
    if (saleDateIso) {
      orderData.created_at = saleDateIso;
    }

    // Add social_platform if provided
    if (validated.social_platform) {
      orderData.social_platform = validated.social_platform;
    }

    // Set seller_id for POS orders
    if (sellerId) {
      orderData.seller_id = sellerId;
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
      if (
        orderError &&
        orderError.message &&
        (orderError.message.includes("commission") ||
          orderError.message.includes("social_platform"))
      ) {
        logger.warn("Commission or social_platform column not found. Retrying without it.");
        // Remove commission and social_platform for retry
        const {
          commission: _,
          social_platform: __,
          ...orderDataWithoutOptional
        } = orderDataWithCommission;
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
      if (
        orderError &&
        orderError.message &&
        orderError.message.includes("social_platform")
      ) {
        logger.warn("Social platform column not found. Retrying without it.");
        const { social_platform: _, ...orderDataWithoutSocialPlatform } =
          orderData;
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
      logger.error("Order creation error:", orderError);
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    // Create order items
    // Build order items object - conditionally include color if it might exist
    const orderItems = allOrderItems.map((item) => {
      const orderItem: any = {
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
      };

      // Include size if provided
      if (item.size !== undefined && item.size !== null) {
        orderItem.size = item.size;
      }

      // Include color if provided (only if column exists - will be handled by try/catch)
      if (item.color !== undefined && item.color !== null) {
        orderItem.color = item.color;
      }

      return orderItem;
    });

    // Try to insert order items
    // If color column doesn't exist, remove it and retry
    let itemsError: any = null;

    const insertResult = await supabase.from("order_items").insert(orderItems);
    itemsError = insertResult.error;

    // If error is about missing color column, retry without it
    if (
      itemsError &&
      itemsError.message &&
      (itemsError.message.includes("color") ||
        itemsError.message.includes("Could not find the 'color' column"))
    ) {
      logger.warn("Color column not found in order_items table. Retrying without color field.");

      // Remove color from order items and retry
      const orderItemsWithoutColor = orderItems.map((item: any) => {
        const { color, ...itemWithoutColor } = item;
        return itemWithoutColor;
      });

      const retryResult = await supabase
        .from("order_items")
        .insert(orderItemsWithoutColor);
      itemsError = retryResult.error;

      // Retry succeeded without color field
    }

    if (itemsError) {
      logger.error("Order items creation error:", itemsError);
      // Clean up order if items creation fails
      await supabase.from("orders").delete().eq("id", order.id);
      return NextResponse.json(
        { error: "Failed to create order items" },
        { status: 500 }
      );
    }

    // Mark reward code as used if one was validated
    if (validatedRewardCode) {
      await supabase
        .from("reward_codes")
        .update({ is_used: true })
        .eq("code", validatedRewardCode)
        .eq("user_id", user.id);
    }

    // Update user record with customer info — fire and forget (non-critical path)
    supabase.from("users").upsert({
      id: user.id,
      email: validated.customer_info.email,
      full_name: validated.customer_info.name,
      phone: validated.customer_info.phone,
    }).then(() => {}).catch(() => {});

    // For POS orders, deduct inventory immediately since they're completed
    if (validated.sale_type === "pos" && order) {
      const { InventoryService } = await import("@/services/inventoryService");

      // Get order items to deduct inventory
      const { data: posOrderItems } = await supabase
        .from("order_items")
        .select("product_id, quantity, size, color")
        .eq("order_id", order.id);

      if (posOrderItems) {
        logger.debug(`Deducting inventory for POS order ${order.id}`);
        for (const item of posOrderItems) {
          try {
            await InventoryService.deductStock(
              item.product_id,
              item.quantity,
              undefined, // sellerId not needed for inventory deduction
              item.size || undefined,
              item.color || undefined
            );
            logger.debug(`Deducted ${item.quantity} from product ${item.product_id}`);
          } catch (error) {
            logger.error(`Error deducting inventory for product ${item.product_id}:`, error);
            // Continue with other items even if one fails
            // Don't fail the entire order creation - inventory can be adjusted manually if needed
          }
        }
      }
    }

    // Award loyalty points for completed POS orders
    if (validated.sale_type === "pos" && order) {
      try {
        const { LoyaltyService } = await import("@/services/loyaltyService");
        const pointsAwarded = await LoyaltyService.awardPurchasePoints(
          user.id,
          order.id,
          total
        );
        if (pointsAwarded > 0) {
          logger.info(`Awarded ${pointsAwarded} loyalty points for POS order ${order.id}`);
        }
      } catch (loyaltyError) {
        logger.error("Error awarding loyalty points for POS order:", loyaltyError);
      }
    }

    return NextResponse.json({ order_id: order.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    logger.error("Order creation error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
