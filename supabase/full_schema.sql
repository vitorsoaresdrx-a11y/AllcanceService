
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

-- Allow anonymous users to SELECT parts and bike_models for public product page
CREATE POLICY "Anyone can read parts"
ON public.parts
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anyone can read bike_models"
ON public.bike_models
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to read bike_model_parts for public product page
CREATE POLICY "Anyone can read bike_model_parts"
ON public.bike_model_parts
FOR SELECT
TO anon
USING (true);

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update categories" ON public.categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete categories" ON public.categories FOR DELETE TO authenticated USING (true);

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read product images" ON storage.objects;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can update product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Anyone can read product images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

ALTER TABLE public.parts
  ADD COLUMN IF NOT EXISTS pix_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS installment_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS installment_count integer DEFAULT 1;

ALTER TABLE public.bike_models
  ADD COLUMN IF NOT EXISTS pix_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS installment_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS installment_count integer DEFAULT 1;

CREATE TABLE public.mechanic_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name text,
  customer_cpf text,
  customer_whatsapp text,
  bike_name text,
  problem text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'in_repair',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.mechanic_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read mechanic_jobs" ON public.mechanic_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert mechanic_jobs" ON public.mechanic_jobs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update mechanic_jobs" ON public.mechanic_jobs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete mechanic_jobs" ON public.mechanic_jobs FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_mechanic_jobs_updated_at BEFORE UPDATE ON public.mechanic_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.mechanic_job_additions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.mechanic_jobs(id) ON DELETE CASCADE,
  problem text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  approval text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.mechanic_job_additions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read mechanic_job_additions" ON public.mechanic_job_additions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert mechanic_job_additions" ON public.mechanic_job_additions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update mechanic_job_additions" ON public.mechanic_job_additions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete mechanic_job_additions" ON public.mechanic_job_additions FOR DELETE TO authenticated USING (true);

-- Cash register sessions
CREATE TABLE public.cash_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  opening_amount numeric NOT NULL DEFAULT 0,
  closing_amount numeric,
  expected_amount numeric,
  difference numeric,
  status text NOT NULL DEFAULT 'open',
  opened_by text,
  closed_by text
);

ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cash_registers" ON public.cash_registers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert cash_registers" ON public.cash_registers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update cash_registers" ON public.cash_registers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Cash register sales link
CREATE TABLE public.cash_register_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id uuid NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_register_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cash_register_sales" ON public.cash_register_sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert cash_register_sales" ON public.cash_register_sales FOR INSERT TO authenticated WITH CHECK (true);

-- Create whatsapp_conversations table
CREATE TABLE public.whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_phone text NOT NULL,
  contact_name text,
  contact_photo text,
  last_message text DEFAULT '',
  last_message_at timestamptz DEFAULT now(),
  unread_count integer DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create whatsapp_messages table
CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  message_id text,
  from_me boolean NOT NULL DEFAULT false,
  type text NOT NULL DEFAULT 'text',
  content text DEFAULT '',
  media_url text,
  status text DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for whatsapp_conversations
CREATE POLICY "Authenticated users can read whatsapp_conversations" ON public.whatsapp_conversations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert whatsapp_conversations" ON public.whatsapp_conversations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update whatsapp_conversations" ON public.whatsapp_conversations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete whatsapp_conversations" ON public.whatsapp_conversations FOR DELETE TO authenticated USING (true);

-- RLS policies for whatsapp_messages
CREATE POLICY "Authenticated users can read whatsapp_messages" ON public.whatsapp_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert whatsapp_messages" ON public.whatsapp_messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update whatsapp_messages" ON public.whatsapp_messages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Allow anon insert for webhook
CREATE POLICY "Anon can insert whatsapp_conversations" ON public.whatsapp_conversations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update whatsapp_conversations" ON public.whatsapp_conversations FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can select whatsapp_conversations" ON public.whatsapp_conversations FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert whatsapp_messages" ON public.whatsapp_messages FOR INSERT TO anon WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
-- 1. Tenant roles enum
CREATE TYPE public.tenant_role AS ENUM ('owner', 'member');

-- 2. Module keys enum matching app tabs
CREATE TYPE public.app_module AS ENUM (
  'dashboard',
  'dre',
  'produtos',
  'bikes',
  'estoque',
  'pdv',
  'caixa',
  'historico',
  'mecanica',
  'gastos',
  'clientes',
  'whatsapp',
  'configuracoes'
);

-- 3. Tenants table (the store/org)
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Minha Loja',
  created_at timestamptz NOT NULL DEFAULT now(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 4. Tenant members (users belonging to a tenant)
CREATE TABLE public.tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role tenant_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  name text NOT NULL,
  email text,
  cpf text,
  phone text,
  role text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.face_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  descriptor double precision[] NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.time_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  type text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  date date DEFAULT current_date,
  confidence double precision,
  tenant_id uuid REFERENCES public.tenants(id)
);

CREATE TABLE IF NOT EXISTS public.store_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_reference text,
  payment_id text,
  status text NOT NULL,
  status_detail text,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_cpf text,
  customer_phone text,
  items jsonb DEFAULT '[]'::jsonb,
  transaction_amount numeric NOT NULL DEFAULT 0,
  shipping_amount numeric NOT NULL DEFAULT 0,
  payment_method text,
  installments integer,
  approved_at timestamptz,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_sales ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- 5. Module permissions per member
CREATE TABLE public.module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_member_id uuid NOT NULL REFERENCES public.tenant_members(id) ON DELETE CASCADE,
  module app_module NOT NULL,
  can_access boolean NOT NULL DEFAULT true,
  hide_sensitive boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_member_id, module)
);

ALTER TABLE public.module_permissions ENABLE ROW LEVEL SECURITY;

-- 6. Security definer helper: get user's tenant_member record
CREATE OR REPLACE FUNCTION public.get_user_tenant_member_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.tenant_members WHERE user_id = _user_id LIMIT 1
$$;

-- 7. Security definer: check if user is tenant owner
CREATE OR REPLACE FUNCTION public.is_tenant_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id AND role = 'owner'
  )
$$;

-- 8. Security definer: check if user has access to a module
CREATE OR REPLACE FUNCTION public.has_module_access(_user_id uuid, _module app_module)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.tenant_members WHERE user_id = _user_id AND role = 'owner') THEN true
    WHEN EXISTS (
      SELECT 1 FROM public.module_permissions mp
      JOIN public.tenant_members tm ON tm.id = mp.tenant_member_id
      WHERE tm.user_id = _user_id AND mp.module = _module AND mp.can_access = true
    ) THEN true
    ELSE false
  END
$$;

-- 9. Security definer: check if sensitive data is hidden for user on a module
CREATE OR REPLACE FUNCTION public.should_hide_sensitive(_user_id uuid, _module app_module)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT mp.hide_sensitive FROM public.module_permissions mp
     JOIN public.tenant_members tm ON tm.id = mp.tenant_member_id
     WHERE tm.user_id = _user_id AND mp.module = _module),
    false
  )
$$;

-- 10. RLS Policies for tenants
CREATE POLICY "Members can read own tenant"
  ON public.tenants FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm WHERE tm.tenant_id = tenants.id AND tm.user_id = auth.uid()
  ));

CREATE POLICY "Owner can update tenant"
  ON public.tenants FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Authenticated can create tenant"
  ON public.tenants FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- 11. RLS Policies for tenant_members
CREATE POLICY "Members can read same tenant members"
  ON public.tenant_members FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members me WHERE me.tenant_id = tenant_members.tenant_id AND me.user_id = auth.uid()
  ));

CREATE POLICY "Owner can insert members"
  ON public.tenant_members FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_owner(auth.uid()));

CREATE POLICY "Owner can update members"
  ON public.tenant_members FOR UPDATE TO authenticated
  USING (public.is_tenant_owner(auth.uid()))
  WITH CHECK (public.is_tenant_owner(auth.uid()));

CREATE POLICY "Owner can delete members"
  ON public.tenant_members FOR DELETE TO authenticated
  USING (public.is_tenant_owner(auth.uid()));

-- 12. RLS Policies for module_permissions
CREATE POLICY "Members can read own permissions"
  ON public.module_permissions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tenant_members tm WHERE tm.id = module_permissions.tenant_member_id AND tm.user_id = auth.uid()
  ));

