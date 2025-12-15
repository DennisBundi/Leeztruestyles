# Commission System Setup

## Overview
A 3% commission system has been implemented for sales persons on all POS sales (both custom products and regular products).

## Database Migration Required

**IMPORTANT**: You need to run the migration to add the `commission` column to the `orders` table.

### Step 1: Run the Migration

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the following SQL:

```sql
-- Add commission column to orders table
-- Commission is 3% of total_amount for POS sales by sellers

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS commission DECIMAL(10, 2) DEFAULT 0;

-- Add index for commission queries
CREATE INDEX IF NOT EXISTS idx_orders_seller_commission ON orders(seller_id, commission) WHERE commission > 0;

-- Add comment
COMMENT ON COLUMN orders.commission IS 'Commission earned by seller (3% of total_amount for POS sales)';
```

4. Click "Run" to execute the migration

## Features Implemented

### 1. Commission Calculation
- **3% commission** is automatically calculated for all POS sales
- Applies to both:
  - Regular products sold through POS
  - Custom products created and sold through POS
- Commission is stored in the `orders` table when an order is created

### 2. Settings Page (Dashboard)
- **For Sellers**: Shows "Total Commission" instead of "Total Sales"
- **For Sellers**: Shows "Commission This Week" instead of "Sales This Week"
- **For Admins/Managers**: Shows total sales as before
- Displays commission with a note: "3% of total sales"

### 3. Orders Page
- **For Sellers**: 
  - "Total Revenue" card shows "Total Commission" instead
  - Table column header shows "Commission" instead of "Amount"
  - Each order shows commission amount with original sale amount as subtitle
- **For Admins/Managers**: 
  - Shows total revenue as before
  - Commission is shown as a subtitle under the amount (if applicable)

### 4. API Updates
- `/api/orders/create`: Calculates and stores commission (3% of total) for POS orders
- `/api/dashboard/user-stats`: Returns commission data for sellers
- `/api/orders`: Includes commission in order data

## How It Works

1. When a sales person completes a sale in POS:
   - Order is created with `sale_type: "pos"`
   - `seller_id` is set to the sales person's employee ID
   - Commission is calculated: `total_amount * 0.03` (3%)
   - Commission is stored in the `commission` column

2. On the Settings page:
   - Sellers see their total commission earned
   - Admins see total sales (as before)

3. On the Orders page:
   - Sellers see commission per order
   - Total commission is shown in the stats card
   - Admins see all amounts with commission as additional info

## Testing

After running the migration:

1. **As a Sales Person**:
   - Complete a POS sale
   - Check Settings page - should show "Total Commission"
   - Check Orders page - should show commission per order

2. **As an Admin**:
   - View Orders page - should show amounts with commission info
   - View Settings page - should show total sales

## Notes

- Commission is only calculated for POS sales (`sale_type: "pos"`)
- Commission is 3% of the total order amount
- Commission is stored at the order level, not per item
- Historical orders (created before this update) will have `commission = 0` by default





