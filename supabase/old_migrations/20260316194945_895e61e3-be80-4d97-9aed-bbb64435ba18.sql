
-- Create promotions table
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric(10,2) NOT NULL DEFAULT 0,
  applies_to text NOT NULL DEFAULT 'product',
  product_id uuid REFERENCES public.parts(id) ON DELETE SET NULL,
  bike_model_id uuid REFERENCES public.bike_models(id) ON DELETE SET NULL,
  category text,
  scope text NOT NULL DEFAULT 'pdv',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT now(),
  active boolean DEFAULT true,
  created_by uuid,
  tenant_id uuid REFERENCES public.tenants(id),
  created_at timestamptz DEFAULT now()
);

-- Add tenant_id trigger
CREATE TRIGGER set_promotions_tenant_id
  BEFORE INSERT ON public.promotions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- Enable RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Tenant read promotions" ON public.promotions
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant insert promotions" ON public.promotions
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant update promotions" ON public.promotions
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant delete promotions" ON public.promotions
  FOR DELETE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- Add discount columns to sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS discount_type text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS promotion_id uuid REFERENCES public.promotions(id);
