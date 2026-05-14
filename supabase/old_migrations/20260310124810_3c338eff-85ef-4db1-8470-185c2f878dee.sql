
ALTER TABLE public.bike_models
  ADD COLUMN brand text,
  ADD COLUMN frame_size text,
  ADD COLUMN rim_size text,
  ADD COLUMN color text,
  ADD COLUMN weight_kg numeric;
