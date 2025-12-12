-- ============================================
-- URGENT FIX: Inventory Function Returning False
-- Run this in Supabase SQL Editor NOW
-- ============================================

-- Step 1: Update function with SECURITY DEFINER (CRITICAL - bypasses RLS)
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
  -- Set main inventory record
  INSERT INTO inventory (product_id, stock_quantity, reserved_quantity)
  VALUES (p_product_id, p_initial_stock, 0)
  ON CONFLICT (product_id) DO UPDATE
  SET stock_quantity = p_initial_stock,
      last_updated = NOW();

  -- Store size breakdown
  IF p_size_stocks IS NOT NULL AND jsonb_typeof(p_size_stocks) = 'object' THEN
    DELETE FROM product_sizes WHERE product_id = p_product_id;
    
    FOR size_key, size_value IN SELECT * FROM jsonb_each_text(p_size_stocks)
    LOOP
      IF size_key IN ('S', 'M', 'L', 'XL') THEN
        BEGIN
          size_value_int := size_value::INTEGER;
          IF size_value_int > 0 THEN
            INSERT INTO product_sizes (product_id, size, stock_quantity, reserved_quantity)
            VALUES (p_product_id, size_key, size_value_int, 0);
          END IF;
        EXCEPTION
          WHEN OTHERS THEN
            CONTINUE;
        END;
      END IF;
    END LOOP;
  ELSE
    DELETE FROM product_sizes WHERE product_id = p_product_id;
  END IF;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Inventory initialization failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Grant execute permissions
GRANT EXECUTE ON FUNCTION initialize_product_inventory TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_product_inventory TO anon;
GRANT EXECUTE ON FUNCTION initialize_product_inventory TO service_role;

-- Step 3: Fix existing products without inventory
INSERT INTO inventory (product_id, stock_quantity, reserved_quantity)
SELECT p.id, 0, 0
FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM inventory i WHERE i.product_id = p.id
)
ON CONFLICT (product_id) DO NOTHING;

-- ============================================
-- VERIFY: Run this to check
-- ============================================
-- SELECT routine_name, security_type
-- FROM information_schema.routines 
-- WHERE routine_name = 'initialize_product_inventory';
-- Should show: security_type = 'DEFINER'
-- ============================================


