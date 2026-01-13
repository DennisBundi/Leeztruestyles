-- Migration: Add source column to products table
-- This tracks whether products were created from admin modal or POS system
-- Run this in Supabase SQL Editor

-- Step 1: Add source column with default 'admin'
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'admin' 
CHECK (source IN ('admin', 'pos'));

-- Step 2: Update existing products based on images
-- Products with images → source = 'admin'
UPDATE products 
SET source = 'admin' 
WHERE (images IS NOT NULL AND array_length(images, 1) > 0);

-- Products without images → source = 'pos'
UPDATE products 
SET source = 'pos' 
WHERE (images IS NULL OR array_length(images, 1) = 0 OR array_length(images, 1) IS NULL);

-- Step 3: Add index for performance
CREATE INDEX IF NOT EXISTS idx_products_source ON products(source);

-- Step 4: Add comment for documentation
COMMENT ON COLUMN products.source IS 'Tracks product origin: admin (created from admin modal) or pos (created from POS custom products)';
