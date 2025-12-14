-- ============================================
-- VERIFICATION: Check if migration was run
-- Run this to verify the buying_price column exists
-- ============================================

-- Check if buying_price column exists
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name = 'buying_price';

-- Expected result: 
-- buying_price | numeric | YES

-- ============================================
-- If you see NO ROWS, the migration hasn't been run!
-- Run: supabase/migrations/RUN_THIS_NOW.sql
-- ============================================

-- Also check if product_sizes table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'product_sizes';

-- Expected result:
-- product_sizes

-- ============================================
-- Check if function exists
-- ============================================
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'initialize_product_inventory';

-- Expected result:
-- initialize_product_inventory



