import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Part {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  weight_capacity_kg: number | null;
  material: string | null;
  gears: string | null;
  hub_style: string | null;
  color: string | null;
  rim_size: string | null;
  frame_size: string | null;
  stock_qty: number;
  visible_on_storefront: boolean;
  notes: string | null;
  description: string | null;
  unit_cost: number | null;
  sale_price: number | null;
  pix_price: number | null;
  price_store: number | null;
  price_ecommerce: number | null;
  installment_price: number | null;
  installment_count: number | null;
  alert_stock: number;
  images: string[] | null;
  created_at: string;
  updated_at: string;
}

export type PartInsert = Omit<Part, "id" | "created_at" | "updated_at" | "sku">;

const PARTS_KEY = ["parts"];

export function useParts() {
  return useQuery({
    queryKey: PARTS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parts")
        .select("id, name, sku, category, material, gears, hub_style, color, rim_size, frame_size, stock_qty, visible_on_storefront, notes, description, unit_cost, sale_price, pix_price, price_store, price_ecommerce, installment_price, installment_count, alert_stock, images, weight_capacity_kg, created_at, updated_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Part[];
    },
  });
}

export function useCreatePart() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (part: PartInsert) => {
      const { data, error } = await supabase
        .from("parts")
        .insert(part)
        .select()
        .single();
      if (error) throw error;
      return data as Part;
    },
    onMutate: async (newPart) => {
      await queryClient.cancelQueries({ queryKey: PARTS_KEY });
      const previous = queryClient.getQueryData<Part[]>(PARTS_KEY);
      const optimistic: Part = {
        id: crypto.randomUUID(),
        sku: null,
        ...newPart,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      queryClient.setQueryData<Part[]>(PARTS_KEY, (old) => [optimistic, ...(old || [])]);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(PARTS_KEY, context.previous);
      toast({ title: "Erro ao criar peça", variant: "destructive" });
    },
    onSuccess: () => {
      toast({ title: "Peça criada com sucesso" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PARTS_KEY });
    },
  });
}

export function useUpdatePart() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Part> & { id: string }) => {
      const { data, error } = await supabase
        .from("parts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Part;
    },
    onMutate: async (updated) => {
      await queryClient.cancelQueries({ queryKey: PARTS_KEY });
      const previous = queryClient.getQueryData<Part[]>(PARTS_KEY);
      queryClient.setQueryData<Part[]>(PARTS_KEY, (old) =>
        (old || []).map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(PARTS_KEY, context.previous);
      toast({ title: "Erro ao atualizar peça", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PARTS_KEY });
    },
  });
}

export function useDeletePart() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("parts").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: PARTS_KEY });
      const previous = queryClient.getQueryData<Part[]>(PARTS_KEY);
      queryClient.setQueryData<Part[]>(PARTS_KEY, (old) =>
        (old || []).filter((p) => p.id !== id)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(PARTS_KEY, context.previous);
      toast({ title: "Erro ao excluir peça", variant: "destructive" });
    },
    onSuccess: () => {
      toast({ title: "Peça excluída" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PARTS_KEY });
    },
  });
}
