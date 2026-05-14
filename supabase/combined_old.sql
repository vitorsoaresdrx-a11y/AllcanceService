
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

ALTER TABLE public.bike_models
  ADD COLUMN brand text,
  ADD COLUMN frame_size text,
  ADD COLUMN rim_size text,
  ADD COLUMN color text,
  ADD COLUMN weight_kg numeric;

-- Customers table
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  whatsapp text,
  cpf text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update customers" ON public.customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete customers" ON public.customers FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sales table
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  total numeric NOT NULL DEFAULT 0,
  payment_method text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sales" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update sales" ON public.sales FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete sales" ON public.sales FOR DELETE TO authenticated USING (true);

-- Sale items table
CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  bike_model_id uuid REFERENCES public.bike_models(id) ON DELETE SET NULL,
  part_id uuid REFERENCES public.parts(id) ON DELETE SET NULL
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sale_items" ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sale_items" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete sale_items" ON public.sale_items FOR DELETE TO authenticated USING (true);

-- Settings table for card machine taxes and future configs
CREATE TABLE public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read settings" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert settings" ON public.settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update settings" ON public.settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Insert default card tax settings
INSERT INTO public.settings (key, value) VALUES ('card_taxes', '{"credit_tax": 0, "debit_tax": 0}'::jsonb);

-- Add card fee tracking to sales for DRE
ALTER TABLE public.sales
  ADD COLUMN card_fee numeric DEFAULT 0,
  ADD COLUMN card_tax_percent numeric DEFAULT 0;

ALTER TABLE public.parts
  ADD COLUMN sale_price numeric DEFAULT 0;

-- Create storage bucket for product images (public for display)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images', 'product-images', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- RLS policies for product-images bucket
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can update product images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can delete product images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'product-images');

-- Add image columns (array of URLs, max 2)
ALTER TABLE public.parts ADD COLUMN images text[] DEFAULT '{}';
ALTER TABLE public.bike_models ADD COLUMN images text[] DEFAULT '{}';

-- Add alert_stock to parts (stock_qty already exists)
ALTER TABLE public.parts
  ADD COLUMN alert_stock integer NOT NULL DEFAULT 0;

-- Add stock fields to bike_models
ALTER TABLE public.bike_models
  ADD COLUMN stock_qty integer NOT NULL DEFAULT 0,
  ADD COLUMN alert_stock integer NOT NULL DEFAULT 0;

-- Fixed expenses (recurring monthly)
CREATE TABLE public.fixed_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read fixed_expenses" ON public.fixed_expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fixed_expenses" ON public.fixed_expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fixed_expenses" ON public.fixed_expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete fixed_expenses" ON public.fixed_expenses FOR DELETE TO authenticated USING (true);

-- Variable expenses (per-occurrence, with date)
CREATE TABLE public.variable_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.variable_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read variable_expenses" ON public.variable_expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert variable_expenses" ON public.variable_expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update variable_expenses" ON public.variable_expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete variable_expenses" ON public.variable_expenses FOR DELETE TO authenticated USING (true);

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
