-- Fix order deletion: loyalty_transactions and reviews reference orders(id)
-- without ON DELETE behaviour, causing FK violations when deleting orders.
-- Use SET NULL so history is preserved but the order reference is cleared.

-- Fix loyalty_transactions.order_id
ALTER TABLE loyalty_transactions
  DROP CONSTRAINT IF EXISTS loyalty_transactions_order_id_fkey;

ALTER TABLE loyalty_transactions
  ADD CONSTRAINT loyalty_transactions_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;

-- Fix reviews.order_id
ALTER TABLE reviews
  DROP CONSTRAINT IF EXISTS reviews_order_id_fkey;

ALTER TABLE reviews
  ADD CONSTRAINT reviews_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;
