import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Promotion {
  id: string;
  name: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  applies_to: "product" | "category" | "both";
  product_id: string | null;
  bike_model_id: string | null;
  category: string | null;
  scope: "pdv" | "ecommerce" | "both";
  starts_at: string;
  ends_at: string;
  active: boolean;
  created_by: string | null;
  tenant_id: string | null;
  created_at: string;
}

const KEY = ["promotions"];

export function usePromotions() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Promotion[];
    },
  });
}

export function useActivePromotions() {
  return useQuery({
    queryKey: [...KEY, "active"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .eq("active", true)
        .lte("starts_at", now)
        .gte("ends_at", now);
      if (error) throw error;
      return (data || []) as unknown as Promotion[];
    },
    staleTime: 30_000,
  });
}

export function useCreatePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Promotion, "id" | "created_at" | "tenant_id" | "created_by">) => {
      const { data, error } = await supabase
        .from("promotions")
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdatePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Promotion> & { id: string }) => {
      const { error } = await supabase
        .from("promotions")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeletePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("promotions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
