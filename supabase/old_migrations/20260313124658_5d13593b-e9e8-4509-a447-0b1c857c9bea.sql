
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
