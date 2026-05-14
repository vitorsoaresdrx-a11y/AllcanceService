-- Criar tabela de fotos
CREATE TABLE IF NOT EXISTS os_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  os_id UUID REFERENCES mechanic_jobs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  tipo TEXT CHECK (tipo IN ('chegada', 'problema', 'finalizacao')),
  criado_em TIMESTAMPTZ DEFAULT now(),
  expira_em TIMESTAMPTZ DEFAULT (now() + interval '15 days')
);

-- Ativar pg_cron se disponível e agendar limpeza
-- Obs: pg_cron geralmente requer configuração no painel do Supabase.
-- Se o cron não funcionar, este comando falhará (mas a tabela existirá).
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron não disponível. Certifique-se de habilitar via dashboard.';
END $$;

-- Tentar agendar a deleção se o pg_cron estiver disponível
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'deletar-fotos-expiradas',
      '0 3 * * *',
      'DELETE FROM os_fotos WHERE expira_em < now()'
    );
  END IF;
END $$;
