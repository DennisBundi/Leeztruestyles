-- Add missing columns to products table for flash sales and status

-- Add sale_price column
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10, 2);

-- Add status column
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' 
CHECK (status IN ('active', 'inactive'));

-- Add flash sale columns
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_flash_sale BOOLEAN DEFAULT FALSE;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS flash_sale_start TIMESTAMP WITH TIME ZONE;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS flash_sale_end TIMESTAMP WITH TIME ZONE;

-- Add inventory insert policy (needed for product creation)
CREATE POLICY IF NOT EXISTS "Admins and managers can insert inventory"
  ON inventory FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;
