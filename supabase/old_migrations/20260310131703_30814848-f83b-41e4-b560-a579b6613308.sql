
-- Add alert_stock to parts (stock_qty already exists)
ALTER TABLE public.parts
  ADD COLUMN alert_stock integer NOT NULL DEFAULT 0;

-- Add stock fields to bike_models
ALTER TABLE public.bike_models
  ADD COLUMN stock_qty integer NOT NULL DEFAULT 0,
  ADD COLUMN alert_stock integer NOT NULL DEFAULT 0;
