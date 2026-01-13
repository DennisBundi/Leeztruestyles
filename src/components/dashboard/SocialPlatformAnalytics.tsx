'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { getPlatformDisplayName, getPlatformGradient } from '@/lib/utils/socialPlatform';

type Period = 'day' | 'week' | 'month' | 'year' | 'all';
type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' | 'all';

interface PlatformStat {
  platform: string;
  count: number;
  displayName: string;
  percentage: number;
  rank: number;
}

interface SocialPlatformStatsResponse {
  platforms: PlatformStat[];
  period: Period;
  totalOrders: number;
  error?: string;
  message?: string;
}

export default function SocialPlatformAnalytics() {
  const [data, setData] = useState<PlatformStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('month');
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>('all');
  const [customDate, setCustomDate] = useState<string>('');
  const [totalOrders, setTotalOrders] = useState(0);

  useEffect(() => {
    fetchData(period, dayOfWeek, customDate);
  }, [period, dayOfWeek, customDate]);

  const fetchData = async (selectedPeriod: Period, selectedDay: DayOfWeek, selectedCustomDate: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      
      // If custom date is selected, use it instead of period
      if (selectedCustomDate) {
        params.append('customDate', selectedCustomDate);
      } else {
        params.append('period', selectedPeriod);
      }
      
      if (selectedDay !== 'all') {
        params.append('dayOfWeek', selectedDay);
      }

      const response = await fetch(`/api/dashboard/social-platform-stats?${params.toString()}`);
      const result: SocialPlatformStatsResponse = await response.json();

      if (!response.ok) {
        if (result.error === 'Migration required') {
          setError(result.message || 'Migration required');
        } else {
          setError(result.error || 'Failed to fetch data');
        }
        setData([]);
        setTotalOrders(0);
        return;
      }

      setData(result.platforms || []);
      setTotalOrders(result.totalOrders || 0);
    } catch (err) {
      console.error('Error fetching social platform stats:', err);
      setError('Failed to load social platform statistics');
      setData([]);
      setTotalOrders(0);
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = (p: Period): string => {
    const labels: Record<Period, string> = {
      day: 'Today',
      week: 'This Week',
      month: 'This Month',
      year: 'This Year',
      all: 'All Time',
    };
    return labels[p];
  };

  const getDayLabel = (d: DayOfWeek): string => {
    const labels: Record<DayOfWeek, string> = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday',
      all: 'All Days',
    };
    return labels[d];
  };

  const getRankBadge = (rank: number): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  // Prepare chart data
  const chartData = data.map((platform) => ({
    name: platform.displayName,
    count: platform.count,
    percentage: platform.percentage,
    rank: platform.rank,
    platform: platform.platform,
  }));

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Social Platform Performance</h2>
          <p className="text-sm text-gray-500 mt-1">
            Customer acquisition by platform source
          </p>
        </div>
      </div>

      {/* Custom Date Filter */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="text-sm font-medium text-gray-700">Custom Date:</label>
        <input
          type="date"
          value={customDate}
          onChange={(e) => {
            const newDate = e.target.value;
            setCustomDate(newDate);
            // Clear day filter when custom date is selected (day filter only works for current week)
            if (newDate) {
              setDayOfWeek('all');
            }
          }}
          className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {customDate && (
          <button
            onClick={() => {
              setCustomDate('');
              setPeriod('month');
            }}
            className="px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Period Filter Buttons */}
      {!customDate && (
        <div className="flex flex-wrap gap-2 mb-4">
          {(['day', 'week', 'month', 'year', 'all'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => {
                setPeriod(p);
                // When selecting a period, clear day filter if it's not 'week'
                if (p !== 'week' && dayOfWeek !== 'all') {
                  setDayOfWeek('all');
                }
                // If selecting week and a day is already selected, keep it
                // If selecting a day of week, automatically set period to 'week'
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                period === p
                  ? 'bg-primary text-white shadow-md hover:bg-primary-dark'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {getPeriodLabel(p)}
            </button>
          ))}
        </div>
      )}

      {/* Day of Week Filter Buttons - Only shows current week when a day is selected */}
      <div className="flex flex-wrap gap-2 mb-6">
        <span className="text-sm font-medium text-gray-700 self-center mr-2">Day (Current Week):</span>
        {(['all', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as DayOfWeek[]).map((d) => (
          <button
            key={d}
            onClick={() => {
              setDayOfWeek(d);
              // When selecting a day of week, automatically set period to 'week' (current week only)
              // Clear custom date as day filter only works for current week
              if (d !== 'all') {
                setPeriod('week');
                setCustomDate('');
              }
            }}
            disabled={customDate !== '' && d !== 'all'}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              dayOfWeek === d
                ? 'bg-primary text-white shadow-md hover:bg-primary-dark'
                : customDate !== '' && d !== 'all'
                ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {getDayLabel(d)}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-yellow-800">{error}</p>
              {error.includes('Migration required') && (
                <p className="text-xs text-yellow-700 mt-1">
                  Run the migration file in your Supabase SQL editor: <code className="bg-yellow-100 px-1 rounded">add_social_platform_to_orders.sql</code>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-gray-600">Loading statistics...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && data.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-500 text-lg mb-2">No data available</p>
          <p className="text-gray-400 text-sm">
            No POS orders with social platform data found for{' '}
            {customDate 
              ? `date ${new Date(customDate).toLocaleDateString()}`
              : getPeriodLabel(period).toLowerCase()}
            {dayOfWeek !== 'all' && ` on ${getDayLabel(dayOfWeek)}`}
          </p>
        </div>
      )}

      {/* Chart and Stats */}
      {!loading && !error && data.length > 0 && (
        <>
          {/* Platform Cards Section */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.slice(0, 4).map((platform) => (
              <div
                key={platform.platform}
                className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold text-gray-700">
                    {getRankBadge(platform.rank)}
                  </span>
                  <span className="text-xs font-semibold text-gray-500 bg-white px-2 py-1 rounded-full">
                    {platform.percentage}%
                  </span>
                </div>
                <div className="mb-2">
                  <p className="text-xl font-bold text-gray-900">{platform.displayName}</p>
                  <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Social Platform</p>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-2xl font-bold text-primary">{platform.count}</p>
                  <p className="text-xs text-gray-600 mt-1">Customers</p>
                </div>
              </div>
            ))}
          </div>

          {/* Customer Count by Platform - Bar Chart Section */}
          <div className="mt-6 bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Number of Customers by Platform</h3>
              <p className="text-xs text-gray-500 mt-1">Total customers acquired from each social platform</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) => value.toString()}
                />
                <Tooltip
                  formatter={(value: number, name: string, props: any) => [
                    `${value} ${value === 1 ? 'customer' : 'customers'} (${props.payload.percentage}%)`,
                    'Count',
                  ]}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '10px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  labelStyle={{ color: '#374151', fontWeight: 600, marginBottom: '4px' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => {
                    // Use theme colors with varying shades based on rank
                    // Top rank gets the darkest pink, others get progressively lighter
                    const colors = ['#f472b6', '#f9a8d4', '#fbcfe8', '#fce7f3']; // Primary dark to light
                    const color = colors[index] || '#f9a8d4'; // Default to primary if more than 4 platforms
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={color}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Total Summary */}
          <div className="mt-6 bg-gradient-to-br from-primary/10 to-primary-light/10 rounded-xl p-5 border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Customers</p>
                <p className="text-xs text-gray-500 mt-1">
                  Across all platforms for{' '}
                  {customDate 
                    ? `date ${new Date(customDate).toLocaleDateString()}`
                    : getPeriodLabel(period).toLowerCase()}
                  {dayOfWeek !== 'all' && ` on ${getDayLabel(dayOfWeek)}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-primary">{totalOrders}</p>
                <p className="text-xs text-gray-600 mt-1">Total Orders</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

