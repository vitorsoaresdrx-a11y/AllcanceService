CREATE TABLE IF NOT EXISTS developer_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilita RLS
ALTER TABLE developer_tasks ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso simples para usuários autenticados (Admins e Salão)
CREATE POLICY "Enable all for authenticated users" ON developer_tasks
  FOR ALL USING (auth.role() = 'authenticated');
