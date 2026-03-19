'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatOrderId } from '@/lib/utils/orderId';

interface UserStats {
  totalSalesToday: number;
  totalOrdersToday: number;
  completedOrdersToday: number;
  pendingOrdersToday: number;
  totalCommission: number;
  lastCommissionPaymentDate: string | null;
}

interface Order {
  id: string;
  order_number?: string;
  customer?: string;
  total_amount?: number;
  amount?: number;
  commission?: number;
  status: string;
  created_at: string;
}

export default function SellerDashboard() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    fetchOrders();
  }, []);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await fetch('/api/dashboard/user-stats');
      const data = await response.json();
      if (response.ok) {
        setStats(data);
      } else {
        setStats(null);
      }
    } catch {
      setStats(null);
      setError('Failed to load stats. Please retry.');
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const response = await fetch('/api/orders');
      const data = await response.json();
      if (response.ok) {
        setOrders((data.orders || []).slice(0, 5));
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in pt-16 lg:pt-0">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-white/50 text-sm">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="glass-card border-l-4 border-[#f9a8d4] p-4">
          <div className="flex items-center gap-3">
            <p className="text-white/80 text-sm flex-1">{error}</p>
            <button
              onClick={() => { setError(null); fetchStats(); fetchOrders(); }}
              className="text-[#f9a8d4] text-sm font-medium underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today's Sales */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white/50 text-xs font-medium uppercase tracking-widest">
              Today&apos;s Sales
            </h3>
            <svg className="w-5 h-5 text-[#f9a8d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-2xl font-bold text-white">
            {statsLoading ? '...' : `KES ${(stats?.totalSalesToday ?? 0).toLocaleString()}`}
          </p>
          <p className="text-white/40 text-xs mt-1">
            {statsLoading ? '...' : 'Today'}
          </p>
        </div>

        {/* Today's Orders */}
        <Link
          href="/dashboard/orders"
          className="glass-card p-5 hover:bg-white/15 transition-all duration-200 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white/50 text-xs font-medium uppercase tracking-widest">
              Today&apos;s Orders
            </h3>
            <svg className="w-5 h-5 text-[#f9a8d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <p className="text-2xl font-bold text-white">
            {statsLoading ? '...' : stats?.totalOrdersToday ?? 0}
          </p>
          <p className="text-white/40 text-xs mt-1">
            {statsLoading
              ? '...'
              : `${stats?.completedOrdersToday ?? 0} completed · ${stats?.pendingOrdersToday ?? 0} pending`}
          </p>
        </Link>

        {/* Pending Commission */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white/50 text-xs font-medium uppercase tracking-widest">
              Pending Commission
            </h3>
            <svg className="w-5 h-5 text-[#f9a8d4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <p className="text-2xl font-bold text-white">
            {statsLoading ? '...' : `KES ${(stats?.totalCommission ?? 0).toLocaleString()}`}
          </p>
          <p className="text-white/40 text-xs mt-1">
            {statsLoading
              ? '...'
              : `Last paid: ${formatDate(stats?.lastCommissionPaymentDate ?? null)}`}
          </p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Today&apos;s Orders</h2>
          <Link
            href="/dashboard/orders"
            className="text-[#f9a8d4] hover:text-[#f9a8d4] text-xs font-medium flex items-center gap-1 transition-colors"
          >
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
                <th className="text-left py-2 px-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                  Order #
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                  Customer
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                  Amount
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                  Commission
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-white/40 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody>
              {ordersLoading ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-white/30 text-sm">
                    Loading...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-white/30 text-sm">
                    No orders today
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-3 font-mono text-xs text-white/50">
                      {order.order_number
                        ? `#${order.order_number}`
                        : `#${formatOrderId(order.id)}`}
                    </td>
                    <td className="py-3 px-3 text-sm text-white/80 font-medium">
                      {order.customer || 'Guest'}
                    </td>
                    <td className="py-3 px-3 text-sm text-white font-semibold">
                      KES {(order.amount ?? order.total_amount ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          order.status === 'completed'
                            ? 'bg-green-500/20 text-green-300'
                            : order.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'bg-white/10 text-white/50'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-sm text-white/70">
                      {order.commission != null
                        ? `KES ${order.commission.toLocaleString()}`
                        : '—'}
                    </td>
                    <td className="py-3 px-3">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="text-[#f9a8d4] hover:text-[#f9a8d4] text-xs font-medium transition-colors"
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
