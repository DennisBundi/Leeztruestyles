import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const REQUIRED_FIELDS = [
  "full_name",
  "email",
  "phone",
  "business_name",
  "goods_category",
  "monthly_order_value",
] as const;

const VALID_CATEGORIES = ["Clothing", "Footwear", "Accessories", "Home Goods", "Electronics", "Other"];
const VALID_ORDER_VALUES = ["Under KES 50k", "KES 50k–100k", "KES 100k–500k", "Over KES 500k"];

interface WaitlistRequestBody {
  full_name: string;
  email: string;
  phone: string;
  business_name: string;
  goods_category: string;
  monthly_order_value: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as WaitlistRequestBody;

    // Validate required fields
    for (const field of REQUIRED_FIELDS) {
      if (!body[field] || typeof body[field] !== "string" || !body[field].trim()) {
        return NextResponse.json(
          { error: `Missing or invalid field: ${field}` },
          { status: 400 }
        );
      }
    }

    if (!VALID_CATEGORIES.includes(body.goods_category)) {
      return NextResponse.json({ error: "Invalid goods_category" }, { status: 400 });
    }

    if (!VALID_ORDER_VALUES.includes(body.monthly_order_value)) {
      return NextResponse.json({ error: "Invalid monthly_order_value" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("import_waitlist")
      .insert({
        full_name: body.full_name.trim(),
        email: body.email.trim().toLowerCase(),
        phone: body.phone.trim(),
        business_name: body.business_name.trim(),
        goods_category: body.goods_category,
        monthly_order_value: body.monthly_order_value,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: "An application with this email already exists." }, { status: 409 });
      }
      console.error("Waitlist insert error:", error);
      return NextResponse.json({ error: "Failed to save application." }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Waitlist route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
