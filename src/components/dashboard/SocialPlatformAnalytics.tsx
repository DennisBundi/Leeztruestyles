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
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Social Platform Performance</h2>
          <p className="text-sm text-white/50 mt-1">
            Customer acquisition by platform source
          </p>
        </div>
      </div>

      {/* Custom Date Filter */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="text-sm font-medium text-white/60">Custom Date:</label>
        <input
          type="date"
          value={customDate}
          onChange={(e) => {
            const newDate = e.target.value;
            setCustomDate(newDate);
            if (newDate) setDayOfWeek('all');
          }}
          className="px-3 py-2 glass rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-400/40"
        />
        {customDate && (
          <button
            onClick={() => { setCustomDate(''); setPeriod('month'); }}
            className="px-3 py-2 text-xs font-medium text-white/50 hover:text-white transition-colors"
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
                if (p !== 'week' && dayOfWeek !== 'all') setDayOfWeek('all');
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                period === p
                  ? 'bg-rose-500/30 text-white border border-rose-400/40'
                  : 'glass text-white/60 hover:text-white hover:bg-white/15'
              }`}
            >
              {getPeriodLabel(p)}
            </button>
          ))}
        </div>
      )}

      {/* Day of Week Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <span className="text-sm font-medium text-white/60 self-center mr-2">Day (Current Week):</span>
        {(['all', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as DayOfWeek[]).map((d) => (
          <button
            key={d}
            onClick={() => {
              setDayOfWeek(d);
              if (d !== 'all') { setPeriod('week'); setCustomDate(''); }
            }}
            disabled={customDate !== '' && d !== 'all'}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              dayOfWeek === d
                ? 'bg-rose-500/30 text-white border border-rose-400/40'
                : customDate !== '' && d !== 'all'
                ? 'glass text-white/20 cursor-not-allowed'
                : 'glass text-white/60 hover:text-white hover:bg-white/15'
            }`}
          >
            {getDayLabel(d)}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className="glass border-l-4 border-rose-400 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-rose-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-white/80">{error}</p>
              {error.includes('Migration required') && (
                <p className="text-xs text-white/50 mt-1">
                  Run the migration file in your Supabase SQL editor: <code className="bg-white/10 px-1 rounded">add_social_platform_to_orders.sql</code>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-400"></div>
          <span className="ml-3 text-white/50">Loading statistics...</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && data.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-white/20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-white/40 text-lg mb-2">No data available</p>
          <p className="text-white/30 text-sm">
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
          {/* Platform Cards */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.slice(0, 4).map((platform) => (
              <div key={platform.platform} className="glass rounded-xl p-5 hover:bg-white/15 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold text-white/70">{getRankBadge(platform.rank)}</span>
                  <span className="text-xs font-semibold text-white/50 bg-white/10 px-2 py-1 rounded-full">
                    {platform.percentage}%
                  </span>
                </div>
                <div className="mb-2">
                  <p className="text-xl font-bold text-white">{platform.displayName}</p>
                  <p className="text-xs text-white/40 mt-1 uppercase tracking-wide">Social Platform</p>
                </div>
                <div className="pt-3 border-t border-white/10">
                  <p className="text-2xl font-bold text-rose-400">{platform.count}</p>
                  <p className="text-xs text-white/40 mt-1">Customers</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bar Chart */}
          <div className="mt-6 glass rounded-xl p-6">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-white">Customers by Platform</h3>
              <p className="text-xs text-white/40 mt-1">Total customers acquired from each social platform</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} tickFormatter={(v) => v.toString()} />
                <Tooltip
                  formatter={(value: number, name: string, props: any) => [
                    `${value} ${value === 1 ? 'customer' : 'customers'} (${props.payload.percentage}%)`,
                    'Count',
                  ]}
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.75)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                  labelStyle={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginBottom: '4px' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={72}>
                  {chartData.map((entry, index) => {
                    const colors = ['#f472b6', '#db2777', '#9d174d', '#831843'];
                    return <Cell key={`cell-${index}`} fill={colors[index] || '#f472b6'} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Total Summary */}
          <div className="mt-6 glass rounded-xl p-5 border-l-4 border-rose-400">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/50 uppercase tracking-wide">Total Customers</p>
                <p className="text-xs text-white/30 mt-1">
                  Across all platforms for{' '}
                  {customDate
                    ? `date ${new Date(customDate).toLocaleDateString()}`
                    : getPeriodLabel(period).toLowerCase()}
                  {dayOfWeek !== 'all' && ` on ${getDayLabel(dayOfWeek)}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-rose-400">{totalOrders}</p>
                <p className="text-xs text-white/40 mt-1">Total Orders</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

