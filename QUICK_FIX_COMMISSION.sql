-- QUICK FIX: Add commission column to orders table
-- Copy and paste this into Supabase SQL Editor and run it

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS commission DECIMAL(10, 2) DEFAULT 0;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'commission';



