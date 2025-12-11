-- Update initialize_product_inventory function to SET stock instead of ADD when updating
-- This ensures sizes are a breakdown of the total stock, not additional stock

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
  -- Set main inventory record (SET, not ADD, so sizes are breakdown, not additional)
  INSERT INTO inventory (product_id, stock_quantity, reserved_quantity)
  VALUES (p_product_id, p_initial_stock, 0)
  ON CONFLICT (product_id) DO UPDATE
  SET stock_quantity = p_initial_stock,  -- SET to new value, not add
      last_updated = NOW();

  -- Store size breakdown (this is just for tracking, not additional stock)
  -- Clear existing sizes first, then insert new ones
  IF p_size_stocks IS NOT NULL AND jsonb_typeof(p_size_stocks) = 'object' THEN
    -- Delete existing sizes for this product
    DELETE FROM product_sizes WHERE product_id = p_product_id;
    
    -- Insert new size breakdown
    FOR size_key, size_value IN SELECT * FROM jsonb_each_text(p_size_stocks)
    LOOP
      -- Validate size and convert value to integer
      IF size_key IN ('S', 'M', 'L', 'XL') THEN
        BEGIN
          size_value_int := size_value::INTEGER;
          IF size_value_int > 0 THEN
            INSERT INTO product_sizes (product_id, size, stock_quantity, reserved_quantity)
            VALUES (p_product_id, size_key, size_value_int, 0);
          END IF;
        EXCEPTION
          WHEN OTHERS THEN
            -- Skip invalid size values
            CONTINUE;
        END;
      END IF;
    END LOOP;
  ELSE
    -- If no sizes provided, clear existing sizes
    DELETE FROM product_sizes WHERE product_id = p_product_id;
  END IF;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error initializing inventory: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

