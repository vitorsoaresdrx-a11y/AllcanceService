-- Create history table for OS payments
CREATE TABLE IF NOT EXISTS os_pagamentos_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID REFERENCES mechanic_jobs(id) ON DELETE CASCADE,
  valor DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tipo TEXT NOT NULL CHECK (tipo IN ('parcial', 'integral', 'desconto')),
  payment_method TEXT,
  desconto_valor DECIMAL(12, 2) DEFAULT 0,
  desconto_motivo TEXT,
  criado_em TIMESTAMPTZ DEFAULT now(),
  criado_por UUID REFERENCES auth.users(id),
  customer_id UUID,
  customer_name TEXT,
  customer_whatsapp TEXT
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_os_pagamentos_historico_os_id ON os_pagamentos_historico(os_id);

-- Enable RLS
ALTER TABLE os_pagamentos_historico ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage payments (simplify for now, or match mechanic_jobs access)
CREATE POLICY "Manage payments" ON os_pagamentos_historico FOR ALL TO authenticated USING (true);
