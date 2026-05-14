import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ServiceOrder {
  id: string;
  customer_name: string | null;
  customer_cpf: string | null;
  customer_whatsapp: string | null;
  customer_id: string | null;
  bike_name: string | null;
  problem: string;
  price: number;
  status: string;
  sem_custo: boolean;
  mechanic_status: string;
  mechanic_name: string | null;
  mechanic_id: string | null;
  frame_number: string | null;
  responsible_name: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

const KEY = ["service_orders"];

export function useServiceOrders(statusFilter?: string[]) {
  return useQuery({
    queryKey: [...KEY, statusFilter],
    queryFn: async () => {
      let query = supabase.from("service_orders").select("*").order("created_at", { ascending: false });
      if (statusFilter && statusFilter.length > 0) {
        query = query.in("mechanic_status", statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCreateServiceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (order: {
      id?: string;
      customer_name?: string;
      customer_cpf?: string;
      customer_whatsapp?: string;
      customer_id?: string | null;
      bike_name?: string;
      problem: string;
      price?: number;
      sem_custo?: boolean;
      responsible_name?: string;
      mechanic_status?: string;
    }) => {
      const { data, error } = await supabase.from("service_orders").upsert(order).select().single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useAcceptServiceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, mechanic_id, mechanic_name }: { id: string; mechanic_id: string; mechanic_name: string }) => {
      const { error } = await supabase
        .from("service_orders")
        .update({ mechanic_status: "accepted", mechanic_id, mechanic_name })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useFinishServiceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, frame_number }: { id: string; frame_number: string }) => {
      const { error } = await supabase
        .from("service_orders")
        .update({
          mechanic_status: "done",
          frame_number,
          completed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

interface RealtimeCallbacks {
  onDone?: (order: ServiceOrder) => void;
  onAccepted?: (order: ServiceOrder) => void;
  onNew?: (order: ServiceOrder) => void;
}

export function useServiceOrdersRealtime(callbacks?: RealtimeCallbacks) {
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("service_orders_callbacks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_orders" },
        (payload) => {
          qc.invalidateQueries({ queryKey: KEY });

          if (payload.eventType === "INSERT" && cbRef.current?.onNew) {
            cbRef.current.onNew(payload.new as ServiceOrder);
          }
          if (payload.eventType === "UPDATE") {
            const newOrder = payload.new as ServiceOrder;
            const oldOrder = payload.old as ServiceOrder;
            
            // Only trigger onDone when transitioning to 'done'
            if (newOrder.mechanic_status === "done" && oldOrder?.mechanic_status !== "done" && cbRef.current?.onDone) {
              cbRef.current.onDone(newOrder);
            }
            // Only trigger onAccepted when transitioning to 'accepted'
            if (newOrder.mechanic_status === "accepted" && oldOrder?.mechanic_status !== "accepted" && cbRef.current?.onAccepted) {
              cbRef.current.onAccepted(newOrder);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
