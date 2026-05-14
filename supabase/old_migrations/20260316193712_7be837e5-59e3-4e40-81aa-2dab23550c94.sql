
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
