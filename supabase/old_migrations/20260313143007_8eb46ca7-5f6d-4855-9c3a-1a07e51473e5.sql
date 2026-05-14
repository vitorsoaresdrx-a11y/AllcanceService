
-- Add responsible_name to existing tables
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS responsible_name text;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS responsible_name text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS responsible_name text;

-- Create stock_changes table
CREATE TABLE IF NOT EXISTS public.stock_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  product_type text NOT NULL,
  product_id uuid NOT NULL,
  product_name text NOT NULL,
  old_qty integer NOT NULL,
  new_qty integer NOT NULL,
  responsible_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant read stock_changes" ON public.stock_changes
  FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant insert stock_changes" ON public.stock_changes
  FOR INSERT TO authenticated WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- Auto-set tenant_id
CREATE TRIGGER set_tenant_id_stock_changes
  BEFORE INSERT ON public.stock_changes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id();

-- Update decrement_stock_on_sale to also log stock changes
CREATE OR REPLACE FUNCTION public.decrement_stock_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _responsible text;
  _old_qty integer;
  _name text;
  _tenant uuid;
BEGIN
  SELECT responsible_name INTO _responsible FROM public.sales WHERE id = NEW.sale_id;

  IF NEW.part_id IS NOT NULL THEN
    SELECT stock_qty, name, tenant_id INTO _old_qty, _name, _tenant
    FROM public.parts WHERE id = NEW.part_id;

    UPDATE public.parts
    SET stock_qty = GREATEST(stock_qty - NEW.quantity, 0), updated_at = now()
    WHERE id = NEW.part_id;

    INSERT INTO public.stock_changes (tenant_id, product_type, product_id, product_name, old_qty, new_qty, responsible_name)
    VALUES (_tenant, 'part', NEW.part_id, _name, _old_qty, GREATEST(_old_qty - NEW.quantity, 0), COALESCE(_responsible, 'Venda'));
  END IF;

  IF NEW.bike_model_id IS NOT NULL THEN
    SELECT stock_qty, name, tenant_id INTO _old_qty, _name, _tenant
    FROM public.bike_models WHERE id = NEW.bike_model_id;

    UPDATE public.bike_models
    SET stock_qty = GREATEST(stock_qty - NEW.quantity, 0), updated_at = now()
    WHERE id = NEW.bike_model_id;

    INSERT INTO public.stock_changes (tenant_id, product_type, product_id, product_name, old_qty, new_qty, responsible_name)
    VALUES (_tenant, 'bike', NEW.bike_model_id, _name, _old_qty, GREATEST(_old_qty - NEW.quantity, 0), COALESCE(_responsible, 'Venda'));
  END IF;

  RETURN NEW;
END;
$$;
