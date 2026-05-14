
ALTER TABLE bike_models
  ADD COLUMN IF NOT EXISTS installments_enabled_store boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS installment_count_store integer,
  ADD COLUMN IF NOT EXISTS installment_value_store numeric,
  ADD COLUMN IF NOT EXISTS installments_enabled_ecommerce boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS installment_count_ecommerce integer,
  ADD COLUMN IF NOT EXISTS installment_value_ecommerce numeric;

UPDATE bike_models
SET installments_enabled_store = true,
    installment_count_store = installment_count,
    installment_value_store = installment_price
WHERE installment_count > 1 AND installment_price > 0;

DROP VIEW IF EXISTS bike_models_public;

CREATE VIEW bike_models_public AS
SELECT id, name, sku, category, description, brand, color, rim_size, frame_size, weight_kg,
       images, stock_qty, visible_on_storefront,
       sale_price, pix_price, installment_price, installment_count,
       price_store, price_ecommerce,
       installments_enabled_store, installment_count_store, installment_value_store,
       installments_enabled_ecommerce, installment_count_ecommerce, installment_value_ecommerce,
       created_at, updated_at
FROM bike_models
WHERE visible_on_storefront = true;
