'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

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

const PERIOD_LABELS: Record<Period, string> = {
  day: 'Today',
  week: 'This Week',
  month: 'This Month',
  year: 'This Year',
  all: 'All Time',
};

const DAY_LABELS: Record<DayOfWeek, string> = {
  all: 'All Days',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const PLATFORM_COLORS = ['#f9a8d4', '#a78bfa', '#60a5fa', '#34d399'];

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
        setError(result.message || result.error || 'Failed to fetch data');
        setData([]);
        setTotalOrders(0);
        return;
      }

      setData(result.platforms || []);
      setTotalOrders(result.totalOrders || 0);
    } catch (err) {
      setError('Failed to load social platform statistics');
      setData([]);
      setTotalOrders(0);
    } finally {
      setLoading(false);
    }
  };

  const chartData = data.map((platform) => ({
    name: platform.displayName,
    count: platform.count,
    percentage: platform.percentage,
    rank: platform.rank,
    platform: platform.platform,
  }));

  const currentPeriodLabel = customDate
    ? `Date: ${new Date(customDate).toLocaleDateString()}`
    : PERIOD_LABELS[period];

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-white">Social Performance</h2>
          <p className="text-sm text-white/40 mt-0.5">Customer acquisition by platform source</p>
        </div>
        {!loading && totalOrders > 0 && (
          <div className="text-right">
            <p className="text-2xl font-bold text-[#f9a8d4]">{totalOrders}</p>
            <p className="text-xs text-white/40">total orders</p>
          </div>
        )}
      </div>

      {/* Compact unified filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-6 px-3 py-2.5 bg-black/20 rounded-xl border border-white/10">
        {/* Period pills */}
        <div className="flex gap-1">
          {(['day', 'week', 'month', 'year', 'all'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => {
                setPeriod(p);
                setCustomDate('');
                if (p !== 'week') setDayOfWeek('all');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === p && !customDate
                  ? 'bg-[#f9a8d4]/20 text-white border border-[#f9a8d4]/30'
                  : 'text-white/50 hover:text-white hover:bg-white/10'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-white/10 hidden sm:block" />

        {/* Day of week – only when week is selected */}
        {period === 'week' && !customDate && (
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(e.target.value as DayOfWeek)}
            className="px-2.5 py-1.5 bg-black/30 border border-white/10 rounded-lg text-xs text-white/70 focus:outline-none focus:border-[#f9a8d4]/40 transition-all"
          >
            {(
              ['all', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as DayOfWeek[]
            ).map((d) => (
              <option key={d} value={d}>
                {DAY_LABELS[d]}
              </option>
            ))}
          </select>
        )}

        {/* Custom date */}
        <input
          type="date"
          value={customDate}
          onChange={(e) => {
            const v = e.target.value;
            setCustomDate(v);
            if (v) setDayOfWeek('all');
          }}
          className="px-2.5 py-1.5 bg-black/30 border border-white/10 rounded-lg text-xs text-white/70 focus:outline-none focus:border-[#f9a8d4]/40"
        />
        {customDate && (
          <button
            onClick={() => {
              setCustomDate('');
              setPeriod('month');
            }}
            className="px-2.5 py-1.5 text-xs text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/10"
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="glass border-l-4 border-[#f9a8d4] rounded-lg p-4 mb-5">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-[#f9a8d4] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-white/80">{error}</p>
              {error.includes('Migration') && (
                <p className="text-xs text-white/50 mt-1">
                  Run <code className="bg-white/10 px-1 rounded">add_social_platform_to_orders.sql</code> in Supabase.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-64 bg-white/5 rounded-xl animate-pulse mt-4" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && data.length === 0 && (
        <div className="text-center py-14">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-white/40 font-medium mb-1">No data for {currentPeriodLabel.toLowerCase()}</p>
          <p className="text-white/25 text-sm">No POS orders with social platform data found.</p>
        </div>
      )}

      {/* Data: platform cards + chart */}
      {!loading && !error && data.length > 0 && (
        <>
          {/* Platform stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {data.slice(0, 4).map((platform, i) => {
              const color = PLATFORM_COLORS[i] || '#f9a8d4';
              return (
                <div
                  key={platform.platform}
                  className="rounded-xl p-4 bg-black/20 border border-white/10 hover:border-white/20 hover:bg-black/30 transition-all"
                  style={{ borderTopColor: color, borderTopWidth: 2 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-white/30 tracking-widest">#{platform.rank}</span>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/5"
                      style={{ color }}
                    >
                      {platform.percentage}%
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white mb-3 truncate">{platform.displayName}</p>
                  <p className="text-2xl font-bold leading-none" style={{ color }}>
                    {platform.count}
                  </p>
                  <p className="text-xs text-white/30 mt-1">customers</p>
                </div>
              );
            })}
          </div>

          {/* Bar chart with gradient fills */}
          <div className="bg-black/20 rounded-xl p-5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-white">Customers by Platform</p>
              <p className="text-xs text-white/30">{currentPeriodLabel}</p>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <defs>
                  {PLATFORM_COLORS.map((color, i) => (
                    <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.25} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="rgba(255,255,255,0.25)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.25)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  formatter={(value: number, _: any, props: any) => [
                    `${value} ${value === 1 ? 'customer' : 'customers'} (${props.payload.percentage}%)`,
                    'Count',
                  ]}
                  contentStyle={{
                    backgroundColor: 'rgba(10,0,20,0.92)',
                    border: '1px solid rgba(249,168,212,0.2)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '13px',
                  }}
                  labelStyle={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: '4px' }}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={72}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={`url(#barGrad${index % PLATFORM_COLORS.length})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
