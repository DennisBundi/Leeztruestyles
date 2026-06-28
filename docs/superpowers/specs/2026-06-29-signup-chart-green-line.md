# Signup Chart — Green Line Redesign

**Date:** 2026-06-29  
**Status:** Approved

## Overview

Replace the pink bar chart in the Analytics dashboard's Signup Growth card with a smooth green line chart featuring a top-to-bottom gradient fill. One file changes: `src/components/dashboard/analytics/SignupChart.tsx`.

---

## Visual Design

- **Chart type:** `AreaChart` (Recharts) replacing the current `BarChart`
- **Line colour:** `#22C55E` (Tailwind green-500), `strokeWidth={2.5}`
- **Curve:** `type="monotone"` for smooth curves between data points
- **Gradient fill:** linear gradient, top-to-bottom
  - 0% stop: `#22C55E` at 45% opacity
  - 100% stop: `#22C55E` at 0% opacity (transparent)
- **Toggle active state:** `bg-[#22C55E]` replacing `bg-[#EC4899]`
- **Tooltip cursor:** `fill: rgba(34,197,94,0.05)` (subtle green tint)
- **Active dot:** `fill: #22C55E`, outer ring `stroke: rgba(34,197,94,0.4)`

All other chart properties (axes, grid lines, margins, toggle behaviour, 30d/12m data) remain unchanged.

---

## Modified File

| File | Change |
|------|--------|
| `src/components/dashboard/analytics/SignupChart.tsx` | Swap `BarChart`/`Bar` → `AreaChart`/`Area`; add green gradient; update toggle colour |

---

## Recharts API Notes

**Imports to swap:**
```ts
// Remove: BarChart, Bar
// Add:    AreaChart, Area
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
```

**Gradient definition (inside `<AreaChart>` or a wrapping `<svg>`):**
```tsx
<defs>
  <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stopColor="#22C55E" stopOpacity={0.45} />
    <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
  </linearGradient>
</defs>
```

**Area element:**
```tsx
<Area
  type="monotone"
  dataKey="count"
  stroke="#22C55E"
  strokeWidth={2.5}
  fill="url(#greenGradient)"
  dot={false}
  activeDot={{ r: 5, fill: '#22C55E', stroke: 'rgba(34,197,94,0.4)', strokeWidth: 3 }}
/>
```
