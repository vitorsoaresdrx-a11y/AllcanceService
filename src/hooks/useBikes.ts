import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BikeModel {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  description: string | null;
  visible_on_storefront: boolean;
  stock_qty: number;
  alert_stock: number;
  created_at: string;
  updated_at: string;
}

export interface BikeModelPart {
  id: string;
  bike_model_id: string;
  part_id: string | null;
  part_name_override: string | null;
  quantity: number;
  notes: string | null;
  sort_order: number;
}

export type BikeModelInsert = Omit<BikeModel, "id" | "created_at" | "updated_at" | "sku">;
export type BikeModelPartInsert = Omit<BikeModelPart, "id">;

const BIKES_KEY = ["bike_models"];

export function useBikeModels() {
  return useQuery({
    queryKey: BIKES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bike_models")
        .select("id, name, sku, category, description, visible_on_storefront, stock_qty, alert_stock, images, brand, color, rim_size, frame_size, weight_kg, cost_price, cost_mode, sale_price, pix_price, price_store, price_ecommerce, installment_price, installment_count, installments_enabled_store, installment_count_store, installment_value_store, installments_enabled_ecommerce, installment_count_ecommerce, installment_value_ecommerce, created_at, updated_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BikeModel[];
    },
  });
}

export function useBikeModel(id: string | undefined) {
  return useQuery({
    queryKey: ["bike_model", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bike_models")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as BikeModel;
    },
  });
}

export function useBikeModelParts(bikeModelId: string | undefined) {
  return useQuery({
    queryKey: ["bike_model_parts", bikeModelId],
    enabled: !!bikeModelId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bike_model_parts")
        .select("*")
        .eq("bike_model_id", bikeModelId!)
        .order("sort_order");
      if (error) throw error;
      return data as BikeModelPart[];
    },
  });
}

/** Count parts per bike model (for listing) */
export function useBikePartsCount() {
  return useQuery({
    queryKey: ["bike_parts_count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bike_model_parts")
        .select("bike_model_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((row: { bike_model_id: string }) => {
        counts[row.bike_model_id] = (counts[row.bike_model_id] || 0) + 1;
      });
      return counts;
    },
  });
}

export function useCreateBikeModel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (bike: BikeModelInsert) => {
      const { data, error } = await supabase
        .from("bike_models")
        .insert(bike)
        .select()
        .single();
      if (error) throw error;
      return data as BikeModel;
    },
    onSuccess: () => {
      toast({ title: "Bike criada com sucesso" });
      queryClient.invalidateQueries({ queryKey: BIKES_KEY });
    },
    onError: () => {
      toast({ title: "Erro ao criar bike", variant: "destructive" });
    },
  });
}

export function useUpdateBikeModel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BikeModel> & { id: string }) => {
      const { data, error } = await supabase
        .from("bike_models")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as BikeModel;
    },
    onMutate: async (updated) => {
      await queryClient.cancelQueries({ queryKey: BIKES_KEY });
      const previous = queryClient.getQueryData<BikeModel[]>(BIKES_KEY);
      queryClient.setQueryData<BikeModel[]>(BIKES_KEY, (old) =>
        (old || []).map((b) => (b.id === updated.id ? { ...b, ...updated } : b))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(BIKES_KEY, context.previous);
      toast({ title: "Erro ao atualizar bike", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: BIKES_KEY });
    },
  });
}

export function useDeleteBikeModel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bike_models").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Bike excluída" });
      queryClient.invalidateQueries({ queryKey: BIKES_KEY });
    },
    onError: () => {
      toast({ title: "Erro ao excluir bike", variant: "destructive" });
    },
  });
}

export function useSaveBikeModelParts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bikeModelId,
      parts,
    }: {
      bikeModelId: string;
      parts: Omit<BikeModelPartInsert, "bike_model_id">[];
    }) => {
      // Delete existing parts, then insert new ones
      await supabase.from("bike_model_parts").delete().eq("bike_model_id", bikeModelId);
      if (parts.length > 0) {
        const rows = parts.map((p, i) => ({
          ...p,
          bike_model_id: bikeModelId,
          sort_order: i,
        }));
        const { error } = await supabase.from("bike_model_parts").insert(rows);
        if (error) throw error;
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["bike_model_parts"] });
      queryClient.invalidateQueries({ queryKey: ["bike_parts_count"] });
    },
  });
}
