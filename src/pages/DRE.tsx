import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Receipt,
  Percent,
  Minus,
  ChevronLeft,
  ChevronRight,
  Activity,
  Target,
  ShoppingBag,
  Tag,
  Scissors,
} from "lucide-react";
import { useSales } from "@/hooks/useSales";
import { useFixedExpenses, useVariableExpenses } from "@/hooks/useExpenses";
import { supabase } from "@/integrations/supabase/client";
import { calculateWeightedAverage } from "@/lib/cost-average";
import { useAllStockEntries } from "@/hooks/usePriceHistory";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── Constantes ───────────────────────────────────────────────────────────────

const MONTHS_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MONTHS_FULL  = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const TAX_RATE = 0.08;

import { formatBRL } from "@/lib/format";

// ─── Design System ────────────────────────────────────────────────────────────

const Btn = ({
  children,
  variant = "ghost",
  size = "icon",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
  size?: "icon" | "md";
}) => {
  const v = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/80",
    ghost: "hover:bg-muted/50 text-muted-foreground hover:text-white",
  };
  const s = {
    icon: "h-9 w-9 flex items-center justify-center rounded-xl",
    md: "h-10 px-4 py-2 text-sm font-bold rounded-xl",
  };
  return (
    <button
      className={`inline-flex items-center justify-center transition-all active:scale-95 disabled:opacity-30 ${v[variant]} ${s[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon: Icon,
  tag,
  color = "text-white",
  compact = false,
  formatValue = formatBRL,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  tag: string;
  color?: string;
  compact?: boolean;
  formatValue?: (v: number) => string;
}) {
  if (compact) {
    return (
      <div className="bg-card border border-border rounded-2xl md:rounded-[32px] px-4 py-3 md:p-8 hover:border-border/80 transition-all overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-12 md:h-12 bg-white/5 rounded-xl md:rounded-2xl flex items-center justify-center text-muted-foreground shrink-0">
              <Icon size={16} />
            </div>
            <div>
              <span className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{tag}</span>
              <p className="text-[10px] md:text-xs text-muted-foreground leading-tight">{title}</p>
            </div>
          </div>
          <span className={`text-base md:text-2xl font-black tracking-tighter shrink-0 ml-3 ${color}`}>{formatValue(value)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group bg-card border border-border rounded-2xl md:rounded-[32px] p-3 md:p-8 hover:border-border/80 transition-all duration-500 overflow-hidden">
      <div className="absolute -right-4 -top-4 opacity-[0.03] text-muted-foreground/70">
        <Icon size={120} className="md:hidden" />
        <Icon size={160} className="hidden md:block" />
      </div>
      <div className="relative z-10 flex flex-col justify-between h-full space-y-4 md:space-y-10">
        <div className="flex items-center justify-between">
          <div className="w-9 h-9 md:w-12 md:h-12 bg-white/5 rounded-xl md:rounded-2xl flex items-center justify-center text-muted-foreground">
            <Icon size={18} />
          </div>
          <span className="text-[9px] md:text-[10px] font-bold text-muted-foreground bg-background border border-border px-2 md:px-3 py-0.5 md:py-1 rounded-full uppercase tracking-widest">
            {tag}
          </span>
        </div>
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-tight mb-0.5 md:mb-1">{title}</p>
          <h2 className={`text-lg md:text-2xl font-black tracking-tighter ${color}`}>{formatValue(value)}</h2>
        </div>
      </div>
    </div>
  );
}

function ChartContainer({
  title,
  subtitle,
  value,
  children,
}: {
  title: string;
  subtitle: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl md:rounded-[32px] p-4 md:p-8 space-y-3 md:space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5 md:mb-1">{title}</p>
          <div className="flex items-center gap-2">
            <h3 className="text-xl md:text-2xl font-black text-white tracking-tighter">{value}</h3>
            <span className="text-[10px] font-bold text-muted-foreground uppercase bg-background px-2 py-0.5 rounded-md border border-border">
              {subtitle}
            </span>
          </div>
        </div>
        <div className="w-8 h-8 md:w-10 md:h-10 bg-white/5 rounded-lg md:rounded-xl flex items-center justify-center text-muted-foreground/70">
          <Activity size={16} />
        </div>
      </div>
      {children}
    </div>
  );
}

function DRELineRow({
  label,
  value,
  icon: Icon,
  type,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  type: "header" | "deduction" | "subtotal";
}) {
  const isDeduction = type === "deduction";
  const isSubtotal = type === "subtotal";
  return (
    <div
      className={`flex items-center justify-between p-3 md:p-4 rounded-xl md:rounded-2xl transition-colors ${
        isSubtotal ? "bg-background border border-border" : "hover:bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
        <div
          className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 ${
            isSubtotal ? "bg-primary/10 text-primary" : "bg-background text-muted-foreground"
          }`}
        >
          <Icon size={16} />
        </div>
        <span className={`text-xs md:text-sm font-bold leading-snug min-w-0 ${isSubtotal ? "text-white" : "text-muted-foreground"}`}>
          {label}
        </span>
      </div>
      <span
        className={`text-xs md:text-sm font-black tabular-nums text-right shrink-0 ml-2 whitespace-nowrap ${
          isDeduction
            ? "text-zinc-400/80"
            : isSubtotal
            ? "text-zinc-400"
            : "text-foreground"
        }`}
      >
        {value < 0 ? `- ${formatBRL(Math.abs(value))}` : formatBRL(value)}
      </span>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-secondary border border-border p-4 rounded-2xl shadow-2xl">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Dia {label}</p>
      <p className="text-sm font-black text-white">{formatBRL(payload[0].value)}</p>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function DRE() {
  const { data: sales = [], isLoading: salesLoading } = useSales();
  const { data: fixedExpenses = [], isLoading: fixedLoading } = useFixedExpenses();
  const { data: variableExpenses = [], isLoading: varLoading } = useVariableExpenses();
  const { data: allStockEntries = [], isLoading: entriesLoading } = useAllStockEntries();

  // Fetch sale_items to calculate CMV
  const { data: saleItems = [] } = useQuery({
    queryKey: ["sale_items_for_dre"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sale_items")
        .select("sale_id, part_id, bike_model_id, quantity")
        .order("sale_id");
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = salesLoading || fixedLoading || varLoading || entriesLoading;

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const { data: osHist = [] } = useQuery({
    queryKey: ["os_pagamentos_historico"],
    queryFn: async () => {
      const { data, error } = await supabase.from("os_pagamentos_historico" as any).select("*").eq("tipo", "desconto");
      if (error) throw error;
      return data || [];
    }
  });


  const monthlyFixedCost = useMemo(
    () => fixedExpenses.filter((e) => e.active).reduce((s, e) => s + Number(e.amount), 0),
    [fixedExpenses]
  );

  // Build weighted average cost map per item
  const avgCostMap = useMemo(() => {
    const map = new Map<string, number>();
    const grouped = new Map<string, { quantity: number; unit_cost: number }[]>();
    allStockEntries.forEach((e) => {
      const key = `${e.item_type}-${e.item_id}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push({ quantity: e.quantity, unit_cost: e.unit_cost });
    });
    grouped.forEach((entries, key) => {
      map.set(key, calculateWeightedAverage(entries));
    });
    return map;
  }, [allStockEntries]);

  // Map sale_id to sale for date filtering
  const salesMap = useMemo(() => {
    const m = new Map<string, any>();
    sales.forEach((s: any) => m.set(s.id, s));
    return m;
  }, [sales]);

  // Calculate CMV (Custo das Mercadorias Vendidas) for the selected year
  const yearCMV = useMemo(() => {
    let total = 0;
    saleItems.forEach((item: any) => {
      const sale = salesMap.get(item.sale_id);
      if (!sale || sale.status === "cancelled") return;
      const date = new Date(sale.created_at);
      if (date.getFullYear() !== selectedYear) return;

      const itemId = item.part_id || item.bike_model_id;
      const itemType = item.part_id ? "part" : "bike";
      if (!itemId) return;

      const avgCost = avgCostMap.get(`${itemType}-${itemId}`) || 0;
      total += avgCost * (item.quantity || 1);
    });
    return total;
  }, [saleItems, salesMap, avgCostMap, selectedYear]);

  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i,
      label: MONTHS_SHORT[i],
      revenue: 0,
      cardFees: 0,
      variableExpenses: 0,
      promotionDiscounts: 0,
      manualDiscounts: 0,
    }));

    sales.forEach((sale: any) => {
      if (sale.status === "cancelled") return;
      const date = new Date(sale.created_at);
      if (date.getFullYear() !== selectedYear) return;
      const m = date.getMonth();
      months[m].revenue += Number(sale.total) || 0;
      months[m].cardFees += Number(sale.card_fee) || 0;
      const discountAmt = Number(sale.discount_amount) || 0;
      if (sale.discount_type === "promotion") months[m].promotionDiscounts += discountAmt;
      else if (sale.discount_type === "manual") months[m].manualDiscounts += discountAmt;
    });

    osHist.forEach((h: any) => {
      const date = new Date(h.criado_em);
      if (date.getFullYear() !== selectedYear) return;
      const m = date.getMonth();
      months[m].manualDiscounts += Number(h.desconto_valor) || 0;
    });

    variableExpenses.forEach((exp: any) => {
      const d = new Date(exp.expense_date + "T00:00:00");
      if (d.getFullYear() !== selectedYear) return;
      months[d.getMonth()].variableExpenses += Number(exp.amount) || 0;
    });

    return months.map((m) => ({
      ...m,
      taxes: m.revenue * TAX_RATE,
      fixedExpenses: monthlyFixedCost,
      netProfit:
        m.revenue - m.revenue * TAX_RATE - m.cardFees - monthlyFixedCost - m.variableExpenses,
    }));
  }, [sales, variableExpenses, selectedYear, monthlyFixedCost]);

  const monthsInScope = selectedYear === currentYear ? new Date().getMonth() + 1 : 12;

  const monthlySalesCount = useMemo(() => {
    return sales.filter((sale: any) => {
      const date = new Date(sale.created_at);
      return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth;
    }).length;
  }, [sales, selectedYear, selectedMonth]);

  const totals = useMemo(() => {
    const t = monthlyData.reduce(
      (acc, m) => ({
        revenue: acc.revenue + m.revenue,
        cardFees: acc.cardFees + m.cardFees,
        taxes: acc.taxes + m.taxes,
        variableExpenses: acc.variableExpenses + m.variableExpenses,
        promotionDiscounts: acc.promotionDiscounts + m.promotionDiscounts,
        manualDiscounts: acc.manualDiscounts + m.manualDiscounts,
      }),
      { revenue: 0, cardFees: 0, taxes: 0, variableExpenses: 0, promotionDiscounts: 0, manualDiscounts: 0 }
    );
    const totalFixed = monthlyFixedCost * monthsInScope;
    const netRevenue = t.revenue - t.taxes - t.cardFees - t.promotionDiscounts - t.manualDiscounts;
    const netProfit = netRevenue - totalFixed - t.variableExpenses - yearCMV;
    return { ...t, fixedExpenses: totalFixed, netRevenue, netProfit, cmv: yearCMV };
  }, [monthlyData, monthlyFixedCost, monthsInScope, yearCMV]);

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  const dailyChartData = useMemo(() => {
    const days = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      revenue: 0,
      netProfit: 0,
    }));

    sales.forEach((sale: any) => {
      if (sale.status === "cancelled") return;
      const date = new Date(sale.created_at);
      if (date.getFullYear() !== selectedYear || date.getMonth() !== selectedMonth) return;
      const d = date.getDate() - 1;
      const rev = Number(sale.total) || 0;
      const cardFee = Number(sale.card_fee) || 0;
      days[d].revenue += rev;
      days[d].netProfit += rev - rev * TAX_RATE - cardFee;
    });

    const isCurrentMonth =
      selectedYear === currentYear && selectedMonth === new Date().getMonth();
    const limit = isCurrentMonth ? new Date().getDate() : daysInMonth;
    return days.slice(0, limit);
  }, [sales, selectedYear, selectedMonth, daysInMonth, currentYear]);

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear((y) => y - 1); }
    else setSelectedMonth((m) => m - 1);
  };
  const nextMonth = () => {
    const isCurrentMonth = selectedYear === currentYear && selectedMonth === new Date().getMonth();
    if (isCurrentMonth) return;
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear((y) => y + 1); }
    else setSelectedMonth((m) => m + 1);
  };
  const isAtCurrentMonth =
    selectedYear === currentYear && selectedMonth === new Date().getMonth();

  const marginPct =
    totals.revenue > 0
      ? ((totals.netProfit / totals.revenue) * 100).toFixed(1)
      : "0.0";

  if (isLoading) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background text-foreground font-sans selection:bg-primary/30 pb-24 lg:pb-0">
      <div className="max-w-7xl mx-auto w-full p-4 lg:p-8 space-y-3 md:space-y-6 lg:space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
          <div className="space-y-1 md:space-y-2">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-zinc-800 rounded-xl md:rounded-2xl flex items-center justify-center shadow-black/20">
                <Activity size={16} className="md:hidden text-white" />
                <Activity size={20} className="hidden md:block text-white" />
              </div>
              <span className="text-[10px] md:text-sm font-black tracking-widest text-primary uppercase">Performance Hub</span>
            </div>
            <h1 className="text-lg md:text-2xl lg:text-4xl font-black md:font-extrabold tracking-tight">Análise DRE</h1>
          </div>

          <div className="flex items-center bg-card border border-border rounded-xl md:rounded-2xl p-1 h-10 md:h-auto self-start">
            <Btn onClick={() => setSelectedYear((y) => y - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Btn>
            <span className="text-xs font-black uppercase tracking-widest px-4 md:px-6 min-w-[80px] md:min-w-[100px] text-center">
              {selectedYear}
            </span>
            <Btn
              onClick={() => setSelectedYear((y) => Math.min(y + 1, currentYear))}
              disabled={selectedYear >= currentYear}
            >
              <ChevronRight className="w-4 h-4" />
            </Btn>
          </div>
        </header>

        {/* KPI Cards */}
        {(() => {
          const kpiValues = [totals.revenue, totals.netRevenue, totals.fixedExpenses + totals.variableExpenses, totals.netProfit];
          const hasLargeValue = kpiValues.some((v) => Math.abs(v) >= 100000);
          return (
            <div className={hasLargeValue ? "flex flex-col gap-3 md:grid md:grid-cols-4 md:gap-6" : "grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6"}>
              <StatCard title="Faturamento Bruto" value={totals.revenue} icon={DollarSign} tag="Receita" compact={hasLargeValue} />
              <StatCard title="Vendas do Mês" value={monthlySalesCount} icon={Receipt} tag="Qtd" color="text-zinc-400" compact={hasLargeValue} formatValue={(v) => String(v)} />
              <StatCard
                title="Despesas Totais"
                value={totals.fixedExpenses + totals.variableExpenses}
                icon={TrendingDown}
                tag="Saídas"
                color="text-zinc-400"
                compact={hasLargeValue}
              />
              <StatCard
                title="Lucro Líquido"
                value={totals.netProfit}
                icon={totals.netProfit >= 0 ? TrendingUp : TrendingDown}
                tag="Resultado"
                color={totals.netProfit >= 0 ? "text-zinc-400" : "text-zinc-400"}
                compact={hasLargeValue}
              />
            </div>
          );
        })()}

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
          <ChartContainer
            title="Faturamento Diário"
            subtitle={MONTHS_FULL[selectedMonth]}
            value={formatBRL(dailyChartData.reduce((s, d) => s + d.revenue, 0))}
          >
            <div className="h-40 md:h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyChartData}>
                  <defs>
                    <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A1A1AA" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#A1A1AA" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1C1C1E" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#52525B", fontSize: 10 }} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#2C2C2E" }} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#A1A1AA"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#blueGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartContainer>

          <ChartContainer
            title="Lucro Líquido Diário"
            subtitle={MONTHS_FULL[selectedMonth]}
            value={formatBRL(dailyChartData.reduce((s, d) => s + d.netProfit, 0))}
          >
            <div className="h-40 md:h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1C1C1E" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#52525B", fontSize: 10 }} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
                  <Bar dataKey="netProfit" radius={[4, 4, 0, 0]}>
                    {dailyChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.netProfit >= 0 ? "#A1A1AA" : "#52525B"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartContainer>
        </div>

        {/* DRE Detalhado */}
        <div className="bg-card border border-border rounded-2xl md:rounded-[32px] overflow-hidden shadow-2xl">
          <div className="p-4 md:p-8 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base md:text-lg font-black">Demonstrativo Detalhado</h3>
            <div className="flex items-center gap-1 md:gap-2 bg-background p-1 rounded-xl border border-border self-start">
              <Btn onClick={prevMonth}>
                <ChevronLeft size={16} />
              </Btn>
              <span className="text-[10px] font-black uppercase tracking-widest px-2 md:px-4 min-w-[80px] md:min-w-[100px] text-center">
                {MONTHS_FULL[selectedMonth]}
              </span>
              <Btn onClick={nextMonth} disabled={isAtCurrentMonth}>
                <ChevronRight size={16} />
              </Btn>
            </div>
          </div>

          <div className="p-4 md:p-8 space-y-3 md:space-y-4">

            {/* Faturamento Bruto — card individual */}
            <div className="flex items-center gap-3 md:gap-4 p-3 md:p-5 bg-background border border-border rounded-xl md:rounded-2xl">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-xl md:rounded-2xl flex items-center justify-center text-muted-foreground shrink-0">
                <DollarSign size={18} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Faturamento Bruto</span>
                <span className="text-base md:text-xl font-black tracking-tighter text-foreground">{formatBRL(totals.revenue)}</span>
              </div>
            </div>

            {/* Deduções — card agrupado */}
            <div className="bg-background border border-border rounded-xl md:rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 md:gap-4 p-3 md:p-5">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-xl md:rounded-2xl flex items-center justify-center text-muted-foreground shrink-0">
                  <Percent size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Impostos sobre Venda (8%)</span>
                  <span className="text-base md:text-xl font-black tracking-tighter text-zinc-400/80">- {formatBRL(totals.taxes)}</span>
                </div>
              </div>
              <div className="h-px bg-border/50 mx-4 md:mx-5" />
              <div className="flex items-center gap-3 md:gap-4 p-3 md:p-5">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-xl md:rounded-2xl flex items-center justify-center text-muted-foreground shrink-0">
                  <CreditCard size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Taxas de cartão</span>
                  <span className="text-base md:text-xl font-black tracking-tighter text-zinc-400/80">- {formatBRL(totals.cardFees)}</span>
                </div>
              </div>
            </div>

            {/* Descontos */}
            {(totals.promotionDiscounts > 0 || totals.manualDiscounts > 0) && (
              <div className="bg-background border border-border rounded-xl md:rounded-2xl overflow-hidden">
                {totals.promotionDiscounts > 0 && (
                  <div className="flex items-center gap-3 md:gap-4 p-3 md:p-5">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-xl md:rounded-2xl flex items-center justify-center text-muted-foreground shrink-0">
                      <Tag size={18} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Descontos de Promoções</span>
                      <span className="text-base md:text-xl font-black tracking-tighter text-primary">- {formatBRL(totals.promotionDiscounts)}</span>
                    </div>
                  </div>
                )}
                {totals.promotionDiscounts > 0 && totals.manualDiscounts > 0 && (
                  <div className="h-px bg-border/50 mx-4 md:mx-5" />
                )}
                {totals.manualDiscounts > 0 && (
                  <div className="flex items-center gap-3 md:gap-4 p-3 md:p-5">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-xl md:rounded-2xl flex items-center justify-center text-muted-foreground shrink-0">
                      <Scissors size={18} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Descontos Manuais (PDV)</span>
                      <span className="text-base md:text-xl font-black tracking-tighter text-zinc-400">- {formatBRL(totals.manualDiscounts)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {totals.cmv > 0 && (
              <div className="flex items-center gap-3 md:gap-4 p-3 md:p-5 bg-background border border-border rounded-xl md:rounded-2xl">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-xl md:rounded-2xl flex items-center justify-center text-muted-foreground shrink-0">
                  <ShoppingBag size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Custo Médio Ponderado dos Produtos</span>
                  <span className="text-base md:text-xl font-black tracking-tighter text-zinc-400/80">- {formatBRL(totals.cmv)}</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 md:gap-4 p-3 md:p-5 bg-background border border-border rounded-xl md:rounded-2xl">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-xl md:rounded-2xl flex items-center justify-center text-primary shrink-0">
                <Target size={18} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Receita Líquida Operacional</span>
                <span className="text-lg md:text-2xl font-black tracking-tighter text-zinc-400">{formatBRL(totals.netRevenue)}</span>
              </div>
            </div>

            {/* Custos — card agrupado */}
            <div className="bg-background border border-border rounded-xl md:rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 md:gap-4 p-3 md:p-5">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-xl md:rounded-2xl flex items-center justify-center text-muted-foreground shrink-0">
                  <Minus size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Custos Fixos Totais</span>
                  <span className="text-base md:text-xl font-black tracking-tighter text-zinc-400/80">- {formatBRL(totals.fixedExpenses)}</span>
                </div>
              </div>
              <div className="h-px bg-border/50 mx-4 md:mx-5" />
              <div className="flex items-center gap-3 md:gap-4 p-3 md:p-5">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-white/5 rounded-xl md:rounded-2xl flex items-center justify-center text-muted-foreground shrink-0">
                  <Minus size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">Custos Variáveis e Insumos</span>
                  <span className="text-base md:text-xl font-black tracking-tighter text-zinc-400/80">- {formatBRL(totals.variableExpenses)}</span>
                </div>
              </div>
            </div>

            {/* Lucro Líquido Final — card destaque maior */}
            <div className="mt-3 md:mt-6 p-4 md:p-8 bg-primary/5 border border-primary/20 rounded-2xl md:rounded-[24px]">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-primary rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-primary/40 shrink-0">
                  <TrendingUp size={20} className="md:hidden" />
                  <TrendingUp size={28} className="hidden md:block" />
                </div>
                <div className="flex flex-col min-w-0">
                  <h4 className="text-white font-black text-sm md:text-xl leading-tight">Lucro Líquido Final</h4>
                  <p className="text-muted-foreground text-[9px] md:text-xs font-bold uppercase tracking-widest">
                    Resultado do Exercício de {selectedYear} · Margem: {marginPct}%
                  </p>
                </div>
              </div>
              <p className={`mt-3 md:mt-5 text-3xl md:text-4xl font-black tracking-tighter ${totals.netProfit >= 0 ? "text-zinc-400" : "text-zinc-400"}`}>
                {formatBRL(totals.netProfit)}
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
