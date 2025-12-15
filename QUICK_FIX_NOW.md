# ⚡ QUICK FIX - Run This NOW

## The Error
```
PGRST204: Could not find the 'buying_price' column of 'products' in the schema cache
```

## ✅ FIX IN 2 MINUTES

### 1. Open Supabase SQL Editor
**Click here:** https://supabase.com/dashboard/project/pklbqruulnpalzxurznr/sql/new

### 2. Copy This SQL (The ENTIRE Block Below)

```sql
-- Add buying_price column
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS buying_price DECIMAL(10, 2) NULL;

-- Create product_sizes table
CREATE TABLE IF NOT EXISTS product_sizes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size VARCHAR(10) NOT NULL CHECK (size IN ('S', 'M', 'L', 'XL')),
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, size)
);

CREATE INDEX IF NOT EXISTS idx_product_sizes_product ON product_sizes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sizes_size ON product_sizes(size);

-- Update function
CREATE OR REPLACE FUNCTION initialize_product_inventory(
  p_product_id UUID,
  p_initial_stock INTEGER DEFAULT 0,
  p_size_stocks JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  size_key TEXT;
  size_value TEXT;
  size_value_int INTEGER;
BEGIN
  INSERT INTO inventory (product_id, stock_quantity, reserved_quantity)
  VALUES (p_product_id, p_initial_stock, 0)
  ON CONFLICT (product_id) DO UPDATE
  SET stock_quantity = inventory.stock_quantity + p_initial_stock,
      last_updated = NOW();

  IF p_size_stocks IS NOT NULL AND jsonb_typeof(p_size_stocks) = 'object' THEN
    FOR size_key, size_value IN SELECT * FROM jsonb_each_text(p_size_stocks)
    LOOP
      IF size_key IN ('S', 'M', 'L', 'XL') THEN
        BEGIN
          size_value_int := size_value::INTEGER;
          IF size_value_int > 0 THEN
            INSERT INTO product_sizes (product_id, size, stock_quantity, reserved_quantity)
            VALUES (p_product_id, size_key, size_value_int, 0)
            ON CONFLICT (product_id, size) DO UPDATE
            SET stock_quantity = product_sizes.stock_quantity + size_value_int,
                last_updated = NOW();
          END IF;
        EXCEPTION
          WHEN OTHERS THEN
            CONTINUE;
        END;
      END IF;
    END LOOP;
  END IF;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error initializing inventory: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Add size to order_items
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS size VARCHAR(10) NULL CHECK (size IS NULL OR size IN ('S', 'M', 'L', 'XL'));
```

### 3. Paste and Run
1. **Paste** the SQL above into the Supabase SQL Editor
2. Click **"Run"** button
3. Wait for: **"Success. No rows returned"**

### 4. Verify
Run this query:

```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'products' AND column_name = 'buying_price';
```

**Must see:** `buying_price`

### 5. Restart
1. **Stop dev server** (Ctrl+C)
2. **Run:** `npm run dev`
3. **Wait 30 seconds**
4. **Try creating product again**

## ✅ Done!

If you still see errors, the migration didn't run. Check for red error messages in Supabase SQL Editor.





