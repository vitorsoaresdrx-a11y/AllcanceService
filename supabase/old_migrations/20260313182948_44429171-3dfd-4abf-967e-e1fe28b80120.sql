
CREATE TABLE public.lucky_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  number text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lucky_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own lucky numbers"
  ON public.lucky_numbers FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own lucky numbers"
  ON public.lucky_numbers FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_lucky_numbers_tenant_id
  BEFORE INSERT ON public.lucky_numbers
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
