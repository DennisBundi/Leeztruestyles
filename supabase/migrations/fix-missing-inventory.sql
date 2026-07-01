-- Step 1: Check RLS policies on inventory table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'inventory';

-- Step 2: Ensure the INSERT policy exists for inventory
-- (This should already exist from earlier, but let's make sure)
CREATE POLICY IF NOT EXISTS "Admins and managers can insert inventory"
  ON inventory FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Step 3: Fix existing products - create missing inventory records
-- This will create inventory records for the 3 products that are missing them
INSERT INTO inventory (product_id, stock_quantity, reserved_quantity)
SELECT p.id, 0, 0
FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM inventory i WHERE i.product_id = p.id
)
ON CONFLICT (product_id) DO NOTHING;

-- Step 4: Verify all products now have inventory
SELECT 
  p.name,
  p.created_at,
  COALESCE(i.stock_quantity, 0) as stock,
  COALESCE(i.reserved_quantity, 0) as reserved,
  CASE 
    WHEN i.product_id IS NULL THEN '❌ Missing Inventory'
    WHEN i.stock_quantity = 0 THEN '⚠️ Zero Stock'
    ELSE '✅ Has Stock'
  END as status
FROM products p
LEFT JOIN inventory i ON i.product_id = p.id
ORDER BY p.created_at DESC;
