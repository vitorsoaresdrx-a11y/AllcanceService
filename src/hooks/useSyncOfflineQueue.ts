import { useEffect, useRef } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { getQueue, removeFromQueue } from '@/lib/offline-queue';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export function useSyncOfflineQueue() {
  const online = useOnlineStatus();
  const { toast } = useToast();
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!online || syncingRef.current) return;

    const queue = getQueue();
    if (queue.length === 0) return;

    syncingRef.current = true;

    const sync = async () => {
      let synced = 0;
      let failed = 0;

      for (const item of queue) {
        try {
          const { salePayload, itemsPayload } = item.payload as {
            salePayload: Record<string, unknown>;
            itemsPayload: Record<string, unknown>[];
          };

          // Upsert sale — ignores if ID already exists
          const { error: saleError } = await supabase
            .from('sales')
            .upsert(salePayload as any, { onConflict: 'id', ignoreDuplicates: true });

          if (saleError) {
            failed++;
            continue;
          }

          // Insert sale items (only if sale was created)
          if (itemsPayload.length > 0) {
            await supabase.from('sale_items').upsert(itemsPayload as any, { onConflict: 'id', ignoreDuplicates: true });
          }

          removeFromQueue(item.id);
          synced++;
        } catch {
          failed++;
        }
      }

      if (synced > 0) {
        toast({
          title: `${synced} venda${synced > 1 ? 's' : ''} sincronizada${synced > 1 ? 's' : ''}`,
          description: 'Dados offline enviados com sucesso.',
        });
      }
      if (failed > 0) {
        toast({
          title: 'Erro ao sincronizar',
          description: `${failed} venda${failed > 1 ? 's' : ''} não puderam ser enviadas. Tentaremos novamente.`,
          variant: 'destructive',
        });
      }

      syncingRef.current = false;
    };

    sync();
  }, [online, toast]);
}
