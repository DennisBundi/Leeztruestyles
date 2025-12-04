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

