import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Global realtime subscription that invalidates React Query caches
 * whenever any relevant table changes — keeping all devices in sync.
 */

const TABLE_QUERY_MAP: Record<string, string[][]> = {
  parts: [["parts"]],
  bike_models: [["bike_models"]],
  customers: [["customers"]],
  sales: [["sales"], ["customer_sales"]],
  sale_items: [["sales"]],
  service_orders: [["service_orders"]],
  mechanic_jobs: [["mechanic_jobs"]],
  mechanic_job_additions: [["mechanic_jobs"]],
  mechanics: [["mechanics"]],
  cash_registers: [["cash_register"]],
  cash_register_sales: [["cash_register"]],
  stock_changes: [["stock_changes"]],
  quotes: [["quotes"]],
  quote_items: [["quotes"]],
  fixed_expenses: [["fixed_expenses"]],
  variable_expenses: [["variable_expenses"]],
  categories: [["categories"]],
  bike_model_parts: [["bike_model_parts"]],
  bike_service_history: [["bike_service_history"]],
  settings: [["settings"]],
};

export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase.channel("global-sync");

    Object.entries(TABLE_QUERY_MAP).forEach(([table, queryKeys]) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
