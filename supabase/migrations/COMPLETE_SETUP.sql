-- ============================================
-- COMPLETE SUPABASE SETUP SCRIPT
-- Copy and paste this ENTIRE script into Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: SCHEMA - Create all tables
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  images TEXT[] DEFAULT '{}',
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory table (critical for stock tracking)
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID UNIQUE NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'seller')),
  employee_code VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  sale_type VARCHAR(10) NOT NULL CHECK (sale_type IN ('online', 'pos')),
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'refunded')),
  payment_method VARCHAR(20) CHECK (payment_method IN ('mpesa', 'card', 'cash')),
  payment_reference VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_provider VARCHAR(50) NOT NULL DEFAULT 'paystack',
  provider_reference VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'reversed')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(provider_reference);
CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to reserve inventory (atomic operation)
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
$$ LANGUAGE plpgsql;

-- Function to release reserved inventory
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
$$ LANGUAGE plpgsql;

-- Function to deduct inventory (atomic operation for completed sales)
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

  -- Deduct from reserved first, then from stock
  IF current_reserved >= p_quantity THEN
    UPDATE inventory
    SET reserved_quantity = reserved_quantity - p_quantity,
        stock_quantity = stock_quantity - p_quantity,
        last_updated = NOW()
    WHERE product_id = p_product_id;
  ELSE
    -- If not enough reserved, deduct from stock directly
    UPDATE inventory
    SET reserved_quantity = 0,
        stock_quantity = stock_quantity - p_quantity,
        last_updated = NOW()
    WHERE product_id = p_product_id
      AND stock_quantity >= p_quantity;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 2: SCHEMA UPDATE - Add missing fields
-- ============================================

-- Add new columns to products table if they don't exist
DO $$ 
BEGIN
  -- Add sale_price column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='products' AND column_name='sale_price') THEN
    ALTER TABLE products ADD COLUMN sale_price DECIMAL(10, 2);
  END IF;

  -- Add status column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='products' AND column_name='status') THEN
    ALTER TABLE products ADD COLUMN status VARCHAR(20) DEFAULT 'active' 
      CHECK (status IN ('active', 'inactive', 'draft'));
  END IF;

  -- Add is_flash_sale column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='products' AND column_name='is_flash_sale') THEN
    ALTER TABLE products ADD COLUMN is_flash_sale BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add flash_sale_start column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='products' AND column_name='flash_sale_start') THEN
    ALTER TABLE products ADD COLUMN flash_sale_start TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add flash_sale_end column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='products' AND column_name='flash_sale_end') THEN
    ALTER TABLE products ADD COLUMN flash_sale_end TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_flash_sale ON products(is_flash_sale) WHERE is_flash_sale = TRUE;

-- ============================================
-- PART 3: RLS POLICIES - Security setup
-- ============================================

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Categories: Public read, Admin/Manager write
CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  USING (true);

CREATE POLICY "Only admins and managers can insert categories"
  ON categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Only admins and managers can update categories"
  ON categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Only admins can delete categories"
  ON categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Products: Public read, Admin/Manager write
CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Only admins and managers can insert products"
  ON products FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Only admins and managers can update products"
  ON products FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Only admins can delete products"
  ON products FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Inventory: Admin/Manager/Seller read, Admin/Manager write
CREATE POLICY "Employees can view inventory"
  ON inventory FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'seller')
    )
    OR true -- Also allow public read for stock checking
  );

CREATE POLICY "Only admins and managers can update inventory"
  ON inventory FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Users: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Employees: Admin only
CREATE POLICY "Only admins can view employees"
  ON employees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can insert employees"
  ON employees FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update employees"
  ON employees FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete employees"
  ON employees FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Orders: Users see own orders, Admin/Manager see all
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins and managers can view all orders"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Sellers can view POS orders they processed"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees e1
      WHERE e1.user_id = auth.uid()
      AND e1.id = orders.seller_id
      AND orders.sale_type = 'pos'
    )
  );

CREATE POLICY "Anyone can create orders (for checkout)"
  ON orders FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Only admins and managers can update orders"
  ON orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Order Items: Same as orders
CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and managers can view all order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Anyone can create order items"
  ON order_items FOR INSERT
  WITH CHECK (true);

-- Transactions: Admin/Manager only
CREATE POLICY "Only admins and managers can view transactions"
  ON transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "System can create transactions"
  ON transactions FOR INSERT
  WITH CHECK (true);

-- ============================================
-- PART 4: MIGRATE DUMMY DATA - Insert products
-- ============================================

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

-- ============================================
-- SETUP COMPLETE!
-- ============================================

