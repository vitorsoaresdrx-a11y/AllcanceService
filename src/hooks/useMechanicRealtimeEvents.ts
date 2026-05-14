import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MechanicJob } from "@/hooks/useMechanicJobs";
import { useServiceOrdersRealtime, ServiceOrder } from "@/hooks/useServiceOrders";
import { playNotifySound, playAcceptSound } from "@/lib/sounds";
import { toast } from "sonner";

interface RealtimeEventsProps {
  jobs: MechanicJob[];
  updateDetails: any; // useUpdateMechanicJobDetails mutation
  setNotifData: (data: any) => void;
  setNotifOpen: (open: boolean) => void;
}

export function useMechanicRealtimeEvents({
  jobs,
  updateDetails,
  setNotifData,
  setNotifOpen,
}: RealtimeEventsProps) {
  const notifiedIdsRef = useRef<Set<string>>(new Set());
  const statusOrder = ["in_approval", "in_repair", "in_maintenance", "in_analysis", "ready", "delivered", "cancelado"];

  const handleServiceOrderDone = useCallback(async (order: ServiceOrder) => {
    if (notifiedIdsRef.current.has(`${order.id}-done`)) return;
    
    const job = jobs.find(j => j.id === order.id);
    if (job) {
      const currentIndex = statusOrder.indexOf(job.status);
      const targetIndex = statusOrder.indexOf("in_analysis");
      
      if (currentIndex < targetIndex) {
        playNotifySound();
        notifiedIdsRef.current.add(`${order.id}-done`);
        await updateDetails.mutateAsync({ id: order.id, status: "in_analysis" } as any);
        toast.success(`🔧 ${order.bike_name || "Bike"} pronta pra entrega! (Em Análise)`, { duration: 8000 });
      } else {
        notifiedIdsRef.current.add(`${order.id}-done`);
      }
    }
  }, [jobs, updateDetails]);

  const handleServiceOrderAccepted = useCallback(async (order: ServiceOrder) => {
    if (notifiedIdsRef.current.has(`${order.id}-accepted`)) return;

    const job = jobs.find(j => j.id === order.id);
    if (job) {
      const currentIndex = statusOrder.indexOf(job.status);
      const targetIndex = statusOrder.indexOf("in_maintenance");

      if (currentIndex < targetIndex) {
        playAcceptSound();
        notifiedIdsRef.current.add(`${order.id}-accepted`);
        await updateDetails.mutateAsync({ id: order.id, status: "in_maintenance" } as any);
        toast.info(`⚙️ ${order.bike_name || "OS"} aceita por ${order.mechanic_name || "mecânico"}`, { duration: 5000 });
      } else {
        notifiedIdsRef.current.add(`${order.id}-accepted`);
      }
    }
  }, [jobs, updateDetails]);

  useServiceOrdersRealtime({ onDone: handleServiceOrderDone, onAccepted: handleServiceOrderAccepted });

  useEffect(() => {
    const channel = supabase
      .channel('os_alertas_cancelamento')
      .on('postgres_changes' as any,
        { event: 'INSERT', schema: 'public', table: 'os_alertas' },
        async (payload: any) => {
          const contexto = (payload.new?.contexto || '').toLowerCase();
          if (contexto.includes('cancelamento total')) {
            const osId = payload.new?.os_id;
            let { data: job } = await supabase
              .from('mechanic_jobs')
              .select('*')
              .eq('id', osId)
              .maybeSingle();

            if (!job) {
              const { data: hist } = await supabase
                .from('bike_service_history')
                .select('customer_name, bike_name, customer_phone')
                .eq('service_order_id', osId)
                .maybeSingle();
              if (hist) {
                job = {
                  customer_name: hist.customer_name,
                  bike_name: hist.bike_name,
                  customer_whatsapp: hist.customer_phone
                } as any;
              }
            }

            const payloadToSave = {
              job: job || { customer_name: 'Cliente', bike_name: 'Bike' },
              status: 'cancelamento_total',
              problem: contexto,
              timestamp: Date.now()
            };

            localStorage.setItem('pendingAlert', JSON.stringify(payloadToSave));
            setNotifData(payloadToSave);
            setNotifOpen(true);
            new Audio("https://cdn.pixabay.com/audio/2021/08/04/audio_bbdec30d20.mp3").play().catch(() => {});

            if (job?.customer_whatsapp) {
              const phone = (job.customer_whatsapp as string).replace(/\D/g, '').slice(-10);
              await supabase
                .from('whatsapp_conversations')
                .update({ ai_notifications_enabled: false } as any)
                .ilike('contact_phone', `%${phone}%`);
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [setNotifData, setNotifOpen]);
}
