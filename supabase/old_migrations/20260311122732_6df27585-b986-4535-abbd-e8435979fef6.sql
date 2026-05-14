
-- Cash register sessions
CREATE TABLE public.cash_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  opening_amount numeric NOT NULL DEFAULT 0,
  closing_amount numeric,
  expected_amount numeric,
  difference numeric,
  status text NOT NULL DEFAULT 'open',
  opened_by text,
  closed_by text
);

ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cash_registers" ON public.cash_registers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert cash_registers" ON public.cash_registers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update cash_registers" ON public.cash_registers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Cash register sales link
CREATE TABLE public.cash_register_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id uuid NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_register_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cash_register_sales" ON public.cash_register_sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert cash_register_sales" ON public.cash_register_sales FOR INSERT TO authenticated WITH CHECK (true);
