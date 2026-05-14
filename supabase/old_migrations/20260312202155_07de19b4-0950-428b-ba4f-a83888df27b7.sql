
-- Function to decrement stock when sale_items are inserted
CREATE OR REPLACE FUNCTION public.decrement_stock_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Decrement part stock (never below 0)
  IF NEW.part_id IS NOT NULL THEN
    UPDATE public.parts
    SET stock_qty = GREATEST(stock_qty - NEW.quantity, 0),
        updated_at = now()
    WHERE id = NEW.part_id;
  END IF;

  -- Decrement bike model stock (never below 0)
  IF NEW.bike_model_id IS NOT NULL THEN
    UPDATE public.bike_models
    SET stock_qty = GREATEST(stock_qty - NEW.quantity, 0),
        updated_at = now()
    WHERE id = NEW.bike_model_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on sale_items insert
CREATE TRIGGER trg_decrement_stock_on_sale
  AFTER INSERT ON public.sale_items
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_stock_on_sale();

-- Enable realtime for parts and bike_models
ALTER PUBLICATION supabase_realtime ADD TABLE public.parts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bike_models;
