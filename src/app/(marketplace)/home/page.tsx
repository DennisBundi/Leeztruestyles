import Link from "next/link";
import ProductGrid from "@/components/products/ProductGrid";
import FlashSaleCountdown from "@/components/products/FlashSaleCountdown";
import ReviewSection from "@/components/home/ReviewSection";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Product } from "@/types";

export default async function HomePage() {
  const supabase = await createClient();

  // Fetch featured products - Top 4 products by sale count
  let featuredProducts: any[] = [];
  let productsError: any = null;
  let productSalesCountMap = new Map<string, number>(); // Store sales counts for sorting after filtering

  try {
    // Try to create admin client (may fail if service role key is not set)
    let adminClient;
    try {
      adminClient = createAdminClient();
    } catch (adminError) {
      console.warn(
        "Admin client not available, using fallback for featured products:",
        adminError
      );
      adminClient = null;
    }

    // Fetch all completed orders (only if admin client is available)
    if (adminClient) {
      const { data: completedOrders, error: ordersError } = await adminClient
        .from("orders")
        .select("id")
        .eq("status", "completed");

      if (ordersError) {
        console.error(
          "Error fetching completed orders for featured products:",
          ordersError
        );
      }

      if (completedOrders && completedOrders.length > 0) {
        const orderIds = completedOrders.map((o: any) => o.id);

        // Fetch order items for completed orders
        const { data: orderItems, error: itemsError } = await adminClient
          .from("order_items")
          .select("product_id, quantity")
          .in("order_id", orderIds);

        if (itemsError) {
          console.error(
            "Error fetching order items for featured products:",
            itemsError
          );
        } else if (orderItems && orderItems.length > 0) {
          // Aggregate product sales (sum of quantities)
          const productSalesMap = new Map<string, number>();

          orderItems.forEach((item: any) => {
            if (item.product_id && item.quantity) {
              const currentSales = productSalesMap.get(item.product_id) || 0;
              productSalesMap.set(
                item.product_id,
                currentSales + (parseInt(item.quantity) || 0)
              );
            }
          });

          // Store sales count map for later use in filtering
          productSalesCountMap = productSalesMap;

          // Get top product IDs by sale count (get more than 4 to account for filtering)
          // We'll filter by stock and images later, so get top 20 to ensure we have 4 good ones
          const topProductsBySales = Array.from(productSalesMap.entries())
            .sort((a, b) => b[1] - a[1]) // Sort by sales count descending
            .slice(0, 20) // Get top 20 to filter down to 4 with stock and images
            .map(([productId, salesCount]) => ({ productId, salesCount }));

          if (topProductsBySales.length > 0) {
            // Fetch product details for top products
            const productIdsToFetch = topProductsBySales.map(
              (p) => p.productId
            );
            const { data: products, error: productsFetchError } = await supabase
              .from("products")
              .select("*")
              .in("id", productIdsToFetch);

            if (productsFetchError) {
              console.error(
                "Error fetching featured products:",
                productsFetchError
              );
              productsError = productsFetchError;
            } else if (products) {
              // Create a map of product ID to sales count for sorting
              const salesCountMap = new Map(
                topProductsBySales.map((p) => [p.productId, p.salesCount])
              );

              // Sort products by sales count (most sold first)
              const productMap = new Map(products.map((p: any) => [p.id, p]));
              featuredProducts = topProductsBySales
                .map(({ productId }) => productMap.get(productId))
                .filter(Boolean)
                .sort((a: any, b: any) => {
                  const salesA = salesCountMap.get(a.id) || 0;
                  const salesB = salesCountMap.get(b.id) || 0;
                  return salesB - salesA; // Sort by sales count descending
                }) as any[];

              console.log(
                `✅ Found ${featuredProducts.length} featured products (top sellers, will filter to 4)`
              );
            }
          } else {
            console.log("No products found in sales data");
          }
        }
      }
    } else {
      // Admin client not available, skip to fallback
      console.log(
        "Skipping sales-based featured products (admin client not available)"
      );
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
    console.error("Error fetching featured products:", error);
    // Fallback to newest products
    const { data: fallbackProducts, error: fallbackError } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(4);
    featuredProducts = fallbackProducts || [];
    productsError = fallbackError;
  }

  // Initially use featuredProducts, will be overridden later to use newArrivals
  // This ensures we don't reference newArrivals before it's initialized
  let products = featuredProducts;

  // Fetch inventory separately with error handling
  // Fetch stock from inventory table only (not aggregated with product_sizes)
  let inventoryMap = new Map();
  if (products && products.length > 0) {
    const productIds = products.map((p) => p.id);

    // Fetch from inventory table (general stock)
    const { data: inventory, error: inventoryError } = await supabase
      .from("inventory")
      .select("product_id, stock_quantity, reserved_quantity")
      .in("product_id", productIds);

    if (inventoryError) {
      console.error("Error fetching inventory:", inventoryError);
    }

    // Calculate available stock from inventory table only
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
  // First try with date filter (active flash sales)
  let { data: flashSaleProducts, error: flashSaleError } = await supabase
    .from("products")
    .select("*")
    .eq("is_flash_sale", true)
    .gte("flash_sale_end", new Date().toISOString())
    .order("flash_sale_end", { ascending: true })
    .limit(4);

  // If no active flash sale products, try without date filter (show all flash sale items)
  if (
    (!flashSaleProducts || flashSaleProducts.length === 0) &&
    !flashSaleError
  ) {
    console.log(
      "🔄 Trying to fetch flash sale products without date filter..."
    );
    const { data: allFlashSale, error: allFlashError } = await supabase
      .from("products")
      .select("*")
      .eq("is_flash_sale", true)
      .order("flash_sale_end", { ascending: true })
      .limit(4);
    if (allFlashSale && allFlashSale.length > 0) {
      flashSaleProducts = allFlashSale;
      console.log(
        `✅ Found ${allFlashSale.length} flash sale products (including expired)`
      );
    }
    flashSaleError = allFlashError;
  }

  // Log what we found
  if (flashSaleError) {
    console.error("❌ Error fetching flash sale products:", flashSaleError);
  } else {
    console.log(
      `✅ Fetched ${flashSaleProducts?.length || 0} flash sale products`
    );
  }

  // Fetch inventory for flash sale products with error handling
  // Fetch stock from inventory table only (same as products page)
  let flashSaleInventoryMap = new Map();
  if (flashSaleProducts && flashSaleProducts.length > 0) {
    const flashSaleIds = flashSaleProducts.map((p) => p.id);

    // Fetch from inventory table only
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

    // Calculate available stock from inventory table only (same as products page)
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
  // Fetch ALL products from database, no status filter
  // Fetch a large number to ensure we get all products that should be displayed
  let { data: newArrivals, error: newArrivalsError } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200); // Increased to 200 to ensure we get all products that should be displayed

  // Override products to use newArrivals if available (for featured products)
  if (newArrivals && newArrivals.length > 0) {
    products = newArrivals.slice(0, 4);
  }

  // Log what we found
  if (newArrivalsError) {
    console.error("❌ Error fetching new arrivals:", newArrivalsError);
    // If error, try to fetch any products as fallback
    const { data: fallbackProducts } = await supabase
      .from("products")
      .select("*")
      .limit(8);
    if (fallbackProducts) {
      newArrivals = fallbackProducts;
      console.log(`✅ Fetched ${fallbackProducts.length} products as fallback`);
    }
  } else {
    console.log(
      `✅ Fetched ${
        newArrivals?.length || 0
      } new arrival products from database`
    );
    if (newArrivals && newArrivals.length > 0) {
      console.log(
        "📦 Product names:",
        newArrivals.map((p: any) => p.name).join(", ")
      );
    } else {
      console.warn(
        "⚠️ No products found in database! Check if products table has data."
      );
    }
  }

  // Fetch stock from inventory table only (same as products page)
  let newArrivalsInventoryMap = new Map();
  if (newArrivals && newArrivals.length > 0) {
    const newArrivalIds = newArrivals.map((p) => p.id);

    // Fetch from inventory table only
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

    // Calculate available stock from inventory table only (same as products page)
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

  // Log detailed info about products AFTER inventory is fetched
  if (newArrivals && newArrivals.length > 0) {
    console.log("📊 Detailed Product Analysis (after inventory fetch):");
    newArrivals.forEach((p: any) => {
      const stock = newArrivalsInventoryMap.get(p.id);
      const imagesType = Array.isArray(p.images) ? "array" : typeof p.images;
      const imagesValue = Array.isArray(p.images)
        ? `[${p.images.length} items: ${p.images
            .slice(0, 2)
            .map((img: any) => img?.substring(0, 30) || "")
            .join(", ")}${p.images.length > 2 ? "..." : ""}]`
        : p.images || "null/undefined";
      const hasValidImage = Array.isArray(p.images)
        ? p.images.some(
            (img: any) => img && typeof img === "string" && img.trim() !== ""
          )
        : p.images && typeof p.images === "string" && p.images.trim() !== "";
      const hasStock = stock === undefined || stock >= 1;
      const willShow = hasStock && hasValidImage;

      console.log(`  - ${p.name}:`);
      console.log(`    Stock: ${stock ?? "undefined"} (hasStock: ${hasStock})`);
      console.log(`    Images: ${imagesType} = ${imagesValue}`);
      console.log(`    Has valid image: ${hasValidImage}`);
      console.log(`    ✅ Will show: ${willShow}`);
    });
  }

  // Log errors and debug info
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
  // Filter out products with 0 stock and products without images
  // Featured products: Top 4 by sales count (sorted by sales count)
  // First, get all product IDs that might be in featured products
  const potentialFeaturedProductIds = (products || []).map((p: any) => p.id);

  // Fetch stock from inventory table only (not aggregated with product_sizes)
  let featuredInventoryMap = new Map();
  if (potentialFeaturedProductIds.length > 0) {
    // Fetch from inventory table (general stock)
    const { data: featuredInventory, error: featuredInventoryError } =
      await supabase
        .from("inventory")
        .select("product_id, stock_quantity, reserved_quantity")
        .in("product_id", potentialFeaturedProductIds);

    if (featuredInventoryError) {
      console.error(
        "Error fetching featured inventory:",
        featuredInventoryError
      );
    }

    // Calculate available stock from inventory table only
    if (featuredInventory) {
      featuredInventory.forEach((inv: any) => {
        const available = Math.max(
          0,
          (inv.stock_quantity || 0) - (inv.reserved_quantity || 0)
        );
        featuredInventoryMap.set(inv.product_id, available);
      });
    }
  }

  const productsForFeatured = (products || [])
    .map((product: any) => {
      const stock = featuredInventoryMap.get(product.id);
      const finalStock = stock !== undefined ? stock : undefined;

      // Debug logging for stock calculation
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[Featured] Product: ${
            product.name
          }, Stock: ${finalStock}, Map has: ${featuredInventoryMap.has(
            product.id
          )}`
        );
      }

      return {
        ...product,
        available_stock: finalStock,
        salesCount: productSalesCountMap.get(product.id) || 0, // Add sales count for sorting
      };
    })
    .filter((product: any) => {
      const hasStock =
        product.available_stock === undefined || product.available_stock >= 1;

      let hasImage = false;
      if (
        product.image &&
        typeof product.image === "string" &&
        product.image.trim() !== ""
      ) {
        hasImage = true;
      } else if (
        product.image_url &&
        typeof product.image_url === "string" &&
        product.image_url.trim() !== ""
      ) {
        hasImage = true;
      } else if (product.images) {
        if (Array.isArray(product.images)) {
          hasImage = product.images.some((img: any) => {
            if (!img) return false;
            if (typeof img === "string") {
              return img.trim() !== "";
            }
            return false;
          });
        } else if (typeof product.images === "string") {
          hasImage = product.images.trim() !== "";
        }
      }

      return hasStock && hasImage;
    })
    .sort((a: any, b: any) => b.salesCount - a.salesCount) // Sort by sales count descending (largest to smallest)
    .slice(0, 4); // Take top 4 by sales count (largest to smallest)

  // Keep the old variable name for compatibility
  // Will be overridden later to use newArrivalsWithStock
  let productsWithStock = productsForFeatured;

  const flashSaleWithStock = (flashSaleProducts || [])
    .map((product: any) => {
      const discountPercent = product.sale_price
        ? Math.round(
            ((product.price - product.sale_price) / product.price) * 100
          )
        : 0;
      const stock = flashSaleInventoryMap.get(product.id);
      return {
        ...product,
        // Set available_stock: undefined means no inventory record, 0 means out of stock, >=1 means in stock
        available_stock: stock !== undefined ? stock : undefined,
        discount_percent: discountPercent,
        flash_sale_end_date: product.flash_sale_end
          ? product.flash_sale_end // Keep as string/ISO string for serialization
          : null,
      };
    })
    .filter((product: any) => {
      // Show products with stock >= 1 (including stock = 1) OR undefined stock (no inventory record yet)
      // Only filter out products with explicitly 0 stock
      // Stock = 1 should be displayed
      const hasStock =
        product.available_stock === undefined || product.available_stock >= 1;

      // Filter out products without images
      // Handle PostgreSQL arrays and empty arrays
      let hasImage = false;

      if (
        product.image &&
        typeof product.image === "string" &&
        product.image.trim() !== ""
      ) {
        hasImage = true;
      } else if (
        product.image_url &&
        typeof product.image_url === "string" &&
        product.image_url.trim() !== ""
      ) {
        hasImage = true;
      } else if (product.images) {
        if (Array.isArray(product.images)) {
          // Check if array has at least one non-empty string
          hasImage = product.images.some((img: any) => {
            if (!img) return false;
            if (typeof img === "string") {
              return img.trim() !== "";
            }
            return false;
          });
        } else if (typeof product.images === "string") {
          // Handle string format (might be JSON or comma-separated)
          hasImage = product.images.trim() !== "";
        }
      }

      // Only show products that have stock (>=1, including stock = 1) AND have images
      return hasStock && hasImage;
    });

  // Show products from database in "Just In" section
  // Filter out: products with 0 stock AND products without images
  const newArrivalsWithStock = (newArrivals || [])
    .map((product: any) => {
      const stock = newArrivalsInventoryMap.get(product.id);
      const finalStock = stock !== undefined ? stock : undefined;

      // Debug logging for stock calculation
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[Just In] Product: ${
            product.name
          }, Stock: ${finalStock}, Map has: ${newArrivalsInventoryMap.has(
            product.id
          )}`
        );
      }

      return {
        ...product,
        // Set available_stock: undefined means no inventory record, 0 means out of stock, >=1 means in stock
        available_stock: finalStock,
      };
    })
    .filter((product: any) => {
      // Show products with stock >= 1 (including stock = 1) OR undefined stock (no inventory record yet)
      // Only filter out products with explicitly 0 stock
      // Stock = 1 should be displayed
      const hasStock =
        product.available_stock === undefined || product.available_stock >= 1;

      // Filter out products without images
      // Check multiple possible image fields: image, image_url, images (array)
      // Handle PostgreSQL arrays and empty arrays
      let hasImage = false;

      if (
        product.image &&
        typeof product.image === "string" &&
        product.image.trim() !== ""
      ) {
        hasImage = true;
      } else if (
        product.image_url &&
        typeof product.image_url === "string" &&
        product.image_url.trim() !== ""
      ) {
        hasImage = true;
      } else if (product.images) {
        if (Array.isArray(product.images)) {
          // Check if array has at least one non-empty string
          // Also handle null/undefined values in array
          hasImage = product.images.some((img: any) => {
            if (!img) return false;
            if (typeof img === "string") {
              return img.trim() !== "";
            }
            return false;
          });
        } else if (typeof product.images === "string") {
          // Handle string format (might be JSON or comma-separated)
          hasImage = product.images.trim() !== "";
        }
      }

      // Only log products that have one requirement but not the other (to reduce noise)
      if (hasStock && !hasImage) {
        console.log(
          `🚫 "${product.name}" - Has stock (${product.available_stock}) but NO IMAGE. Images:`,
          JSON.stringify(product.images)
        );
      }
      if (!hasStock && hasImage) {
        console.log(
          `🚫 "${product.name}" - Has image but NO STOCK (${product.available_stock})`
        );
      }

      // Only show products that have stock (>=1) AND have images
      return hasStock && hasImage;
    });

  // Featured products should show top 4 by sales count
  // Only override with "Just In" products if we don't have sales-based featured products
  if (
    productsWithStock.length === 0 &&
    newArrivalsWithStock &&
    newArrivalsWithStock.length > 0
  ) {
    // Fallback: Use "Just In" products if no sales-based products available
    productsWithStock = newArrivalsWithStock.slice(0, 4);
    console.log(
      `✅ Featured products: Using ${productsWithStock.length} products from "Just In" section (fallback)`
    );
  } else if (productsWithStock.length > 0) {
    console.log(
      `✅ Featured products: Showing ${productsWithStock.length} top-selling products`
    );
  }

  // Debug logging - detailed information (after variables are defined)
  console.log("📦 Home Page Product Fetch Summary:", {
    featuredProducts: {
      total: products?.length || 0,
      withStock: productsWithStock.length,
      filtered: (products?.length || 0) - productsWithStock.length,
    },
    flashSaleProducts: {
      total: flashSaleProducts?.length || 0,
      withStock: flashSaleWithStock.length,
      filtered: (flashSaleProducts?.length || 0) - flashSaleWithStock.length,
    },
    newArrivals: {
      total: newArrivals?.length || 0,
      withStock: newArrivalsWithStock.length,
      filtered: (newArrivals?.length || 0) - newArrivalsWithStock.length,
    },
    inventoryMaps: {
      featured: inventoryMap.size,
      flashSale: flashSaleInventoryMap.size,
      newArrivals: newArrivalsInventoryMap.size,
    },
  });

  // Log sample products for debugging
  if (newArrivals && newArrivals.length > 0) {
    console.log(
      "📋 Sample New Arrivals (first 3):",
      newArrivals.slice(0, 3).map((p: any) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        stock: newArrivalsInventoryMap.get(p.id),
        hasInventory: newArrivalsInventoryMap.has(p.id),
        images: p.images,
        hasImage:
          (p.images && Array.isArray(p.images) && p.images.length > 0) ||
          (p.image && p.image.trim() !== ""),
      }))
    );
    console.log(
      `📊 After filtering: ${newArrivalsWithStock.length} products will be displayed (out of ${newArrivals.length} fetched)`
    );
    if (newArrivalsWithStock.length === 0 && newArrivals.length > 0) {
      console.warn(
        "⚠️ All products were filtered out! Check stock and image requirements."
      );
    }
  } else {
    console.warn("⚠️ No new arrivals fetched from database");
  }

  if (flashSaleProducts && flashSaleProducts.length > 0) {
    console.log(
      "📋 Sample Flash Sale Products (first 3):",
      flashSaleProducts.slice(0, 3).map((p: any) => ({
        id: p.id,
        name: p.name,
        is_flash_sale: p.is_flash_sale,
        stock: flashSaleInventoryMap.get(p.id),
        hasInventory: flashSaleInventoryMap.has(p.id),
      }))
    );
  } else {
    console.warn("⚠️ No flash sale products fetched from database");
  }

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

          {newArrivalsWithStock.length > 0 ? (
            <>
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
            {flashSaleWithStock.length > 0 &&
              flashSaleWithStock[0]?.flash_sale_end_date && (
                <FlashSaleCountdown
                  endDate={
                    typeof flashSaleWithStock[0].flash_sale_end_date ===
                    "string"
                      ? flashSaleWithStock[0].flash_sale_end_date
                      : flashSaleWithStock[0].flash_sale_end_date instanceof
                        Date
                      ? flashSaleWithStock[0].flash_sale_end_date.toISOString()
                      : new Date(
                          flashSaleWithStock[0].flash_sale_end_date
                        ).toISOString()
                  }
                />
              )}
          </div>

          {flashSaleWithStock.length > 0 ? (
            <>
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
            </>
          ) : (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-red-100 rounded-full mb-6">
                <svg
                  className="w-12 h-12 text-red-400"
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
              </div>
              <h3 className="text-2xl font-semibold text-gray-700 mb-2">
                No Flash Sale Items Available
              </h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                There are no flash sale items at the moment. Check back soon for
                exciting deals!
              </p>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-none font-semibold hover:shadow-xl transition-all"
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

      {/* Customer Reviews Section */}
      <ReviewSection />
    </div>
  );
}
