
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
