-- Adicionar coluna sem_custo à tabela bike_service_history
ALTER TABLE bike_service_history 
ADD COLUMN IF NOT EXISTS sem_custo BOOLEAN DEFAULT false;
