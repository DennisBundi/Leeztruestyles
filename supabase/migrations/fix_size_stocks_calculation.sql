-- Migration: Fix size stocks calculation from color stocks
-- When color_stocks is provided, calculate size_stocks by summing all color stocks per size
-- Replace (not add) size stocks when color stocks are provided

CREATE OR REPLACE FUNCTION initialize_product_inventory(
  p_product_id UUID,
  p_initial_stock INTEGER DEFAULT 0,
  p_size_stocks JSONB DEFAULT NULL,
  p_color_stocks JSONB DEFAULT NULL
) RETURNS BOOLEAN AS $$
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
  calculated_size_stocks JSONB := '{}'::JSONB;
  calculated_size_key TEXT;
  calculated_size_value INTEGER;
BEGIN
  -- Update main inventory record
  INSERT INTO inventory (product_id, stock_quantity, reserved_quantity, last_updated)
  VALUES (p_product_id, p_initial_stock, 0, NOW())
  ON CONFLICT (product_id) DO UPDATE
  SET stock_quantity = p_initial_stock,
      last_updated = NOW();

  -- If color_stocks is provided, calculate size_stocks from color_stocks
  IF p_color_stocks IS NOT NULL AND jsonb_typeof(p_color_stocks) = 'object' THEN
    -- First, delete existing color inventory
    DELETE FROM product_size_colors WHERE product_id = p_product_id;

    -- Process color_stocks and calculate size_stocks simultaneously
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
              -- Insert into product_size_colors
              INSERT INTO product_size_colors (product_id, size, color, stock_quantity, reserved_quantity)
              VALUES (p_product_id, color_size_key, color_key, color_size_value_int, 0)
              ON CONFLICT (product_id, size, color) DO UPDATE
              SET stock_quantity = EXCLUDED.stock_quantity,
                  updated_at = NOW();

              -- Calculate size stocks: sum all color stocks for each size
              calculated_size_value := (calculated_size_stocks->>color_size_key)::INTEGER;
              IF calculated_size_value IS NULL THEN
                calculated_size_value := 0;
              END IF;
              calculated_size_stocks := calculated_size_stocks || jsonb_build_object(color_size_key, calculated_size_value + color_size_value_int);
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

    -- Use calculated size stocks (replace existing)
    IF jsonb_object_keys(calculated_size_stocks) IS NOT NULL THEN
      -- Delete existing sizes first
      DELETE FROM product_sizes WHERE product_id = p_product_id;

      -- Insert calculated size stocks
      FOR calculated_size_key, calculated_size_value IN SELECT * FROM jsonb_each_text(calculated_size_stocks)
      LOOP
        IF calculated_size_key IN ('S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL') THEN
          calculated_size_value_int := calculated_size_value::INTEGER;
          IF calculated_size_value_int > 0 THEN
            INSERT INTO product_sizes (product_id, size, stock_quantity, reserved_quantity)
            VALUES (p_product_id, calculated_size_key, calculated_size_value_int, 0)
            ON CONFLICT (product_id, size) DO UPDATE
            SET stock_quantity = EXCLUDED.stock_quantity,
                last_updated = NOW();
          END IF;
        END IF;
      END LOOP;
    END IF;
  ELSIF p_size_stocks IS NOT NULL AND jsonb_typeof(p_size_stocks) = 'object' THEN
    -- Only use provided size_stocks if color_stocks is NOT provided
    -- Delete existing sizes first
    DELETE FROM product_sizes WHERE product_id = p_product_id;

    FOR size_key, size_value IN SELECT * FROM jsonb_each_text(p_size_stocks)
    LOOP
      -- Validate size and convert value to integer
      IF size_key IN ('S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL') THEN
        size_value_int := size_value::INTEGER;
        IF size_value_int > 0 THEN
          INSERT INTO product_sizes (product_id, size, stock_quantity, reserved_quantity)
          VALUES (p_product_id, size_key, size_value_int, 0)
          ON CONFLICT (product_id, size) DO UPDATE
          SET stock_quantity = EXCLUDED.stock_quantity,
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

