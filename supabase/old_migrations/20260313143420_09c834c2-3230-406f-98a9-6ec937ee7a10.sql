
-- Fix 1: Drop and recreate public views with storefront filter and without internal fields
DROP VIEW IF EXISTS public.bike_model_parts_public;
DROP VIEW IF EXISTS public.bike_models_public;
DROP VIEW IF EXISTS public.parts_public;

CREATE VIEW public.bike_models_public AS
SELECT
  id, name, description, images, brand, category, color, rim_size, frame_size, weight_kg,
  sale_price, pix_price, installment_price, installment_count,
  stock_qty, visible_on_storefront, created_at, updated_at, sku
FROM public.bike_models
WHERE visible_on_storefront = true;

CREATE VIEW public.parts_public AS
SELECT
  id, name, description, images, category, color, rim_size, frame_size,
  material, gears, hub_style, weight_capacity_kg, notes,
  sale_price, pix_price, installment_price, installment_count,
  stock_qty, visible_on_storefront, created_at, updated_at, sku
FROM public.parts
WHERE visible_on_storefront = true;

CREATE VIEW public.bike_model_parts_public AS
SELECT
  bmp.id, bmp.bike_model_id, bmp.part_id, bmp.quantity, bmp.sort_order, bmp.part_name_override, bmp.notes
FROM public.bike_model_parts bmp
JOIN public.bike_models bm ON bm.id = bmp.bike_model_id
WHERE bm.visible_on_storefront = true;

GRANT SELECT ON public.bike_models_public TO anon, authenticated;
GRANT SELECT ON public.parts_public TO anon, authenticated;
GRANT SELECT ON public.bike_model_parts_public TO anon, authenticated;
