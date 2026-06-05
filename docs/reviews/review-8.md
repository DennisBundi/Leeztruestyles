# PR Review: fix: reduce hero section height to 60vh (#8)

## Summary

This is a minimal, focused change: a single Tailwind class replacement on the hero `<section>` element in `src/app/(marketplace)/home/page.tsx`. The old value `min-h-[80vh] md:min-h-screen` is replaced with `min-h-[60vh]`, removing the full-screen breakpoint variant and uniformly applying a 60 vh minimum height on all viewports. The change is purely cosmetic/layout with no logic, type, security, or test implications.

## Findings

No issues found. This change is clean and safe to merge.
