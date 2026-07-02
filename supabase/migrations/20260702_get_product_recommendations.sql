CREATE OR REPLACE FUNCTION get_product_recommendations(
  p_product_id UUID,
  p_limit INT DEFAULT 4
)
RETURNS TABLE (
  id UUID, name TEXT, price NUMERIC, sale_price NUMERIC,
  images TEXT[], is_flash_sale BOOLEAN, category_id UUID
)
LANGUAGE sql STABLE AS $$
  SELECT
    p.id, p.name, p.price, p.sale_price,
    p.images, p.is_flash_sale, p.category_id
  FROM products p
  LEFT JOIN order_items oi ON oi.product_id = p.id
  WHERE
    p.category_id = (SELECT category_id FROM products WHERE id = p_product_id)
    AND p.id != p_product_id
    AND p.status = 'active'
    AND EXISTS (
      SELECT 1 FROM inventory i
      WHERE i.product_id = p.id AND i.stock_quantity > 0
    )
  GROUP BY p.id
  ORDER BY COUNT(oi.id) DESC, p.created_at DESC
  LIMIT p_limit;
$$;
