'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

// Dummy orders for preview
const dummyOrders = [
  {
    id: 'ORD-001',
    customer: 'Jane Doe',
    email: 'jane@example.com',
    seller: 'EMP-001',
    type: 'online',
    amount: 5500,
    status: 'completed',
    date: new Date(),
    payment_method: 'mpesa',
  },
  {
    id: 'ORD-002',
    customer: 'John Smith',
    email: 'john@example.com',
    seller: '-',
    type: 'online',
    amount: 3200,
    status: 'pending',
    date: new Date(Date.now() - 86400000),
    payment_method: 'card',
  },
  {
    id: 'ORD-003',
    customer: 'Mary Johnson',
    email: 'mary@example.com',
    seller: 'EMP-002',
    type: 'pos',
    amount: 6800,
    status: 'completed',
    date: new Date(Date.now() - 172800000),
    payment_method: 'cash',
  },
  {
    id: 'ORD-004',
    customer: 'David Brown',
    email: 'david@example.com',
    seller: '-',
    type: 'online',
    amount: 1750,
    status: 'processing',
    date: new Date(Date.now() - 259200000),
    payment_method: 'mpesa',
  },
];

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  // Filter orders based on search, status, and type
  const filteredOrders = useMemo(() => {
    return dummyOrders.filter((order) => {
      const matchesSearch = 
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
      const matchesType = selectedType === 'all' || order.type === selectedType;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [searchQuery, selectedStatus, selectedType]);

  const orders = filteredOrders;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Orders</h1>
          <p className="text-gray-600">Manage and track all customer orders</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="text-sm text-gray-600 mb-2">Total Orders</div>
          <div className="text-3xl font-bold text-gray-900">{dummyOrders.length}</div>
          {filteredOrders.length !== dummyOrders.length && (
            <div className="text-xs text-gray-500 mt-1">Showing {filteredOrders.length} filtered</div>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="text-sm text-gray-600 mb-2">Completed</div>
          <div className="text-3xl font-bold text-green-600">
            {filteredOrders.filter(o => o.status === 'completed').length}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="text-sm text-gray-600 mb-2">Pending</div>
          <div className="text-3xl font-bold text-yellow-600">
            {filteredOrders.filter(o => o.status === 'pending').length}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="text-sm text-gray-600 mb-2">Total Revenue</div>
          <div className="text-3xl font-bold text-primary">
            KES {filteredOrders.reduce((sum, o) => sum + o.amount, 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search orders by ID, customer, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
          </select>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Types</option>
            <option value="online">Online</option>
            <option value="pos">POS</option>
          </select>
        </div>
        {filteredOrders.length !== dummyOrders.length && (
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredOrders.length} of {dummyOrders.length} orders
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Order ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Customer</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Seller</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Type</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Payment</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <p className="font-medium">No orders found</p>
                      <p className="text-sm mt-1">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-mono text-sm font-semibold text-gray-900">{order.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{order.customer}</div>
                      <div className="text-sm text-gray-500">{order.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{order.seller}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 uppercase">
                      {order.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900">
                      KES {order.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 capitalize">{order.payment_method}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
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
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      {order.date.toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="text-primary hover:text-primary-dark font-medium text-sm"
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

