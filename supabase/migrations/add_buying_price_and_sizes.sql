-- Migration: Add buying_price column and size-based inventory support
-- Run this in Supabase SQL Editor

-- Step 1: Add buying_price column to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS buying_price DECIMAL(10, 2) NULL;

-- Add a comment to explain the column
COMMENT ON COLUMN products.buying_price IS 'The cost price at which the product was purchased. Used for profit tracking.';

-- Step 2: Create product_sizes table for size-based inventory
CREATE TABLE IF NOT EXISTS product_sizes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size VARCHAR(10) NOT NULL CHECK (size IN ('S', 'M', 'L', 'XL')),
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, size)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_sizes_product ON product_sizes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sizes_size ON product_sizes(size);

-- Add comment
COMMENT ON TABLE product_sizes IS 'Tracks inventory quantities for each size (S, M, L, XL) of a product';

-- Step 3: Create function to initialize product inventory with sizes
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
      -- Validate size and convert value to integer
      IF size_key IN ('S', 'M', 'L', 'XL') THEN
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

-- Step 4: Update order_items to include size (optional, for future use)
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS size VARCHAR(10) NULL CHECK (size IS NULL OR size IN ('S', 'M', 'L', 'XL'));

COMMENT ON COLUMN order_items.size IS 'The size of the product ordered (S, M, L, XL). NULL if product has no sizes.';

