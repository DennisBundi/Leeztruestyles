import Link from 'next/link';

// Dummy data for preview
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
  topProducts: [
    { id: '1', name: 'Elegant Summer Dress', sales: 15, revenue: 37500 },
    { id: '3', name: 'Designer Handbag', sales: 12, revenue: 66000 },
    { id: '4', name: 'High-Waisted Jeans', sales: 10, revenue: 28000 },
  ],
  salesByDay: [
    { day: 'Mon', sales: 12000 },
    { day: 'Tue', sales: 15000 },
    { day: 'Wed', sales: 18000 },
    { day: 'Thu', sales: 14000 },
    { day: 'Fri', sales: 22000 },
    { day: 'Sat', sales: 28000 },
    { day: 'Sun', sales: 16000 },
  ],
};

export default function DashboardPage() {
  // Check if database is configured
  const hasDatabase = process.env.NEXT_PUBLIC_SUPABASE_URL && 
                      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'placeholder';

  // Use dummy data for preview
  const {
    totalSales,
    totalOrders,
    completedOrders,
    pendingOrders,
    totalProducts,
    totalCustomers,
    todaySales,
    todayOrders,
    lowStock,
    recentOrders,
    topProducts,
    salesByDay,
  } = dummyStats;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's your business overview.</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-primary/10 to-primary-light/10 p-6 rounded-2xl shadow-lg border border-primary/20 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Total Sales</h3>
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-4xl font-bold text-primary">KES {totalSales.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-2">Last 30 days</p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl shadow-lg border border-blue-200 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Total Orders</h3>
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-4xl font-bold text-blue-600">{totalOrders}</p>
          <p className="text-sm text-gray-500 mt-2">All time</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl shadow-lg border border-green-200 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Today's Sales</h3>
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <p className="text-4xl font-bold text-green-600">KES {todaySales.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-2">{todayOrders} orders today</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl shadow-lg border border-purple-200 hover:shadow-xl transition-all">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Total Products</h3>
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-4xl font-bold text-purple-600">{totalProducts}</p>
          <p className="text-sm text-gray-500 mt-2">Active products</p>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-600 text-sm font-semibold">Completed Orders</h3>
            <span className="text-2xl">✓</span>
          </div>
          <p className="text-3xl font-bold text-green-600">{completedOrders}</p>
          <p className="text-xs text-gray-500 mt-1">{Math.round((completedOrders / totalOrders) * 100)}% success rate</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-600 text-sm font-semibold">Pending Orders</h3>
            <span className="text-2xl">⏳</span>
          </div>
          <p className="text-3xl font-bold text-yellow-600">{pendingOrders}</p>
          <p className="text-xs text-gray-500 mt-1">Requires attention</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-600 text-sm font-semibold">Total Customers</h3>
            <span className="text-2xl">👥</span>
          </div>
          <p className="text-3xl font-bold text-blue-600">{totalCustomers}</p>
          <p className="text-xs text-gray-500 mt-1">Registered users</p>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStock && lowStock.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl p-6 shadow-lg animate-slide-up">
          <div className="flex items-center gap-3 mb-4">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-2xl font-bold text-yellow-800">Low Stock Alerts</h2>
          </div>
          <div className="space-y-3">
            {lowStock.map((item) => (
              <div key={item.id} className="flex justify-between items-center bg-white/50 p-3 rounded-lg">
                <span className="text-gray-800 font-medium">
                  {item.name || 'Unknown Product'}
                </span>
                <span className="font-bold text-yellow-700 bg-yellow-100 px-3 py-1 rounded-full">
                  {item.stock_quantity} units
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts and Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 animate-slide-up">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Sales This Week</h2>
          <div className="space-y-4">
            {salesByDay.map((day, index) => {
              const maxSales = Math.max(...salesByDay.map(d => d.sales));
              const percentage = (day.sales / maxSales) * 100;
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{day.day}</span>
                    <span className="font-semibold text-gray-900">KES {day.sales.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary to-primary-dark h-3 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Top Products</h2>
            <Link
              href="/dashboard/products"
              className="text-primary hover:text-primary-dark font-semibold text-sm"
            >
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={product.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-600">{product.sales} sales</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary">KES {product.revenue.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Revenue</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-100 animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recent Orders</h2>
          <Link
            href="/dashboard/orders"
            className="text-primary hover:text-primary-dark font-semibold text-sm flex items-center gap-1"
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
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Order ID</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders?.map((order: any) => (
                <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-mono text-sm text-gray-600">#{order.id}</td>
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {order.customer || 'Guest'}
                  </td>
                  <td className="py-3 px-4 font-semibold text-gray-900">
                    KES {order.amount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
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
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {order.date instanceof Date ? order.date.toLocaleDateString() : new Date(order.date).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="text-primary hover:text-primary-dark font-medium text-sm"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

