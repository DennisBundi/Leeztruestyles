import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createClientServer } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify user is authenticated
    const supabase = await createClientServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const productId = params.id;

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient();

    // Check if table exists by attempting a select
    const { error: tableCheckError } = await adminClient
      .from("product_size_colors")
      .select("id")
      .limit(0);

    if (tableCheckError) {
      // Table doesn't exist - return empty array
      if (process.env.NODE_ENV === "development") {
        console.log(
          `ℹ️ product_size_colors table not found for product ${productId}. Returning empty color stocks.`
        );
      }
      return NextResponse.json({ colorStocks: [] });
    }

    // Fetch color-based inventory
    const { data: colorInventory, error: colorInventoryError } =
      await adminClient
        .from("product_size_colors")
        .select("color, size, stock_quantity")
        .eq("product_id", productId);

    if (colorInventoryError) {
      console.error(
        `Error fetching color stocks for product ${productId}:`,
        colorInventoryError
      );
      return NextResponse.json(
        {
          error: "Failed to fetch color stocks",
          details: colorInventoryError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      colorStocks: colorInventory || [],
    });
  } catch (error) {
    console.error("Error in color-stocks API route:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

