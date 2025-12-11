import Link from "next/link";
import ProductGrid from "@/components/products/ProductGrid";
import FlashSaleCountdown from "@/components/products/FlashSaleCountdown";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Product } from "@/types";

export default async function HomePage() {
  const supabase = await createClient();
  
  // Fetch featured products - Top 4 products by sale count
  let featuredProducts: any[] = [];
  let productsError: any = null;

  try {
    // Try to create admin client (may fail if service role key is not set)
    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch (adminError) {
      console.warn('Admin client not available, using fallback for featured products:', adminError);
      adminClient = null;
    }

    // Fetch all completed orders (only if admin client is available)
    if (adminClient) {
      const { data: completedOrders, error: ordersError } = await adminClient
        .from('orders')
        .select('id')
        .eq('status', 'completed');

      if (ordersError) {
        console.error('Error fetching completed orders for featured products:', ordersError);
      }

      if (completedOrders && completedOrders.length > 0) {
        const orderIds = completedOrders.map((o: any) => o.id);

        // Fetch order items for completed orders
        const { data: orderItems, error: itemsError } = await adminClient
          .from('order_items')
          .select('product_id, quantity')
          .in('order_id', orderIds);

        if (itemsError) {
          console.error('Error fetching order items for featured products:', itemsError);
        } else if (orderItems && orderItems.length > 0) {
          // Aggregate product sales (sum of quantities)
          const productSalesMap = new Map<string, number>();

          orderItems.forEach((item: any) => {
            if (item.product_id && item.quantity) {
              const currentSales = productSalesMap.get(item.product_id) || 0;
              productSalesMap.set(item.product_id, currentSales + (parseInt(item.quantity) || 0));
            }
          });

          // Get top 4 product IDs by sale count
          const topProductIds = Array.from(productSalesMap.entries())
            .sort((a, b) => b[1] - a[1]) // Sort by sales count descending
            .slice(0, 4) // Top 4
            .map(([productId]) => productId);

          if (topProductIds.length > 0) {
            // Fetch product details for top 4 products
            const { data: products, error: productsFetchError } = await supabase
              .from('products')
              .select('*')
              .in('id', topProductIds);

            if (productsFetchError) {
              console.error('Error fetching featured products:', productsFetchError);
              productsError = productsFetchError;
            } else if (products) {
              // Sort products to match the sales order
              const productMap = new Map(products.map((p: any) => [p.id, p]));
              featuredProducts = topProductIds
                .map(id => productMap.get(id))
                .filter(Boolean) as any[];
            }
          }
        }
      }
    } else {
      // Admin client not available, skip to fallback
      console.log('Skipping sales-based featured products (admin client not available)');
    }

    // Fallback: If no sales data or admin client unavailable, use newest products
    if (featuredProducts.length === 0) {
      const { data: fallbackProducts, error: fallbackError } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(4);

      if (fallbackError) {
        // Try without status filter
        const { data: allProducts, error: allError } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(4);
        featuredProducts = allProducts || [];
        productsError = allError;
      } else {
        featuredProducts = fallbackProducts || [];
        productsError = fallbackError;
      }
    }
  } catch (error) {
    console.error('Error fetching featured products:', error);
    // Fallback to newest products
    const { data: fallbackProducts, error: fallbackError } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(4);
    featuredProducts = fallbackProducts || [];
    productsError = fallbackError;
  }

  const products = featuredProducts;

  // Fetch inventory separately with error handling
  let inventoryMap = new Map();
  if (products && products.length > 0) {
    const productIds = products.map((p) => p.id);
    const { data: inventory, error: inventoryError } = await supabase
      .from("inventory")
      .select("product_id, stock_quantity, reserved_quantity")
      .in("product_id", productIds);

    if (inventoryError) {
      console.error("Error fetching inventory:", inventoryError);
    }

    if (inventory) {
      inventory.forEach((inv: any) => {
        const available = Math.max(
          0,
          (inv.stock_quantity || 0) - (inv.reserved_quantity || 0)
        );
        inventoryMap.set(inv.product_id, available);
      });
    }
  }

  // Fetch flash sale products
  let { data: flashSaleProducts, error: flashSaleError } = await supabase
    .from("products")
    .select("*")
    .eq("is_flash_sale", true)
    .gte("flash_sale_end", new Date().toISOString())
    .order("flash_sale_end", { ascending: true })
    .limit(4);

  // If no flash sale products with status filter, try without
  if (
    (!flashSaleProducts || flashSaleProducts.length === 0) &&
    !flashSaleError
  ) {
    const { data: allFlashSale, error: allFlashError } = await supabase
      .from("products")
      .select("*")
      .eq("is_flash_sale", true)
      .order("flash_sale_end", { ascending: true })
      .limit(4);
    flashSaleProducts = allFlashSale;
    flashSaleError = allFlashError;
  }

  // Fetch inventory for flash sale products with error handling
  let flashSaleInventoryMap = new Map();
  if (flashSaleProducts && flashSaleProducts.length > 0) {
    const flashSaleIds = flashSaleProducts.map((p) => p.id);
    const { data: flashSaleInventory, error: flashSaleInventoryError } =
      await supabase
        .from("inventory")
        .select("product_id, stock_quantity, reserved_quantity")
        .in("product_id", flashSaleIds);

    if (flashSaleInventoryError) {
      console.error(
        "Error fetching flash sale inventory:",
        flashSaleInventoryError
      );
    }

    if (flashSaleInventory) {
      flashSaleInventory.forEach((inv: any) => {
        const available = Math.max(
          0,
          (inv.stock_quantity || 0) - (inv.reserved_quantity || 0)
        );
        flashSaleInventoryMap.set(inv.product_id, available);
      });
    }
  }

  // Fetch New Arrivals - Latest products added
  let { data: newArrivals, error: newArrivalsError } = await supabase
    .from("products")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(8);

  // If no products with status='active', try without status filter
  if ((!newArrivals || newArrivals.length === 0) && !newArrivalsError) {
    const { data: allNewArrivals, error: allNewArrivalsError } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8);
    newArrivals = allNewArrivals;
    newArrivalsError = allNewArrivalsError;
  }

  // Fetch inventory for new arrivals
  let newArrivalsInventoryMap = new Map();
  if (newArrivals && newArrivals.length > 0) {
    const newArrivalIds = newArrivals.map((p) => p.id);
    const { data: newArrivalsInventory, error: newArrivalsInventoryError } =
      await supabase
        .from("inventory")
        .select("product_id, stock_quantity, reserved_quantity")
        .in("product_id", newArrivalIds);

    if (newArrivalsInventoryError) {
      console.error(
        "Error fetching new arrivals inventory:",
        newArrivalsInventoryError
      );
    }

    if (newArrivalsInventory) {
      newArrivalsInventory.forEach((inv: any) => {
        const available = Math.max(
          0,
          (inv.stock_quantity || 0) - (inv.reserved_quantity || 0)
        );
        newArrivalsInventoryMap.set(inv.product_id, available);
      });
    }
  }

  // Log errors for debugging
  if (productsError) {
    console.error("Error fetching products:", productsError);
  }
  if (flashSaleError) {
    console.error("Error fetching flash sale products:", flashSaleError);
  }
  if (newArrivalsError) {
    console.error("Error fetching new arrivals:", newArrivalsError);
  }

  // Handle errors gracefully - fallback to empty array
  // Filter out products with 0 stock - only show products with stock > 0
  const productsWithStock = (products || [])
    .map((product: any) => {
      const stock = inventoryMap.get(product.id);
      return {
        ...product,
        // Only set available_stock if we have inventory data, otherwise leave undefined
        // This allows the UI to handle missing inventory differently
        available_stock: stock !== undefined ? stock : undefined,
      };
    })
    .filter((product: any) => {
      // Filter out products with 0 stock
      // Keep products with undefined stock (inventory not set up yet) or stock > 0
      return product.available_stock === undefined || product.available_stock > 0;
    });

  const flashSaleWithStock = (flashSaleProducts || [])
    .map((product: any) => {
      const discountPercent = product.sale_price
        ? Math.round(((product.price - product.sale_price) / product.price) * 100)
        : 0;
      const stock = flashSaleInventoryMap.get(product.id);
      return {
        ...product,
        // Only set available_stock if we have inventory data
        available_stock: stock !== undefined ? stock : undefined,
        discount_percent: discountPercent,
        flash_sale_end_date: product.flash_sale_end
          ? new Date(product.flash_sale_end)
          : null,
      };
    })
    .filter((product: any) => {
      // Filter out products with 0 stock
      // Keep products with undefined stock (inventory not set up yet) or stock > 0
      return product.available_stock === undefined || product.available_stock > 0;
    });

  const newArrivalsWithStock = (newArrivals || [])
    .map((product: any) => {
      const stock = newArrivalsInventoryMap.get(product.id);
      return {
        ...product,
        available_stock: stock !== undefined ? stock : undefined,
      };
    })
    .filter((product: any) => {
      // Filter out products with 0 stock
      // Keep products with undefined stock (inventory not set up yet) or stock > 0
      return product.available_stock === undefined || product.available_stock > 0;
    });

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary via-primary-dark to-primary-light text-white py-24 md:py-32 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 text-center relative z-10 animate-slide-up">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            Welcome to{" "}
            <span className="bg-white/20 px-4 py-2 rounded-2xl">
              Leeztruestyles
            </span>
          </h1>
          <p className="text-xl md:text-2xl mb-10 text-white/90 max-w-2xl mx-auto">
            Discover the latest fashion trends. Style that speaks to you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/products"
              className="inline-block px-8 py-4 bg-white text-primary rounded-none font-semibold hover:bg-gray-50 transition-all hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Shop Now
            </Link>
            <Link
              href="/about"
              className="inline-block px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-none font-semibold hover:bg-white/20 transition-all"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* New Arrivals Section */}
      {newArrivalsWithStock.length > 0 && (
        <section className="bg-gradient-to-br from-gray-50 to-white py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary-dark text-white px-4 py-2 rounded-full mb-4 font-bold text-sm shadow-lg">
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
                Just In
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Discover our latest additions. Fresh styles added just for you.
              </p>
            </div>

            <ProductGrid products={newArrivalsWithStock} />

            <div className="text-center mt-12">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-none font-semibold hover:bg-primary-dark hover:shadow-xl transition-all hover:scale-105"
              >
                View All Products
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

      {/* Flash Sale Section */}
      {flashSaleWithStock.length > 0 && (
        <section className="bg-gradient-to-br from-red-50 via-pink-50 to-primary-light/20 py-16 md:py-24 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-10 right-10 w-64 h-64 bg-red-500 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 left-10 w-64 h-64 bg-pink-500 rounded-full blur-3xl"></div>
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-12 animate-fade-in">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-full mb-4 font-bold text-sm shadow-lg">
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
                Limited Time Offers
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-6">
                Don't miss out on these amazing deals! Limited quantities
                available.
              </p>

              {/* Countdown Timer - Show earliest end date */}
              {flashSaleWithStock[0]?.flash_sale_end_date && (
                <FlashSaleCountdown
                  endDate={flashSaleWithStock[0].flash_sale_end_date}
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
            Featured Products
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Curated collection of our most popular items
          </p>
        </div>

        <ProductGrid products={productsWithStock.slice(0, 4)} />

        <div className="text-center mt-12">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-none font-semibold hover:bg-primary-dark hover:shadow-xl transition-all hover:scale-105"
          >
            View All Products
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
    </div>
  );
}
