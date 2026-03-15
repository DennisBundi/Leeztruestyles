import Link from "next/link";
import type { Metadata } from "next";
import ProductGrid from "@/components/products/ProductGrid";
import FlashSaleCountdown from "@/components/products/FlashSaleCountdown";
import ReviewSection from "@/components/home/ReviewSection";
import ImportationSection from "@/components/home/ImportationSection";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Leeztruestyles - Fashion Marketplace in Kenya",
  description:
    "Discover the latest fashion trends at Leeztruestyles. Shop premium clothing, accessories, and more with fast delivery across Kenya.",
  openGraph: {
    title: "Leeztruestyles - Fashion Marketplace in Kenya",
    description:
      "Discover the latest fashion trends at Leeztruestyles. Shop premium clothing, accessories, and more with fast delivery across Kenya.",
    type: "website",
  },
};

export const revalidate = 60;

function hasValidImage(product: Record<string, unknown>): boolean {
  if (product.image && typeof product.image === "string" && product.image.trim() !== "") return true;
  if (product.image_url && typeof product.image_url === "string" && product.image_url.trim() !== "") return true;
  if (product.images) {
    if (Array.isArray(product.images)) {
      return product.images.some((img: unknown) => img && typeof img === "string" && img.trim() !== "");
    }
    if (typeof product.images === "string") return product.images.trim() !== "";
  }
  return false;
}

function filterProducts<T extends Record<string, unknown> & { id: string }>(products: T[], inventoryMap: Map<string, number>): (T & { available_stock?: number })[] {
  return products
    .map((product) => {
      const stock = inventoryMap.get(product.id);
      return { ...product, available_stock: stock !== undefined ? stock : undefined };
    })
    .filter((product) => {
      const hasStock = product.available_stock === undefined || product.available_stock >= 1;
      return hasStock && hasValidImage(product);
    });
}

function buildInventoryMap(inventory: { product_id: string; stock_quantity: number; reserved_quantity: number }[] | null): Map<string, number> {
  const map = new Map<string, number>();
  if (inventory) {
    inventory.forEach((inv) => {
      const available = Math.max(0, (inv.stock_quantity || 0) - (inv.reserved_quantity || 0));
      map.set(inv.product_id, available);
    });
  }
  return map;
}

