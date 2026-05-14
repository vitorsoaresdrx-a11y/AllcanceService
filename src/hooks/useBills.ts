import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef } from "react";
import { differenceInDays, format } from "date-fns";
import { toast } from "sonner";
import { formatBRL } from "@/lib/format";

export interface Bill {
  id: string;
  barcode: string;
  barcode_type: string;
  bank_name: string | null;
  beneficiary: string | null;
  amount: number | null;
  due_date: string | null;
  status: string;
  paid_at: string | null;
  notes: string | null;
  created_by: string | null;
  tenant_id: string | null;
  created_at: string;
}

const BILLS_KEY = ["bills"];

export function useBills() {
  const { session } = useAuth();

  return useQuery({
    queryKey: BILLS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bills")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return (data || []) as unknown as Bill[];
    },
    enabled: !!session?.user?.id,
  });
}

export function useCreateBill() {
  const { session } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (bill: {
      barcode: string;
      barcode_type: string;
      bank_name?: string | null;
      beneficiary?: string | null;
      amount?: number | null;
      due_date?: string | null;
      notes?: string | null;
    }) => {
      const { error } = await supabase.from("bills").insert({
        ...bill,
        created_by: session!.user.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BILLS_KEY }),
  });
}

export function useUpdateBillStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: any = { status };
      if (status === "paid") update.paid_at = new Date().toISOString();
      const { error } = await supabase.from("bills").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BILLS_KEY }),
  });
}

export function useDeleteBill() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bills").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BILLS_KEY }),
  });
}

export function useAutoUpdateOverdue() {
  const { session } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (!session?.user?.id || ran.current) return;
    ran.current = true;

    const today = new Date().toISOString().split("T")[0];
    supabase
      .from("bills")
      .update({ status: "overdue" } as any)
      .eq("status", "pending")
      .lt("due_date", today)
      .then(() => {});
  }, [session?.user?.id]);
}

export function useBillAlerts(bills: Bill[]) {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !bills.length) return;
    ran.current = true;

    const upcoming = bills.filter((b) => {
      if (b.status !== "pending" || !b.due_date) return false;
      const days = differenceInDays(new Date(b.due_date), new Date());
      return days >= 0 && days <= 3;
    });

    upcoming.forEach((bill) => {
      toast.warning("Conta vencendo em breve", {
        description: `${bill.beneficiary || bill.bank_name || "Conta"} vence em ${format(new Date(bill.due_date!), "dd/MM")} — ${formatBRL(bill.amount)}`,
      });
    });
  }, [bills]);
}
