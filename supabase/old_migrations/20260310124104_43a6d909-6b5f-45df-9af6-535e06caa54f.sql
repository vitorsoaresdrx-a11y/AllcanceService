
-- Add pricing columns to bike_models
ALTER TABLE public.bike_models
  ADD COLUMN cost_mode text NOT NULL DEFAULT 'fixed',
  ADD COLUMN cost_price numeric DEFAULT 0,
  ADD COLUMN sale_price numeric DEFAULT 0;

-- Add unit_cost to parts so we can calculate manual bike costs
ALTER TABLE public.parts
  ADD COLUMN unit_cost numeric DEFAULT 0;

-- Add unit_cost snapshot to bike_model_parts (captures cost at time of assignment)
ALTER TABLE public.bike_model_parts
  ADD COLUMN unit_cost numeric DEFAULT 0;
