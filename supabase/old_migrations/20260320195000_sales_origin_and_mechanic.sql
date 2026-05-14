-- Add origin and mechanic_job_id columns to sales table
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'pdv',
  ADD COLUMN IF NOT EXISTS mechanic_job_id TEXT DEFAULT NULL;

-- Add index for faster lookup
CREATE INDEX IF NOT EXISTS sales_origin_idx ON sales(origin);
CREATE INDEX IF NOT EXISTS sales_mechanic_job_idx ON sales(mechanic_job_id);

-- Also ensure customers table has the basic columns (whatsapp, cpf)
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS cpf TEXT;
