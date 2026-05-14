import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const KEYS = {
  current: ["cash_register", "current"],
  history: ["cash_register", "history"],
  sales: (id: string) => ["cash_register", "sales", id],
};

export interface CashRegister {
  id: string;
  opened_at: string;
  closed_at: string | null;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number | null;
  difference: number | null;
  status: string;
  opened_by: string | null;
  closed_by: string | null;
}

// Get current open register
export function useCurrentCashRegister() {
  return useQuery({
    queryKey: KEYS.current,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_registers")
        .select("*")
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as CashRegister | null;
    },
  });
}

// Open a new register
export function useOpenCashRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ openingAmount, opened_by }: { openingAmount: number; opened_by?: string }) => {
      const { data, error } = await supabase
        .from("cash_registers")
        .insert({
          opening_amount: openingAmount,
          status: "open",
          opened_at: new Date().toISOString(),
          opened_by: opened_by || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.current });
      qc.invalidateQueries({ queryKey: KEYS.history });
    },
  });
}

// Close the register
export function useCloseCashRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      closingAmount,
      expectedAmount,
      closed_by,
    }: {
      id: string;
      closingAmount: number;
      expectedAmount: number;
      closed_by?: string;
    }) => {
      const difference = closingAmount - expectedAmount;
      const { data, error } = await supabase
        .from("cash_registers")
        .update({
          closing_amount: closingAmount,
          expected_amount: expectedAmount,
          difference,
          status: "closed",
          closed_at: new Date().toISOString(),
          closed_by: closed_by || null,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.current });
      qc.invalidateQueries({ queryKey: KEYS.history });
    },
  });
}

// History of closed registers
export function useCashRegisterHistory() {
  return useQuery({
    queryKey: KEYS.history,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_registers")
        .select("*")
        .eq("status", "closed")
        .order("closed_at", { ascending: false });
      if (error) throw error;
      return data as CashRegister[];
    },
  });
}

// Sales linked to a register session
export function useCashRegisterSales(registerId: string | null) {
  return useQuery({
    queryKey: KEYS.sales(registerId || ""),
    enabled: !!registerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_register_sales")
        .select("*, sales(*, customers(*), sale_items(*))")
        .eq("cash_register_id", registerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// Link a sale to the current open register
export function useLinkSaleToCashRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ cashRegisterId, saleId, amount }: { cashRegisterId: string; saleId: string; amount: number }) => {
      const { error } = await supabase
        .from("cash_register_sales")
        .insert({ cash_register_id: cashRegisterId, sale_id: saleId, amount });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.current });
    },
  });
}

// Sum of cash sales in the current open register
export function useCashRegisterCashTotal(registerId: string | null) {
  return useQuery({
    queryKey: [...KEYS.sales(registerId || ""), "total"],
    enabled: !!registerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cash_register_sales")
        .select("amount")
        .eq("cash_register_id", registerId!);
      if (error) throw error;
      const total = (data || []).reduce((sum, r) => sum + Number(r.amount), 0);
      const count = data?.length || 0;
      return { total, count };
    },
  });
}
