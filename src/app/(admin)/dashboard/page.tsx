'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatOrderId } from '@/lib/utils/orderId';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Dot } from 'recharts';
import SocialPlatformAnalytics from '@/components/dashboard/SocialPlatformAnalytics';

// Dummy data for preview (keeping original structure)
const dummyStats = {
  totalSales: 125000,
  totalOrders: 45,
  completedOrders: 38,
  pendingOrders: 5,
  totalProducts: 25,
  totalCustomers: 120,
  todaySales: 8500,
  todayOrders: 3,
  lowStock: [
    { id: '1', name: 'Elegant Summer Dress', stock_quantity: 3 },
    { id: '2', name: 'Designer Handbag', stock_quantity: 5 },
  ],
  recentOrders: [
    { id: '1', customer: 'Jane Doe', amount: 5500, status: 'completed', date: new Date() },
    { id: '2', customer: 'John Smith', amount: 3200, status: 'pending', date: new Date(Date.now() - 86400000) },
    { id: '3', customer: 'Mary Johnson', amount: 6800, status: 'completed', date: new Date(Date.now() - 172800000) },
  ],
};

interface SalesByDay {
  day: string;
  sales: number;
}

interface TopProduct {
  id: string;
  name: string;
  sales: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [salesByDay, setSalesByDay] = useState<SalesByDay[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentOrdersLoading, setRecentOrdersLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Real data from Supabase
  const [completedOrders, setCompletedOrders] = useState<number>(0);
  const [pendingOrders, setPendingOrders] = useState<number>(0);
  const [totalCustomers, setTotalCustomers] = useState<number>(0);
  const [totalSales, setTotalSales] = useState<number>(0);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [todaySales, setTodaySales] = useState<number>(0);
  const [todayOrders, setTodayOrders] = useState<number>(0);
  const [todayProfits, setTodayProfits] = useState<number>(0);
  const [lowStock, setLowStock] = useState<Array<{ id: string; name: string; stock_quantity: number }>>([]);

  // Check role and redirect sellers immediately (only once)
  useEffect(() => {
    let mounted = true;
    const checkRole = async () => {
      try {
        const response = await fetch('/api/auth/role');
        const { role } = await response.json();
        if (mounted && role === 'seller') {
          setIsRedirecting(true);
          // Use replace to avoid adding to history, and do it immediately
          router.replace('/dashboard/products');
        }
      } catch (error) {
        console.error('Error checking role:', error);
      }
    };
    // Run immediately, don't wait
    checkRole();
    return () => { mounted = false; };
  }, [router]);

  // Define functions before early return to ensure they're always available
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      
      console.log('📊 [Dashboard] Fetching dashboard stats...');
      const response = await fetch('/api/dashboard/stats');
      
      console.log('📊 [Dashboard] API response status:', response.status, response.statusText);
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle API errors
        const errorMessage = data.error || `API error: ${response.status}`;
        setError(errorMessage);
        console.error('❌ [Dashboard] Stats API error:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          details: data.details,
          fullResponse: data
        });
        
        // Handle specific error types
        if (response.status === 401) {
          setError('Authentication required. Please sign in again.');
        } else if (response.status === 403) {
          setError('Access denied. You do not have permission to view dashboard stats.');
        } else if (response.status === 500) {
          setError('Server error. Please try again later.');
        }
        
