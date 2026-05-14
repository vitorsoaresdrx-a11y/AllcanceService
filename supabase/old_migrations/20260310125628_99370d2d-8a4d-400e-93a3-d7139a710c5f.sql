
-- Settings table for card machine taxes and future configs
CREATE TABLE public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read settings" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert settings" ON public.settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update settings" ON public.settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Insert default card tax settings
INSERT INTO public.settings (key, value) VALUES ('card_taxes', '{"credit_tax": 0, "debit_tax": 0}'::jsonb);

-- Add card fee tracking to sales for DRE
ALTER TABLE public.sales
  ADD COLUMN card_fee numeric DEFAULT 0,
  ADD COLUMN card_tax_percent numeric DEFAULT 0;
