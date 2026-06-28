'use client'

import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface SignupsByDay {
  date: string
  count: number
}

interface SignupsByMonth {
  month: string
  count: number
}

interface SignupChartProps {
  signupsByDay: SignupsByDay[]
  signupsByMonth: SignupsByMonth[]
}

export default function SignupChart({ signupsByDay, signupsByMonth }: SignupChartProps) {
  const [view, setView] = useState<'30d' | '12m'>('30d')

  const dayData = signupsByDay.map(d => ({
    label: String(parseInt(d.date.split('-')[2], 10)),
    count: d.count,
  }))

  const monthData = signupsByMonth.map(d => ({
    label: d.month,
    count: d.count,
  }))

  const data = view === '30d' ? dayData : monthData

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold">Signup Growth</h2>
        <div className="flex border border-white/20 rounded-lg overflow-hidden">
          <button
            onClick={() => setView('30d')}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
              view === '30d' ? 'bg-[#EC4899] text-white' : 'text-white/50 hover:text-white'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setView('12m')}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
              view === '12m' ? 'bg-[#EC4899] text-white' : 'text-white/50 hover:text-white'
            }`}
          >
            12 Months
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            stroke="rgba(255,255,255,0.25)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            interval={view === '30d' ? 4 : 0}
          />
          <YAxis
            stroke="rgba(255,255,255,0.25)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(10,0,20,0.92)',
              border: '1px solid rgba(249,168,212,0.2)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '13px',
            }}
            formatter={(value: number) => [value, 'Signups']}
            labelStyle={{ color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
          />
          <Bar dataKey="count" fill="#EC4899" radius={[3, 3, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