CREATE POLICY "Owner can read all permissions"
  ON public.module_permissions FOR SELECT TO authenticated
  USING (public.is_tenant_owner(auth.uid()));

CREATE POLICY "Owner can insert permissions"
  ON public.module_permissions FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_owner(auth.uid()));

CREATE POLICY "Owner can update permissions"
  ON public.module_permissions FOR UPDATE TO authenticated
  USING (public.is_tenant_owner(auth.uid()))
  WITH CHECK (public.is_tenant_owner(auth.uid()));

CREATE POLICY "Owner can delete permissions"
  ON public.module_permissions FOR DELETE TO authenticated
  USING (public.is_tenant_owner(auth.uid()));

-- 13. Auto-create tenant + owner membership on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id uuid;
BEGIN
  INSERT INTO public.tenants (name, owner_id)
  VALUES ('Minha Loja', NEW.id)
  RETURNING id INTO new_tenant_id;

  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  VALUES (new_tenant_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_tenant
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_tenant();

-- 14. Trigger to update updated_at on module_permissions
CREATE TRIGGER update_module_permissions_updated_at
  BEFORE UPDATE ON public.module_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 15. Create tenant + membership for existing users who don't have one
DO $$
DECLARE
  u RECORD;
  new_tenant_id uuid;
BEGIN
  FOR u IN
    SELECT au.id FROM auth.users au
    WHERE NOT EXISTS (SELECT 1 FROM public.tenant_members tm WHERE tm.user_id = au.id)
  LOOP
    INSERT INTO public.tenants (name, owner_id)
    VALUES ('Minha Loja', u.id)
    RETURNING id INTO new_tenant_id;

    INSERT INTO public.tenant_members (tenant_id, user_id, role)
    VALUES (new_tenant_id, u.id, 'owner');
  END LOOP;
END;
$$;
-- Drop the recursive SELECT policy
DROP POLICY "Members can read same tenant members" ON public.tenant_members;

-- Create a simple non-recursive policy: users can read their own membership row
CREATE POLICY "Users can read own membership"
  ON public.tenant_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Owners need to see all members in their tenant - use security definer function
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_members WHERE user_id = _user_id LIMIT 1
$$;

-- Policy for owners to see all members of their tenant
CREATE POLICY "Owner can read all tenant members"
  ON public.tenant_members FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Add email column to tenant_members for display purposes
ALTER TABLE public.tenant_members ADD COLUMN IF NOT EXISTS email text;

-- Update existing owner's email from auth (we'll do this via edge function)
ALTER TABLE public.whatsapp_conversations ADD COLUMN IF NOT EXISTS contact_lid text;
ALTER TABLE public.whatsapp_conversations ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT true;

-- Mechanics table (admin-managed list of mechanics)
create table if not exists mechanics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean default true,
  created_at timestamptz default now()
);
alter table mechanics enable row level security;
create policy "Authenticated can read mechanics" on mechanics for select to authenticated using (true);
create policy "Authenticated can insert mechanics" on mechanics for insert to authenticated with check (true);
create policy "Authenticated can update mechanics" on mechanics for update to authenticated using (true) with check (true);
create policy "Authenticated can delete mechanics" on mechanics for delete to authenticated using (true);

-- Service orders table
create table if not exists service_orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text,
  customer_cpf text,
  customer_whatsapp text,
  bike_name text,
  problem text not null,
  price numeric default 0,
  status text default 'in_repair',
  mechanic_status text default 'pending',
  mechanic_name text,
  mechanic_id uuid references mechanics(id),
  frame_number text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);
alter table service_orders enable row level security;
create policy "Authenticated can read service_orders" on service_orders for select to authenticated using (true);
create policy "Authenticated can insert service_orders" on service_orders for insert to authenticated with check (true);
create policy "Authenticated can update service_orders" on service_orders for update to authenticated using (true) with check (true);
create policy "Authenticated can delete service_orders" on service_orders for delete to authenticated using (true);

-- Bike service history table
create table if not exists bike_service_history (
  id uuid primary key default gen_random_uuid(),
  frame_number text not null,
  bike_name text not null,
  customer_name text,
  customer_cpf text,
  customer_phone text,
  problem text not null,
  mechanic_id uuid references mechanics(id),
  mechanic_name text,
  service_order_id uuid references service_orders(id),
  status text default 'pending',
  created_at timestamptz default now(),
  completed_at timestamptz
);
alter table bike_service_history enable row level security;
create policy "Authenticated can read bike_service_history" on bike_service_history for select to authenticated using (true);
create policy "Authenticated can insert bike_service_history" on bike_service_history for insert to authenticated with check (true);
create policy "Authenticated can update bike_service_history" on bike_service_history for update to authenticated using (true) with check (true);

-- Enable realtime
alter publication supabase_realtime add table service_orders;
alter publication supabase_realtime add table bike_service_history;

-- ============================================================
-- 1. PUBLIC PRODUCT VIEWS (exclude cost columns, filter visible)
-- ============================================================

CREATE VIEW public.parts_public
WITH (security_invoker = on) AS
SELECT id, name, sku, category, material, gears, hub_style, color, rim_size, frame_size,
       sale_price, pix_price, installment_price, installment_count,
       stock_qty, alert_stock, images, notes, weight_capacity_kg,
       visible_on_storefront, created_at, updated_at
FROM public.parts
WHERE visible_on_storefront = true;

CREATE VIEW public.bike_models_public
WITH (security_invoker = on) AS
SELECT id, name, sku, category, brand, frame_size, rim_size, color, weight_kg,
       sale_price, pix_price, installment_price, installment_count,
       stock_qty, alert_stock, images, description, cost_mode,
       visible_on_storefront, created_at, updated_at
FROM public.bike_models
WHERE visible_on_storefront = true;

CREATE VIEW public.bike_model_parts_public
WITH (security_invoker = on) AS
SELECT bmp.id, bmp.bike_model_id, bmp.part_id, bmp.part_name_override,
       bmp.quantity, bmp.sort_order, bmp.notes
FROM public.bike_model_parts bmp
JOIN public.bike_models bm ON bm.id = bmp.bike_model_id
WHERE bm.visible_on_storefront = true;

-- ============================================================
-- 2. RESTRICT ANON SELECT on base tables
-- ============================================================

DROP POLICY IF EXISTS "Anyone can read parts" ON public.parts;
DROP POLICY IF EXISTS "Anyone can read bike_models" ON public.bike_models;
DROP POLICY IF EXISTS "Anyone can read bike_model_parts" ON public.bike_model_parts;

CREATE POLICY "Anon can read visible parts"
ON public.parts FOR SELECT TO anon
USING (visible_on_storefront = true);

CREATE POLICY "Anon can read visible bike_models"
ON public.bike_models FOR SELECT TO anon
USING (visible_on_storefront = true);

CREATE POLICY "Anon can read bike_model_parts for visible bikes"
ON public.bike_model_parts FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.bike_models bm
    WHERE bm.id = bike_model_parts.bike_model_id
    AND bm.visible_on_storefront = true
  )
);

-- ============================================================
-- 3. FIX CROSS-TENANT OWNER ESCALATION on tenant_members
-- ============================================================

DROP POLICY IF EXISTS "Owner can insert members" ON public.tenant_members;
CREATE POLICY "Owner can insert members to own tenant"
ON public.tenant_members FOR INSERT TO authenticated
WITH CHECK (
  is_tenant_owner(auth.uid())
  AND tenant_id = get_user_tenant_id(auth.uid())
);

DROP POLICY IF EXISTS "Owner can update members" ON public.tenant_members;
CREATE POLICY "Owner can update own tenant members"
ON public.tenant_members FOR UPDATE TO authenticated
USING (
  is_tenant_owner(auth.uid())
  AND tenant_id = get_user_tenant_id(auth.uid())
)
WITH CHECK (
  is_tenant_owner(auth.uid())
  AND tenant_id = get_user_tenant_id(auth.uid())
);

DROP POLICY IF EXISTS "Owner can delete members" ON public.tenant_members;
CREATE POLICY "Owner can delete own tenant members"
ON public.tenant_members FOR DELETE TO authenticated
USING (
  is_tenant_owner(auth.uid())
  AND tenant_id = get_user_tenant_id(auth.uid())
);

