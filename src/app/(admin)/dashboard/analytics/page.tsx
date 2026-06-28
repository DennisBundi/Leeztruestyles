'use client'

import { useState, useEffect } from 'react'
import SignupChart from '@/components/dashboard/analytics/SignupChart'
import UserTable from '@/components/dashboard/analytics/UserTable'

interface User {
  id: string
  full_name: string | null
  email: string
  created_at: string
}

interface AnalyticsData {
  users: User[]
  signupsByDay: { date: string; count: number }[]
  signupsByMonth: { month: string; count: number }[]
  totalUsers: number
  thisMonth: number
  today: number
  newThisWeek: number
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/analytics/users')
      .then(res => {
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json()
      })
      .then((json: AnalyticsData) => setData(json))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 pt-16 lg:pt-0 animate-pulse">
        <div className="h-8 w-40 bg-white/10 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4">
          <div className="glass-card h-72 bg-white/5" />
          <div className="flex flex-col gap-4">
            <div className="glass-card h-20 bg-white/5" />
            <div className="glass-card h-20 bg-white/5" />
            <div className="glass-card h-20 bg-white/5" />
          </div>
        </div>
        <div className="glass-card h-64 bg-white/5" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="pt-16 lg:pt-0">
        <p className="text-white/50 text-sm">{error ?? 'Failed to load analytics'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pt-16 lg:pt-0">
      <div>
        <h1 className="text-3xl font-bold text-white mb-1">Analytics</h1>
        <p className="text-white/50 text-sm">User growth &amp; sign-up tracking</p>
      </div>

      {/* Chart + stat cards side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4 items-start">
        <SignupChart
          signupsByDay={data.signupsByDay}
          signupsByMonth={data.signupsByMonth}
        />

        <div className="flex flex-col gap-4">
          {/* Total Users */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-white/50 text-xs font-medium uppercase tracking-widest">
                Total Users
              </h3>
              <svg
                className="w-4 h-4 text-[#f9a8d4]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <p className="text-2xl font-bold text-white">
              {data.totalUsers.toLocaleString()}
            </p>
            <p className="text-xs text-green-400 font-semibold mt-1">
              +{data.newThisWeek} this week
            </p>
          </div>

          {/* This Month */}
          <div className="glass-card p-5">
            <h3 className="text-white/50 text-xs font-medium uppercase tracking-widest mb-1">
              This Month
            </h3>
            <p className="text-2xl font-bold text-white">
              {data.thisMonth.toLocaleString()}
            </p>
          </div>

          {/* Today */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-white/50 text-xs font-medium uppercase tracking-widest">
                Today
              </h3>
              <svg
                className="w-4 h-4 text-[#f9a8d4]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
            <p className="text-2xl font-bold text-white">{data.today.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* User table */}
      <UserTable users={data.users} />
    </div>
  )
}
