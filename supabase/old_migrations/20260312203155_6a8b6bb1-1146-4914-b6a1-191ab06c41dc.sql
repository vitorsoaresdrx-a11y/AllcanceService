
-- Add description column
ALTER TABLE public.parts ADD COLUMN description text;

-- Recreate parts_public view with description
DROP VIEW IF EXISTS public.parts_public;
CREATE VIEW public.parts_public WITH (security_invoker = on) AS
  SELECT id, name, sku, category, material, gears, hub_style, color, rim_size, frame_size,
         weight_capacity_kg, stock_qty, alert_stock, sale_price, pix_price,
         installment_price, installment_count, images, notes, description,
         visible_on_storefront, created_at, updated_at
  FROM public.parts
  WHERE visible_on_storefront = true;
