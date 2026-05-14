import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface QuoteItem {
  id: string;
  quote_id: string;
  part_id: string | null;
  part_name: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  created_at: string;
}

export interface Quote {
  id: string;
  customer_name: string | null;
  customer_cpf: string | null;
  customer_whatsapp: string | null;
  customer_id: string | null;
  notes: string | null;
  labor_cost: number;
  total: number;
  status: string;
  responsible_name: string | null;
  created_at: string;
  updated_at: string;
  items?: QuoteItem[];
}

const KEY = ["quotes"];

export function useQuotes() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data: quotes, error } = await supabase
        .from("quotes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: items } = await supabase
        .from("quote_items")
        .select("*")
        .order("created_at");

      const itemsByQuote: Record<string, QuoteItem[]> = {};
      (items || []).forEach((item: any) => {
        if (!itemsByQuote[item.quote_id]) itemsByQuote[item.quote_id] = [];
        itemsByQuote[item.quote_id].push(item as QuoteItem);
      });

      return (quotes as any[]).map((q) => ({
        ...q,
        items: itemsByQuote[q.id] || [],
      })) as Quote[];
    },
  });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      customer_name?: string;
      customer_cpf?: string;
      customer_whatsapp?: string;
      customer_id?: string | null;
      notes?: string;
      labor_cost: number;
      total: number;
      responsible_name?: string;
      items: {
        part_id: string | null;
        part_name: string;
        quantity: number;
        unit_cost: number;
        unit_price: number;
      }[];
    }) => {
      const { items, ...quoteData } = data;
      const { data: quote, error } = await supabase
        .from("quotes")
        .insert(quoteData)
        .select()
        .single();
      if (error) throw error;

      if (items.length > 0) {
        const { error: itemsError } = await supabase
          .from("quote_items")
          .insert(items.map((item) => ({ ...item, quote_id: (quote as any).id })));
        if (itemsError) throw itemsError;
      }

      return quote as any as Quote;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
