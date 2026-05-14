
ALTER TABLE public.parts
  ADD COLUMN IF NOT EXISTS pix_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS installment_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS installment_count integer DEFAULT 1;

ALTER TABLE public.bike_models
  ADD COLUMN IF NOT EXISTS pix_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS installment_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS installment_count integer DEFAULT 1;
