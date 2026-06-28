# Analytics Dashboard Design

**Date:** 2026-06-28  
**Status:** Approved

## Overview

A new `/dashboard/analytics` page in the admin panel that gives staff a clear view of user growth over time and a searchable list of all registered users. Visible to `admin` and `manager` roles only.

---

## Page Layout

**URL:** `/dashboard/analytics`  
**Nav label:** "Analytics" — added to the admin sidebar below "Importation"

### Top row — side by side
Two columns:
- **Left (wider):** Signup Growth bar chart with a 30 Days / 12 Months toggle
- **Right (narrower):** Three stacked stat cards — Total Users, This Month, Today

### Bottom — full width
Searchable, paginated user table

---

## Stat Cards

Three cards stacked in the right column:

| Card | Value |
|---|---|
| Total Users | All-time count from `users` table |
| This Month | Signups in the current calendar month |
| Today | Signups since midnight today |

"New" badge appears on Total Users card showing the count of users who joined in the last 7 days (e.g. "+12 this week").

---

## Signup Growth Chart

- **Library:** Recharts `BarChart` (already installed, used on the main dashboard)
- **Bar color:** `#EC4899` (project primary pink)
- **Toggle:** "30 Days" | "12 Months" pill buttons above the chart
  - **30 Days:** X-axis = day number (1–30), Y-axis = signups that day
  - **12 Months:** X-axis = month abbreviation (Jan–Dec), Y-axis = signups that month
- Toggle is client-side state — data for both ranges is returned by the API in one call, no second fetch needed

---

## User Table

- **Columns:** Avatar (initials) + Full Name | Email | Joined date
- **Sort:** Newest first (by `created_at` descending)
- **"New" badge:** shown inline next to name for users who joined within the last 7 days
- **Search:** Client-side filter on `full_name` and `email` (case-insensitive, instant)
- **Pagination:** 20 rows per page, Prev / Next buttons. Search resets to page 1.

Avatar is a coloured circle showing the user's initials (first letter of first name + first letter of last name). Uses a deterministic colour from a small palette based on the user's name.

---

## Data API

**Route:** `GET /api/dashboard/analytics/users`  
**Auth:** Admin client (service role). Requires `admin` or `manager` role — returns 401/403 otherwise.

**Response shape:**
```ts
{
  users: {
    id: string
    full_name: string | null
    email: string
    created_at: string  // ISO timestamp
  }[]
  signupsByDay: {
    date: string   // "YYYY-MM-DD"
    count: number
  }[]  // last 30 days, all dates included (0 if no signups)
  signupsByMonth: {
    month: string  // "Jan", "Feb", ...
    count: number
  }[]  // last 12 calendar months
  totalUsers: number
  thisMonth: number
  today: number
  newThisWeek: number
}
```

All aggregations are computed server-side from the `users` table using the admin Supabase client. The `users` table is populated on every sign-up via the auth callback and sign-in actions.

---

## Roles & Navigation

### `src/lib/auth/roles.ts`
Add `'analytics'` to `DashboardSection` type:
```ts
export type DashboardSection = '...' | 'importation' | 'analytics'
```
Add to `canAccessSection`: `analytics` → admin + manager only.  
Add to `getAllowedSections` array.

### `src/components/admin/AdminNav.tsx`
This file has its own local `DashboardSection` type and `canAccessSection` function — **both must be updated** to match `roles.ts`:
- Add `'analytics'` to the local `DashboardSection` union
- Add `analytics` to the `canAccessSection` logic (admin + manager only)
- Add nav item: `{ href: '/dashboard/analytics', label: 'Analytics', section: 'analytics', icon: <AnalyticsIcon /> }`

---

## New Files

| File | Purpose |
|---|---|
| `src/app/api/dashboard/analytics/users/route.ts` | GET — returns users list + signup aggregations |
| `src/app/(admin)/dashboard/analytics/page.tsx` | Page component — fetches data, renders layout |
| `src/components/dashboard/analytics/SignupChart.tsx` | Bar chart with 30-day / 12-month toggle |
| `src/components/dashboard/analytics/UserTable.tsx` | Searchable paginated user table |

## Modified Files

| File | Change |
|---|---|
| `src/lib/auth/roles.ts` | Add `'analytics'` to `DashboardSection`, `canAccessSection`, `getAllowedSections` |
| `src/components/admin/AdminNav.tsx` | Add `'analytics'` to local type + `canAccessSection`, add nav item |
