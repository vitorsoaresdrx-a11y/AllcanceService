
CREATE TABLE public.mechanic_job_additions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.mechanic_jobs(id) ON DELETE CASCADE,
  problem text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  approval text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.mechanic_job_additions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read mechanic_job_additions" ON public.mechanic_job_additions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert mechanic_job_additions" ON public.mechanic_job_additions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update mechanic_job_additions" ON public.mechanic_job_additions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete mechanic_job_additions" ON public.mechanic_job_additions FOR DELETE TO authenticated USING (true);
