
ALTER TABLE public.mechanic_job_additions
  ADD COLUMN IF NOT EXISTS labor_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parts_used jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.mechanic_job_additions.parts_used IS 'Array of {part_id, part_name, quantity, unit_price}';
