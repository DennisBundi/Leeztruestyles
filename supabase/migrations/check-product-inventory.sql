-- Check which products have inventory and which don't
SELECT 
  p.id,
  p.name,
  p.status,
  p.created_at,
  i.stock_quantity,
  i.reserved_quantity,
  CASE 
    WHEN i.product_id IS NULL THEN 'No Inventory Record'
    WHEN i.stock_quantity = 0 THEN 'Out of Stock'
    WHEN i.stock_quantity < 10 THEN 'Low Stock'
    ELSE 'In Stock'
  END as stock_status
FROM products p
LEFT JOIN inventory i ON i.product_id = p.id
ORDER BY p.created_at DESC;

-- If you see products with "No Inventory Record", run this to create them:
-- (This will initialize inventory for products that don't have it)

INSERT INTO inventory (product_id, stock_quantity, reserved_quantity)
SELECT p.id, 0, 0
FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM inventory i WHERE i.product_id = p.id
);

-- After running the above, verify all products now have inventory:
SELECT 
  COUNT(*) as total_products,
  COUNT(i.product_id) as products_with_inventory,
  COUNT(*) - COUNT(i.product_id) as products_without_inventory
FROM products p
LEFT JOIN inventory i ON i.product_id = p.id;
