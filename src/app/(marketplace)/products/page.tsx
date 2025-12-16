import ProductGrid from "@/components/products/ProductGrid";
import SearchBar from "@/components/search/SearchBar";
import CategoryFilter from "@/components/filters/CategoryFilter";
import PriceFilter from "@/components/filters/PriceFilter";
import ColorFilter from "@/components/filters/ColorFilter";
import ClearFiltersButton from "@/components/filters/ClearFiltersButton";
import { createClient } from "@/lib/supabase/server";

interface SearchParams {
  q?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  color?: string;
  page?: string;
  flash_sale?: string;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();

  // Build query - try with status filter first
  let query = supabase.from("products").select("*");

  // Only filter by status if we have products, otherwise try without
  // (in case status field wasn't set on existing products)
  if (searchParams.flash_sale !== "true") {
    query = query.eq("status", "active");
  }

  // Apply filters
  if (searchParams.q) {
    const searchTerm = `%${searchParams.q}%`;
    // Use or() with PostgREST syntax - format: column.operator.value
    query = query.or(
      `name.ilike.${searchTerm},description.ilike.${searchTerm}`
    );
  }

  if (searchParams.category && searchParams.category.trim() !== "") {
    // Get category ID from slug
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", searchParams.category)
      .single();

    if (category) {
      query = query.eq("category_id", category.id);
    }
  }

  if (searchParams.minPrice) {
    query = query.gte("price", parseFloat(searchParams.minPrice));
  }

  if (searchParams.maxPrice) {
    query = query.lte("price", parseFloat(searchParams.maxPrice));
  }

  if (searchParams.flash_sale === "true") {
    query = query
      .eq("is_flash_sale", true)
      .gte("flash_sale_end", new Date().toISOString());
  }

  // Execute query
  const { data: products, error } = await query.order("created_at", {
    ascending: false,
  });

  // Fetch product colors for filtering
  let productColorsMap = new Map<string, string[]>();
  let allAvailableColors = new Set<string>();
  
  if (products && products.length > 0) {
    const productIds = products.map((p: any) => p.id);
    const { data: productColors, error: colorsError } = await supabase
      .from("product_colors")
      .select("product_id, color")
      .in("product_id", productIds);

    if (colorsError) {
      console.error("Error fetching product colors:", colorsError);
    } else if (productColors) {
      productColors.forEach((pc: any) => {
        const existing = productColorsMap.get(pc.product_id) || [];
        productColorsMap.set(pc.product_id, [...existing, pc.color]);
        allAvailableColors.add(pc.color);
      });
    }
  }

  // Filter by color if specified
  let filteredProducts = products || [];
  if (searchParams.color && searchParams.color.trim() !== "") {
    filteredProducts = filteredProducts.filter((product: any) => {
      const productColors = productColorsMap.get(product.id) || [];
      return productColors.includes(searchParams.color!);
    });
  }

  // Fetch inventory for products with error handling
  // Use only the inventory table (not product_sizes) for stock display
  let inventoryMap = new Map();
  if (products && products.length > 0) {
    const productIds = products.map((p: any) => p.id);
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

  // Fetch categories for filter
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name");

  // Fetch category names for products
  let categoryMap = new Map();
  if (categories) {
    categories.forEach((cat: any) => {
      categoryMap.set(cat.id, cat);
    });
  }

  // Log errors for debugging
  if (error) {
    console.error("Error fetching products:", error);
  }

  // Transform products to include stock, category, and colors
  // Filter out products with 0 stock - only show products with stock > 0
  const productsWithStock = (filteredProducts || [])
    .map((product: any) => {
      const category = product.category_id
        ? categoryMap.get(product.category_id)
        : null;
      const stock = inventoryMap.get(product.id);
      const colors = productColorsMap.get(product.id) || [];
      return {
        ...product,
        // Only set available_stock if we have inventory data
        available_stock: stock !== undefined ? stock : undefined,
        categories: category
          ? { name: category.name }
          : { name: "Uncategorized" },
        colors: colors, // Include colors for product display
      };
    })
    .filter((product: any) => {
      // Filter out products with 0 stock
      // Keep products with undefined stock (inventory not set up yet) or stock > 0
      return product.available_stock === undefined || product.available_stock > 0;
    });

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      {/* Page Header */}
      <div className="mb-12 text-center animate-fade-in">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
          Our Products
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Discover our curated collection of fashion-forward pieces
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4 animate-slide-up">
        <SearchBar />
        <div className="flex flex-wrap gap-4 justify-center items-center">
          <CategoryFilter categories={categories || []} />
          <PriceFilter />
          <ColorFilter availableColors={Array.from(allAvailableColors).sort()} />
          <ClearFiltersButton />
        </div>
      </div>

      {/* Results Count */}
      {productsWithStock.length > 0 && (
        <div className="mb-6 text-sm text-gray-600 font-medium">
          Showing {productsWithStock.length} product
          {productsWithStock.length !== 1 ? "s" : ""}
        </div>
      )}

      {/* Products Grid */}
      <ProductGrid products={productsWithStock} />

      {productsWithStock.length === 0 && (
        <div className="text-center py-16 animate-fade-in">
          <svg
            className="w-24 h-24 mx-auto text-gray-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <p className="text-gray-500 text-lg mb-2">No products found</p>
          <p className="text-gray-400 text-sm">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );
}
