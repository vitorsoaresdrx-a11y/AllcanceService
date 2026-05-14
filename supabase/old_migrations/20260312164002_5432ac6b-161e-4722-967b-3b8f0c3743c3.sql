
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
