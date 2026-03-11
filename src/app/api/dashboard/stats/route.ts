import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    
    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role - only admins and managers can view dashboard stats
    const userRole = await getUserRole(user.id);
    if (!userRole || (userRole !== 'admin' && userRole !== 'manager')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Calculate date range for "this week" (last 7 days including today)
    // Use a simpler approach: fetch all completed orders and filter by date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Start of 7 days ago (including today = 6 days back) - set to start of day
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 6);
    weekAgo.setHours(0, 0, 0, 0);
    
    // Get day names for the week (last 7 days)
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const salesByDay = [];
    const dateMap = new Map<string, string>(); // date string -> day name
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayName = daysOfWeek[date.getDay()];
      // Format as YYYY-MM-DD (local date)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      salesByDay.push({ day: dayName, date: dateString });
      dateMap.set(dateString, dayName);
    }

    // Fetch completed orders for the last 7 days only — filtered at DB level for performance
    const { data: allCompletedOrders, error: weekOrdersError } = await adminClient
      .from('orders')
      .select('id, total_amount, created_at, status')
      .eq('status', 'completed')
      .gte('created_at', weekAgo.toISOString())
      .order('created_at', { ascending: true });

    // allCompletedOrders is already scoped to the last 7 days
    const weekOrders = allCompletedOrders || [];
    
    if (weekOrdersError) {
      console.error('Error fetching week orders:', weekOrdersError);
    }

    // Calculate sales by day - initialize map first
    const salesByDayMap = new Map<string, number>();
    salesByDay.forEach(({ date }) => {
      salesByDayMap.set(date, 0);
    });
    
    weekOrders.forEach((order: any) => {
      // Extract date from order.created_at - use local date
      const orderDateObj = new Date(order.created_at);
      const year = orderDateObj.getFullYear();
      const month = String(orderDateObj.getMonth() + 1).padStart(2, '0');
      const day = String(orderDateObj.getDate()).padStart(2, '0');
      const orderDate = `${year}-${month}-${day}`;
      
      // Add to sales if this date is in our map
      if (salesByDayMap.has(orderDate)) {
        const currentSales = salesByDayMap.get(orderDate) || 0;
        salesByDayMap.set(orderDate, currentSales + parseFloat(order.total_amount || 0));
      } else {
        // Date not in map — order outside expected range (shouldn't happen with DB filter)
      }
    });

    // Format sales by day with day names
    const formattedSalesByDay = salesByDay.map(({ day, date }) => ({
      day,
      sales: salesByDayMap.get(date) || 0,
    }));

    // Fetch order items for completed orders to calculate product sales
    const orderIds = (allCompletedOrders || []).map((o: any) => o.id);
    let topProducts: any[] = [];

    if (orderIds.length > 0) {
      const { data: orderItems, error: itemsError } = await adminClient
        .from('order_items')
        .select('product_id, quantity')
        .in('order_id', orderIds);

      if (itemsError) {
        console.error('Error fetching order items:', itemsError);
      } else {
        if (orderItems && orderItems.length > 0) {
          // Aggregate product sales
          const productSalesMap = new Map<string, { quantity: number; product_id: string }>();
          
          orderItems.forEach((item: any) => {
            if (!item.product_id || !item.quantity) return;
            const existing = productSalesMap.get(item.product_id) || { quantity: 0, product_id: item.product_id };
            existing.quantity += parseInt(item.quantity) || 0;
            productSalesMap.set(item.product_id, existing);
          });

          // Get product details for top products
          const productIds = Array.from(productSalesMap.keys());
          if (productIds.length > 0) {
            const { data: products, error: productsError } = await adminClient
              .from('products')
              .select('id, name')
              .in('id', productIds);

            if (productsError) {
              console.error('Error fetching products:', productsError);
            } else {
              if (products && products.length > 0) {
                // Combine product data with sales count
                topProducts = Array.from(productSalesMap.entries())
                  .map(([productId, salesData]) => {
                    const product = products.find((p: any) => p.id === productId);
                    return {
                      id: productId,
                      name: product?.name || 'Unknown Product',
                      sales: salesData.quantity, // Sales count (quantity sold)
                    };
                  })
                  .sort((a, b) => b.sales - a.sales) // Sort by sales count (highest to lowest)
                  .slice(0, 5); // Top 5 products
                
              }
            }
          }
        }
      }
    }

    // Fetch all orders for total count and total sales calculation
    // Limit is a safety cap — use aggregate queries if order volume exceeds this
    const { data: allOrders, error: allOrdersError } = await adminClient
      .from('orders')
      .select('id, total_amount, status, created_at')
      .limit(10000);

    if (allOrdersError) {
      console.error('Error fetching all orders:', allOrdersError);
    }

    const totalOrdersCount = allOrders?.length || 0;
    const totalSalesAmount = (allOrders || []).reduce((sum: number, order: any) => {
      const amount = parseFloat(order.total_amount || 0);
      return isNaN(amount) ? sum : sum + amount;
    }, 0);

    // Fetch order counts by status
    const { count: completedCount, error: completedError } = await adminClient
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    const { count: pendingCount, error: pendingError } = await adminClient
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (completedError) {
      console.error('Error fetching completed orders count:', completedError);
    }
    if (pendingError) {
      console.error('Error fetching pending orders count:', pendingError);
    }

    // Fetch total customers count
    const { count: customersCount, error: customersError } = await adminClient
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (customersError) {
      console.error('Error fetching customers count:', customersError);
    }

    // Fetch all products - use the EXACT same approach as /api/products GET endpoint
    // This ensures we get the same count as the products page
    let allProducts: any[] = [];
    let allProductsError: any = null;
    
    try {
      // Use regular client (same as products API) - authenticated user should have access
      const { data: allProductsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, image, image_url, images, status')
        .order('created_at', { ascending: false });
      
      if (!productsError && allProductsData) {
        allProducts = allProductsData;
        console.log('✅ Products fetched successfully, count:', allProducts.length);
      } else {
        allProductsError = productsError;
        console.error('❌ Error fetching products:', {
          message: productsError?.message,
          details: productsError?.details,
          hint: productsError?.hint,
        });
        allProducts = [];
        
        // Try admin client as fallback if regular client fails
        try {
          const { data: adminProductsData, error: adminError } = await adminClient
            .from('products')
            .select('id, name, image, image_url, images, status')
            .order('created_at', { ascending: false });
          
          if (!adminError && adminProductsData) {
            allProducts = adminProductsData;
            allProductsError = null;
            console.log('✅ Admin client fallback succeeded, count:', allProducts.length);
          }
        } catch (adminErr) {
          console.error('❌ Admin client fallback also failed:', adminErr);
        }
      }
    } catch (err) {
      console.error('❌ Exception fetching products:', err);
      allProductsError = err;
      allProducts = [];
    }
    
    const totalProductsCount = allProducts.length;

    let productStockMap = new Map<string, { stock: number; reserved: number; available: number }>();
    let finalProductsCount = 0;
    let lowStockProducts: any[] = [];
    let outOfStockProducts: any[] = [];

    if (allProducts && allProducts.length > 0) {
      const productIds = allProducts.map((p: any) => p.id);
      
      // Fetch inventory for all products (general stock)
      const { data: inventory, error: inventoryError } = await adminClient
        .from('inventory')
        .select('product_id, stock_quantity, reserved_quantity')
        .in('product_id', productIds);

      // Fetch size-based inventory
      const { data: productSizes, error: sizesError } = await adminClient
        .from('product_sizes')
        .select('product_id, stock_quantity, reserved_quantity')
        .in('product_id', productIds);

      if (inventoryError) {
        console.error('Error fetching inventory:', inventoryError);
      }
      if (sizesError) {
        console.error('Error fetching product sizes:', sizesError);
      }

      // Aggregate stock from both sources
      if (inventory) {
        inventory.forEach((inv: any) => {
          const existing = productStockMap.get(inv.product_id) || { stock: 0, reserved: 0, available: 0 };
          productStockMap.set(inv.product_id, {
            stock: existing.stock + (inv.stock_quantity || 0),
            reserved: existing.reserved + (inv.reserved_quantity || 0),
            available: 0, // Will calculate after
          });
        });
      }

      if (productSizes) {
        productSizes.forEach((size: any) => {
          const existing = productStockMap.get(size.product_id) || { stock: 0, reserved: 0, available: 0 };
          productStockMap.set(size.product_id, {
            stock: existing.stock + (size.stock_quantity || 0),
            reserved: existing.reserved + (size.reserved_quantity || 0),
            available: 0, // Will calculate after
          });
        });
      }

      // Calculate available stock for each product and categorize
      productStockMap.forEach((stockData, productId) => {
        stockData.available = Math.max(0, stockData.stock - stockData.reserved);
      });

      // Count products that have images AND stock > 0 (in stock or low stock, not out of stock)
      // First, let's check what we have
      const productsWithImages = allProducts.filter((product: any) => {
        // Check if product has a valid image
        const hasImage = product.image || product.image_url || 
          (Array.isArray(product.images) && product.images.length > 0 && product.images[0]);
        return hasImage;
      });
      
      const productsWithStock = allProducts.filter((product: any) => {
        const stockData = productStockMap.get(product.id);
        const availableStock = stockData ? stockData.available : 0;
        return availableStock > 0;
      });
      
      finalProductsCount = allProducts.filter((product: any) => {
        // Check if product has a valid image
        const hasImage = product.image || product.image_url || 
          (Array.isArray(product.images) && product.images.length > 0 && product.images[0]);
        
        if (!hasImage) return false;

        // Check if product has stock > 0 (in stock or low stock, not out of stock)
        const stockData = productStockMap.get(product.id);
        const availableStock = stockData ? stockData.available : 0;
        
        return availableStock > 0;
      }).length;
      

      // Categorize products for low stock alerts
      allProducts.forEach((product: any) => {
        const stockData = productStockMap.get(product.id);
        const available = stockData ? stockData.available : 0;
        
        if (available === 0) {
          // Out of stock
          outOfStockProducts.push({
            id: product.id,
            name: product.name,
            stock_quantity: 0,
            status: 'out_of_stock',
          });
        } else if (available > 0 && available < 10) {
          // Low stock
          lowStockProducts.push({
            id: product.id,
            name: product.name,
            stock_quantity: available,
            status: 'low_stock',
          });
        }
      });

      // Sort by stock quantity (lowest first) for low stock
      lowStockProducts = lowStockProducts
        .sort((a, b) => a.stock_quantity - b.stock_quantity);
      
      // Sort by name for out of stock
      outOfStockProducts = outOfStockProducts
        .sort((a, b) => a.name.localeCompare(b.name));

      // Combine low stock and out of stock, limit to top 15 total
      const allStockAlerts = [...lowStockProducts, ...outOfStockProducts].slice(0, 15);
      
      // Return combined list for low stock alerts
      lowStockProducts = allStockAlerts;
    } else if (allProductsError) {
      console.error('Error fetching products:', allProductsError);
      // If there's an error, allProducts is already set to empty array above
    }
    
    // Calculate today's sales and orders
    // Use local timezone for "today" but convert to UTC for database query
    // Database stores timestamps in UTC, so we need to query the full UTC day
    const nowLocal = new Date();
    const localYear = nowLocal.getFullYear();
    const localMonth = nowLocal.getMonth();
    const localDate = nowLocal.getDate();
    
    // Create start of day in local timezone, then convert to UTC
    const todayStartLocal = new Date(localYear, localMonth, localDate, 0, 0, 0, 0);
    // Create end of day in local timezone, then convert to UTC
    const todayEndLocal = new Date(localYear, localMonth, localDate, 23, 59, 59, 999);
    
    // Convert to UTC ISO strings for database query
    // The database stores UTC, so we query the UTC equivalent of the local day
    const todayStartUTC = new Date(Date.UTC(localYear, localMonth, localDate, 0, 0, 0, 0));
    const todayEndUTC = new Date(Date.UTC(localYear, localMonth, localDate, 23, 59, 59, 999));
    
    // Fetch today's orders
    // Query using UTC dates to match database storage
    const { data: todayOrders, error: todayOrdersError } = await adminClient
      .from('orders')
      .select('id, total_amount, created_at, status, sale_type')
      .gte('created_at', todayStartUTC.toISOString())
      .lte('created_at', todayEndUTC.toISOString())
      .order('created_at', { ascending: false });

    if (todayOrdersError) {
      console.error('Error fetching today\'s orders:', todayOrdersError);
    }

    // Calculate today's sales (sum of all orders created today)
    const todaySales = (todayOrders || []).reduce((sum: number, order: any) => {
      const amount = parseFloat(order.total_amount || 0);
      return isNaN(amount) ? sum : sum + amount;
    }, 0);

    // Count today's orders
    const todayOrdersCount = todayOrders?.length || 0;

    // Calculate today's profits - include all orders except cancelled/refunded
    // For POS sales, orders might be pending initially but should still count as profit
    let todayProfits = 0;
    const eligibleTodayOrders = (todayOrders || []).filter((order: any) => 
      order.status !== 'cancelled' && order.status !== 'refunded'
    );
    
    if (eligibleTodayOrders.length > 0) {
      const eligibleOrderIds = eligibleTodayOrders.map((order: any) => order.id);
      
      // Fetch order items for today's eligible orders
      const { data: todayOrderItems, error: orderItemsError } = await adminClient
        .from('order_items')
        .select('product_id, quantity, price, order_id')
        .in('order_id', eligibleOrderIds);
      
      if (orderItemsError) {
        console.error('Error fetching today\'s order items:', orderItemsError);
      } else if (todayOrderItems && todayOrderItems.length > 0) {
        // Get unique product IDs (filter out nulls for custom products)
        const productIds = [...new Set(todayOrderItems
          .map((item: any) => item.product_id)
          .filter((id: any) => id !== null && id !== undefined)
        )];
        
        // Fetch buying prices for products
        let productsMap = new Map<string, number>();
        if (productIds.length > 0) {
          const { data: products, error: productsError } = await adminClient
            .from('products')
            .select('id, buying_price')
            .in('id', productIds);
          
          if (productsError) {
            console.error('Error fetching products for profit calculation:', productsError);
          } else if (products) {
            products.forEach((product: any) => {
              const buyingPrice = parseFloat(product.buying_price || 0);
              if (buyingPrice > 0) {
                productsMap.set(product.id, buyingPrice);
              }
            });
          }
        }
        
        // Track items that are skipped and why
        let skippedItems = {
          noProductId: 0,
          noBuyingPrice: 0,
          invalidPrice: 0,
          invalidQuantity: 0,
        };
        
        // Calculate profit for each order item
        todayOrderItems.forEach((item: any) => {
          // Skip custom products (no product_id)
          if (!item.product_id) {
            skippedItems.noProductId++;
            return; // Custom product, skip
          }
          
          const buyingPrice = productsMap.get(item.product_id);
          if (!buyingPrice || buyingPrice <= 0) {
            skippedItems.noBuyingPrice++;
            return; // No buying price, skip (0 profit)
          }
          
          const sellingPrice = parseFloat(item.price || 0);
          const quantity = parseInt(item.quantity || 0);
          
          if (sellingPrice <= 0) {
            skippedItems.invalidPrice++;
            return;
          }
          
          if (quantity <= 0) {
            skippedItems.invalidQuantity++;
            return;
          }
          
          const profitPerItem = sellingPrice - buyingPrice;
          const totalProfit = profitPerItem * quantity;
          todayProfits += totalProfit;
        });
        
      }
    }

    // Ensure we always return data, even if empty - with consistent structure
    const responseData = {
      salesByDay: formattedSalesByDay || [],
      topProducts: topProducts || [],
      lowStock: lowStockProducts || [],
      totalSales: totalSalesAmount || 0,
      totalOrders: totalOrdersCount || 0,
      totalProducts: allProducts.length || 0,
      todaySales: todaySales || 0,
      todayOrders: todayOrdersCount || 0,
      todayProfits: todayProfits || 0,
      completedOrders: completedCount || 0,
      pendingOrders: pendingCount || 0,
      totalCustomers: customersCount || 0,
    };
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('❌ [API] Dashboard stats error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard stats', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

