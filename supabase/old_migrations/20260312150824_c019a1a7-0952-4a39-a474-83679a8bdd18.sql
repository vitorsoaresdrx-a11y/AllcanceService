
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
