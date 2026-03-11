# Importation Section Theme Reskin — Design

**Date:** 2026-03-11
**Status:** Approved

## Overview

Restyle the "Direct Importation Service" section on `/about` to match the project's pink theme colours. Currently uses a hard-coded dark navy/indigo gradient (`#0f172a → #1e1b4b`) with indigo accents, which is visually disconnected from the brand palette.

## Approach

Deep pink gradient (Approach A) — keeps the section bold and standout as a CTA while swapping indigo for brand pink.

## Colour Changes

| Element | Before | After |
|---|---|---|
| Section background | `style` inline `#0f172a → #1e1b4b` + `border-indigo-700/30` | `bg-gradient-to-br from-secondary-dark to-primary-dark` + `border-white/20` |
| Icon container | `bg-white/10` | `bg-white/20` |
| Icon color | `text-indigo-300` | `text-white` |
| Body text | `text-indigo-200` | `text-pink-100` |
| Sub-label text | `text-indigo-300` | `text-pink-200` |
| Primary button | `bg-indigo-600 hover:bg-indigo-500 text-white` | `bg-white text-secondary hover:bg-pink-50` |
| Secondary button | unchanged | unchanged |
| Feature grid items | `bg-white/10` | `bg-white/15` |

## Files Changed

| File | Change |
|---|---|
| `src/app/(marketplace)/about/page.tsx` | Colour class swaps in the importation section only (lines ~206-259) |

## Out of Scope

- No content changes
- No layout or structure changes
- No other sections on the page
