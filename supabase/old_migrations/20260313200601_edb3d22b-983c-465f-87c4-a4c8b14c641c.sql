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