-- ============================================
-- FIX: Reset leaked reserved_quantity values
-- ============================================
-- Problem: reserved_quantity was never decremented for abandoned payments,
-- causing all products to show "Insufficient stock" over time.
--
-- Fix: Reset reserved_quantity to 0 for all inventory and product_sizes rows.
-- The application no longer reserves stock at payment initiation —
-- it only checks availability and deducts on confirmed payment.
-- ============================================

-- Reset general inventory reserved quantities
UPDATE inventory
SET reserved_quantity = 0,
    last_updated = NOW()
WHERE reserved_quantity > 0;

-- Reset product_sizes reserved quantities
UPDATE product_sizes
SET reserved_quantity = 0
WHERE reserved_quantity > 0;

-- Reset product_size_colors reserved quantities (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_size_colors') THEN
    EXECUTE 'UPDATE product_size_colors SET reserved_quantity = 0 WHERE reserved_quantity > 0';
  END IF;
END $$;

-- Also add SECURITY DEFINER to reserve_inventory and deduct_inventory
-- so they work correctly when called via service role
CREATE OR REPLACE FUNCTION reserve_inventory(
  p_product_id UUID,
  p_quantity INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  available_stock INTEGER;
BEGIN
  SELECT (stock_quantity - reserved_quantity) INTO available_stock
  FROM inventory
  WHERE product_id = p_product_id
  FOR UPDATE;

  IF available_stock IS NULL OR available_stock < p_quantity THEN
    RETURN FALSE;
  END IF;

  UPDATE inventory
  SET reserved_quantity = reserved_quantity + p_quantity,
      last_updated = NOW()
  WHERE product_id = p_product_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION release_inventory(
  p_product_id UUID,
  p_quantity INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE inventory
  SET reserved_quantity = GREATEST(0, reserved_quantity - p_quantity),
      last_updated = NOW()
  WHERE product_id = p_product_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION deduct_inventory(
  p_product_id UUID,
  p_quantity INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  current_reserved INTEGER;
BEGIN
  SELECT reserved_quantity INTO current_reserved
  FROM inventory
  WHERE product_id = p_product_id
  FOR UPDATE;

  IF current_reserved IS NULL THEN
    RETURN FALSE;
  END IF;

  IF current_reserved >= p_quantity THEN
    UPDATE inventory
    SET reserved_quantity = reserved_quantity - p_quantity,
        stock_quantity = stock_quantity - p_quantity,
        last_updated = NOW()
    WHERE product_id = p_product_id;
  ELSE
    UPDATE inventory
    SET reserved_quantity = 0,
        stock_quantity = GREATEST(0, stock_quantity - p_quantity),
        last_updated = NOW()
    WHERE product_id = p_product_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
