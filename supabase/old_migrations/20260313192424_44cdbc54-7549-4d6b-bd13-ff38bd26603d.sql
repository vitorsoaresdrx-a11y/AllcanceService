
-- Table for call replies
CREATE TABLE public.internal_call_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.internal_calls(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_by uuid NOT NULL,
  created_by_name text NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz DEFAULT now()
);

-- Auto-set tenant_id
CREATE TRIGGER set_tenant_id_internal_call_replies
  BEFORE INSERT ON public.internal_call_replies
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- Enable RLS
ALTER TABLE public.internal_call_replies ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Tenant read internal_call_replies"
  ON public.internal_call_replies FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant insert internal_call_replies"
  ON public.internal_call_replies FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_call_replies;
