ALTER TABLE whatsapp_conversations 
ADD COLUMN IF NOT EXISTS human_takeover BOOLEAN DEFAULT false;
