-- Fix RLS policies for os_adicionais so authenticated users can read/write
ALTER TABLE IF EXISTS os_adicionais ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting policies
DROP POLICY IF EXISTS "os_adicionais_select" ON os_adicionais;
DROP POLICY IF EXISTS "os_adicionais_insert" ON os_adicionais;
DROP POLICY IF EXISTS "os_adicionais_update" ON os_adicionais;
DROP POLICY IF EXISTS "os_adicionais_delete" ON os_adicionais;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON os_adicionais;

-- Allow all operations for authenticated users (internal staff)
CREATE POLICY "os_adicionais_authenticated_all"
  ON os_adicionais
  FOR ALL
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Also ensure mechanic_job_additions has same open policy
ALTER TABLE IF EXISTS mechanic_job_additions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mechanic_job_additions_authenticated_all" ON mechanic_job_additions;
CREATE POLICY "mechanic_job_additions_authenticated_all"
  ON mechanic_job_additions
  FOR ALL
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');
