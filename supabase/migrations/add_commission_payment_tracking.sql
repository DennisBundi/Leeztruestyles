-- Add last_commission_payment_date column to employees table
-- This tracks when commissions were last paid for each sales person
-- Used to filter dashboard data to show only current week orders after last payment

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS last_commission_payment_date TIMESTAMP WITH TIME ZONE;

-- Add index for efficient queries on sellers with payment dates
CREATE INDEX IF NOT EXISTS idx_employees_last_payment ON employees(last_commission_payment_date) WHERE role = 'seller';

-- Add comment for documentation
COMMENT ON COLUMN employees.last_commission_payment_date IS 'Timestamp when commissions were last marked as paid for this sales person. Used to filter dashboard to show only current week orders after this date.';

