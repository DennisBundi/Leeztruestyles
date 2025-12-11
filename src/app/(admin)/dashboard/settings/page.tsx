'use client';

import { useState, useEffect } from 'react';

interface UserStats {
  totalSales: number;
  totalCommission: number;
  totalOrders: number;
  salesThisWeek: number;
  commissionThisWeek: number;
  userRole?: string;
}

export default function SettingsPage() {
  const [stats, setStats] = useState<UserStats>({
    totalSales: 0,
    totalCommission: 0,
    totalOrders: 0,
    salesThisWeek: 0,
    commissionThisWeek: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/dashboard/user-stats');
        
        if (!response.ok) {
          throw new Error('Failed to fetch user statistics');
        }
        
        const data = await response.json();
        setStats({
          totalSales: data.totalSales || 0,
          totalCommission: data.totalCommission || 0,
          totalOrders: data.totalOrders || 0,
          salesThisWeek: data.salesThisWeek || 0,
          commissionThisWeek: data.commissionThisWeek || 0,
          userRole: data.userRole,
        });
      } catch (err: any) {
        console.error('Error fetching user stats:', err);
        setError(err.message || 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">View your sales performance and statistics</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Revenue / Commission */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="text-sm text-gray-600 mb-2">
            {stats.userRole === 'seller' ? 'Total Commission' : 'Total Sales'}
          </div>
          {loading ? (
            <div className="text-3xl font-bold text-gray-400">...</div>
          ) : error ? (
            <div className="text-sm text-red-600">Error loading</div>
          ) : (
            <div className="text-3xl font-bold text-primary">
              KES {stats.userRole === 'seller' 
                ? (stats.totalCommission || 0).toLocaleString()
                : (stats.totalSales || 0).toLocaleString()}
            </div>
          )}
          {stats.userRole === 'seller' && (
            <div className="text-xs text-gray-500 mt-1">3% of total sales</div>
          )}
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="text-sm text-gray-600 mb-2">Total Orders</div>
          {loading ? (
            <div className="text-3xl font-bold text-gray-400">...</div>
          ) : error ? (
            <div className="text-sm text-red-600">Error loading</div>
          ) : (
            <div className="text-3xl font-bold text-gray-900">
              {stats.totalOrders || 0}
            </div>
          )}
        </div>

        {/* Sales/Commission This Week */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="text-sm text-gray-600 mb-2">
            {stats.userRole === 'seller' ? 'Commission This Week' : 'Sales This Week'}
          </div>
          {loading ? (
            <div className="text-3xl font-bold text-gray-400">...</div>
          ) : error ? (
            <div className="text-sm text-red-600">Error loading</div>
          ) : (
            <div className="text-3xl font-bold text-green-600">
              KES {stats.userRole === 'seller'
                ? (stats.commissionThisWeek || 0).toLocaleString()
                : (stats.salesThisWeek || 0).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Additional Settings Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Settings</h2>
        <p className="text-sm text-gray-600">
          For additional account settings, please visit your{' '}
          <a href="/dashboard/profile" className="text-primary hover:underline">
            Profile page
          </a>
          .
        </p>
      </div>
    </div>
  );
}