-- ============================================================
-- 4. FIX CROSS-TENANT on module_permissions
-- ============================================================

DROP POLICY IF EXISTS "Owner can insert permissions" ON public.module_permissions;
CREATE POLICY "Owner can insert own tenant permissions"
ON public.module_permissions FOR INSERT TO authenticated
WITH CHECK (
  is_tenant_owner(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.id = module_permissions.tenant_member_id
    AND tm.tenant_id = get_user_tenant_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Owner can read all permissions" ON public.module_permissions;
CREATE POLICY "Owner can read own tenant permissions"
ON public.module_permissions FOR SELECT TO authenticated
USING (
  is_tenant_owner(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.id = module_permissions.tenant_member_id
    AND tm.tenant_id = get_user_tenant_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Owner can update permissions" ON public.module_permissions;
CREATE POLICY "Owner can update own tenant permissions"
ON public.module_permissions FOR UPDATE TO authenticated
USING (
  is_tenant_owner(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.id = module_permissions.tenant_member_id
    AND tm.tenant_id = get_user_tenant_id(auth.uid())
  )
)
WITH CHECK (
  is_tenant_owner(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.id = module_permissions.tenant_member_id
    AND tm.tenant_id = get_user_tenant_id(auth.uid())
  )
);

DROP POLICY IF EXISTS "Owner can delete permissions" ON public.module_permissions;
CREATE POLICY "Owner can delete own tenant permissions"
ON public.module_permissions FOR DELETE TO authenticated
USING (
  is_tenant_owner(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.tenant_members tm
    WHERE tm.id = module_permissions.tenant_member_id
    AND tm.tenant_id = get_user_tenant_id(auth.uid())
  )
);

-- ============================================================
-- 5. REMOVE ANON ACCESS FROM WHATSAPP TABLES
-- ============================================================

DROP POLICY IF EXISTS "Anon can select whatsapp_conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Anon can insert whatsapp_conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Anon can update whatsapp_conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Anon can insert whatsapp_messages" ON public.whatsapp_messages;

-- =============================================
-- TENANT ISOLATION: Add tenant_id to all operational tables
-- =============================================

-- 1. Auto-set trigger function
CREATE OR REPLACE FUNCTION public.set_tenant_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := get_user_tenant_id(auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Add tenant_id column to all operational tables
ALTER TABLE public.bike_model_parts ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.bike_models ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.bike_service_history ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.cash_register_sales ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.cash_registers ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.customers ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.fixed_expenses ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.mechanic_job_additions ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.mechanic_jobs ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.mechanics ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.parts ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.sale_items ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.sales ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.service_orders ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.settings ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.variable_expenses ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 3. Populate existing rows with first tenant
DO $$
DECLARE _tid uuid;
BEGIN
  SELECT id INTO _tid FROM public.tenants LIMIT 1;
  IF _tid IS NOT NULL THEN
    UPDATE public.bike_model_parts SET tenant_id = _tid WHERE tenant_id IS NULL;
    UPDATE public.bike_models SET tenant_id = _tid WHERE tenant_id IS NULL;
    UPDATE public.bike_service_history SET tenant_id = _tid WHERE tenant_id IS NULL;
    UPDATE public.cash_register_sales SET tenant_id = _tid WHERE tenant_id IS NULL;
    UPDATE public.cash_registers SET tenant_id = _tid WHERE tenant_id IS NULL;
    UPDATE public.categories SET tenant_id = _tid WHERE tenant_id IS NULL;
    UPDATE public.customers SET tenant_id = _tid WHERE tenant_id IS NULL;
    UPDATE public.fixed_expenses SET tenant_id = _tid WHERE tenant_id IS NULL;
    UPDATE public.mechanic_job_additions SET tenant_id = _tid WHERE tenant_id IS NULL;
    UPDATE public.mechanic_jobs SET tenant_id = _tid WHERE tenant_id IS NULL;
    UPDATE public.mechanics SET tenant_id = _tid WHERE tenant_id IS NULL;
    UPDATE public.parts SET tenant_id = _tid WHERE tenant_id IS NULL;
    UPDATE public.sale_items SET tenant_id = _tid WHERE tenant_id IS NULL;
    UPDATE public.sales SET tenant_id = _tid WHERE tenant_id IS NULL;
    UPDATE public.service_orders SET tenant_id = _tid WHERE tenant_id IS NULL;
    UPDATE public.settings SET tenant_id = _tid WHERE tenant_id IS NULL;
    UPDATE public.variable_expenses SET tenant_id = _tid WHERE tenant_id IS NULL;
    UPDATE public.employees SET tenant_id = _tid WHERE tenant_id IS NULL;
    UPDATE public.time_records SET tenant_id = _tid WHERE tenant_id IS NULL;
    UPDATE public.store_sales SET tenant_id = _tid WHERE tenant_id IS NULL;
  END IF;
END;
$$;

-- 4. Removed SET NOT NULL (handled by triggers or relaxed later)

-- 5. Add indexes for performance
CREATE INDEX idx_bike_model_parts_tenant ON public.bike_model_parts(tenant_id);
CREATE INDEX idx_bike_models_tenant ON public.bike_models(tenant_id);
CREATE INDEX idx_bike_service_history_tenant ON public.bike_service_history(tenant_id);
CREATE INDEX idx_cash_register_sales_tenant ON public.cash_register_sales(tenant_id);
CREATE INDEX idx_cash_registers_tenant ON public.cash_registers(tenant_id);
CREATE INDEX idx_categories_tenant ON public.categories(tenant_id);
CREATE INDEX idx_customers_tenant ON public.customers(tenant_id);
CREATE INDEX idx_fixed_expenses_tenant ON public.fixed_expenses(tenant_id);
CREATE INDEX idx_mechanic_job_additions_tenant ON public.mechanic_job_additions(tenant_id);
CREATE INDEX idx_mechanic_jobs_tenant ON public.mechanic_jobs(tenant_id);
CREATE INDEX idx_mechanics_tenant ON public.mechanics(tenant_id);
CREATE INDEX idx_parts_tenant ON public.parts(tenant_id);
CREATE INDEX idx_sale_items_tenant ON public.sale_items(tenant_id);
CREATE INDEX idx_sales_tenant ON public.sales(tenant_id);
CREATE INDEX idx_service_orders_tenant ON public.service_orders(tenant_id);
CREATE INDEX idx_settings_tenant ON public.settings(tenant_id);
CREATE INDEX idx_variable_expenses_tenant ON public.variable_expenses(tenant_id);
CREATE INDEX idx_employees_tenant ON public.employees(tenant_id);
CREATE INDEX idx_time_records_tenant ON public.time_records(tenant_id);
CREATE INDEX idx_store_sales_tenant ON public.store_sales(tenant_id);

-- 6. Create triggers to auto-set tenant_id
CREATE TRIGGER set_tenant_id_bike_model_parts BEFORE INSERT ON public.bike_model_parts FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_bike_models BEFORE INSERT ON public.bike_models FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_bike_service_history BEFORE INSERT ON public.bike_service_history FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_cash_register_sales BEFORE INSERT ON public.cash_register_sales FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_cash_registers BEFORE INSERT ON public.cash_registers FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_categories BEFORE INSERT ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_customers BEFORE INSERT ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_fixed_expenses BEFORE INSERT ON public.fixed_expenses FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_mechanic_job_additions BEFORE INSERT ON public.mechanic_job_additions FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_mechanic_jobs BEFORE INSERT ON public.mechanic_jobs FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_mechanics BEFORE INSERT ON public.mechanics FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_parts BEFORE INSERT ON public.parts FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_sale_items BEFORE INSERT ON public.sale_items FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_sales BEFORE INSERT ON public.sales FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_service_orders BEFORE INSERT ON public.service_orders FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_settings BEFORE INSERT ON public.settings FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_variable_expenses BEFORE INSERT ON public.variable_expenses FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_employees BEFORE INSERT ON public.employees FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_time_records BEFORE INSERT ON public.time_records FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();
CREATE TRIGGER set_tenant_id_store_sales BEFORE INSERT ON public.store_sales FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- 7. Add unique constraint on settings (tenant_id, key) for correct upserts
ALTER TABLE public.settings ADD CONSTRAINT settings_tenant_key_unique UNIQUE (tenant_id, key);

-- Make tenant_id nullable so the trigger can handle it without TypeScript requiring it
ALTER TABLE public.bike_model_parts ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.bike_models ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.bike_service_history ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.cash_register_sales ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.cash_registers ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.categories ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.customers ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.fixed_expenses ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.mechanic_job_additions ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.mechanic_jobs ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.mechanics ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.parts ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.sale_items ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.sales ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.service_orders ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.settings ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.variable_expenses ALTER COLUMN tenant_id DROP NOT NULL;

-- Also drop the unique constraint that requires tenant_id (it's now nullable)
ALTER TABLE public.settings DROP CONSTRAINT IF EXISTS settings_tenant_key_unique;
-- Re-add it allowing the combination
ALTER TABLE public.settings ADD CONSTRAINT settings_tenant_key_unique UNIQUE (tenant_id, key);

-- =============================================
-- REPLACE ALL USING(true) AUTHENTICATED POLICIES WITH TENANT ISOLATION
-- =============================================

-- Helper variable: t = tenant_id = get_user_tenant_id(auth.uid())

-- ─── bike_model_parts ───
DROP POLICY IF EXISTS "Authenticated users can read bike_model_parts" ON public.bike_model_parts;
DROP POLICY IF EXISTS "Authenticated users can insert bike_model_parts" ON public.bike_model_parts;
DROP POLICY IF EXISTS "Authenticated users can update bike_model_parts" ON public.bike_model_parts;
DROP POLICY IF EXISTS "Authenticated users can delete bike_model_parts" ON public.bike_model_parts;

CREATE POLICY "Tenant read bike_model_parts" ON public.bike_model_parts FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert bike_model_parts" ON public.bike_model_parts FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update bike_model_parts" ON public.bike_model_parts FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete bike_model_parts" ON public.bike_model_parts FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ─── bike_models ───
DROP POLICY IF EXISTS "Authenticated users can read bike_models" ON public.bike_models;
DROP POLICY IF EXISTS "Authenticated users can insert bike_models" ON public.bike_models;
DROP POLICY IF EXISTS "Authenticated users can update bike_models" ON public.bike_models;
DROP POLICY IF EXISTS "Authenticated users can delete bike_models" ON public.bike_models;

CREATE POLICY "Tenant read bike_models" ON public.bike_models FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert bike_models" ON public.bike_models FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update bike_models" ON public.bike_models FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete bike_models" ON public.bike_models FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ─── bike_service_history ───
DROP POLICY IF EXISTS "Authenticated can read bike_service_history" ON public.bike_service_history;
DROP POLICY IF EXISTS "Authenticated can insert bike_service_history" ON public.bike_service_history;
DROP POLICY IF EXISTS "Authenticated can update bike_service_history" ON public.bike_service_history;

CREATE POLICY "Tenant read bike_service_history" ON public.bike_service_history FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert bike_service_history" ON public.bike_service_history FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update bike_service_history" ON public.bike_service_history FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- ─── cash_register_sales ───
DROP POLICY IF EXISTS "Authenticated users can read cash_register_sales" ON public.cash_register_sales;
DROP POLICY IF EXISTS "Authenticated users can insert cash_register_sales" ON public.cash_register_sales;

CREATE POLICY "Tenant read cash_register_sales" ON public.cash_register_sales FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert cash_register_sales" ON public.cash_register_sales FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- ─── cash_registers ───
DROP POLICY IF EXISTS "Authenticated users can read cash_registers" ON public.cash_registers;
DROP POLICY IF EXISTS "Authenticated users can insert cash_registers" ON public.cash_registers;
DROP POLICY IF EXISTS "Authenticated users can update cash_registers" ON public.cash_registers;

CREATE POLICY "Tenant read cash_registers" ON public.cash_registers FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert cash_registers" ON public.cash_registers FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update cash_registers" ON public.cash_registers FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- ─── categories ───
DROP POLICY IF EXISTS "Authenticated users can read categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON public.categories;

CREATE POLICY "Tenant read categories" ON public.categories FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update categories" ON public.categories FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete categories" ON public.categories FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ─── customers ───
DROP POLICY IF EXISTS "Authenticated users can read customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON public.customers;

CREATE POLICY "Tenant read customers" ON public.customers FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update customers" ON public.customers FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete customers" ON public.customers FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ─── fixed_expenses ───
DROP POLICY IF EXISTS "Authenticated users can read fixed_expenses" ON public.fixed_expenses;
DROP POLICY IF EXISTS "Authenticated users can insert fixed_expenses" ON public.fixed_expenses;
DROP POLICY IF EXISTS "Authenticated users can update fixed_expenses" ON public.fixed_expenses;
DROP POLICY IF EXISTS "Authenticated users can delete fixed_expenses" ON public.fixed_expenses;

CREATE POLICY "Tenant read fixed_expenses" ON public.fixed_expenses FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert fixed_expenses" ON public.fixed_expenses FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update fixed_expenses" ON public.fixed_expenses FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete fixed_expenses" ON public.fixed_expenses FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ─── mechanic_job_additions ───
DROP POLICY IF EXISTS "Authenticated users can read mechanic_job_additions" ON public.mechanic_job_additions;
DROP POLICY IF EXISTS "Authenticated users can insert mechanic_job_additions" ON public.mechanic_job_additions;
DROP POLICY IF EXISTS "Authenticated users can update mechanic_job_additions" ON public.mechanic_job_additions;
DROP POLICY IF EXISTS "Authenticated users can delete mechanic_job_additions" ON public.mechanic_job_additions;

CREATE POLICY "Tenant read mechanic_job_additions" ON public.mechanic_job_additions FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert mechanic_job_additions" ON public.mechanic_job_additions FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update mechanic_job_additions" ON public.mechanic_job_additions FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete mechanic_job_additions" ON public.mechanic_job_additions FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ─── mechanic_jobs ───
DROP POLICY IF EXISTS "Authenticated users can read mechanic_jobs" ON public.mechanic_jobs;
DROP POLICY IF EXISTS "Authenticated users can insert mechanic_jobs" ON public.mechanic_jobs;
DROP POLICY IF EXISTS "Authenticated users can update mechanic_jobs" ON public.mechanic_jobs;
DROP POLICY IF EXISTS "Authenticated users can delete mechanic_jobs" ON public.mechanic_jobs;

CREATE POLICY "Tenant read mechanic_jobs" ON public.mechanic_jobs FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert mechanic_jobs" ON public.mechanic_jobs FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update mechanic_jobs" ON public.mechanic_jobs FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete mechanic_jobs" ON public.mechanic_jobs FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ─── mechanics ───
DROP POLICY IF EXISTS "Authenticated can read mechanics" ON public.mechanics;
DROP POLICY IF EXISTS "Authenticated can insert mechanics" ON public.mechanics;
DROP POLICY IF EXISTS "Authenticated can update mechanics" ON public.mechanics;
DROP POLICY IF EXISTS "Authenticated can delete mechanics" ON public.mechanics;

CREATE POLICY "Tenant read mechanics" ON public.mechanics FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert mechanics" ON public.mechanics FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update mechanics" ON public.mechanics FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete mechanics" ON public.mechanics FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ─── parts ───
DROP POLICY IF EXISTS "Authenticated users can read parts" ON public.parts;
DROP POLICY IF EXISTS "Authenticated users can insert parts" ON public.parts;
DROP POLICY IF EXISTS "Authenticated users can update parts" ON public.parts;
DROP POLICY IF EXISTS "Authenticated users can delete parts" ON public.parts;

CREATE POLICY "Tenant read parts" ON public.parts FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert parts" ON public.parts FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update parts" ON public.parts FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete parts" ON public.parts FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ─── sale_items ───
DROP POLICY IF EXISTS "Authenticated users can read sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Authenticated users can insert sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Authenticated users can delete sale_items" ON public.sale_items;

CREATE POLICY "Tenant read sale_items" ON public.sale_items FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert sale_items" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete sale_items" ON public.sale_items FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ─── sales ───
DROP POLICY IF EXISTS "Authenticated users can read sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can update sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can delete sales" ON public.sales;

CREATE POLICY "Tenant read sales" ON public.sales FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update sales" ON public.sales FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete sales" ON public.sales FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ─── service_orders ───
DROP POLICY IF EXISTS "Authenticated can read service_orders" ON public.service_orders;
DROP POLICY IF EXISTS "Authenticated can insert service_orders" ON public.service_orders;
DROP POLICY IF EXISTS "Authenticated can update service_orders" ON public.service_orders;
DROP POLICY IF EXISTS "Authenticated can delete service_orders" ON public.service_orders;

CREATE POLICY "Tenant read service_orders" ON public.service_orders FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert service_orders" ON public.service_orders FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update service_orders" ON public.service_orders FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete service_orders" ON public.service_orders FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ─── settings ───
DROP POLICY IF EXISTS "Authenticated users can read settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated users can insert settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated users can update settings" ON public.settings;

CREATE POLICY "Tenant read settings" ON public.settings FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert settings" ON public.settings FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update settings" ON public.settings FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- ─── variable_expenses ───
DROP POLICY IF EXISTS "Authenticated users can read variable_expenses" ON public.variable_expenses;
DROP POLICY IF EXISTS "Authenticated users can insert variable_expenses" ON public.variable_expenses;
DROP POLICY IF EXISTS "Authenticated users can update variable_expenses" ON public.variable_expenses;
DROP POLICY IF EXISTS "Authenticated users can delete variable_expenses" ON public.variable_expenses;

CREATE POLICY "Tenant read variable_expenses" ON public.variable_expenses FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert variable_expenses" ON public.variable_expenses FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update variable_expenses" ON public.variable_expenses FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete variable_expenses" ON public.variable_expenses FOR DELETE TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Quotes table
CREATE TABLE public.quotes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name text,
  customer_cpf text,
  customer_whatsapp text,
  notes text,
  labor_cost numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Quote items table
CREATE TABLE public.quote_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  part_id uuid REFERENCES public.parts(id),
  part_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_cost numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- Auto-set tenant_id triggers
CREATE TRIGGER set_quotes_tenant_id BEFORE INSERT ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER set_quote_items_tenant_id BEFORE INSERT ON public.quote_items
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- Updated_at trigger
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies for quotes
CREATE POLICY "Tenant read quotes" ON public.quotes FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert quotes" ON public.quotes FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update quotes" ON public.quotes FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete quotes" ON public.quotes FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- RLS policies for quote_items
CREATE POLICY "Tenant read quote_items" ON public.quote_items FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant insert quote_items" ON public.quote_items FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant update quote_items" ON public.quote_items FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "Tenant delete quote_items" ON public.quote_items FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Indexes
CREATE INDEX idx_quotes_tenant_id ON public.quotes(tenant_id);
CREATE INDEX idx_quote_items_quote_id ON public.quote_items(quote_id);
CREATE INDEX idx_quote_items_tenant_id ON public.quote_items(tenant_id);

-- Add customer_id FK to mechanic_jobs
ALTER TABLE public.mechanic_jobs
  ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

-- Add customer_id FK to service_orders
ALTER TABLE public.service_orders
  ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

-- Add customer_id FK to quotes
ALTER TABLE public.quotes
  ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

-- Function to decrement stock when sale_items are inserted
CREATE OR REPLACE FUNCTION public.decrement_stock_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Decrement part stock (never below 0)
  IF NEW.part_id IS NOT NULL THEN
    UPDATE public.parts
    SET stock_qty = GREATEST(stock_qty - NEW.quantity, 0),
        updated_at = now()
    WHERE id = NEW.part_id;
  END IF;

  -- Decrement bike model stock (never below 0)
  IF NEW.bike_model_id IS NOT NULL THEN
    UPDATE public.bike_models
    SET stock_qty = GREATEST(stock_qty - NEW.quantity, 0),
        updated_at = now()
    WHERE id = NEW.bike_model_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on sale_items insert
CREATE TRIGGER trg_decrement_stock_on_sale
  AFTER INSERT ON public.sale_items
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_stock_on_sale();

-- Enable realtime for parts and bike_models
ALTER PUBLICATION supabase_realtime ADD TABLE public.parts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bike_models;

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

-- ============================================================
-- FIX 1: Remove anon SELECT on parts base table (unit_cost exposure)
-- The public page already uses parts_public view, so this is safe.
-- ============================================================
DROP POLICY IF EXISTS "Anon can read visible parts" ON public.parts;

-- Also remove anon SELECT on bike_models base table (cost_price exposure)
DROP POLICY IF EXISTS "Anon can read visible bike_models" ON public.bike_models;

-- ============================================================
-- FIX 2: Add tenant_id to WhatsApp tables and enforce tenant isolation
-- ============================================================

-- Add tenant_id column to whatsapp_conversations
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- Add tenant_id column to whatsapp_messages  
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- Add auto-set triggers for tenant_id
CREATE OR REPLACE TRIGGER set_tenant_id_whatsapp_conversations
  BEFORE INSERT ON public.whatsapp_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE OR REPLACE TRIGGER set_tenant_id_whatsapp_messages
  BEFORE INSERT ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- Drop old permissive policies on whatsapp_conversations
DROP POLICY IF EXISTS "Authenticated users can read whatsapp_conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Authenticated users can insert whatsapp_conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Authenticated users can update whatsapp_conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Authenticated users can delete whatsapp_conversations" ON public.whatsapp_conversations;

-- Create tenant-scoped policies on whatsapp_conversations
CREATE POLICY "Tenant read whatsapp_conversations" ON public.whatsapp_conversations
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant insert whatsapp_conversations" ON public.whatsapp_conversations
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant update whatsapp_conversations" ON public.whatsapp_conversations
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant delete whatsapp_conversations" ON public.whatsapp_conversations
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Drop old permissive policies on whatsapp_messages
DROP POLICY IF EXISTS "Authenticated users can read whatsapp_messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Authenticated users can insert whatsapp_messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Authenticated users can update whatsapp_messages" ON public.whatsapp_messages;

-- Create tenant-scoped policies on whatsapp_messages
CREATE POLICY "Tenant read whatsapp_messages" ON public.whatsapp_messages
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant insert whatsapp_messages" ON public.whatsapp_messages
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant update whatsapp_messages" ON public.whatsapp_messages
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- ============================================================
-- FIX 3: Make get_user_tenant_id deterministic
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_members 
  WHERE user_id = _user_id 
  ORDER BY created_at ASC 
  LIMIT 1
$$;

-- Backfill existing whatsapp data with the first tenant's id
UPDATE public.whatsapp_conversations
SET tenant_id = (SELECT id FROM public.tenants ORDER BY created_at ASC LIMIT 1)
WHERE tenant_id IS NULL;

UPDATE public.whatsapp_messages
SET tenant_id = (SELECT id FROM public.tenants ORDER BY created_at ASC LIMIT 1)
WHERE tenant_id IS NULL;

-- Fix search_path for functions missing it
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_part_sku()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    NEW.sku := 'PCA-' || LPAD(nextval('parts_sku_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_bike_sku()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    NEW.sku := 'BKE-' || LPAD(nextval('bike_models_sku_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix 1: Replace anon SELECT policy on bike_model_parts to use the public view (excludes unit_cost)
DROP POLICY IF EXISTS "Anon can read bike_model_parts for visible bikes" ON public.bike_model_parts;

CREATE POLICY "Anon can read bike_model_parts for visible bikes"
ON public.bike_model_parts
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.bike_models bm
    WHERE bm.id = bike_model_parts.bike_model_id
      AND bm.visible_on_storefront = true
  )
);

-- Actually, the policy still returns all columns including unit_cost.
-- The proper fix is to revoke direct anon SELECT on bike_model_parts and only allow access through the view.
DROP POLICY IF EXISTS "Anon can read bike_model_parts for visible bikes" ON public.bike_model_parts;

-- Anon users should only use the bike_model_parts_public view which already excludes unit_cost and tenant_id.

-- Fix 2: Replace is_tenant_owner with tenant-scoped version
CREATE OR REPLACE FUNCTION public.is_tenant_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE user_id = _user_id
      AND role = 'owner'
      AND tenant_id = get_user_tenant_id(_user_id)
  )
$$;

-- Add responsible_name to existing tables
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS responsible_name text;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS responsible_name text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS responsible_name text;

-- Create stock_changes table
CREATE TABLE IF NOT EXISTS public.stock_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  product_type text NOT NULL,
  product_id uuid NOT NULL,
  product_name text NOT NULL,
  old_qty integer NOT NULL,
  new_qty integer NOT NULL,
  responsible_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant read stock_changes" ON public.stock_changes
  FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant insert stock_changes" ON public.stock_changes
  FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- Auto-set tenant_id
CREATE TRIGGER set_tenant_id_stock_changes
  BEFORE INSERT ON public.stock_changes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- Update decrement_stock_on_sale to also log stock changes
CREATE OR REPLACE FUNCTION public.decrement_stock_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _responsible text;
  _old_qty integer;
  _name text;
  _tenant uuid;
BEGIN
  SELECT responsible_name INTO _responsible FROM public.sales WHERE id = NEW.sale_id;

  IF NEW.part_id IS NOT NULL THEN
    SELECT stock_qty, name, tenant_id INTO _old_qty, _name, _tenant
    FROM public.parts WHERE id = NEW.part_id;

    UPDATE public.parts
    SET stock_qty = GREATEST(stock_qty - NEW.quantity, 0), updated_at = now()
    WHERE id = NEW.part_id;

    INSERT INTO public.stock_changes (tenant_id, product_type, product_id, product_name, old_qty, new_qty, responsible_name)
    VALUES (_tenant, 'part', NEW.part_id, _name, _old_qty, GREATEST(_old_qty - NEW.quantity, 0), COALESCE(_responsible, 'Venda'));
  END IF;

  IF NEW.bike_model_id IS NOT NULL THEN
    SELECT stock_qty, name, tenant_id INTO _old_qty, _name, _tenant
    FROM public.bike_models WHERE id = NEW.bike_model_id;

    UPDATE public.bike_models
    SET stock_qty = GREATEST(stock_qty - NEW.quantity, 0), updated_at = now()
    WHERE id = NEW.bike_model_id;

    INSERT INTO public.stock_changes (tenant_id, product_type, product_id, product_name, old_qty, new_qty, responsible_name)
    VALUES (_tenant, 'bike', NEW.bike_model_id, _name, _old_qty, GREATEST(_old_qty - NEW.quantity, 0), COALESCE(_responsible, 'Venda'));
  END IF;

  RETURN NEW;
END;
$$;

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

-- Fix security definer views by setting security_invoker
ALTER VIEW public.bike_models_public SET (security_invoker = true);
ALTER VIEW public.parts_public SET (security_invoker = true);
ALTER VIEW public.bike_model_parts_public SET (security_invoker = true);
ALTER PUBLICATION supabase_realtime ADD TABLE
  customers,
  sales,
  sale_items,
  mechanic_jobs,
  mechanic_job_additions,
  mechanics,
  cash_registers,
  cash_register_sales,
  stock_changes,
  quotes,
  quote_items,
  fixed_expenses,
  variable_expenses,
  categories,
  bike_model_parts,
  settings;

ALTER TABLE public.mechanic_job_additions
  ADD COLUMN IF NOT EXISTS labor_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS parts_used jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.mechanic_job_additions.parts_used IS 'Array of {part_id, part_name, quantity, unit_price}';

CREATE TABLE public.lucky_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  number text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lucky_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own lucky numbers"
  ON public.lucky_numbers FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own lucky numbers"
  ON public.lucky_numbers FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_lucky_numbers_tenant_id
  BEFORE INSERT ON public.lucky_numbers
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- Table: internal_calls
create table public.internal_calls (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  created_by uuid not null,
  created_by_name text not null,
  target_type text not null default 'all',
  target_role text,
  target_user_id uuid,
  tenant_id uuid references public.tenants(id),
  created_at timestamptz default now()
);

alter table public.internal_calls enable row level security;

create policy "Tenant read internal_calls" on public.internal_calls
  for select to authenticated
  using (tenant_id = get_user_tenant_id(auth.uid()));

create policy "Tenant insert internal_calls" on public.internal_calls
  for insert to authenticated
  with check (tenant_id = get_user_tenant_id(auth.uid()));

create policy "Tenant delete internal_calls" on public.internal_calls
  for delete to authenticated
  using (tenant_id = get_user_tenant_id(auth.uid()));

-- Trigger to auto-set tenant_id
create trigger set_tenant_id_internal_calls
  before insert on public.internal_calls
  for each row execute function public.set_tenant_id();

-- Table: internal_call_views
create table public.internal_call_views (
  id uuid primary key default gen_random_uuid(),
  call_id uuid references public.internal_calls(id) on delete cascade not null,
  user_id uuid not null,
  tenant_id uuid references public.tenants(id),
  viewed_at timestamptz default now(),
  unique(call_id, user_id)
);

alter table public.internal_call_views enable row level security;

create policy "Tenant read internal_call_views" on public.internal_call_views
  for select to authenticated
  using (tenant_id = get_user_tenant_id(auth.uid()));

create policy "Tenant insert internal_call_views" on public.internal_call_views
  for insert to authenticated
  with check (tenant_id = get_user_tenant_id(auth.uid()));

create trigger set_tenant_id_internal_call_views
  before insert on public.internal_call_views
  for each row execute function public.set_tenant_id();

-- Enable realtime on internal_calls
alter publication supabase_realtime add table public.internal_calls;

-- Table for call replies
CREATE TABLE public.internal_call_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.internal_calls(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_by uuid NOT NULL,
  created_by_name text NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz DEFAULT now()
);

-- Auto-set tenant_id
CREATE TRIGGER set_tenant_id_internal_call_replies
  BEFORE INSERT ON public.internal_call_replies
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- Enable RLS
ALTER TABLE public.internal_call_replies ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Tenant read internal_call_replies"
  ON public.internal_call_replies FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant insert internal_call_replies"
  ON public.internal_call_replies FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_call_replies;

-- Add audio columns to internal_calls
ALTER TABLE public.internal_calls
  ADD COLUMN audio_url text,
  ADD COLUMN audio_duration integer;

-- Create storage bucket for call audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('internal-calls', 'internal-calls', true);

-- Storage policies: authenticated users can upload
CREATE POLICY "Authenticated users can upload call audio"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'internal-calls');

-- Authenticated users can read
CREATE POLICY "Authenticated users can read call audio"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'internal-calls');

-- Authenticated users can delete own uploads
CREATE POLICY "Authenticated users can delete call audio"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'internal-calls');
-- Allow any authenticated user to read profiles (only contains names/avatars, no sensitive data)
CREATE POLICY "Authenticated can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);
-- Create bills table for bill management
CREATE TABLE public.bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode text NOT NULL,
  barcode_type text NOT NULL DEFAULT 'boleto',
  bank_name text,
  beneficiary text,
  amount decimal(10,2),
  due_date date,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  notes text,
  created_by uuid,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Tenant read bills" ON public.bills FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant insert bills" ON public.bills FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant update bills" ON public.bills FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant delete bills" ON public.bills FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Auto-set tenant_id trigger
CREATE TRIGGER set_bills_tenant_id
  BEFORE INSERT ON public.bills
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();
DELETE FROM whatsapp_messages;
DELETE FROM whatsapp_conversations;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed';

-- Stock entries table for price history
CREATE TABLE public.stock_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,
  item_type text NOT NULL, -- 'part' or 'bike'
  quantity int NOT NULL,
  unit_cost decimal(10,2) NOT NULL DEFAULT 0,
  supplier_name text,
  notes text,
  created_by uuid,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Tenant read stock_entries" ON public.stock_entries
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant insert stock_entries" ON public.stock_entries
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant update stock_entries" ON public.stock_entries
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant delete stock_entries" ON public.stock_entries
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Auto-set tenant_id trigger
CREATE TRIGGER set_stock_entries_tenant_id
  BEFORE INSERT ON public.stock_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  period text NOT NULL,
  target_value decimal(10,2) NOT NULL,
  reference_date date NOT NULL,
  created_by uuid,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(type, period, reference_date, tenant_id)
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant read goals" ON public.goals
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant insert goals" ON public.goals
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant update goals" ON public.goals
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant delete goals" ON public.goals
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE TRIGGER set_goals_tenant_id
  BEFORE INSERT ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- Create promotions table
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric(10,2) NOT NULL DEFAULT 0,
  applies_to text NOT NULL DEFAULT 'product',
  product_id uuid REFERENCES public.parts(id) ON DELETE SET NULL,
  bike_model_id uuid REFERENCES public.bike_models(id) ON DELETE SET NULL,
  category text,
  scope text NOT NULL DEFAULT 'pdv',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT now(),
  active boolean DEFAULT true,
  created_by uuid,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz DEFAULT now()
);

-- Add tenant_id trigger
CREATE TRIGGER set_promotions_tenant_id
  BEFORE INSERT ON public.promotions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- Enable RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Tenant read promotions" ON public.promotions
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant insert promotions" ON public.promotions
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant update promotions" ON public.promotions
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant delete promotions" ON public.promotions
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Add discount columns to sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS discount_type text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS promotion_id uuid REFERENCES public.promotions(id);

-- Step 1: Add columns
ALTER TABLE parts ADD COLUMN IF NOT EXISTS price_store numeric DEFAULT NULL;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS price_ecommerce numeric DEFAULT NULL;
ALTER TABLE bike_models ADD COLUMN IF NOT EXISTS price_store numeric DEFAULT NULL;
ALTER TABLE bike_models ADD COLUMN IF NOT EXISTS price_ecommerce numeric DEFAULT NULL;

-- Step 2: Migrate existing data
UPDATE parts SET price_store = sale_price WHERE sale_price > 0 AND price_store IS NULL;
UPDATE bike_models SET price_store = sale_price WHERE sale_price > 0 AND price_store IS NULL;

DROP VIEW IF EXISTS parts_public;
CREATE VIEW parts_public AS
SELECT id, name, sku, category, description, notes, material, weight_capacity_kg, gears, hub_style,
       color, rim_size, frame_size, images, stock_qty, visible_on_storefront, sale_price, pix_price,
       installment_price, installment_count, price_store, price_ecommerce, created_at, updated_at
FROM parts
WHERE visible_on_storefront = true;

DROP VIEW IF EXISTS bike_models_public;
CREATE VIEW bike_models_public AS
SELECT id, name, sku, category, description, brand, color, rim_size, frame_size, weight_kg,
       images, stock_qty, visible_on_storefront, sale_price, pix_price, installment_price,
       installment_count, price_store, price_ecommerce, created_at, updated_at
FROM bike_models
WHERE visible_on_storefront = true;

ALTER VIEW parts_public SET (security_invoker = on);
ALTER VIEW bike_models_public SET (security_invoker = on);

ALTER TABLE bike_models
  ADD COLUMN IF NOT EXISTS installments_enabled_store boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS installment_count_store integer,
  ADD COLUMN IF NOT EXISTS installment_value_store numeric,
  ADD COLUMN IF NOT EXISTS installments_enabled_ecommerce boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS installment_count_ecommerce integer,
  ADD COLUMN IF NOT EXISTS installment_value_ecommerce numeric;

UPDATE bike_models
SET installments_enabled_store = true,
    installment_count_store = installment_count,
    installment_value_store = installment_price
WHERE installment_count > 1 AND installment_price > 0;

DROP VIEW IF EXISTS bike_models_public;

CREATE VIEW bike_models_public AS
SELECT id, name, sku, category, description, brand, color, rim_size, frame_size, weight_kg,
       images, stock_qty, visible_on_storefront,
       sale_price, pix_price, installment_price, installment_count,
       price_store, price_ecommerce,
       installments_enabled_store, installment_count_store, installment_value_store,
       installments_enabled_ecommerce, installment_count_ecommerce, installment_value_ecommerce,
       created_at, updated_at
FROM bike_models
WHERE visible_on_storefront = true;
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
select
cron.schedule(
  'whatsapp-health-check',
  '*/5 * * * *',
  $$
  select
    net.http_post(
        url:='https://cxyfwikrjtovvyvcyacl.supabase.co/functions/v1/zapi-health-check',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4eWZ3aWtyanRvdnZ5dmN5YWNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMzc2MzYsImV4cCI6MjA4ODcxMzYzNn0.B4JNUOSuxHaMLP45mF780hyuQEzuHge7AMkyT_fBGHE"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);
select cron.unschedule('whatsapp-health-check');
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cep text;
-- Add address fields to customers (PDV lead data)
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS address_complement text,
  ADD COLUMN IF NOT EXISTS address_neighborhood text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_state text;

CREATE TABLE IF NOT EXISTS os_adicionais (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), os_id UUID REFERENCES mechanic_jobs(id) ON DELETE CASCADE, pecas JSONB, observacoes TEXT, valor_total DECIMAL(12,2), status TEXT DEFAULT 'pendente', criado_em TIMESTAMPTZ DEFAULT now());
CREATE TABLE IF NOT EXISTS os_pagamentos (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), os_id UUID REFERENCES mechanic_jobs(id) ON DELETE CASCADE, tipo TEXT CHECK (tipo IN ('integral', 'parcial', 'nenhum')), valor_total DECIMAL(12,2), valor_pago DECIMAL(12,2), valor_restante DECIMAL(12,2), criado_em TIMESTAMPTZ DEFAULT now());
-- Fix RLS policies for os_adicionais so authenticated users can read/write
ALTER TABLE IF EXISTS os_adicionais ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting policies
DROP POLICY IF EXISTS "os_adicionais_select" ON os_adicionais;
DROP POLICY IF EXISTS "os_adicionais_insert" ON os_adicionais;
DROP POLICY IF EXISTS "os_adicionais_update" ON os_adicionais;
DROP POLICY IF EXISTS "os_adicionais_delete" ON os_adicionais;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON os_adicionais;

-- Allow all operations for authenticated users (internal staff)
CREATE POLICY "os_adicionais_authenticated_all"
  ON os_adicionais
  FOR ALL
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Also ensure mechanic_job_additions has same open policy
ALTER TABLE IF EXISTS mechanic_job_additions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mechanic_job_additions_authenticated_all" ON mechanic_job_additions;
CREATE POLICY "mechanic_job_additions_authenticated_all"
  ON mechanic_job_additions
  FOR ALL
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');
-- Ensure all station users that exist get default whatsapp permission
-- This fixes the "WhatsApp disappeared" issue after permissions overhaul
INSERT INTO module_permissions (tenant_member_id, module, can_access)
SELECT 
  sm.id as tenant_member_id,
  'whatsapp' as module,
  true as can_access
FROM tenant_members sm
WHERE sm.email LIKE '%@station.internal%'
  AND NOT EXISTS (
    SELECT 1 FROM module_permissions sp
    WHERE sp.tenant_member_id = sm.id AND sp.module = 'whatsapp'
  )
ON CONFLICT DO NOTHING;
-- Add origin and mechanic_job_id columns to sales table
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'pdv',
  ADD COLUMN IF NOT EXISTS mechanic_job_id TEXT DEFAULT NULL;

-- Add index for faster lookup
CREATE INDEX IF NOT EXISTS sales_origin_idx ON sales(origin);
CREATE INDEX IF NOT EXISTS sales_mechanic_job_idx ON sales(mechanic_job_id);

-- Also ensure customers table has the basic columns (whatsapp, cpf)
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE whatsapp_conversations 
ADD COLUMN IF NOT EXISTS human_takeover BOOLEAN DEFAULT false;
-- Create history table for OS payments
CREATE TABLE IF NOT EXISTS os_pagamentos_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID REFERENCES mechanic_jobs(id) ON DELETE CASCADE,
  valor DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL CHECK (tipo IN ('parcial', 'integral', 'desconto')),
  payment_method TEXT,
  desconto_valor DECIMAL(12, 2) DEFAULT 0,
  desconto_motivo TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id),
  customer_id UUID,
  customer_name TEXT,
  customer_whatsapp TEXT
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_os_pagamentos_historico_os_id ON os_pagamentos_historico(os_id);

