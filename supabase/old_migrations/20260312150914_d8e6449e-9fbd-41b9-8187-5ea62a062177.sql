
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