export default async function HomePage() {
  const supabase = await createClient();

  // Try to create admin client for sales data
  let adminClient: ReturnType<typeof createAdminClient> | null = null;
  try {
    adminClient = createAdminClient();
  } catch {
    // Admin client not available
  }

  // --- Phase 1: Parallel fetch of all product lists ---
  const [newArrivalsResult, flashSaleResult, salesDataResult] = await Promise.allSettled([
    // New arrivals: latest 20 products
    supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),

    // Flash sale: active flash sales
    supabase
      .from("products")
      .select("*")
      .eq("is_flash_sale", true)
      .gte("flash_sale_end", new Date().toISOString())
      .order("flash_sale_end", { ascending: true })
      .limit(4),

    // Sales data for featured products
    adminClient
      ? (async () => {
          const { data: completedOrders } = await adminClient
            .from("orders")
            .select("id")
            .eq("status", "completed");

          if (!completedOrders || completedOrders.length === 0) return null;

          const orderIds = completedOrders.map((o: { id: string }) => o.id);
          const { data: orderItems } = await adminClient
            .from("order_items")
            .select("product_id, order_id, quantity")
            .in("order_id", orderIds);

          return orderItems || null;
        })()
      : Promise.resolve(null),
  ]);

  let newArrivals = newArrivalsResult.status === "fulfilled" ? newArrivalsResult.value.data || [] : [];
  let flashSaleProducts = flashSaleResult.status === "fulfilled" ? flashSaleResult.value.data || [] : [];

  // If no active flash sales, try without date filter
  if (flashSaleProducts.length === 0) {
    const { data: allFlashSale } = await supabase
      .from("products")
      .select("*")
      .eq("is_flash_sale", true)
      .order("flash_sale_end", { ascending: true })
      .limit(4);
    flashSaleProducts = allFlashSale || [];
  }

  // --- Phase 2: Compute featured products from sales data ---
  let featuredProductIds: string[] = [];
  const productSalesCountMap = new Map<string, number>();
  const salesData = salesDataResult.status === "fulfilled" ? salesDataResult.value : null;

  if (salesData) {
    const productOrderCountMap = new Map<string, Set<string>>();
    salesData.forEach((item: { product_id: string; order_id: string; quantity: number }) => {
      if (item.product_id && item.order_id) {
        if (!productOrderCountMap.has(item.product_id)) {
          productOrderCountMap.set(item.product_id, new Set());
        }
        productOrderCountMap.get(item.product_id)!.add(item.order_id);
      }
    });

    productOrderCountMap.forEach((orderIds, productId) => {
      productSalesCountMap.set(productId, orderIds.size);
    });

    featuredProductIds = Array.from(productSalesCountMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([productId]) => productId);
  }

  // Fetch featured product details if we have sales data
  let featuredProducts: typeof newArrivals = [];
  if (featuredProductIds.length > 0) {
    const { data: products } = await supabase
      .from("products")
      .select("*")
      .in("id", featuredProductIds);
    featuredProducts = products || [];
  }

  // --- Phase 3: Single inventory fetch for ALL products ---
  const allProductIds = new Set<string>();
  newArrivals.forEach((p) => allProductIds.add(p.id));
  flashSaleProducts.forEach((p) => allProductIds.add(p.id));
  featuredProducts.forEach((p) => allProductIds.add(p.id));

  let inventoryMap = new Map<string, number>();
  const allIds = Array.from(allProductIds);
  if (allIds.length > 0) {
    const { data: inventory } = await supabase
      .from("inventory")
      .select("product_id, stock_quantity, reserved_quantity")
      .in("product_id", allIds);
    inventoryMap = buildInventoryMap(inventory);
  }

  // --- Phase 4: Filter and prepare display data ---
  const newArrivalsWithStock = filterProducts(newArrivals, inventoryMap);

  const flashSaleWithStock = filterProducts(flashSaleProducts, inventoryMap).map((product) => {
    const discountPercent = product.sale_price
      ? Math.round(((product.price - product.sale_price) / product.price) * 100)
      : 0;
    return {
      ...product,
      discount_percent: discountPercent,
      flash_sale_end_date: product.flash_sale_end || null,
    };
  });

  // Featured: top 4 by sales count
  let productsWithStock = filterProducts(featuredProducts, inventoryMap)
    .map((p) => ({ ...p, salesCount: productSalesCountMap.get(p.id) || 0 }))
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, 4);

  // Fallback: use new arrivals if no sales-based featured products
  if (productsWithStock.length === 0 && newArrivalsWithStock.length > 0) {
    productsWithStock = newArrivalsWithStock.slice(0, 4);
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative text-white min-h-[calc(60vh+150px)] flex items-center overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-top bg-no-repeat"
          style={{ backgroundImage: "url('/images/hero-fashion.jpg')" }}
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/50" />

        <div className="container mx-auto px-4 text-center relative z-10 animate-slide-up w-full py-24 md:py-0">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            Dress Like You{" "}
            <span className="bg-white/20 px-4 py-2 rounded-2xl">
              Mean It
            </span>
          </h1>
          <p className="text-xl md:text-2xl mb-10 text-white/90 max-w-2xl mx-auto">
            Bold, fresh styles for the woman who walks in and owns the room. Shop Nairobi&apos;s go-to fashion destination.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/products"
              className="inline-block px-8 py-4 bg-white text-primary rounded-none font-semibold hover:bg-gray-50 transition-all hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Shop the Collection
            </Link>
          </div>
        </div>
      </section>

      {/* New Arrivals Section */}
      <section className="bg-gradient-to-br from-gray-50 to-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary-dark text-white px-4 py-2 rounded-none mb-4 font-bold text-sm shadow-lg">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
              NEW ARRIVALS
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Fresh Drops
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              New styles every week. Be the first to wear what everyone else wishes they had.
            </p>
          </div>

          {newArrivalsWithStock.length > 0 ? (
            <>
              <ProductGrid products={newArrivalsWithStock} />
              <div className="text-center mt-12">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-none font-semibold hover:bg-primary-dark hover:shadow-xl transition-all hover:scale-105"
                >
                  Shop New Arrivals
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gray-100 rounded-full mb-6">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-gray-700 mb-2">
                No New Arrivals Yet
              </h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Check back soon for our latest products and fresh styles!
              </p>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-none font-semibold hover:bg-primary-dark transition-all"
              >
                Browse All Products
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Flash Sale Section */}
      {flashSaleWithStock.length > 0 && (
      <section className="bg-gradient-to-br from-red-50 via-pink-50 to-primary-light/20 py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 right-10 w-64 h-64 bg-red-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-10 w-64 h-64 bg-pink-500 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-none mb-4 font-bold text-sm shadow-lg">
              <svg
                className="w-5 h-5 animate-pulse"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              FLASH SALE
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Snag It Before It&apos;s Gone
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-6">
              These prices won&apos;t last — and neither will the stock.
            </p>

            {flashSaleWithStock.length > 0 &&
              flashSaleWithStock[0]?.flash_sale_end_date && (
                <FlashSaleCountdown
                  endDate={
                    typeof flashSaleWithStock[0].flash_sale_end_date === "string"
                      ? flashSaleWithStock[0].flash_sale_end_date
                      : flashSaleWithStock[0].flash_sale_end_date instanceof Date
                      ? flashSaleWithStock[0].flash_sale_end_date.toISOString()
                      : new Date(flashSaleWithStock[0].flash_sale_end_date).toISOString()
                  }
                />
              )}
          </div>

          <ProductGrid products={flashSaleWithStock} />
          <div className="text-center mt-12">
            <Link
              href="/products?flash_sale=true"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-none font-semibold hover:shadow-xl transition-all hover:scale-105"
            >
              View All Flash Sale Items
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>
      )}

      {/* Featured Products */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
            Fan Favourites
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            The pieces our customers keep coming back for.
          </p>
        </div>

        <ProductGrid products={productsWithStock.slice(0, 4)} />

        <div className="text-center mt-12">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-none font-semibold hover:bg-primary-dark hover:shadow-xl transition-all hover:scale-105"
          >
            Shop Everything
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>
      </section>

      {/* Importation Waitlist Section */}
      <ImportationSection />

      {/* Customer Reviews Section */}
      <ReviewSection />
    </div>
  );
}
