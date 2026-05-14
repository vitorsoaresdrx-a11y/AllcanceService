-- Drop the recursive SELECT policy
DROP POLICY "Members can read same tenant members" ON public.tenant_members;

-- Create a simple non-recursive policy: users can read their own membership row
CREATE POLICY "Users can read own membership"
  ON public.tenant_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Owners need to see all members in their tenant - use security definer function
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.tenant_members WHERE user_id = _user_id LIMIT 1
$$;

-- Policy for owners to see all members of their tenant
CREATE POLICY "Owner can read all tenant members"
  ON public.tenant_members FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));
