'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatOrderId } from '@/lib/utils/orderId';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Dot } from 'recharts';
import SocialPlatformAnalytics from '@/components/dashboard/SocialPlatformAnalytics';
import SellerDashboard from '@/components/dashboard/SellerDashboard';

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
  const [salesByDay, setSalesByDay] = useState<SalesByDay[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentOrdersLoading, setRecentOrdersLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
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

  useEffect(() => {
    fetch('/api/auth/role')
      .then(r => r.json())
      .then(({ role }) => {
        setUserRole(role);
        setRoleLoading(false);
        if (role !== 'seller') {
          fetchDashboardData();
          fetchRecentOrders();
        }
      })
      .catch(() => {
        setRoleLoading(false);
        fetchDashboardData();
        fetchRecentOrders();
      });
  }, []);

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

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f9a8d4]" />
      </div>
    );
  }

  if (userRole === 'seller') {
    return <SellerDashboard />;
  }

  return (
    <div className="space-y-6 animate-fade-in pt-16 lg:pt-0">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-white/50 text-sm">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="glass-card border-l-4 border-[#f9a8d4] p-4">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-[#f9a8d4] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-white/80 text-sm flex-1">{error}</p>
            <button
              onClick={() => { setError(null); fetchDashboardData(); }}
              className="text-[#f9a8d4] hover:text-[#f9a8d4] text-sm font-medium underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/orders" className="glass-card p-5 hover:bg-white/15 transition-all duration-200 cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white/50 text-xs font-medium uppercase tracking-widest">Total Sales</h3>
            <svg className="w-5 h-5 text-[#f9a8d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-white">
            {loading ? '...' : error ? '—' : `KES ${(totalSales || 0).toLocaleString()}`}
          </p>
          <p className="text-white/40 text-xs mt-1">All time</p>
        </Link>

        <Link href="/dashboard/orders" className="glass-card p-5 hover:bg-white/15 transition-all duration-200 cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white/50 text-xs font-medium uppercase tracking-widest">Total Orders</h3>
            <svg className="w-5 h-5 text-[#f9a8d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-white">
            {loading ? '...' : error ? '—' : totalOrders}
          </p>
          <p className="text-white/40 text-xs mt-1">
            {loading ? '...' : `${completedOrders} completed · ${pendingOrders} pending`}
          </p>
        </Link>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white/50 text-xs font-medium uppercase tracking-widest">Today's Sales</h3>
            <svg className="w-5 h-5 text-[#f9a8d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-white">
            {loading ? '...' : error ? '—' : `KES ${(todaySales || 0).toLocaleString()}`}
          </p>
          <p className="text-white/40 text-xs mt-1">
            {loading ? '...' : `${todayOrders} orders today`}
          </p>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white/50 text-xs font-medium uppercase tracking-widest">Today's Profits</h3>
            <svg className="w-5 h-5 text-[#f9a8d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-white">
            {loading ? '...' : error ? '—' : `KES ${(todayProfits || 0).toLocaleString()}`}
          </p>
          <p className="text-white/40 text-xs mt-1">
            {loading ? '...' : `${totalCustomers} customers total`}
          </p>
        </div>
      </div>

      {/* Stock Alerts */}
      {!loading && lowStock && Array.isArray(lowStock) && lowStock.length > 0 && (() => {
        const lowStockItems = lowStock.filter((item: any) => {
          const isOutOfStock = item.stock_quantity === 0 || item.status === 'out_of_stock' || item.status === 'no_inventory';
          return !isOutOfStock;
        });
        const outOfStockItems = lowStock.filter((item: any) => {
          const isOutOfStock = item.stock_quantity === 0 || item.status === 'out_of_stock' || item.status === 'no_inventory';
          return isOutOfStock;
        });
        if (lowStockItems.length === 0 && outOfStockItems.length === 0) return null;

        return (
          <div className="glass-card border-l-4 border-[#f9a8d4] p-5">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-5 h-5 text-[#f9a8d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-white font-semibold">Stock Alerts</h2>
              <span className="ml-auto bg-[#f9a8d4]/20 text-[#f9a8d4] px-2.5 py-0.5 rounded-full text-xs font-semibold">
                {lowStockItems.length + outOfStockItems.length}
              </span>
            </div>
            {outOfStockItems.length > 0 && (
              <div className="mb-3 p-3 bg-red-500/15 border border-red-400/20 rounded-lg">
                <span className="text-red-300 text-sm font-medium">
                  Out of Stock: {outOfStockItems.length} {outOfStockItems.length === 1 ? 'product' : 'products'}
                </span>
              </div>
            )}
            {lowStockItems.length > 0 && (
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {lowStockItems.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                    <span className="text-white/70 text-sm">{item.name || 'Unknown Product'}</span>
                    <span className="text-[#f9a8d4] text-xs font-semibold bg-[#f9a8d4]/15 px-2 py-0.5 rounded-full">
                      {item.stock_quantity} units
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Social Platform Analytics */}
      <SocialPlatformAnalytics />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h2 className="text-white font-semibold mb-4">Sales This Week</h2>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#f9a8d4]"></div>
            </div>
          ) : salesByDay.length === 0 ? (
            <div className="text-center py-8 text-white/30">
              <p className="text-sm">No sales data available</p>
            </div>
          ) : (
            <div className="w-full">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart
                  data={salesByDay.map((day) => ({ day: day.day, sales: day.sales || 0 }))}
                  margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.75)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    formatter={(value: any) => [`KES ${Number(value).toLocaleString()}`, 'Sales']}
                    labelStyle={{ color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#f9a8d4"
                    strokeWidth={2.5}
                    dot={{ fill: '#f9a8d4', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#f43f5e', stroke: 'rgba(255,255,255,0.3)', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
                <span>Week Total</span>
                <span className="text-white font-semibold">
                  KES {salesByDay.reduce((sum, day) => sum + (day.sales || 0), 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Top Products</h2>
            <Link href="/dashboard/products" className="text-[#f9a8d4] hover:text-[#f9a8d4] text-xs font-medium transition-colors">
              View All
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#f9a8d4]"></div>
            </div>
          ) : topProducts.length === 0 ? (
            <div className="text-center py-8 text-white/30">
              <p className="text-sm">No product sales data available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#f9a8d4]/20 flex items-center justify-center text-[#f9a8d4] text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm text-white/80 font-medium">{product.name}</div>
                      <div className="text-xs text-white/40">{product.sales} units sold</div>
                    </div>
                  </div>
                  <span className="text-[#f9a8d4] text-sm font-bold">{product.sales}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Recent Orders</h2>
          <Link href="/dashboard/orders" className="text-[#f9a8d4] hover:text-[#f9a8d4] text-xs font-medium flex items-center gap-1 transition-colors">
            View All
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 px-3 text-xs font-medium text-white/40 uppercase tracking-wider">Order</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-white/40 uppercase tracking-wider">Customer</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-white/40 uppercase tracking-wider">Amount</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-white/40 uppercase tracking-wider">Date</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-white/40 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody>
              {recentOrdersLoading ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-white/30 text-sm">Loading...</td>
                </tr>
              ) : recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-white/30 text-sm">No recent orders</td>
                </tr>
              ) : (
                recentOrders.map((order: any) => (
                  <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 font-mono text-xs text-white/50">
                      {order.order_number ? `#${order.order_number}` : `#${formatOrderId(order.id)}`}
                    </td>
                    <td className="py-3 px-3 text-sm text-white/80 font-medium">
                      {order.customer || 'Guest'}
                    </td>
                    <td className="py-3 px-3 text-sm text-white font-semibold">
                      KES {(order.amount || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'completed'
                          ? 'bg-green-500/20 text-green-300'
                          : order.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-300'
                          : 'bg-white/10 text-white/50'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-white/40">
                      {order.date instanceof Date ? order.date.toLocaleDateString() : new Date(order.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3">
                      <Link href={`/dashboard/orders/${order.id}`} className="text-[#f9a8d4] hover:text-[#f9a8d4] text-xs font-medium transition-colors">
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

