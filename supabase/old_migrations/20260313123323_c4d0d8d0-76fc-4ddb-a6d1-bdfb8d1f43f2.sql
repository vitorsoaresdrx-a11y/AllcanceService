
-- Backfill existing whatsapp data with the first tenant's id
UPDATE public.whatsapp_conversations
SET tenant_id = (SELECT id FROM public.tenants ORDER BY created_at ASC LIMIT 1)
WHERE tenant_id IS NULL;

UPDATE public.whatsapp_messages
SET tenant_id = (SELECT id FROM public.tenants ORDER BY created_at ASC LIMIT 1)
WHERE tenant_id IS NULL;
