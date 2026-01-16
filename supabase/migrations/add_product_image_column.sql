-- Migration: Add image column to products table
-- This adds a single image URL column for compatibility with code expecting products.image
-- Run this in Supabase SQL Editor

-- Step 1: Add image column
ALTER TABLE products
ADD COLUMN IF NOT EXISTS image TEXT;

-- Step 2: Backfill image from images array if available
UPDATE products
SET image = images[1]
WHERE image IS NULL
  AND images IS NOT NULL
  AND array_length(images, 1) > 0;

-- Step 3: Add comment for documentation
COMMENT ON COLUMN products.image IS 'Primary image URL for product. Backfilled from images[1] when available.';
