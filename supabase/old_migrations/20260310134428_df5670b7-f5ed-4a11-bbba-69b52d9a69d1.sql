
-- Add SKU columns
ALTER TABLE public.parts ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE public.bike_models ADD COLUMN IF NOT EXISTS sku text;

-- Add unique constraints
ALTER TABLE public.parts ADD CONSTRAINT parts_sku_unique UNIQUE (sku);
ALTER TABLE public.bike_models ADD CONSTRAINT bike_models_sku_unique UNIQUE (sku);

-- Sequence for parts SKU
CREATE SEQUENCE IF NOT EXISTS parts_sku_seq START 1;

-- Sequence for bike_models SKU
CREATE SEQUENCE IF NOT EXISTS bike_models_sku_seq START 1;

-- Sync sequences to existing row counts
SELECT setval('parts_sku_seq', COALESCE((SELECT COUNT(*) FROM public.parts), 0) + 1, false);
SELECT setval('bike_models_sku_seq', COALESCE((SELECT COUNT(*) FROM public.bike_models), 0) + 1, false);

-- Backfill existing parts without SKU
UPDATE public.parts
SET sku = 'PCA-' || LPAD(nextval('parts_sku_seq')::text, 5, '0')
WHERE sku IS NULL;

-- Backfill existing bike_models without SKU
UPDATE public.bike_models
SET sku = 'BKE-' || LPAD(nextval('bike_models_sku_seq')::text, 5, '0')
WHERE sku IS NULL;

-- Trigger function for parts SKU auto-generation
CREATE OR REPLACE FUNCTION public.generate_part_sku()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    NEW.sku := 'PCA-' || LPAD(nextval('parts_sku_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function for bike_models SKU auto-generation
CREATE OR REPLACE FUNCTION public.generate_bike_sku()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    NEW.sku := 'BKE-' || LPAD(nextval('bike_models_sku_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Attach triggers
CREATE TRIGGER set_part_sku
  BEFORE INSERT ON public.parts
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_part_sku();

CREATE TRIGGER set_bike_sku
  BEFORE INSERT ON public.bike_models
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_bike_sku();
