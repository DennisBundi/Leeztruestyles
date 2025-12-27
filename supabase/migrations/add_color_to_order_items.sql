-- Migration: Add color column to order_items table
-- Run this in Supabase SQL Editor

-- Step 1: Add color column to order_items table
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS color VARCHAR(50) NULL;

-- Step 2: Add index for performance (optional, but helpful for queries)
CREATE INDEX IF NOT EXISTS idx_order_items_color ON order_items(color) WHERE color IS NOT NULL;

-- Step 3: Add comment
COMMENT ON COLUMN order_items.color IS 'The color of the product ordered. NULL if product has no color or color was not specified.';


