-- Ensure all station users that exist get default whatsapp permission
-- This fixes the "WhatsApp disappeared" issue after permissions overhaul
INSERT INTO station_permissions (station_id, module, can_access)
SELECT 
  sm.id as station_id,
  'whatsapp' as module,
  true as can_access
FROM tenant_members sm
WHERE sm.email LIKE '%@station.internal%'
  AND NOT EXISTS (
    SELECT 1 FROM station_permissions sp
    WHERE sp.station_id = sm.id AND sp.module = 'whatsapp'
  )
ON CONFLICT DO NOTHING;
