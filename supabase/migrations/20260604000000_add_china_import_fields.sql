-- Add China import fields to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_china_import boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS lead_time_days   integer DEFAULT null;

CREATE INDEX IF NOT EXISTS idx_products_china
  ON products (is_china_import)
  WHERE is_china_import = true;
