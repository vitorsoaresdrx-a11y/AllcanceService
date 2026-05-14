
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
