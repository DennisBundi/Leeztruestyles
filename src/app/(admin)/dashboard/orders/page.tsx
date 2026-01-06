'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';

interface Order {
  id: string;
  order_number?: string;
  customer: string;
  email: string;
  seller: string;
  seller_role?: string | null;
  type: string;
  amount: number;
  commission?: number;
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
  const [userRole, setUserRole] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [lastPaymentDate, setLastPaymentDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchOrders();
    fetchUserRole();
    if (userRole === 'seller') {
      fetchLastPaymentDate();
    }
  }, [userRole]);

  const fetchUserRole = async () => {
    try {
      const response = await fetch('/api/auth/role');
      const { role } = await response.json();
      setUserRole(role);
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchLastPaymentDate = async () => {
    try {
      // Fetch user stats which includes last_commission_payment_date
      const response = await fetch('/api/dashboard/user-stats');
      if (response.ok) {
        const data = await response.json();
        if (data.lastCommissionPaymentDate) {
          setLastPaymentDate(new Date(data.lastCommissionPaymentDate));
        }
      }
    } catch (error) {
      console.error('Error fetching last payment date:', error);
    }
  };

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

  // Calculate current calendar week (Monday 00:00:00 to Sunday 23:59:59)
  const getCurrentWeekRange = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1; // Days to subtract to get to Monday
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysToMonday);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    return { weekStart, weekEnd };
  }, []);

  // Filter orders for stats (current week only, after last payment, for sellers)
  const statsFilteredOrders = useMemo(() => {
    if (userRole !== 'seller') {
      return orders;
    }

    return orders.filter((order) => {
      // Must be completed
      if (order.status !== 'completed') {
        return false;
      }

      const orderDate = new Date(order.date);

      // Must be in current calendar week
      if (orderDate < getCurrentWeekRange.weekStart || orderDate > getCurrentWeekRange.weekEnd) {
        return false;
      }

      // Must be after last payment date (if payment date exists)
      if (lastPaymentDate && orderDate <= lastPaymentDate) {
        return false;
      }

      return true;
    });
  }, [orders, userRole, getCurrentWeekRange, lastPaymentDate]);

  // Filter orders based on search, status, and type (for table display)
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

  const handleDeleteClick = (order: Order) => {
    setOrderToDelete(order);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;

    setDeletingOrderId(orderToDelete.id);
    try {
      const response = await fetch(`/api/orders?id=${orderToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete order');
      }

      // Remove order from state
      setOrders(orders.filter((o) => o.id !== orderToDelete.id));
      setShowDeleteModal(false);
      setOrderToDelete(null);
    } catch (err) {
      console.error('Error deleting order:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete order. Please try again.');
    } finally {
      setDeletingOrderId(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setOrderToDelete(null);
  };

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
          <div className="text-xs text-gray-600 mb-2">
            {userRole === 'seller' ? 'Total Orders (This Week)' : 'Total Orders'}
          </div>
          {loading ? (
            <div className="text-2xl font-bold text-gray-400">...</div>
          ) : (
            <>
              <div className="text-2xl font-bold text-gray-900">
                {userRole === 'seller' ? statsFilteredOrders.length : orders.length}
              </div>
              {userRole !== 'seller' && filteredOrders.length !== orders.length && (
                <div className="text-xs text-gray-500 mt-1">Showing {filteredOrders.length} filtered</div>
              )}
              {userRole === 'seller' && (
                <div className="text-xs text-gray-500 mt-1">Current week only</div>
              )}
            </>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
          <div className="text-xs text-gray-600 mb-2">
            {userRole === 'seller' ? 'Completed (This Week)' : 'Completed'}
          </div>
          {loading ? (
            <div className="text-2xl font-bold text-gray-400">...</div>
          ) : (
            <div className="text-2xl font-bold text-green-600">
              {userRole === 'seller' 
                ? statsFilteredOrders.length 
                : filteredOrders.filter(o => o.status === 'completed').length}
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
          <div className="text-xs text-gray-600 mb-2">
            {userRole === 'seller' ? 'Total Commission' : 'Total Revenue'}
          </div>
          {loading ? (
            <div className="text-2xl font-bold text-gray-400">...</div>
          ) : (
            <div className="text-2xl font-bold text-primary">
              KES {userRole === 'seller'
                ? (statsFilteredOrders
                    .reduce((sum, o) => sum + (o.commission || 0), 0) || 0).toLocaleString()
                : (filteredOrders
                    .filter(o => o.status === 'completed')
                    .reduce((sum, o) => sum + (o.amount || 0), 0) || 0).toLocaleString()}
            </div>
          )}
          {userRole === 'seller' && (
            <div className="text-xs text-gray-500 mt-1">3% of total sales • Current week only</div>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">
                  {userRole === 'seller' ? 'Commission' : 'Amount'}
                </th>
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
                  <td colSpan={userRole === 'seller' ? 8 : 9} className="px-4 py-8 text-center">
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
                  <td colSpan={userRole === 'seller' ? 8 : 9} className="px-4 py-8 text-center">
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
                  {userRole === 'seller' ? (
                    <td className="px-4 py-3">
                      <span className="font-semibold text-primary">
                        KES {(order.commission || 0).toLocaleString()}
                      </span>
                      <div className="text-xs text-gray-500 mt-0.5">
                        from KES {(order.amount || 0).toLocaleString()}
                      </div>
                    </td>
                  ) : (
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-900">
                        KES {(order.amount || 0).toLocaleString()}
                      </span>
                      {order.seller_role === 'admin' ? (
                        <div className="text-xs text-gray-500 mt-0.5">
                          Commission: <span className="text-gray-400">N/A</span>
                        </div>
                      ) : order.commission && order.commission > 0 ? (
                        <div className="text-xs text-gray-500 mt-0.5">
                          Commission: KES {(order.commission || 0).toLocaleString()}
                        </div>
                      ) : null}
                    </td>
                  )}
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
                    <div className="flex items-center justify-center gap-3">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="text-primary hover:text-primary-dark font-medium text-xs"
                      >
                        View Details
                      </Link>
                      {userRole === 'admin' && (
                        <button
                          onClick={() => handleDeleteClick(order)}
                          disabled={deletingOrderId === order.id}
                          className="text-red-600 hover:text-red-700 font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Delete order"
                        >
                          {deletingOrderId === order.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Order</h3>
                <p className="text-sm text-gray-600 mt-1">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-semibold text-gray-900">
                    {orderToDelete.order_number || orderToDelete.id.slice(0, 8)}...
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-semibold text-gray-900">
                    {orderToDelete.customer}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold text-gray-900">
                    KES {(orderToDelete.amount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-semibold text-gray-900 capitalize">
                    {orderToDelete.status}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-6">
              Are you sure you want to delete this order? All associated order items will also be deleted. This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteCancel}
                disabled={deletingOrderId !== null}
                className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deletingOrderId !== null}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingOrderId ? 'Deleting...' : 'Delete Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

