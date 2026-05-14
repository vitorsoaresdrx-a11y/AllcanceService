import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Mechanic {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

const KEY = ["mechanics"];

export function useMechanics() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mechanics")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Mechanic[];
    },
  });
}

export function useActiveMechanics() {
  return useQuery({
    queryKey: [...KEY, "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mechanics")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as Mechanic[];
    },
  });
}

export function useCreateMechanic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("mechanics").insert({ name });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useToggleMechanic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("mechanics").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteMechanic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mechanics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
