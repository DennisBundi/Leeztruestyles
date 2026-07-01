-- Migration Script: Insert Dummy Data into Supabase
-- Run this AFTER running schema.sql and schema-update.sql
-- This will populate your database with all the dummy products and categories

-- First, insert categories (using UUIDs that match the dummy data)
INSERT INTO categories (id, name, slug, description) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Dresses', 'dresses', 'Beautiful dresses for every occasion'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Jackets', 'jackets', 'Stylish jackets and outerwear'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Accessories', 'accessories', 'Fashion accessories'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Bottoms', 'bottoms', 'Pants, skirts, and shorts'),
  ('550e8400-e29b-41d4-a716-446655440005', 'Shoes', 'shoes', 'Footwear for all occasions'),
  ('550e8400-e29b-41d4-a716-446655440006', 'Tops', 'tops', 'Shirts, blouses, and t-shirts'),
  ('550e8400-e29b-41d4-a716-446655440007', 'Coats', 'coats', 'Winter coats and outerwear')
ON CONFLICT (id) DO NOTHING;

-- Insert products
INSERT INTO products (id, name, description, price, sale_price, images, category_id, status, is_flash_sale, flash_sale_start, flash_sale_end, created_at, updated_at) VALUES
  -- Product 1: Elegant Summer Dress
  ('650e8400-e29b-41d4-a716-446655440001', 
   'Elegant Summer Dress', 
   'Beautiful floral print dress perfect for summer occasions. Made from premium lightweight fabric that keeps you cool and comfortable. Features a flattering A-line silhouette with a cinched waist and flowing skirt. Perfect for garden parties, brunches, or any daytime event.',
   2500.00, 
   2000.00,
   ARRAY[
     'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800',
     'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800',
     'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800',
     'https://images.unsplash.com/photo-1566479179817-4d5b6c4b8e0e?w=800'
   ],
   '550e8400-e29b-41d4-a716-446655440001',
   'active',
   TRUE,
   NOW(),
   NOW() + INTERVAL '7 days',
   NOW(),
   NOW()),

  -- Product 2: Classic Denim Jacket
  ('650e8400-e29b-41d4-a716-446655440002',
   'Classic Denim Jacket',
   'Timeless denim jacket that goes with everything. A wardrobe essential that never goes out of style.',
   3200.00,
   NULL,
   ARRAY[
     'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800',
     'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=800'
   ],
   '550e8400-e29b-41d4-a716-446655440002',
   'active',
   FALSE,
   NULL,
   NULL,
   NOW(),
   NOW()),

  -- Product 3: Designer Handbag
  ('650e8400-e29b-41d4-a716-446655440003',
   'Designer Handbag',
   'Luxury handbag with premium leather finish. Perfect for any occasion.',
   5500.00,
   4500.00,
   ARRAY[
     'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800',
     'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800'
   ],
   '550e8400-e29b-41d4-a716-446655440003',
   'active',
   TRUE,
   NOW(),
   NOW() + INTERVAL '3 days',
   NOW(),
   NOW()),

  -- Product 4: High-Waisted Jeans
  ('650e8400-e29b-41d4-a716-446655440004',
   'High-Waisted Jeans',
   'Comfortable and stylish high-waisted jeans that flatter every figure.',
   2800.00,
   NULL,
   ARRAY[
     'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800',
     'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800'
   ],
   '550e8400-e29b-41d4-a716-446655440004',
   'active',
   FALSE,
   NULL,
   NULL,
   NOW(),
   NOW()),

  -- Product 5: Silk Scarf
  ('650e8400-e29b-41d4-a716-446655440005',
   'Silk Scarf',
   'Elegant silk scarf with vibrant patterns. A versatile accessory.',
   1200.00,
   NULL,
   ARRAY[
     'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800'
   ],
   '550e8400-e29b-41d4-a716-446655440003',
   'active',
   FALSE,
   NULL,
   NULL,
   NOW(),
   NOW()),

  -- Product 6: Leather Ankle Boots
  ('650e8400-e29b-41d4-a716-446655440006',
   'Leather Ankle Boots',
   'Stylish ankle boots perfect for any season. Made from genuine leather.',
   4200.00,
   NULL,
   ARRAY[
     'https://images.unsplash.com/photo-1605812860427-4014434f3048?w=800',
     'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800'
   ],
   '550e8400-e29b-41d4-a716-446655440005',
   'inactive',
   FALSE,
   NULL,
   NULL,
   NOW(),
   NOW()),

  -- Product 7: Casual T-Shirt
  ('650e8400-e29b-41d4-a716-446655440007',
   'Casual T-Shirt',
   'Comfortable cotton t-shirt for everyday wear.',
   1500.00,
   NULL,
   ARRAY[
     'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800',
     'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800'
   ],
   '550e8400-e29b-41d4-a716-446655440006',
   'active',
   FALSE,
   NULL,
   NULL,
   NOW(),
   NOW()),

  -- Product 8: Wool Winter Coat
  ('650e8400-e29b-41d4-a716-446655440008',
   'Wool Winter Coat',
   'Warm and stylish winter coat to keep you cozy.',
   6800.00,
   NULL,
   ARRAY[
     'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800',
     'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=800'
   ],
   '550e8400-e29b-41d4-a716-446655440007',
   'active',
   FALSE,
   NULL,
   NULL,
   NOW(),
   NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert inventory records for each product
INSERT INTO inventory (product_id, stock_quantity, reserved_quantity, last_updated) VALUES
  ('650e8400-e29b-41d4-a716-446655440001', 15, 0, NOW()),
  ('650e8400-e29b-41d4-a716-446655440002', 8, 0, NOW()),
  ('650e8400-e29b-41d4-a716-446655440003', 5, 0, NOW()),
  ('650e8400-e29b-41d4-a716-446655440004', 12, 0, NOW()),
  ('650e8400-e29b-41d4-a716-446655440005', 20, 0, NOW()),
  ('650e8400-e29b-41d4-a716-446655440006', 7, 0, NOW()),
  ('650e8400-e29b-41d4-a716-446655440007', 25, 0, NOW()),
  ('650e8400-e29b-41d4-a716-446655440008', 4, 0, NOW())
ON CONFLICT (product_id) DO UPDATE SET
  stock_quantity = EXCLUDED.stock_quantity,
  last_updated = NOW();

