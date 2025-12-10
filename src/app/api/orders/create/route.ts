import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const createOrderSchema = z.object({
  items: z.array(
    z.object({
      product_id: z.string().uuid(),
      quantity: z.number().positive().int(),
      price: z.number().positive(),
    })
  ),
  customer_info: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    address: z.string().min(1),
  }),
  sale_type: z.enum(["online", "pos"]).default("online"),
});

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

    // Calculate total
    const total = validated.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Create order with user_id
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id, // Always set user_id for authenticated users
        sale_type: validated.sale_type,
        total_amount: total,
        status: "pending",
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error("Order creation error:", orderError);
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    // Create order items
    const orderItems = validated.items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
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