-- Enable RLS
ALTER TABLE os_pagamentos_historico ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage payments (simplify for now, or match mechanic_jobs access)
CREATE POLICY "Manage payments" ON os_pagamentos_historico FOR ALL TO authenticated USING (true);
-- Criar tabela de fotos
CREATE TABLE IF NOT EXISTS os_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID REFERENCES mechanic_jobs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  tipo TEXT CHECK (tipo IN ('chegada', 'problema', 'finalizacao')),
  criado_em TIMESTAMPTZ DEFAULT now(),
  expira_em TIMESTAMPTZ DEFAULT (now() + interval '15 days')
);

-- Ativar pg_cron se disponível e agendar limpeza
-- Obs: pg_cron geralmente requer configuração no painel do Supabase.
-- Se o cron não funcionar, este comando falhará (mas a tabela existirá).
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron não disponível. Certifique-se de habilitar via dashboard.';
END $$;

-- Tentar agendar a deleção se o pg_cron estiver disponível
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'deletar-fotos-expiradas',
      '0 3 * * *',
      'DELETE FROM os_fotos WHERE expira_em < now()'
    );
  END IF;
END $$;
-- Adicionar coluna sem_custo à tabela mechanic_jobs
ALTER TABLE mechanic_jobs 
ADD COLUMN IF NOT EXISTS sem_custo BOOLEAN DEFAULT false;
-- Adicionar coluna sem_custo à tabela bike_service_history
ALTER TABLE bike_service_history 
ADD COLUMN IF NOT EXISTS sem_custo BOOLEAN DEFAULT false;
-- Adicionar coluna sem_custo à tabela service_orders
ALTER TABLE service_orders 
ADD COLUMN IF NOT EXISTS sem_custo BOOLEAN DEFAULT false;
-- Add mechanic_notes to os_adicionais
ALTER TABLE os_adicionais ADD COLUMN IF NOT EXISTS mechanic_notes TEXT;

