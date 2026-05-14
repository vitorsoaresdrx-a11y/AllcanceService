import { useState, useMemo } from "react";
import { GoalCard } from "@/components/GoalCard";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { useGoals, useUpsertGoal, getGoalTarget, getReferenceDate } from "@/hooks/useGoals";
import { useSales } from "@/hooks/useSales";
import { useFixedExpenses, useVariableExpenses } from "@/hooks/useExpenses";
import { useMyPermissions } from "@/hooks/usePermissions";
import { Target } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TAX_RATE = 0.08;

function isToday(d: Date) {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function isThisWeek(d: Date) {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(now.getFullYear(), now.getMonth(), diff);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return d >= weekStart && d <= weekEnd;
}

function isThisMonth(d: Date) {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

// ─── Goal Edit Modal ──────────────────────────────────────────────────────────

function GoalEditModal({
  type,
  period,
  currentTarget,
  onClose,
}: {
  type: "revenue" | "profit";
  period: "daily" | "weekly" | "monthly";
  currentTarget: number;
  onClose: () => void;
}) {
  const [value, setValue] = useState(currentTarget);
  const upsert = useUpsertGoal();

  const periodLabel = { daily: "hoje", weekly: "esta semana", monthly: "este mês" }[period];
  const typeLabel = type === "revenue" ? "faturamento" : "lucro líquido";

  const handleSave = async () => {
    await upsert.mutateAsync({
      type,
      period,
      target_value: value,
      reference_date: getReferenceDate(period),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl" onClick={onClose}>
      <div className="bg-secondary w-full max-w-sm rounded-2xl border border-border overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-black text-foreground">Definir Meta</h3>
          <p className="text-xs text-muted-foreground">
            Meta de {typeLabel} para {periodLabel}
          </p>
          <CurrencyInput value={value} onChange={setValue} autoFocus />
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-border text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={upsert.isPending}
              className="flex-[2] h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 transition-all"
            >
              {upsert.isPending ? "Salvando..." : "Salvar Meta"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function Metas() {
  const { data: goals = [] } = useGoals();
  const { data: sales = [] } = useSales();
  const { data: fixedExpenses = [] } = useFixedExpenses();
  const { data: variableExpenses = [] } = useVariableExpenses();
  const { data: permsData } = useMyPermissions();
  const isOwner = permsData?.isOwner ?? false;

  const [editGoal, setEditGoal] = useState<{ type: "revenue" | "profit"; period: "daily" | "weekly" | "monthly" } | null>(null);

  const monthlyFixedCost = useMemo(
    () => fixedExpenses.filter((e: any) => e.active).reduce((s: number, e: any) => s + Number(e.amount), 0),
    [fixedExpenses]
  );

  const metrics = useMemo(() => {
    const result = {
      revenueToday: 0, revenueWeek: 0, revenueMonth: 0,
      profitToday: 0, profitWeek: 0, profitMonth: 0,
    };

    const monthVarExpenses = variableExpenses
      .filter((e: any) => {
        const d = new Date(e.expense_date + "T00:00:00");
        return isThisMonth(d);
      })
      .reduce((s: number, e: any) => s + Number(e.amount), 0);

    let monthRevenue = 0;
    let monthCardFees = 0;

    sales.forEach((sale: any) => {
      if (sale.status === "cancelled") return;
      const d = new Date(sale.created_at);
      const rev = Number(sale.total) || 0;
      const fee = Number(sale.card_fee) || 0;

      if (isToday(d)) {
        result.revenueToday += rev;
        result.profitToday += rev - rev * TAX_RATE - fee;
      }
      if (isThisWeek(d)) {
        result.revenueWeek += rev;
        result.profitWeek += rev - rev * TAX_RATE - fee;
      }
      if (isThisMonth(d)) {
        monthRevenue += rev;
        monthCardFees += fee;
        result.revenueMonth += rev;
      }
    });

    result.profitMonth = monthRevenue - monthRevenue * TAX_RATE - monthCardFees - monthlyFixedCost - monthVarExpenses;

    return result;
  }, [sales, variableExpenses, monthlyFixedCost]);

  return (
    <div className="min-h-full bg-background text-foreground pb-24 lg:pb-0">
      <div className="max-w-4xl mx-auto w-full p-4 lg:p-8 space-y-6 lg:space-y-8">

        {/* Header */}
        <header className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <Target size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Acompanhamento</p>
            <h1 className="text-xl lg:text-2xl font-black text-foreground tracking-tight uppercase italic">Metas</h1>
          </div>
        </header>

        {/* Faturamento */}
        <section>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 font-black">Faturamento</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(["daily", "weekly", "monthly"] as const).map((p) => (
              <GoalCard
                key={`revenue-${p}`}
                type="revenue"
                period={p}
                current={p === "daily" ? metrics.revenueToday : p === "weekly" ? metrics.revenueWeek : metrics.revenueMonth}
                target={getGoalTarget(goals, "revenue", p)}
                isAdmin={isOwner}
                onEdit={() => setEditGoal({ type: "revenue", period: p })}
              />
            ))}
          </div>
        </section>

        {/* Lucro Líquido */}
        <section>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3 font-black">Lucro Líquido</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(["daily", "weekly", "monthly"] as const).map((p) => (
              <GoalCard
                key={`profit-${p}`}
                type="profit"
                period={p}
                current={p === "daily" ? metrics.profitToday : p === "weekly" ? metrics.profitWeek : metrics.profitMonth}
                target={getGoalTarget(goals, "profit", p)}
                isAdmin={isOwner}
                onEdit={() => setEditGoal({ type: "profit", period: p })}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Modal de edição de meta */}
      {editGoal && (
        <GoalEditModal
          type={editGoal.type}
          period={editGoal.period}
          currentTarget={getGoalTarget(goals, editGoal.type, editGoal.period)}
          onClose={() => setEditGoal(null)}
        />
      )}
    </div>
  );
}
