import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SaleItem {
  description: string;
  quantity: number;
  unit_price: number;
  bike_model_id?: string | null;
  part_id?: string | null;
}

export interface CreateSalePayload {
  customer_id: string | null;
  total: number;
  payment_method: string | null;
  notes: string | null;
  items: SaleItem[];
  card_fee: number;
  card_tax_percent: number;
  responsible_name?: string | null;
  discount_amount?: number;
  discount_type?: string | null;
  promotion_id?: string | null;
}

export interface UpdateSalePayload {
  saleId: string;
  customer_id: string | null;
  total: number;
  payment_method: string | null;
  discount_amount: number;
  discount_type: string | null;
  card_fee: number;
  card_tax_percent: number;
  items: SaleItem[];
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateSalePayload) => {
      const { items, ...saleData } = payload;
      const { data: sale, error } = await supabase
        .from("sales")
        .insert(saleData)
        .select()
        .single();
      if (error) throw error;
      if (items.length > 0) {
        const rows = items.map((item) => ({ ...item, sale_id: sale.id }));
        const { error: itemsError } = await supabase.from("sale_items").insert(rows);
        if (itemsError) throw itemsError;
      }
      return sale;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["stock_changes"] });
    },
  });
}

export function useUpdateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateSalePayload) => {
      const { saleId, items, ...saleData } = payload;

      // 1. Deleta itens antigos — o trigger do banco devolve o estoque automaticamente
      const { error: deleteError } = await supabase
        .from("sale_items")
        .delete()
        .eq("sale_id", saleId);
      if (deleteError) throw deleteError;

      // 2. Insere novos itens — o trigger desconta o estoque automaticamente
      if (items.length > 0) {
        const rows = items.map((item) => ({ ...item, sale_id: saleId }));
        const { error: insertError } = await supabase.from("sale_items").insert(rows);
        if (insertError) throw insertError;
      }

      // 3. Atualiza dados da venda
      const { error: updateError } = await supabase
        .from("sales")
        .update({
          customer_id: saleData.customer_id,
          total: saleData.total,
          payment_method: saleData.payment_method,
          discount_amount: saleData.discount_amount,
          discount_type: saleData.discount_type,
          card_fee: saleData.card_fee,
          card_tax_percent: saleData.card_tax_percent,
        })
        .eq("id", saleId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["stock_changes"] });
      qc.invalidateQueries({ queryKey: ["parts"] });
      qc.invalidateQueries({ queryKey: ["bikes"] });
    },
  });
}

export function useSales() {
  return useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("id, created_at, customer_id, total, payment_method, card_fee, card_tax_percent, notes, responsible_name, status, discount_amount, discount_type, promotion_id, origin, mechanic_job_id, sale_items(id, description, quantity, unit_price, part_id, bike_model_id), customers(id, name, whatsapp, cpf)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCancelSale() {
  const qc = useQueryClient();
  const KEY = ["sales"];
  return useMutation({
    mutationFn: async (saleId: string) => {
      const { error } = await supabase
        .from("sales")
        .update({ status: "cancelled" })
        .eq("id", saleId);
      if (error) throw error;
    },
    onMutate: async (saleId) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData(KEY);
      qc.setQueryData(KEY, (old: any[]) =>
        (old || []).map((s) => (s.id === saleId ? { ...s, status: "cancelled" } : s))
      );
      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) qc.setQueryData(KEY, context.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useDeleteSale() {
  const qc = useQueryClient();
  const KEY = ["sales"];
  return useMutation({
    mutationFn: async (saleId: string) => {
      const { error } = await supabase
        .from("sales")
        .delete()
        .eq("id", saleId);
      if (error) throw error;
    },
    onMutate: async (saleId) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData(KEY);
      qc.setQueryData(KEY, (old: any[]) =>
        (old || []).filter((s) => s.id !== saleId)
      );
      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) qc.setQueryData(KEY, context.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}
