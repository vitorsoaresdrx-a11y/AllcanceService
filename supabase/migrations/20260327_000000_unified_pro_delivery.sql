-- UNIFIED PRO DELIVERY - MARCH 27, 2026
-- This migration consolidates Sales, CRM, and Realtime Sync features.

-- BLOCK 1: STORE SALES (MERCADO PAGO)
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS external_reference TEXT;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS status_detail TEXT;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS payment_id BIGINT;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS installments INT;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS transaction_amount NUMERIC;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS total_amount NUMERIC;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS shipping_amount NUMERIC;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS customer_cpf TEXT;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS store_sales ADD COLUMN IF NOT EXISTS items JSONB;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'store_sales_external_reference_key') THEN
    ALTER TABLE store_sales ADD CONSTRAINT store_sales_external_reference_key UNIQUE (external_reference);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_store_sales_external_ref ON store_sales(external_reference);


-- BLOCK 2: WHATSAPP LABELS
ALTER TABLE IF EXISTS whatsapp_conversations ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE IF EXISTS whatsapp_conversations ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS whatsapp_conversations ADD COLUMN IF NOT EXISTS human_takeover BOOLEAN DEFAULT false;


-- BLOCK 3: BI-DIRECTIONAL SYNC (OFICINA <-> MECANICOS)

-- 3.1 Safely enable Realtime
DO $$ 
BEGIN 
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE mechanic_jobs;
  EXCEPTION WHEN others THEN RAISE NOTICE 'mechanic_jobs skipped'; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE service_orders;
  EXCEPTION WHEN others THEN RAISE NOTICE 'service_orders skipped'; END;
END $$;

-- 3.2 Sync Function: Oficina -> Mecanicos
CREATE OR REPLACE FUNCTION sync_job_to_service_order_v3()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO service_orders (
    id, customer_name, customer_cpf, customer_whatsapp, bike_name, problem, price, 
    mechanic_status, updated_at
  )
  VALUES (
    NEW.id, NEW.customer_name, NEW.customer_cpf, NEW.customer_whatsapp, NEW.bike_name, 
    COALESCE(NEW.problem, 'Sem descrição'), NEW.price,
    CASE 
      WHEN NEW.status = 'in_repair' THEN 'pending'
      WHEN NEW.status = 'in_maintenance' THEN 'accepted'
      WHEN NEW.status IN ('in_analysis', 'ready', 'delivered') THEN 'done'
      ELSE 'cancelled'
    END,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    customer_name = EXCLUDED.customer_name,
    customer_whatsapp = EXCLUDED.customer_whatsapp,
    bike_name = EXCLUDED.bike_name,
    problem = EXCLUDED.problem,
    price = EXCLUDED.price,
    mechanic_status = EXCLUDED.mechanic_status,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_job_to_service_order ON mechanic_jobs;
CREATE TRIGGER tr_sync_job_to_service_order
AFTER INSERT OR UPDATE ON mechanic_jobs
FOR EACH ROW EXECUTE FUNCTION sync_job_to_service_order_v3();

-- 3.3 Sync Function: Mecanicos -> Oficina
CREATE OR REPLACE FUNCTION sync_service_order_to_job_v3()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.mechanic_status IS NOT DISTINCT FROM NEW.mechanic_status) THEN
    RETURN NEW;
  END IF;

  UPDATE mechanic_jobs SET
    status = CASE 
      WHEN NEW.mechanic_status = 'pending' THEN 'in_repair'
      WHEN NEW.mechanic_status = 'accepted' THEN 'in_maintenance'
      WHEN NEW.mechanic_status = 'done' THEN 'in_analysis'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = NEW.id AND status NOT IN ('ready', 'delivered', 'cancelado');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_sync_service_order_to_job ON service_orders;
CREATE TRIGGER tr_sync_service_order_to_job
AFTER UPDATE ON service_orders
FOR EACH ROW EXECUTE FUNCTION sync_service_order_to_job_v3();
