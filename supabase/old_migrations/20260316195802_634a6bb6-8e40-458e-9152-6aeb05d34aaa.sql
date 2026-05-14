
DROP VIEW IF EXISTS parts_public;
CREATE VIEW parts_public AS
SELECT id, name, sku, category, description, notes, material, weight_capacity_kg, gears, hub_style,
       color, rim_size, frame_size, images, stock_qty, visible_on_storefront, sale_price, pix_price,
       installment_price, installment_count, price_store, price_ecommerce, created_at, updated_at
FROM parts
WHERE visible_on_storefront = true;

DROP VIEW IF EXISTS bike_models_public;
CREATE VIEW bike_models_public AS
SELECT id, name, sku, category, description, brand, color, rim_size, frame_size, weight_kg,
       images, stock_qty, visible_on_storefront, sale_price, pix_price, installment_price,
       installment_count, price_store, price_ecommerce, created_at, updated_at
FROM bike_models
WHERE visible_on_storefront = true;
