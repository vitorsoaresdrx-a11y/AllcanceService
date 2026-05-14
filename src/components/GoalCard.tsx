import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Pencil } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { playCelebrationSound, triggerConfetti } from "@/lib/celebration";

interface GoalCardProps {
  type: "revenue" | "profit";
  period: "daily" | "weekly" | "monthly";
  current: number;
  target: number;
  isAdmin: boolean;
  onEdit: () => void;
}

export function GoalCard({ type, period, current, target, isAdmin, onEdit }: GoalCardProps) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const achieved = current >= target && target > 0;
  const periodLabel = { daily: "Hoje", weekly: "Esta Semana", monthly: "Este Mês" }[period];
  const typeLabel = type === "revenue" ? "Faturamento" : "Lucro Líquido";

  const [celebrated, setCelebrated] = useState(false);
  useEffect(() => {
    if (achieved && !celebrated) {
      setCelebrated(true);
      playCelebrationSound();
      triggerConfetti();
    }
  }, [achieved, celebrated]);

  return (
    <motion.div
      className={`relative rounded-2xl border overflow-hidden p-4 ${
        achieved
          ? "border-zinc-500/40 bg-zinc-500/5"
          : "border-border bg-card"
      }`}
      animate={achieved ? { scale: [1, 1.02, 1] } : {}}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{periodLabel}</p>
          <p className="text-xs font-black text-foreground">{typeLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {achieved && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-[9px] font-black px-2 py-0.5 rounded-full bg-zinc-500/20 text-zinc-400 border border-zinc-500/30"
            >
              ✓ META BATIDA
            </motion.span>
          )}
          {isAdmin && (
            <button
              onClick={onEdit}
              className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Valores */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className={`text-xl font-black ${achieved ? "text-zinc-400" : "text-primary"}`}>
            {formatBRL(current)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            de {target > 0 ? formatBRL(target) : "Meta não definida"}
          </p>
        </div>
        <p className={`text-2xl font-black ${achieved ? "text-zinc-400" : "text-primary"}`}>
          {target > 0 ? `${Math.round(percentage)}%` : "—"}
        </p>
      </div>

      {/* Barra de progresso */}
      {target > 0 && (
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${achieved ? "bg-zinc-500" : "bg-primary"}`}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      )}

      {/* Falta quanto */}
      {!achieved && target > 0 && current < target && (
        <p className="text-[10px] text-muted-foreground mt-2">
          Faltam {formatBRL(target - current)} para bater a meta
        </p>
      )}
    </motion.div>
  );
}
