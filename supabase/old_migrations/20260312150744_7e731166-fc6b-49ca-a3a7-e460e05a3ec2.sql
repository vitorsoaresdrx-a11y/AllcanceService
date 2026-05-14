
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
  END IF;
END;
$$;

-- 4. Set NOT NULL
ALTER TABLE public.bike_model_parts ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.bike_models ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.bike_service_history ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.cash_register_sales ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.cash_registers ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.categories ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.customers ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.fixed_expenses ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.mechanic_job_additions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.mechanic_jobs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.mechanics ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.parts ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.sale_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.sales ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.service_orders ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.settings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE public.variable_expenses ALTER COLUMN tenant_id SET NOT NULL;

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

-- 7. Add unique constraint on settings (tenant_id, key) for correct upserts
ALTER TABLE public.settings ADD CONSTRAINT settings_tenant_key_unique UNIQUE (tenant_id, key);
