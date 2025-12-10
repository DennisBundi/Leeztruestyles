'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';

interface Order {
  id: string;
  order_number?: string;
  customer: string;
  email: string;
  seller: string;
  type: string;
  amount: number;
  status: string;
  date: Date;
  payment_method: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/orders');
      const data = await response.json();
      
      if (!response.ok) {
        // Show detailed error message from API
        const errorMessage = data.details 
          ? `${data.error}: ${data.details}`
          : data.error || 'Failed to fetch orders';
        throw new Error(errorMessage);
      }
      
      // Transform dates from strings to Date objects
      const ordersWithDates = (data.orders || []).map((order: any) => ({
        ...order,
        date: order.date ? (order.date instanceof Date ? order.date : new Date(order.date)) : new Date(),
      }));
      
      setOrders(ordersWithDates);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter orders based on search, status, and type
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        order.id.toLowerCase().includes(searchLower) ||
        (order.order_number && order.order_number.toLowerCase().includes(searchLower)) ||
        order.customer.toLowerCase().includes(searchLower) ||
        order.email.toLowerCase().includes(searchLower);
      const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
      const matchesType = selectedType === 'all' || order.type === selectedType;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [orders, searchQuery, selectedStatus, selectedType]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Orders</h1>
          <p className="text-sm text-gray-500">Manage and track all customer orders</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
          <div className="text-xs text-gray-600 mb-2">Total Orders</div>
          {loading ? (
            <div className="text-2xl font-bold text-gray-400">...</div>
          ) : (
            <>
              <div className="text-2xl font-bold text-gray-900">{orders.length}</div>
              {filteredOrders.length !== orders.length && (
                <div className="text-xs text-gray-500 mt-1">Showing {filteredOrders.length} filtered</div>
              )}
            </>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
          <div className="text-xs text-gray-600 mb-2">Completed</div>
          {loading ? (
            <div className="text-2xl font-bold text-gray-400">...</div>
          ) : (
            <div className="text-2xl font-bold text-green-600">
              {filteredOrders.filter(o => o.status === 'completed').length}
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
          <div className="text-xs text-gray-600 mb-2">Pending</div>
          {loading ? (
            <div className="text-2xl font-bold text-gray-400">...</div>
          ) : (
            <div className="text-2xl font-bold text-yellow-600">
              {filteredOrders.filter(o => o.status === 'pending').length}
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
          <div className="text-xs text-gray-600 mb-2">Total Revenue</div>
          {loading ? (
            <div className="text-2xl font-bold text-gray-400">...</div>
          ) : (
            <div className="text-2xl font-bold text-primary">
              KES {filteredOrders
                .filter(o => o.status === 'completed')
                .reduce((sum, o) => sum + o.amount, 0)
                .toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            placeholder="Search orders by ID, customer, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
          </select>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Types</option>
            <option value="online">Online</option>
            <option value="pos">POS</option>
          </select>
        </div>
        {filteredOrders.length !== orders.length && (
          <div className="mt-3 text-xs text-gray-500">
            Showing {filteredOrders.length} of {orders.length} orders
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Order ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Seller</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="ml-2 text-xs text-gray-600">Loading orders...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center">
                    <div className="text-red-500">
                      <svg className="w-10 h-10 mx-auto mb-3 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm font-medium">Error loading orders</p>
                      <p className="text-xs mt-1">{error}</p>
                      <button
                        onClick={fetchOrders}
                        className="mt-3 px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center">
                    <div className="text-gray-500">
                      <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <p className="text-sm font-medium">No orders found</p>
                      <p className="text-xs mt-1">
                        {orders.length === 0 
                          ? 'No orders in the system yet' 
                          : 'Try adjusting your filters'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs font-semibold text-gray-900">
                      {order.order_number || order.id}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">ID: {order.id.slice(0, 8)}...</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{order.customer}</div>
                      <div className="text-xs text-gray-500">{order.email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-600">{order.seller}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 uppercase">
                      {order.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-gray-900">
                      KES {order.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-600 capitalize">{order.payment_method}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : order.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-600">
                      {order.date.toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="text-primary hover:text-primary-dark font-medium text-xs"
                    >
                      View Details
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