-- Update check constraint for os_pagamentos_historico.tipo
DO $$ 
BEGIN 
    ALTER TABLE os_pagamentos_historico DROP CONSTRAINT IF EXISTS os_pagamentos_historico_tipo_check;
    ALTER TABLE os_pagamentos_historico ADD CONSTRAINT os_pagamentos_historico_tipo_check 
        CHECK (tipo IN ('parcial', 'integral', 'desconto', 'adicional_aprovado'));
EXCEPTION 
    WHEN undefined_table THEN RAISE NOTICE 'Table not found';
END $$;

-- Trigger to handle additional repair approval
CREATE OR REPLACE FUNCTION handle_os_adicional_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_id UUID;
    v_customer_name TEXT;
    v_customer_whatsapp TEXT;
BEGIN
    -- Only run when status changes to 'aprovado'
    IF (NEW.status = 'aprovado' AND OLD.status != 'aprovado') THEN
        
        -- 1. Update os_pagamentos.valor_restante
        UPDATE os_pagamentos 
        SET valor_restante = COALESCE(valor_restante, 0) + COALESCE(NEW.valor_total, 0)
        WHERE os_id = NEW.os_id;

        -- 2. Fetch customer info from mechanic_jobs for the history log
        SELECT customer_id, customer_name, customer_whatsapp 
        INTO v_customer_id, v_customer_name, v_customer_whatsapp
        FROM mechanic_jobs WHERE id = NEW.os_id;

        -- 3. Insert into os_pagamentos_historico
        INSERT INTO os_pagamentos_historico (
            os_id, 
            valor, 
            tipo, 
            desconto_valor, 
            desconto_motivo, -- Using this to store the addition description
            customer_id, 
            customer_name, 
            customer_whatsapp
        ) VALUES (
            NEW.os_id, 
            COALESCE(NEW.valor_total, 0), 
            'adicional_aprovado', 
            0,
            COALESCE(NEW.problem, 'Adicional aprovado'), -- The 'problem' field contains the addition description
            v_customer_id, 
            v_customer_name, 
            v_customer_whatsapp
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS tr_os_adicional_approval ON os_adicionais;
CREATE TRIGGER tr_os_adicional_approval
AFTER UPDATE ON os_adicionais
FOR EACH ROW
EXECUTE FUNCTION handle_os_adicional_approval();
CREATE TABLE IF NOT EXISTS developer_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilita RLS
ALTER TABLE developer_tasks ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso simples para usuários autenticados (Admins e Salão)
CREATE POLICY "Enable all for authenticated users" ON developer_tasks
  FOR ALL USING (auth.role() = 'authenticated');
-- UNIFIED PRO DELIVERY - MARCH 27, 2026
-- This migration consolidates Sales, CRM, and Realtime Sync features.

-- BLOCK 1: STORE SALES (MERCADO PAGO)
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS external_reference TEXT;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS status_detail TEXT;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS payment_id BIGINT;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS installments INT;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS transaction_amount NUMERIC;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS total_amount NUMERIC;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS shipping_amount NUMERIC;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS customer_cpf TEXT;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS items JSONB;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'store_sales_external_reference_key') THEN
    ALTER TABLE store_sales ADD CONSTRAINT store_sales_external_reference_key UNIQUE (external_reference);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_store_sales_external_ref ON store_sales(external_reference);


