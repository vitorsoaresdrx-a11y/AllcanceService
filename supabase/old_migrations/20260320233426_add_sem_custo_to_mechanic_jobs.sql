-- Adicionar coluna sem_custo à tabela mechanic_jobs
ALTER TABLE mechanic_jobs 
ADD COLUMN IF NOT EXISTS sem_custo BOOLEAN DEFAULT false;
