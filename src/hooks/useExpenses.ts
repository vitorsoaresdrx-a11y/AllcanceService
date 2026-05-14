import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VariableExpense {
  id: string;
  name: string;
  amount: number;
  expense_date: string;
  notes: string | null;
  created_at: string;
}

// Fixed expenses
export function useFixedExpenses() {
  return useQuery({
    queryKey: ["fixed_expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixed_expenses" as any)
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as FixedExpense[];
    },
  });
}

export function useCreateFixedExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; amount: number; notes?: string | null }) => {
      const { error } = await supabase.from("fixed_expenses" as any).insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fixed_expenses"] }),
  });
}

export function useUpdateFixedExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; name?: string; amount?: number; notes?: string | null; active?: boolean }) => {
      const { id, ...rest } = payload;
      const { error } = await supabase.from("fixed_expenses" as any).update(rest as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fixed_expenses"] }),
  });
}

export function useDeleteFixedExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fixed_expenses" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fixed_expenses"] }),
  });
}

// Variable expenses
export function useVariableExpenses() {
  return useQuery({
    queryKey: ["variable_expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("variable_expenses" as any)
        .select("*")
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data as unknown as VariableExpense[];
    },
  });
}

export function useCreateVariableExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; amount: number; expense_date?: string; notes?: string | null }) => {
      const { error } = await supabase.from("variable_expenses" as any).insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["variable_expenses"] }),
  });
}

export function useDeleteVariableExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("variable_expenses" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["variable_expenses"] }),
  });
}
