import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Goal {
  id: string;
  type: string;
  period: string;
  target_value: number;
  reference_date: string;
  created_by: string | null;
  tenant_id: string | null;
  created_at: string;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function fmt(d: Date) {
  return d.toISOString().split("T")[0];
}
function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

export function useGoals() {
  const today = new Date();
  return useQuery({
    queryKey: ["goals", fmt(today)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals" as any)
        .select("*")
        .gte("reference_date", fmt(startOfMonth(today)))
        .lte("reference_date", fmt(endOfMonth(today)));
      if (error) throw error;
      return (data || []) as unknown as Goal[];
    },
  });
}

export function useUpsertGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (goal: { type: string; period: string; target_value: number; reference_date: string }) => {
      const { error } = await supabase
        .from("goals" as any)
        .upsert(goal as any, { onConflict: "type,period,reference_date,tenant_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function getGoalTarget(goals: Goal[], type: string, period: string): number {
  const today = new Date();
  let refDate: string;
  if (period === "daily") refDate = fmt(today);
  else if (period === "weekly") refDate = fmt(startOfWeek(today));
  else refDate = fmt(startOfMonth(today));

  const goal = goals.find((g) => g.type === type && g.period === period && g.reference_date === refDate);
  return goal ? Number(goal.target_value) : 0;
}

export function getReferenceDate(period: string): string {
  const today = new Date();
  if (period === "daily") return fmt(today);
  if (period === "weekly") return fmt(startOfWeek(today));
  return fmt(startOfMonth(today));
}
