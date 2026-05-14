
-- Parts table
CREATE TABLE public.parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  weight_capacity_kg NUMERIC,
  material TEXT,
  gears TEXT,
  hub_style TEXT,
  color TEXT,
  rim_size TEXT,
  frame_size TEXT,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  visible_on_storefront BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bike models table
CREATE TABLE public.bike_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  visible_on_storefront BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bike model parts (template)
CREATE TABLE public.bike_model_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bike_model_id UUID NOT NULL REFERENCES public.bike_models(id) ON DELETE CASCADE,
  part_id UUID REFERENCES public.parts(id) ON DELETE SET NULL,
  part_name_override TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bike_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bike_model_parts ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users can CRUD
CREATE POLICY "Authenticated users can read parts" ON public.parts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert parts" ON public.parts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update parts" ON public.parts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete parts" ON public.parts FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read bike_models" ON public.bike_models FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert bike_models" ON public.bike_models FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update bike_models" ON public.bike_models FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete bike_models" ON public.bike_models FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read bike_model_parts" ON public.bike_model_parts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert bike_model_parts" ON public.bike_model_parts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update bike_model_parts" ON public.bike_model_parts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete bike_model_parts" ON public.bike_model_parts FOR DELETE TO authenticated USING (true);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_parts_updated_at BEFORE UPDATE ON public.parts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bike_models_updated_at BEFORE UPDATE ON public.bike_models FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
