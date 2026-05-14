import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateWeightedAverage } from "@/lib/cost-average";

export interface StockEntryRow {
  id: string;
  item_id: string;
  item_type: string;
  quantity: number;
  unit_cost: number;
  supplier_name: string | null;
  notes: string | null;
  created_by: string | null;
  tenant_id: string | null;
  created_at: string;
}

export function usePriceHistory(itemId: string, itemType: "part" | "bike") {
  return useQuery({
    queryKey: ["stock_entries", itemId, itemType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_entries" as any)
        .select("*")
        .eq("item_id", itemId)
        .eq("item_type", itemType)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const entries = (data || []) as unknown as StockEntryRow[];
      const validEntries = entries.filter((e) => e.unit_cost > 0);
      const avg = calculateWeightedAverage(validEntries);
      const costs = validEntries.map((e) => e.unit_cost);
      const min = costs.length > 0 ? Math.min(...costs) : 0;
      const max = costs.length > 0 ? Math.max(...costs) : 0;

      return { entries, avg, min, max };
    },
    enabled: !!itemId,
  });
}

export function useAllStockEntries() {
  return useQuery({
    queryKey: ["stock_entries", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_entries" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as StockEntryRow[];
    },
  });
}

export function useInsertStockEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: {
      item_id: string;
      item_type: string;
      quantity: number;
      unit_cost: number;
      supplier_name?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("stock_entries" as any)
        .insert(entry as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock_entries"] });
    },
  });
}

export function useUpdateStockEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, unit_cost, supplier_name }: { id: string; unit_cost: number; supplier_name?: string }) => {
      const { error } = await supabase
        .from("stock_entries" as any)
        .update({ unit_cost, supplier_name } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock_entries"] });
    },
  });
}
