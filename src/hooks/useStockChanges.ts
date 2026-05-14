import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StockChange {
  id: string;
  product_type: string;
  product_id: string;
  product_name: string;
  old_qty: number;
  new_qty: number;
  responsible_name: string | null;
  created_at: string;
}

const KEY = ["stock_changes"];

export function useStockChanges() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_changes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as StockChange[];
    },
  });
}
