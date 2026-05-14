
-- Step 1: Add columns
ALTER TABLE parts ADD COLUMN IF NOT EXISTS price_store numeric DEFAULT NULL;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS price_ecommerce numeric DEFAULT NULL;
ALTER TABLE bike_models ADD COLUMN IF NOT EXISTS price_store numeric DEFAULT NULL;
ALTER TABLE bike_models ADD COLUMN IF NOT EXISTS price_ecommerce numeric DEFAULT NULL;

-- Step 2: Migrate existing data
UPDATE parts SET price_store = sale_price WHERE sale_price > 0 AND price_store IS NULL;
UPDATE bike_models SET price_store = sale_price WHERE sale_price > 0 AND price_store IS NULL;
