-- ============================================
-- COMMISSION COLUMN MIGRATION
-- Copy and paste this ENTIRE script into Supabase SQL Editor
-- ============================================

-- Add commission column to orders table
-- Commission is 3% of total_amount for POS sales by sellers
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS commission DECIMAL(10, 2) DEFAULT 0;

-- Add index for commission queries (improves performance)
CREATE INDEX IF NOT EXISTS idx_orders_seller_commission 
ON orders(seller_id, commission) 
WHERE commission > 0;

-- Add comment for documentation
COMMENT ON COLUMN orders.commission IS 'Commission earned by seller (3% of total_amount for POS sales)';

-- Verify the column was added successfully
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name = 'commission';

-- Expected result: Should show one row with commission column details
-- If you see the row, the migration was successful!





