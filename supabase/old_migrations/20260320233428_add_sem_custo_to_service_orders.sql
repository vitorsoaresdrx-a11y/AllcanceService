-- Adicionar coluna sem_custo à tabela service_orders
ALTER TABLE service_orders 
ADD COLUMN IF NOT EXISTS sem_custo BOOLEAN DEFAULT false;
