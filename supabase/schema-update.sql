-- Schema Update: Add missing fields to products table
-- Run this AFTER running schema.sql

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
