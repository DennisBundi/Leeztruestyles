-- Add social_platform column to orders table
-- This tracks the source of POS sales: TikTok, Instagram, WhatsApp, or Walk-in

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS social_platform VARCHAR(20) NULL 
CHECK (social_platform IS NULL OR social_platform IN ('tiktok', 'instagram', 'whatsapp', 'walkin'));

-- Add index for analytics queries
CREATE INDEX IF NOT EXISTS idx_orders_social_platform ON orders(social_platform) WHERE social_platform IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN orders.social_platform IS 'Social platform or source where the sale originated. Required for POS sales. Options: tiktok, instagram, whatsapp, walkin';


