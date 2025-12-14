-- ============================================
-- FIX: Inventory Not Being Created
-- Run this to fix the initialize_product_inventory function
-- ============================================
-- 
-- The issue: Function doesn't have SECURITY DEFINER, so RLS policies block it
-- The fix: Add SECURITY DEFINER to bypass RLS when function runs
-- ============================================

-- Step 1: Update the function with SECURITY DEFINER
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

-- Step 2: Also add INSERT policy for inventory (backup, in case function still has issues)
CREATE POLICY IF NOT EXISTS "Admins and managers can insert inventory"
  ON inventory FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Step 3: Add INSERT policy for product_sizes
CREATE POLICY IF NOT EXISTS "Admins and managers can insert product sizes"
  ON product_sizes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Step 4: Add DELETE policy for product_sizes (needed for clearing sizes)
CREATE POLICY IF NOT EXISTS "Admins and managers can delete product sizes"
  ON product_sizes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- ============================================
-- VERIFICATION: Check if function was updated
-- ============================================
-- SELECT 
--   routine_name,
--   security_type
-- FROM information_schema.routines 
-- WHERE routine_name = 'initialize_product_inventory';
--
-- Should show: security_type = 'DEFINER'
-- ============================================



