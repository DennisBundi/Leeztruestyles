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

    // Fetch ALL completed orders (we'll filter by date in JavaScript)
    // This ensures we don't miss any orders due to timezone issues
    const { data: allCompletedOrders, error: weekOrdersError } = await adminClient
      .from('orders')
      .select('id, total_amount, created_at, status')
      .eq('status', 'completed')
      .order('created_at', { ascending: true });
    
    // Filter orders to last 7 days (including today)
    const weekOrders = (allCompletedOrders || []).filter((order: any) => {
      const orderDate = new Date(order.created_at);
      // Compare dates by setting both to start of day
      const orderDateStart = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
      return orderDateStart >= weekAgo;
    });
    
    // Debug logging
    console.log('Dashboard stats query:', {
      weekAgo: weekAgo.toISOString(),
      today: today.toISOString(),
      allCompletedOrders: allCompletedOrders?.length || 0,
      weekOrders: weekOrders.length,
      error: weekOrdersError?.message,
    });

    if (weekOrdersError) {
      console.error('Error fetching week orders:', weekOrdersError);
    }

    // Calculate sales by day - initialize map first
    const salesByDayMap = new Map<string, number>();
    salesByDay.forEach(({ date }) => {
      salesByDayMap.set(date, 0);
    });
    
    // Debug: Log order dates and date matching
    console.log('Sales by day - date keys:', Array.from(salesByDayMap.keys()));
    if (weekOrders && weekOrders.length > 0) {
      console.log('Sales by day - orders found:', weekOrders.length);
      console.log('Sample order dates:', weekOrders.slice(0, 3).map((o: any) => {
        const orderDateObj = new Date(o.created_at);
        const year = orderDateObj.getFullYear();
        const month = String(orderDateObj.getMonth() + 1).padStart(2, '0');
        const day = String(orderDateObj.getDate()).padStart(2, '0');
        const orderDate = `${year}-${month}-${day}`;
        return {
          id: o.id,
          created_at: o.created_at,
          date_local: orderDate,
          amount: o.total_amount,
          matched: salesByDayMap.has(orderDate),
        };
      }));
    } else {
      console.log('Sales by day - no orders found in date range');
    }

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
        // Log if date doesn't match (shouldn't happen, but helps debug)
        console.warn('Order date not in week range:', {
          orderDate,
          orderId: order.id,
          created_at: order.created_at,
          availableDates: Array.from(salesByDayMap.keys()),
        });
      }
    });

    // Format sales by day with day names
    const formattedSalesByDay = salesByDay.map(({ day, date }) => ({
      day,
      sales: salesByDayMap.get(date) || 0,
    }));

    // Reuse allCompletedOrders from above for top products calculation
    // We already fetched all completed orders, so we can use them here
    console.log('Top products - completed orders found:', allCompletedOrders?.length || 0);

    // Fetch order items for completed orders to calculate product sales
    const orderIds = (allCompletedOrders || []).map((o: any) => o.id);
    let topProducts: any[] = [];

    if (orderIds.length > 0) {
      console.log('Top products - fetching order items for', orderIds.length, 'orders');
      
      const { data: orderItems, error: itemsError } = await adminClient
        .from('order_items')
        .select('product_id, quantity')
        .in('order_id', orderIds);

      if (itemsError) {
        console.error('Error fetching order items:', itemsError);
      } else {
        console.log('Top products - order items found:', orderItems?.length || 0);
        
        if (orderItems && orderItems.length > 0) {
          // Aggregate product sales
          const productSalesMap = new Map<string, { quantity: number; product_id: string }>();
          
          orderItems.forEach((item: any) => {
            if (!item.product_id || !item.quantity) {
              console.warn('Invalid order item:', item);
              return;
            }
            const existing = productSalesMap.get(item.product_id) || { quantity: 0, product_id: item.product_id };
            existing.quantity += parseInt(item.quantity) || 0;
            productSalesMap.set(item.product_id, existing);
          });

          console.log('Top products - unique products:', productSalesMap.size);

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
              console.log('Top products - products found:', products?.length || 0);
              
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
                
                console.log('Top products - final result:', topProducts.length, 'products');
              } else {
                console.warn('Top products - no products found for IDs:', productIds);
              }
            }
          } else {
            console.warn('Top products - no product IDs to fetch');
          }
        } else {
          console.warn('Top products - no order items found for completed orders');
        }
      }
    } else {
      console.warn('Top products - no completed orders found');
    }

    // Fetch all orders for total count and total sales calculation
    const { data: allOrders, error: allOrdersError } = await adminClient
      .from('orders')
      .select('id, total_amount, status');

    if (allOrdersError) {
      console.error('Error fetching all orders:', allOrdersError);
    }

    // Calculate totals from all orders
    const totalOrdersCount = allOrders?.length || 0;
    const totalSalesAmount = (allOrders || []).reduce((sum: number, order: any) => {
      return sum + parseFloat(order.total_amount || 0);
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
    
    // Log for debugging
    const totalProductsCount = allProducts.length;
    console.log('📦 Dashboard products fetch result:', {
      count: totalProductsCount,
      hasError: !!allProductsError,
      errorMessage: allProductsError?.message,
      sampleProductIds: allProducts.slice(0, 3).map((p: any) => p?.id),
    });

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
      
      // Debug logging - always log to help diagnose
      console.log('📊 Dashboard total products calculation:', {
        totalProducts: allProducts.length,
        productsWithInventory: productStockMap.size,
        productsWithImages: productsWithImages.length,
        productsWithStock: productsWithStock.length,
        finalCount: finalProductsCount,
        sampleProducts: allProducts.slice(0, 5).map((p: any) => {
          const stockData = productStockMap.get(p.id);
          const hasImage = !!(p.image || p.image_url || (Array.isArray(p.images) && p.images.length > 0 && p.images[0]));
          return {
            name: p.name,
            hasImage,
            stock: stockData?.available ?? 0,
            totalStock: stockData?.stock ?? 0,
            reserved: stockData?.reserved ?? 0,
          };
        }),
      });
      
      // If finalProductsCount is 0 but we have products, log more details
      if (finalProductsCount === 0 && allProducts.length > 0) {
        console.warn('⚠️ Total products count is 0 but we have products. Checking why...');
        const noImageCount = allProducts.filter((p: any) => {
          return !(p.image || p.image_url || (Array.isArray(p.images) && p.images.length > 0 && p.images[0]));
        }).length;
        const noStockCount = allProducts.filter((p: any) => {
          const stockData = productStockMap.get(p.id);
          return !stockData || stockData.available <= 0;
        }).length;
        console.warn('Products breakdown:', {
          total: allProducts.length,
          noImage: noImageCount,
          noStock: noStockCount,
          hasBoth: allProducts.filter((p: any) => {
            const hasImage = !!(p.image || p.image_url || (Array.isArray(p.images) && p.images.length > 0 && p.images[0]));
            const stockData = productStockMap.get(p.id);
            const hasStock = stockData && stockData.available > 0;
            return hasImage && hasStock;
          }).length,
        });
      }

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
      
      console.log('📦 Stock products found:', {
        totalProducts: allProducts.length,
        productsWithInventory: productStockMap.size,
        lowStock: lowStockProducts.length,
        outOfStock: outOfStockProducts.length,
        totalAlerts: allStockAlerts.length,
        totalProductsWithStock: finalProductsCount,
        sampleLowStock: lowStockProducts.slice(0, 3).map((item: any) => ({
          name: item.name,
          stock: item.stock_quantity,
          status: item.status,
        })),
        sampleOutOfStock: outOfStockProducts.slice(0, 3).map((item: any) => ({
          name: item.name,
          stock: item.stock_quantity,
          status: item.status,
        })),
      });

      // Return combined list for low stock alerts
      lowStockProducts = allStockAlerts;
    } else if (allProductsError) {
      console.error('Error fetching products:', allProductsError);
      // If there's an error, allProducts is already set to empty array above
    }
    
    // Log products count for debugging
    console.log('📦 Total products count for dashboard:', {
      allProductsLength: allProducts.length,
      allProductsError: allProductsError?.message,
      sampleProductIds: allProducts.slice(0, 3).map((p: any) => p.id),
    });

    // Calculate today's sales and orders
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // Fetch today's orders
    const { data: todayOrders, error: todayOrdersError } = await adminClient
      .from('orders')
      .select('id, total_amount, created_at, status')
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString());

    if (todayOrdersError) {
      console.error('Error fetching today\'s orders:', todayOrdersError);
    }

    // Calculate today's sales (sum of all orders created today)
    const todaySales = (todayOrders || []).reduce((sum: number, order: any) => {
      return sum + parseFloat(order.total_amount || 0);
    }, 0);

    // Count today's orders
    const todayOrdersCount = todayOrders?.length || 0;

    // Debug: Log final results
    const weekTotalSales = formattedSalesByDay.reduce((sum, day) => sum + day.sales, 0);
    console.log('Dashboard stats response:', {
      salesByDayCount: formattedSalesByDay.length,
      weekTotalSales,
      totalSales: totalSalesAmount,
      totalOrders: totalOrdersCount,
      totalProducts: allProducts.length,
      todaySales,
      todayOrders: todayOrdersCount,
      completedOrders: completedCount || 0,
      pendingOrders: pendingCount || 0,
      totalCustomers: customersCount || 0,
      topProductsCount: topProducts.length,
    });

    // Ensure we always return data, even if empty
    return NextResponse.json({
      salesByDay: formattedSalesByDay || [],
      topProducts: topProducts || [],
      lowStock: lowStockProducts || [],
      totalSales: totalSalesAmount,
      totalOrders: totalOrdersCount,
      totalProducts: allProducts.length,
      todaySales,
      todayOrders: todayOrdersCount,
      completedOrders: completedCount || 0,
      pendingOrders: pendingCount || 0,
      totalCustomers: customersCount || 0,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

