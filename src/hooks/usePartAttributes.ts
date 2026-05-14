import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PartAttribute {
  id: string;
  part_id: string;
  name: string;
  value: string;
  sort_order: number;
  created_at: string;
}

export function usePartAttributes(partId: string | undefined) {
  return useQuery({
    queryKey: ["part_attributes", partId],
    enabled: !!partId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("part_attributes" as any)
        .select("*")
        .eq("part_id", partId!)
        .order("sort_order")
      if (error) throw error;
      return (data || []) as unknown as PartAttribute[];
    },
  });
}

export function useSavePartAttributes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      partId,
      attributes,
    }: {
      partId: string;
      attributes: { name: string; value: string; sort_order: number }[];
    }) => {
      // Delete existing
      await supabase
        .from("part_attributes" as any)
        .delete()
        .eq("part_id", partId);

      // Insert new ones
      if (attributes.length > 0) {
        const rows = attributes.map((a) => ({
          part_id: partId,
          name: a.name,
          value: a.value,
          sort_order: a.sort_order,
        }));
        const { error } = await supabase
          .from("part_attributes" as any)
          .insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["part_attributes", vars.partId] });
    },
  });
}

// For public page
export function usePublicPartAttributes(partId: string | undefined) {
  return useQuery({
    queryKey: ["public_part_attributes", partId],
    enabled: !!partId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("part_attributes" as any)
        .select("*")
        .eq("part_id", partId!)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as unknown as PartAttribute[];
    },
  });
}
