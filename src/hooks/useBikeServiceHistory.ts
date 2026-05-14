import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BikeServiceRecord {
  id: string;
  frame_number: string;
  bike_name: string;
  customer_name: string | null;
  customer_cpf: string | null;
  customer_phone: string | null;
  problem: string;
  mechanic_id: string | null;
  mechanic_name: string | null;
  service_order_id: string | null;
  status: string;
  sem_custo: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface GroupedBikeHistory {
  frame_number: string;
  bike_name: string;
  records: BikeServiceRecord[];
}

const KEY = ["bike_service_history"];

export function useBikeServiceHistory() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bike_service_history")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Group by frame_number
      const map = new Map<string, GroupedBikeHistory>();
      for (const record of (data || []) as any[]) {
        const existing = map.get(record.frame_number);
        if (existing) {
          existing.records.push(record);
        } else {
          map.set(record.frame_number, {
            frame_number: record.frame_number,
            bike_name: record.bike_name,
            records: [record],
          });
        }
      }
      return Array.from(map.values());
    },
  });
}

export function useCreateBikeServiceRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (record: {
      frame_number: string;
      bike_name: string;
      customer_name?: string;
      customer_cpf?: string;
      customer_phone?: string;
      problem: string;
      mechanic_id?: string;
      mechanic_name?: string;
      service_order_id?: string;
      status?: string;
      sem_custo?: boolean;
      completed_at?: string;
    }) => {
      const { error } = await supabase.from("bike_service_history").insert(record);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useCancelHistoryRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // 1. Get the record to find service_order_id
      const { data: record, error: getErr } = await supabase.from("bike_service_history").select("service_order_id").eq("id", id).single();
      if (getErr) throw getErr;
      
      // 2. Cancel the history record
      const { error: cancelErr } = await supabase.from("bike_service_history").update({ status: "cancelado" }).eq("id", id);
      if (cancelErr) throw cancelErr;
      
      // 3. Cancel the related sale if exists
      if (record?.service_order_id) {
        const { error: saleErr } = await supabase.from("sales").update({ status: "cancelled" }).eq("mechanic_job_id", record.service_order_id);
        if (saleErr) console.warn("Could not cancel related sale:", saleErr);
      }
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData(KEY);
      // We still update optimistically for immediate feedback
      qc.setQueryData(KEY, (old: any) => (old || []).map((group: any) => ({
        ...group,
        records: group.records.map((r: any) => r.id === id ? { ...r, status: 'cancelado' } : r)
      })));
      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) qc.setQueryData(KEY, context.previous);
    },
    onSuccess: () => {
      // Não invalida manualmente — o realtime cuida da sincronização
    },
  });
}

export function useDeleteHistoryRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // 1. Get record for linked sale
      const { data: record, error: getErr } = await supabase.from("bike_service_history").select("service_order_id").eq("id", id).single();
      if (getErr) throw getErr;
      
      // 2. Delete the record
      const { error: delErr } = await supabase.from("bike_service_history").delete().eq("id", id);
      if (delErr) throw delErr;
      
      // 3. Delete related sale if exists
      if (record?.service_order_id) {
        const { error: saleDelErr } = await supabase.from("sales").delete().eq("mechanic_job_id", record.service_order_id);
        if (saleDelErr) console.warn("Could not delete related sale:", saleDelErr);
      }
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData(KEY);
      
      // Optimistic update
      qc.setQueryData(KEY, (old: any) => (old || [])
        .map((group: any) => ({
          ...group,
          records: group.records.filter((r: any) => r.id !== id)
        }))
        .filter((group: any) => group.records.length > 0)
      );
      
      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) qc.setQueryData(KEY, context.previous);
    },
    onSuccess: () => {
      // Não invalida manualmente — o realtime cuida da sincronização
      // após o banco confirmar o delete
    },
  });
}
