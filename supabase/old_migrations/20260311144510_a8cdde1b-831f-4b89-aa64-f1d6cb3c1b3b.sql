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