        // Reset all stats to 0 on error
        setSalesByDay([]);
        setTopProducts([]);
        setTotalSales(0);
        setTotalOrders(0);
        setTodaySales(0);
        setTodayOrders(0);
        setTodayProfits(0);
        setCompletedOrders(0);
        setPendingOrders(0);
        setTotalCustomers(0);
        setLowStock([]);
        return;
      }
      
      // Success - log and set data
      console.log('✅ [Dashboard] Stats received successfully:', {
        salesByDay: data.salesByDay?.length || 0,
        topProducts: data.topProducts?.length || 0,
        lowStock: data.lowStock?.length || 0,
        totalSales: data.totalSales || 0,
        totalOrders: data.totalOrders || 0,
        todaySales: data.todaySales || 0,
        todayOrders: data.todayOrders || 0,
        todayProfits: data.todayProfits || 0,
        completedOrders: data.completedOrders || 0,
        pendingOrders: data.pendingOrders || 0,
        totalCustomers: data.totalCustomers || 0,
        responseStructure: Object.keys(data)
      });
      
      setSalesByDay(data.salesByDay || []);
      setTopProducts(data.topProducts || []);
      setTotalSales(data.totalSales || 0);
      setTotalOrders(data.totalOrders || 0);
      setTodaySales(data.todaySales || 0);
      setTodayOrders(data.todayOrders || 0);
      setTodayProfits(data.todayProfits || 0);
      setCompletedOrders(data.completedOrders || 0);
      setPendingOrders(data.pendingOrders || 0);
      setTotalCustomers(data.totalCustomers || 0);
      
      const lowStockData = data.lowStock || [];
      console.log('📦 [Dashboard] Low stock data received:', {
        count: lowStockData.length,
        items: lowStockData.slice(0, 5), // Log first 5 items
      });
      setLowStock(lowStockData);
      
    } catch (error) {
      // Handle network errors
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dashboard stats';
      setError(errorMessage);
      console.error('❌ [Dashboard] Network error fetching stats:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Reset all stats to 0 on error
      setSalesByDay([]);
      setTopProducts([]);
      setTotalSales(0);
      setTotalOrders(0);
      setTodaySales(0);
      setTodayOrders(0);
      setTodayProfits(0);
      setCompletedOrders(0);
      setPendingOrders(0);
      setTotalCustomers(0);
      setLowStock([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentOrders = async () => {
    try {
      setRecentOrdersLoading(true);
      const response = await fetch('/api/orders');
      const data = await response.json();
      
      if (response.ok) {
        console.log('Recent orders received:', data.orders?.length || 0);
        
        // Orders are already sorted by created_at descending from the API
        // Just take the first 5 (most recent) and ensure dates are Date objects
        const recent = (data.orders || [])
          .slice(0, 5) // Take first 5 (already sorted by most recent)
          .map((order: any) => {
            // Ensure date is a Date object
            let orderDate: Date;
            if (order.date instanceof Date) {
              orderDate = order.date;
            } else if (typeof order.date === 'string') {
              orderDate = new Date(order.date);
            } else {
              // Fallback: try to use created_at if date is not available
              orderDate = order.created_at ? new Date(order.created_at) : new Date();
            }
            
            return {
              ...order,
              date: orderDate,
            };
          });
        
        console.log('Recent orders processed:', recent.length, 'orders');
        setRecentOrders(recent);
      } else {
        console.error('Recent orders API error:', data.error, data.details);
        setRecentOrders([]);
      }
    } catch (error) {
      console.error('Error fetching recent orders:', error);
      setRecentOrders([]);
    } finally {
      setRecentOrdersLoading(false);
    }
  };

  // Fetch dashboard data - only if not redirecting
  // Must be after function definitions but before early return
  useEffect(() => {
    if (!isRedirecting) {
      fetchDashboardData();
      fetchRecentOrders();
    }
  }, [isRedirecting]);

  // Don't render dashboard content if redirecting - must be after all hooks
  if (isRedirecting) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
        <p className="text-sm text-gray-500">Welcome back! Here's your business overview.</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/orders" className="bg-gradient-to-br from-primary/10 to-primary-light/10 p-5 rounded-xl shadow-md border border-primary/20 hover:shadow-lg transition-all cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-600 text-xs font-medium uppercase tracking-wide">Total Sales</h3>
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-primary">
            {loading ? '...' : error ? 'Error' : `KES ${(totalSales || 0).toLocaleString()}`}
          </p>
          <p className="text-xs text-gray-500 mt-1">All time</p>
          {error && <p className="text-xs text-red-500 mt-1 truncate" title={error}>{error}</p>}
        </Link>
        
        <Link href="/dashboard/orders" className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl shadow-md border border-blue-200 hover:shadow-lg transition-all cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-600 text-xs font-medium uppercase tracking-wide">Total Orders</h3>
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {loading ? '...' : error ? 'Error' : totalOrders}
          </p>
          <p className="text-xs text-gray-500 mt-1">All time</p>
          {error && <p className="text-xs text-red-500 mt-1 truncate" title={error}>{error}</p>}
        </Link>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl shadow-md border border-green-200 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-600 text-xs font-medium uppercase tracking-wide">Today's Sales</h3>
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {loading ? '...' : error ? 'Error' : `KES ${(todaySales || 0).toLocaleString()}`}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {loading ? 'Loading...' : error ? 'Failed to load' : `${todayOrders} orders today`}
          </p>
          {error && <p className="text-xs text-red-500 mt-1 truncate" title={error}>{error}</p>}
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl shadow-md border border-purple-200 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-600 text-xs font-medium uppercase tracking-wide">Today's Profits</h3>
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-purple-600">
            {loading ? '...' : error ? 'Error' : `KES ${(todayProfits || 0).toLocaleString()}`}
          </p>
          <p className="text-xs text-gray-500 mt-1">Today's earnings</p>
          {error && <p className="text-xs text-red-500 mt-1 truncate" title={error}>{error}</p>}
        </div>
      </div>
      
      {/* Global Error Banner */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Failed to load dashboard statistics</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
            <button
              onClick={() => {
                setError(null);
                fetchDashboardData();
              }}
              className="ml-4 text-sm font-medium text-red-800 hover:text-red-900 underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-600 text-xs font-medium">Completed Orders</h3>
            <span className="text-lg">✓</span>
          </div>
          <p className="text-xl font-bold text-green-600">
            {loading ? '...' : completedOrders}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {loading ? 'Loading...' : totalOrders > 0 ? `${Math.round((completedOrders / totalOrders) * 100)}% success rate` : 'No orders yet'}
          </p>
        </div>
        
        <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-600 text-xs font-medium">Pending Orders</h3>
            <span className="text-lg">⏳</span>
          </div>
          <p className="text-xl font-bold text-yellow-600">
            {loading ? '...' : pendingOrders}
          </p>
          <p className="text-xs text-gray-500 mt-1">Requires attention</p>
        </div>
        
        <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-600 text-xs font-medium">Total Customers</h3>
            <span className="text-lg">👥</span>
          </div>
          <p className="text-xl font-bold text-blue-600">
            {loading ? '...' : totalCustomers}
          </p>
          <p className="text-xs text-gray-500 mt-1">Registered users</p>
        </div>
      </div>

      {/* Low Stock & Out of Stock Alerts */}
      {!loading && lowStock && Array.isArray(lowStock) && lowStock.length > 0 && (() => {
        // Separate low stock from out of stock
        const lowStockItems = lowStock.filter((item: any) => {
          const isOutOfStock = item.stock_quantity === 0 || item.status === 'out_of_stock' || item.status === 'no_inventory';
          return !isOutOfStock;
        });
        const outOfStockItems = lowStock.filter((item: any) => {
          const isOutOfStock = item.stock_quantity === 0 || item.status === 'out_of_stock' || item.status === 'no_inventory';
          return isOutOfStock;
        });
        const outOfStockCount = outOfStockItems.length;
        const hasAlerts = lowStockItems.length > 0 || outOfStockCount > 0;

        if (!hasAlerts) return null;

        return (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl p-6 shadow-lg animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-2xl font-bold text-yellow-800">Stock Alerts</h2>
              <span className="ml-auto bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold">
                {lowStockItems.length + outOfStockCount}
              </span>
            </div>

            {/* Out of Stock Summary */}
            {outOfStockCount > 0 && (
              <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-red-800 font-semibold">
                    Out of Stock: {outOfStockCount} {outOfStockCount === 1 ? 'product' : 'products'}
                  </span>
                </div>
              </div>
            )}

            {/* Low Stock Products - Scrollable List */}
            {lowStockItems.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Low Stock Products:</h3>
                <div 
                  className="overflow-y-auto pr-2 space-y-3"
                  style={{
                    maxHeight: '180px', // Shows approximately 3 products (60px each)
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#fcd34d #fef3c7',
                  }}
                >
                  {lowStockItems.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center bg-white/50 p-3 rounded-lg">
                      <span className="text-gray-800 font-medium">
                        {item.name || 'Unknown Product'}
                      </span>
                      <span className="font-bold px-3 py-1 rounded-full text-yellow-700 bg-yellow-100">
                        {item.stock_quantity} units
                      </span>
                    </div>
                  ))}
                </div>
                {lowStockItems.length > 3 && (
                  <p className="text-xs text-gray-500 italic text-center mt-2">
                    Scroll to see {lowStockItems.length - 3} more {lowStockItems.length - 3 === 1 ? 'product' : 'products'}
                  </p>
                )}
              </div>
            )}

            {/* Show message if no low stock items but has out of stock */}
            {lowStockItems.length === 0 && outOfStockCount > 0 && (
              <p className="text-sm text-gray-600 italic">All alerts are out of stock items.</p>
            )}
          </div>
        );
      })()}

      {/* Social Platform Analytics */}
      <SocialPlatformAnalytics />

      {/* Charts and Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sales Chart */}
        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 animate-slide-up">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales This Week</h2>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : salesByDay.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No sales data available</p>
              <p className="text-xs mt-1">Check console for details</p>
            </div>
          ) : (
            <div className="w-full">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart
                  data={salesByDay.map((day) => ({
                    day: day.day,
                    sales: day.sales || 0,
                  }))}
                  margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="day" 
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(value) => `KES ${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px 12px',
                    }}
                    formatter={(value: any) => [`KES ${Number(value).toLocaleString()}`, 'Sales']}
                    labelStyle={{ color: '#374151', fontWeight: 600, marginBottom: '4px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#f9a8d4"
                    strokeWidth={3}
                    dot={{ fill: '#f9a8d4', r: 5, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 7, fill: '#f472b6', stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Total Week Sales:</span>
                  <span className="font-semibold text-gray-900">
                    KES {salesByDay.reduce((sum, day) => sum + (day.sales || 0), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Products</h2>
            <Link
              href="/dashboard/products"
              className="text-primary hover:text-primary-dark font-medium text-xs"
            >
              View All
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : topProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No product sales data available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center text-white text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      <div className="text-xs text-gray-600">{product.sales} units sold</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-primary">{product.sales}</div>
                    <div className="text-xs text-gray-500">Sales Count</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
          <Link
            href="/dashboard/orders"
            className="text-primary hover:text-primary-dark font-medium text-xs flex items-center gap-1"
          >
            View All
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Order ID</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Customer</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Amount</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Status</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Date</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentOrdersLoading ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-gray-500">
                    Loading recent orders...
                  </td>
                </tr>
              ) : recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-gray-500">
                    No recent orders found
                  </td>
                </tr>
              ) : (
                recentOrders.map((order: any) => (
                <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-2 px-3 font-mono text-xs text-gray-600">
                    {order.order_number ? `#${order.order_number}` : `#${formatOrderId(order.id)}`}
                  </td>
                  <td className="py-2 px-3 text-sm font-medium text-gray-900">
                    {order.customer || 'Guest'}
                  </td>
                  <td className="py-2 px-3 text-sm font-semibold text-gray-900">
                    KES {(order.amount || 0).toLocaleString()}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : order.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-xs text-gray-600">
                    {order.date instanceof Date ? order.date.toLocaleDateString() : new Date(order.date).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-3">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="text-primary hover:text-primary-dark font-medium text-xs"
                    >
                      View
                    </Link>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

