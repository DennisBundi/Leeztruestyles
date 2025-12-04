-- Row Level Security Policies

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

-- Note: Inventory deduction is handled via database functions which bypass RLS
-- This is intentional for atomic operations

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

