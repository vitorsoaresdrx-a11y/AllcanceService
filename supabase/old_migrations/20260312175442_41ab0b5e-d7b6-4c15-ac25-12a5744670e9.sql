
-- Add customer_id FK to mechanic_jobs
ALTER TABLE public.mechanic_jobs
  ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

-- Add customer_id FK to service_orders
ALTER TABLE public.service_orders
  ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

-- Add customer_id FK to quotes
ALTER TABLE public.quotes
  ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;
