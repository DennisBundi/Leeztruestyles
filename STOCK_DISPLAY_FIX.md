# ✅ Stock Display Fix

## The Problem

Stock quantities were not showing on the products dashboard because:

1. When products are created with size-based inventory (S, M, L, XL), the stock is stored in the `product_sizes` table
2. The GET endpoint was only looking at the `inventory` table
3. If a product only had size-based inventory, the stock would show as 0

## The Fix

I've updated `/api/products/route.ts` GET endpoint to:

1. ✅ Fetch stock from both `inventory` table (general stock)
2. ✅ Fetch stock from `product_sizes` table (size-based stock: S, M, L, XL)
3. ✅ Sum up the total stock from both sources
4. ✅ Calculate available stock correctly (total stock - reserved stock)

## How It Works Now

### When Creating a Product:

- **General Stock**: Stored in `inventory` table
- **Size-Based Stock**: Stored in `product_sizes` table (S, M, L, XL)

### When Displaying Products:

- The API now sums:
  - Stock from `inventory` table
  - Stock from `product_sizes` table (sum of all sizes)
- Total stock = General stock + (S + M + L + XL)

## Example

If you create a product with:

- General stock: 10
- Size S: 2
- Size M: 3
- Size L: 3
- Size XL: 2

**Total stock displayed**: 10 + 2 + 3 + 3 + 2 = **20 pieces**

## Testing

1. Create a new product with size-based inventory
2. Go to Products dashboard
3. Check the "Stock" column - it should now show the total count

## If Stock Still Shows 0

1. **Check if inventory was created**: Run this in Supabase SQL Editor:

   ```sql
   SELECT p.name, i.stock_quantity,
          (SELECT SUM(stock_quantity) FROM product_sizes WHERE product_id = p.id) as size_stock
   FROM products p
   LEFT JOIN inventory i ON i.product_id = p.id
   ORDER BY p.created_at DESC
   LIMIT 5;
   ```

2. **Check if the function ran**: Look at your terminal/console when creating a product. You should see:

   ```
   Initializing inventory for product <id> with stock: X and sizes: {...}
   Successfully created inventory for product <id>
   ```

3. **If inventory wasn't created**: The `initialize_product_inventory` function might have failed. Check the terminal for error messages.

## Next Steps

The stock should now display correctly. If you still see issues:

1. Refresh the products page
2. Check the browser console for any errors
3. Verify the inventory exists in the database using the SQL query above
