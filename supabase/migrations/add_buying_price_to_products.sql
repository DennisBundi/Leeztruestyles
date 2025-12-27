-- Migration: Add buying_price column to products table
-- This allows tracking the cost price of products for profit calculation

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS buying_price DECIMAL(10, 2) NULL;

-- Add a comment to explain the column
COMMENT ON COLUMN products.buying_price IS 'The cost price at which the product was purchased. Used for profit tracking.';






