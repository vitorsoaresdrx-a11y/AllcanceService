
-- Fixed expenses (recurring monthly)
CREATE TABLE public.fixed_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read fixed_expenses" ON public.fixed_expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fixed_expenses" ON public.fixed_expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fixed_expenses" ON public.fixed_expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete fixed_expenses" ON public.fixed_expenses FOR DELETE TO authenticated USING (true);

-- Variable expenses (per-occurrence, with date)
CREATE TABLE public.variable_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.variable_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read variable_expenses" ON public.variable_expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert variable_expenses" ON public.variable_expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update variable_expenses" ON public.variable_expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete variable_expenses" ON public.variable_expenses FOR DELETE TO authenticated USING (true);