-- BLOCK 2: WHATSAPP LABELS
ALTER TABLE IF EXISTS whatsapp_conversations ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE IF EXISTS whatsapp_conversations ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS whatsapp_conversations ADD COLUMN IF NOT EXISTS human_takeover BOOLEAN DEFAULT false;


-- BLOCK 3: BI-DIRECTIONAL SYNC (OFICINA <-> MECANICOS)

-- 3.1 Safely enable Realtime
DO $$ 
BEGIN 
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE mechanic_jobs;
  EXCEPTION WHEN others THEN RAISE NOTICE 'mechanic_jobs skipped'; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE service_orders;
  EXCEPTION WHEN others THEN RAISE NOTICE 'service_orders skipped'; END;
END $$;

-- 3.2 Sync Function: Oficina -> Mecanicos
CREATE OR REPLACE FUNCTION sync_job_to_service_order_v3()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO service_orders (
    id, customer_name, customer_cpf, customer_whatsapp, bike_name, problem, price, 
    mechanic_status, updated_at
  )
  VALUES (
    NEW.id, NEW.customer_name, NEW.customer_cpf, NEW.customer_whatsapp, NEW.bike_name, 
    COALESCE(NEW.problem, 'Sem descrição'), NEW.price,
    CASE 
      WHEN NEW.status = 'in_repair' THEN 'pending'
      WHEN NEW.status = 'in_maintenance' THEN 'accepted'
      WHEN NEW.status IN ('in_analysis', 'ready', 'delivered') THEN 'done'
      ELSE 'cancelled'
    END,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    customer_name = EXCLUDED.customer_name,
    customer_whatsapp = EXCLUDED.customer_whatsapp,
    bike_name = EXCLUDED.bike_name,
    problem = EXCLUDED.problem,
    price = EXCLUDED.price,
    mechanic_status = EXCLUDED.mechanic_status,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_job_to_service_order ON mechanic_jobs;
CREATE TRIGGER tr_sync_job_to_service_order
AFTER INSERT OR UPDATE ON mechanic_jobs
FOR EACH ROW EXECUTE FUNCTION sync_job_to_service_order_v3();

-- 3.3 Sync Function: Mecanicos -> Oficina
CREATE OR REPLACE FUNCTION sync_service_order_to_job_v3()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.mechanic_status IS NOT DISTINCT FROM NEW.mechanic_status) THEN
    RETURN NEW;
  END IF;

  UPDATE mechanic_jobs SET
    status = CASE 
      WHEN NEW.mechanic_status = 'pending' THEN 'in_repair'
      WHEN NEW.mechanic_status = 'accepted' THEN 'in_maintenance'
      WHEN NEW.mechanic_status = 'done' THEN 'in_analysis'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = NEW.id AND status NOT IN ('ready', 'delivered', 'cancelado');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_service_order_to_job ON service_orders;
CREATE TRIGGER tr_sync_service_order_to_job
AFTER UPDATE ON service_orders
FOR EACH ROW EXECUTE FUNCTION sync_service_order_to_job_v3();
