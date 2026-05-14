
CREATE TABLE public.mechanic_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name text,
  customer_cpf text,
  customer_whatsapp text,
  bike_name text,
  problem text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'in_repair',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.mechanic_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read mechanic_jobs" ON public.mechanic_jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert mechanic_jobs" ON public.mechanic_jobs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update mechanic_jobs" ON public.mechanic_jobs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete mechanic_jobs" ON public.mechanic_jobs FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_mechanic_jobs_updated_at BEFORE UPDATE ON public.mechanic_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
