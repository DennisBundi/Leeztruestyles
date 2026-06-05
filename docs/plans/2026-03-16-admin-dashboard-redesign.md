# Admin Dashboard Redesign — Phase 1: Dashboard + Sidebar

**Date:** 2026-03-16
**Scope:** Phase 1 — Dashboard page + AdminNav sidebar
**Goal:** Cleaner, more professional admin UI using glassmorphism over a brand gradient background

---

## Background

The current admin dashboard uses a white/gray background with per-card color tinting (pink, blue, green, purple) that creates visual noise. Compared to reference dashboards (e.g. Natty Gym), the hierarchy is unclear and the design feels busy. This redesign applies a consistent glassmorphism treatment over a deep brand gradient to create a premium, cohesive look.

---

## Design Decisions

### 1. Foundation

**Background:** Fixed full-viewport gradient applied at the layout level (`dashboard/layout.tsx`)
```
bg-gradient-to-br from-rose-950 via-pink-900 to-purple-950
```
Fixed position so it doesn't scroll — cards float over it.

**Glass utilities** — added via Tailwind plugin in `tailwind.config.js`:

| Class | Description |
|---|---|
| `.glass` | Base: `backdrop-blur-md bg-white/10 border border-white/15` |
| `.glass-card` | Cards/panels: `backdrop-blur-md bg-white/12 border border-white/20 rounded-2xl` |
| `.glass-strong` | Modals, active nav item: `backdrop-blur-xl bg-white/20 border border-white/30` |
| `.glass-sidebar` | Sidebar: `backdrop-blur-lg bg-black/30 border-r border-white/10` |

All text on glass surfaces uses white with opacity variants (`text-white`, `text-white/70`, `text-white/50`).

---

### 2. Sidebar (AdminNav)

- **Shell:** `glass-sidebar` — full height, fixed left, dark frosted
- **Logo:** "LEEZ" bold white + "ADMIN" rose-400 small caps
- **Nav items:**
  - Inactive: `text-white/60` + white SVG icon
  - Hover: `bg-white/10` rounded pill
  - Active: `glass-strong` pill + `text-white` + rose-400 icon
- **Remove:** Pink left-border indicator, emoji icons — replace all with clean white SVG icons
- **Bottom:** Employee name `text-white/50`, sign out button

**Collapsed groups (6 parent items):**

| Group | Children |
|---|---|
| Dashboard | — (standalone) |
| Catalogue | Products, Inventory |
| Sales | Orders, Payments, POS System |
| Customers | Reviews, Loyalty |
| Team | Employees, Importation |
| Account | Profile, Settings |

- Click group → expands with chevron rotation animation
- Sub-items indented, same hover/active treatment
- Group stays expanded if any child is active

---

### 3. Dashboard Page

**Stat cards (top row — 4 cards):**
- All use `glass-card` — no per-card color tinting
- `text-white/60` label (uppercase, tracked)
- `text-white text-3xl font-bold` number
- Rose-400 icon only (single accent)
- Secondary info folded in as sub-label (e.g. "392 total · 0 pending")
- Remove separate 3-card secondary row (Completed, Pending, Customers)

**Charts row:**
- `glass-card` panels
- White axis/grid lines at `opacity-20`
- Line stroke: rose-400
- Tooltip: dark glass style (`bg-black/80 border border-white/20`)
- Top Products: rank numbers in rose-400, white product names

**Recent Orders table:**
- `glass-card` container
- Header: `text-white/50`
- Row dividers: `border-white/10`
- Status badges: muted colored (e.g. `bg-green-500/20 text-green-300`)

**Stock Alerts:**
- Replace yellow/orange gradient with `glass-card` + `border-l-4 border-rose-400`

**Error banner:**
- `glass-card` + `border-l-4 border-red-400`

---

## What Does NOT Change (Phase 1)

- All other admin pages (orders, products, employees, etc.) — Phase 2
- API routes, data fetching logic
- Authentication flow
- Mobile nav behavior (kept functional, restyled only)

---

## Files to Modify

1. `tailwind.config.js` — add glass plugin utilities
2. `src/app/(admin)/dashboard/layout.tsx` — gradient background
3. `src/components/admin/AdminNav.tsx` — full sidebar restyle + grouped nav
4. `src/app/(admin)/dashboard/page.tsx` — dashboard page restyle
