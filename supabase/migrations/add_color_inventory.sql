-- Migration: Add color-based inventory tracking
-- This allows tracking inventory quantities per color and size+color combinations

-- Step 1: Create product_size_colors table
CREATE TABLE IF NOT EXISTS product_size_colors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size VARCHAR(10) NULL CHECK (size IS NULL OR size IN ('S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL')),
  color VARCHAR(50) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, size, color)
);

-- Step 2: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_size_colors_product ON product_size_colors(product_id);
CREATE INDEX IF NOT EXISTS idx_product_size_colors_size ON product_size_colors(product_id, size) WHERE size IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_size_colors_color ON product_size_colors(product_id, color);
CREATE INDEX IF NOT EXISTS idx_product_size_colors_combo ON product_size_colors(product_id, size, color);

-- Step 3: Add comments
COMMENT ON TABLE product_size_colors IS 'Tracks inventory quantities for each color and size+color combination. Size is NULL for products without sizes.';
COMMENT ON COLUMN product_size_colors.size IS 'The size of the product (S, M, L, XL, 2XL, 3XL, 4XL, 5XL). NULL if product has no sizes.';
COMMENT ON COLUMN product_size_colors.color IS 'The color of the product. Required.';
COMMENT ON COLUMN product_size_colors.stock_quantity IS 'Available stock quantity for this size+color combination.';
COMMENT ON COLUMN product_size_colors.reserved_quantity IS 'Reserved stock quantity (e.g., in pending orders).';

-- Step 4: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_size_colors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to auto-update updated_at
CREATE TRIGGER update_product_size_colors_updated_at
  BEFORE UPDATE ON product_size_colors
  FOR EACH ROW
  EXECUTE FUNCTION update_product_size_colors_updated_at();

-- Step 6: Update initialize_product_inventory function to accept color_stocks
CREATE OR REPLACE FUNCTION initialize_product_inventory(
  p_product_id UUID,
  p_initial_stock INTEGER DEFAULT 0,
  p_size_stocks JSONB DEFAULT NULL,
  p_color_stocks JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  size_key TEXT;
  size_value TEXT;
  size_value_int INTEGER;
  color_key TEXT;
  color_value JSONB;
  color_value_int INTEGER;
  color_size_key TEXT;
  color_size_value TEXT;
  color_size_value_int INTEGER;
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

  -- Initialize color-based inventory if provided
  IF p_color_stocks IS NOT NULL AND jsonb_typeof(p_color_stocks) = 'object' THEN
    -- Delete existing color inventory first to handle updates
    DELETE FROM product_size_colors WHERE product_id = p_product_id;

    FOR color_key, color_value IN SELECT * FROM jsonb_each(p_color_stocks)
    LOOP
      -- Check if color_value is an object (size+color combination) or number (color only)
      IF jsonb_typeof(color_value) = 'object' THEN
        -- Handle size+color combinations: { "Red": { "M": 5, "L": 3 } }
        FOR color_size_key, color_size_value IN SELECT * FROM jsonb_each_text(color_value)
        LOOP
          -- Validate size and convert value to integer
          IF color_size_key IN ('S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL') THEN
            color_size_value_int := color_size_value::INTEGER;
            IF color_size_value_int > 0 THEN
              INSERT INTO product_size_colors (product_id, size, color, stock_quantity, reserved_quantity)
              VALUES (p_product_id, color_size_key, color_key, color_size_value_int, 0)
              ON CONFLICT (product_id, size, color) DO UPDATE
              SET stock_quantity = EXCLUDED.stock_quantity,
                  updated_at = NOW();
            END IF;
          END IF;
        END LOOP;
      ELSIF jsonb_typeof(color_value) = 'number' THEN
        -- Handle color-only inventory: { "Red": 10, "Blue": 5 }
        color_value_int := (color_value::text)::INTEGER;
        IF color_value_int > 0 THEN
          INSERT INTO product_size_colors (product_id, size, color, stock_quantity, reserved_quantity)
          VALUES (p_product_id, NULL, color_key, color_value_int, 0)
          ON CONFLICT (product_id, size, color) DO UPDATE
          SET stock_quantity = EXCLUDED.stock_quantity,
              updated_at = NOW();
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


