# Migration Instructions: Buying Price and Size-Based Inventory

## Step 1: Run the Database Migration

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Copy and paste the entire contents of `supabase/migrations/add_buying_price_and_sizes.sql`
4. Click **Run** to execute the migration

This migration will:
- ✅ Add `buying_price` column to the `products` table
- ✅ Create `product_sizes` table for tracking inventory by size (S, M, L, XL)
- ✅ Update `order_items` table to optionally include size
- ✅ Create/update `initialize_product_inventory` function to handle size-based inventory

## Step 2: Verify the Migration

Run this SQL query to verify everything was created correctly:

```sql
-- Check if buying_price column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' AND column_name = 'buying_price';

-- Check if product_sizes table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'product_sizes';

-- Check if function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'initialize_product_inventory';
```

## Step 3: Test Product Creation

1. Go to your admin dashboard
2. Click "Add Product"
3. Fill in the product details including:
   - Buying Price (optional)
   - Regular Price
   - Stock quantities for sizes S, M, L, XL (optional)
4. Create the product

The product should now be created successfully with:
- ✅ Buying price saved (if provided)
- ✅ Size-based inventory initialized (if sizes provided)
- ✅ General inventory initialized (if initial_stock provided)

## Troubleshooting

If you get an error about `buying_price` column not found:
- Make sure you ran the migration SQL in Supabase
- Check that the migration completed successfully
- Try refreshing your Supabase connection

If size stocks are not saving:
- Check the browser console for errors
- Verify the `product_sizes` table was created
- Check that the `initialize_product_inventory` function exists


