-- Migration: Add extended sizes (2XL-5XL) and product colors table
-- Run this in Supabase SQL Editor

-- Step 1: Drop existing CHECK constraints on product_sizes.size
ALTER TABLE product_sizes 
DROP CONSTRAINT IF EXISTS product_sizes_size_check;

-- Step 2: Add new CHECK constraint with extended sizes
ALTER TABLE product_sizes 
ADD CONSTRAINT product_sizes_size_check 
CHECK (size IN ('S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'));

-- Step 3: Update comment on product_sizes table
COMMENT ON TABLE product_sizes IS 'Tracks inventory quantities for each size (S, M, L, XL, 2XL, 3XL, 4XL, 5XL) of a product';

-- Step 4: Drop existing CHECK constraint on order_items.size
ALTER TABLE order_items 
DROP CONSTRAINT IF EXISTS order_items_size_check;

-- Step 5: Add new CHECK constraint with extended sizes to order_items
ALTER TABLE order_items 
ADD CONSTRAINT order_items_size_check 
CHECK (size IS NULL OR size IN ('S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'));

-- Step 6: Update comment on order_items.size
COMMENT ON COLUMN order_items.size IS 'The size of the product ordered (S, M, L, XL, 2XL, 3XL, 4XL, 5XL). NULL if product has no sizes.';

-- Step 7: Update initialize_product_inventory function to accept extended sizes
CREATE OR REPLACE FUNCTION initialize_product_inventory(
  p_product_id UUID,
  p_initial_stock INTEGER DEFAULT 0,
  p_size_stocks JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  size_key TEXT;
  size_value TEXT;
  size_value_int INTEGER;
BEGIN
  -- Initialize main inventory record (for backward compatibility)
  INSERT INTO inventory (product_id, stock_quantity, reserved_quantity)
  VALUES (p_product_id, p_initial_stock, 0)
  ON CONFLICT (product_id) DO UPDATE
  SET stock_quantity = inventory.stock_quantity + p_initial_stock,
      last_updated = NOW();

  -- Initialize size-based inventory if provided
  IF p_size_stocks IS NOT NULL AND jsonb_typeof(p_size_stocks) = 'object' THEN
    FOR size_key, size_value IN SELECT * FROM jsonb_each_text(p_size_stocks)
    LOOP
      -- Validate size and convert value to integer (now includes extended sizes)
      IF size_key IN ('S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL') THEN
        size_value_int := size_value::INTEGER;
        IF size_value_int > 0 THEN
          INSERT INTO product_sizes (product_id, size, stock_quantity, reserved_quantity)
          VALUES (p_product_id, size_key, size_value_int, 0)
          ON CONFLICT (product_id, size) DO UPDATE
          SET stock_quantity = product_sizes.stock_quantity + size_value_int,
              last_updated = NOW();
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error initializing inventory: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create product_colors table for storing product color associations
CREATE TABLE IF NOT EXISTS product_colors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, color)
);

-- Step 9: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_colors_product ON product_colors(product_id);
CREATE INDEX IF NOT EXISTS idx_product_colors_color ON product_colors(color);

-- Step 10: Add comment
COMMENT ON TABLE product_colors IS 'Stores color associations for products. Allows multiple colors per product.';

