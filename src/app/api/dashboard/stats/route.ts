import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = await getUserRole(user.id);
    if (!userRole || (userRole !== 'admin' && userRole !== 'manager')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // === Date setup ===
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 6);
    weekAgo.setHours(0, 0, 0, 0);

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const salesByDayTemplate: { day: string; date: string }[] = [];
    const dateMap = new Map<string, string>();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayName = daysOfWeek[date.getDay()];
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      salesByDayTemplate.push({ day: dayName, date: dateString });
      dateMap.set(dateString, dayName);
    }

    const todayStartUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0));
    const todayEndUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999));

    // === Phase 1: All independent queries in parallel ===
    const [
      { data: weekOrdersData, error: weekOrdersError },
      { data: allOrdersData, error: allOrdersError },
      { count: completedCount },
      { count: pendingCount },
      { count: customersCount },
      { data: allProductsData },
      { data: todayOrdersData, error: todayOrdersError },
    ] = await Promise.all([
      adminClient
        .from('orders')
        .select('id, total_amount, created_at, status')
        .eq('status', 'completed')
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: true }),
      adminClient
        .from('orders')
        .select('id, total_amount, status, created_at')
        .limit(10000),
      adminClient
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed'),
      adminClient
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
      adminClient
        .from('users')
        .select('*', { count: 'exact', head: true }),
      adminClient
        .from('products')
        .select('id, name, image, image_url, images, status')
        .order('created_at', { ascending: false }),
      adminClient
        .from('orders')
        .select('id, total_amount, created_at, status, sale_type')
        .gte('created_at', todayStartUTC.toISOString())
        .lte('created_at', todayEndUTC.toISOString())
        .order('created_at', { ascending: false }),
    ]);

    if (weekOrdersError) console.error('Error fetching week orders:', weekOrdersError);
    if (allOrdersError) console.error('Error fetching all orders:', allOrdersError);
    if (todayOrdersError) console.error('Error fetching today orders:', todayOrdersError);

    const weekOrders = weekOrdersData || [];
    const allProducts = allProductsData || [];
    const weekOrderIds = weekOrders.map((o: any) => o.id);
    const allProductIds = allProducts.map((p: any) => p.id);
    const eligibleTodayOrders = (todayOrdersData || []).filter(
      (o: any) => o.status !== 'cancelled' && o.status !== 'refunded',
    );
    const eligibleTodayOrderIds = eligibleTodayOrders.map((o: any) => o.id);

    // === Phase 2: Queries depending on phase 1 results, all in parallel ===
    const [
      { data: orderItemsData, error: orderItemsError },
      { data: inventoryData, error: inventoryError },
      { data: productSizesData, error: sizesError },
      { data: todayOrderItemsData, error: todayOrderItemsError },
    ] = await Promise.all([
      weekOrderIds.length > 0
        ? adminClient.from('order_items').select('product_id, quantity').in('order_id', weekOrderIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      allProductIds.length > 0
        ? adminClient.from('inventory').select('product_id, stock_quantity, reserved_quantity').in('product_id', allProductIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      allProductIds.length > 0
        ? adminClient.from('product_sizes').select('product_id, stock_quantity, reserved_quantity').in('product_id', allProductIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      eligibleTodayOrderIds.length > 0
        ? adminClient.from('order_items').select('product_id, quantity, price, order_id').in('order_id', eligibleTodayOrderIds)
        : Promise.resolve({ data: [] as any[], error: null }),
    ]);

    if (orderItemsError) console.error('Error fetching order items:', orderItemsError);
    if (inventoryError) console.error('Error fetching inventory:', inventoryError);
    if (sizesError) console.error('Error fetching product sizes:', sizesError);
    if (todayOrderItemsError) console.error('Error fetching today order items:', todayOrderItemsError);

    // === Phase 3: Buying prices (depends on today order items) ===
    const todayItemProductIds = [
      ...new Set(
        (todayOrderItemsData || [])
          .map((item: any) => item.product_id)
          .filter((id: any) => id !== null && id !== undefined),
      ),
    ] as string[];

    // Phase 3 also computes top-product names from week order items in parallel
    const weekItemProductIds = [
      ...new Set(
        (orderItemsData || [])
          .map((item: any) => item.product_id)
          .filter((id: any) => id !== null && id !== undefined),
      ),
    ] as string[];

    const [
      { data: buyingPriceProducts },
      { data: topProductsNameData },
    ] = await Promise.all([
      todayItemProductIds.length > 0
        ? adminClient.from('products').select('id, buying_price').in('id', todayItemProductIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      weekItemProductIds.length > 0
        ? adminClient.from('products').select('id, name').in('id', weekItemProductIds)
        : Promise.resolve({ data: [] as any[], error: null }),
    ]);

    // === Process: Sales by day ===
    const salesByDayMap = new Map<string, number>();
    salesByDayTemplate.forEach(({ date }) => salesByDayMap.set(date, 0));

    weekOrders.forEach((order: any) => {
      const orderDateObj = new Date(order.created_at);
      const year = orderDateObj.getFullYear();
      const month = String(orderDateObj.getMonth() + 1).padStart(2, '0');
      const day = String(orderDateObj.getDate()).padStart(2, '0');
      const orderDate = `${year}-${month}-${day}`;
      if (salesByDayMap.has(orderDate)) {
        salesByDayMap.set(orderDate, (salesByDayMap.get(orderDate) || 0) + parseFloat(order.total_amount || 0));
      }
    });

    const formattedSalesByDay = salesByDayTemplate.map(({ day, date }) => ({
      day,
      sales: salesByDayMap.get(date) || 0,
    }));

    // === Process: Top products ===
    let topProducts: any[] = [];
    if ((orderItemsData || []).length > 0 && (topProductsNameData || []).length > 0) {
      const productSalesMap = new Map<string, number>();
      (orderItemsData || []).forEach((item: any) => {
        if (!item.product_id || !item.quantity) return;
        productSalesMap.set(item.product_id, (productSalesMap.get(item.product_id) || 0) + (parseInt(item.quantity) || 0));
      });

      topProducts = Array.from(productSalesMap.entries())
        .map(([productId, qty]) => {
          const product = (topProductsNameData || []).find((p: any) => p.id === productId);
          return { id: productId, name: product?.name || 'Unknown Product', sales: qty };
        })
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);
    }

    // === Process: Total stats ===
    const totalOrdersCount = allOrdersData?.length || 0;
    const totalSalesAmount = (allOrdersData || []).reduce((sum: number, order: any) => {
      const amount = parseFloat(order.total_amount || 0);
      return isNaN(amount) ? sum : sum + amount;
    }, 0);

    // === Process: Inventory & stock alerts ===
    const productStockMap = new Map<string, { stock: number; reserved: number; available: number }>();

    (inventoryData || []).forEach((inv: any) => {
      const existing = productStockMap.get(inv.product_id) || { stock: 0, reserved: 0, available: 0 };
      productStockMap.set(inv.product_id, {
        stock: existing.stock + (inv.stock_quantity || 0),
        reserved: existing.reserved + (inv.reserved_quantity || 0),
        available: 0,
      });
    });

    (productSizesData || []).forEach((size: any) => {
      const existing = productStockMap.get(size.product_id) || { stock: 0, reserved: 0, available: 0 };
      productStockMap.set(size.product_id, {
        stock: existing.stock + (size.stock_quantity || 0),
        reserved: existing.reserved + (size.reserved_quantity || 0),
        available: 0,
      });
    });

    productStockMap.forEach((stockData) => {
      stockData.available = Math.max(0, stockData.stock - stockData.reserved);
    });

    let lowStockProducts: any[] = [];
    let outOfStockProducts: any[] = [];

    allProducts.forEach((product: any) => {
      const stockData = productStockMap.get(product.id);
      const available = stockData ? stockData.available : 0;
      if (available === 0) {
        outOfStockProducts.push({ id: product.id, name: product.name, stock_quantity: 0, status: 'out_of_stock' });
      } else if (available < 10) {
        lowStockProducts.push({ id: product.id, name: product.name, stock_quantity: available, status: 'low_stock' });
      }
    });

    lowStockProducts.sort((a, b) => a.stock_quantity - b.stock_quantity);
    outOfStockProducts.sort((a, b) => a.name.localeCompare(b.name));
    const allStockAlerts = [...lowStockProducts, ...outOfStockProducts].slice(0, 15);

    // === Process: Today's sales & profits ===
    const todaySales = (todayOrdersData || []).reduce((sum: number, order: any) => {
      const amount = parseFloat(order.total_amount || 0);
      return isNaN(amount) ? sum : sum + amount;
    }, 0);
    const todayOrdersCount = todayOrdersData?.length || 0;

    let todayProfits = 0;
    if ((todayOrderItemsData || []).length > 0) {
      const productsMap = new Map<string, number>();
      (buyingPriceProducts || []).forEach((product: any) => {
        const buyingPrice = parseFloat(product.buying_price || 0);
        if (buyingPrice > 0) productsMap.set(product.id, buyingPrice);
      });

      (todayOrderItemsData || []).forEach((item: any) => {
        if (!item.product_id) return;
        const buyingPrice = productsMap.get(item.product_id);
        if (!buyingPrice || buyingPrice <= 0) return;
        const sellingPrice = parseFloat(item.price || 0);
        const quantity = parseInt(item.quantity || 0);
        if (sellingPrice <= 0 || quantity <= 0) return;
        todayProfits += (sellingPrice - buyingPrice) * quantity;
      });
    }

    return NextResponse.json({
      salesByDay: formattedSalesByDay,
      topProducts,
      lowStock: allStockAlerts,
      totalSales: totalSalesAmount,
      totalOrders: totalOrdersCount,
      totalProducts: allProducts.length,
      todaySales,
      todayOrders: todayOrdersCount,
      todayProfits,
      completedOrders: completedCount || 0,
      pendingOrders: pendingCount || 0,
      totalCustomers: customersCount || 0,
    });
  } catch (error) {
    console.error('❌ [API] Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
