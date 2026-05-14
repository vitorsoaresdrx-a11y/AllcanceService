import { useState, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { useInsertStockEntry } from "@/hooks/usePriceHistory";
import {
  Search,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Package,
  Plus,
  Minus,
  ArrowRight,
  Bike,
  Layers,
  History,
  Download,
  User,
} from "lucide-react";
import { useParts, useUpdatePart } from "@/hooks/useParts";
import { useBikeModels, useUpdateBikeModel } from "@/hooks/useBikes";
import { useToast } from "@/hooks/use-toast";
import { getOptimizedImageUrl } from "@/lib/image";
import { exportInventoryCSV } from "@/lib/export-csv";
import { useCurrentUserName } from "@/hooks/useCurrentUserName";
import { useStockChanges } from "@/hooks/useStockChanges";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

// ─── Design System ────────────────────────────────────────────────────────────

const Btn = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
}) => {
  const v = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/80 shadow-primary/20",
    secondary: "bg-secondary text-foreground hover:bg-secondary/80 border border-border",
    ghost: "hover:bg-muted/50 text-muted-foreground hover:text-white",
    outline: "border border-border bg-transparent text-foreground/80 hover:bg-muted",
    destructive: "bg-zinc-500/10 text-zinc-500 hover:bg-zinc-500/20",
  };
  const s = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 py-2 text-sm",
    lg: "h-12 px-8 rounded-2xl text-base font-bold",
    icon: "h-9 w-9 flex items-center justify-center",
  };
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 ${v[variant]} ${s[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const BadgeEl = ({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "critical" | "warning" | "ok" | "default";
}) => {
  const styles = {
    critical: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    warning: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    ok: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    default: "bg-muted text-muted-foreground border-border/80",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${styles[variant]}`}>
      {children}
    </span>
  );
};

// ─── Tipos e Config ───────────────────────────────────────────────────────────

type StockStatus = "critical" | "warning" | "ok";
type FilterStatus = "all" | StockStatus;

interface StockItem {
  id: string;
  name: string;
  type: "Peça" | "Bike";
  category: string | null;
  stock_qty: number;
  alert_stock: number;
  status: StockStatus;
  image: string | null;
}

function getStatus(qty: number, alert: number): StockStatus {
  if (alert <= 0) return "ok";
  if (qty <= alert) return "critical";
  if (qty <= alert * 1.5) return "warning";
  return "ok";
}

const statusConfig = {
  critical: {
    label: "Em alerta",
    icon: AlertTriangle,
    color: "text-zinc-400",
    bg: "bg-zinc-500/5",
    border: "border-zinc-500/20",
    glow: "shadow-[0_0_15px_rgba(161,161,170,0.1)]",
    badgeVariant: "critical" as const,
  },
  warning: {
    label: "Atenção",
    icon: AlertCircle,
    color: "text-zinc-400",
    bg: "bg-zinc-500/5",
    border: "border-zinc-500/20",
    glow: "shadow-[0_0_15px_rgba(161,161,170,0.1)]",
    badgeVariant: "warning" as const,
  },
  ok: {
    label: "Estoque ok",
    icon: CheckCircle2,
    color: "text-zinc-400",
    bg: "bg-zinc-500/5",
    border: "border-zinc-500/20",
    glow: "shadow-[0_0_15px_rgba(161,161,170,0.1)]",
    badgeVariant: "ok" as const,
  },
};

// ─── SummaryCard ──────────────────────────────────────────────────────────────

function SummaryCard({
  status,
  count,
  active,
  onClick,
}: {
  status: StockStatus;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const cfg = statusConfig[status];
  const Icon = cfg.icon;
  return (
    <button
      onClick={onClick}
      className={`relative group p-5 md:p-8 rounded-2xl md:rounded-[32px] border transition-all duration-500 text-left overflow-hidden ${
        active
          ? "bg-card border-primary shadow-[0_0_30px_rgba(161,161,170,0.1)]"
          : "bg-card border-border hover:border-border/80"
      }`}
    >
      <div className="absolute -right-4 -top-4 opacity-[0.03] text-muted-foreground/70">
        <Icon size={120} />
      </div>
      <div className="relative z-10 flex flex-col justify-between h-full space-y-8">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${cfg.bg} ${cfg.color} ${cfg.glow}`}>
          <Icon className="w-6 h-6 stroke-[2.5]" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-1">{cfg.label}</p>
          <div className="flex items-baseline gap-2">
            <h2 className={`text-2xl lg:text-4xl font-black tracking-tighter ${cfg.color}`}>{count}</h2>
            <span className="text-xs text-muted-foreground/70 font-bold uppercase">Itens</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function Estoque() {
  const { data: parts = [], isLoading: partsLoading } = useParts();
  const { data: bikes = [], isLoading: bikesLoading } = useBikeModels();
  const { data: stockChanges = [] } = useStockChanges();
  const updatePart = useUpdatePart();
  const updateBike = useUpdateBikeModel();
  const { toast } = useToast();
  const currentUserName = useCurrentUserName();
  const [showHistory, setShowHistory] = useState(false);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterType, setFilterType] = useState<"all" | "Peça" | "Bike">("all");
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [mode, setMode] = useState<"add" | "subtract" | null>(null);
  const [qty, setQty] = useState("");
  const [unitCost, setUnitCost] = useState(0);
  const [supplierName, setSupplierName] = useState("");
  const [entryNotes, setEntryNotes] = useState("");
  const insertStockEntry = useInsertStockEntry();

  const isLoading = partsLoading || bikesLoading;

  const items: StockItem[] = useMemo(() => {
    const partItems: StockItem[] = parts.map((p) => ({
      id: p.id,
      name: p.name,
      type: "Peça" as const,
      category: p.category,
      stock_qty: p.stock_qty,
      alert_stock: Number((p as any).alert_stock) || 0,
      status: getStatus(p.stock_qty, Number((p as any).alert_stock) || 0),
      image: getOptimizedImageUrl((p as any).images?.[0], 80, 70),
    }));

    const bikeItems: StockItem[] = bikes.map((b) => ({
      id: b.id,
      name: b.name,
      type: "Bike" as const,
      category: b.category,
      stock_qty: Number((b as any).stock_qty) || 0,
      alert_stock: Number((b as any).alert_stock) || 0,
      status: getStatus(Number((b as any).stock_qty) || 0, Number((b as any).alert_stock) || 0),
      image: getOptimizedImageUrl((b as any).images?.[0], 80, 70),
    }));

    return [...partItems, ...bikeItems];
  }, [parts, bikes]);

  const debouncedSearch = useDebounce(search, 300);

  const filtered = useMemo(() => {
    let list = items;
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (i) => i.name.toLowerCase().includes(q) || (i.category || "").toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all") list = list.filter((i) => i.status === filterStatus);
    if (filterType !== "all") list = list.filter((i) => i.type === filterType);
    const order = { critical: 0, warning: 1, ok: 2 };
    list.sort((a, b) => order[a.status] - order[b.status]);
    return list;
  }, [items, debouncedSearch, filterStatus, filterType]);

  const counts = useMemo(() => ({
    critical: items.filter((i) => i.status === "critical").length,
    warning: items.filter((i) => i.status === "warning").length,
    ok: items.filter((i) => i.status === "ok").length,
  }), [items]);

  const openModal = (item: StockItem) => { setSelectedItem(item); setMode(null); setQty(""); setUnitCost(0); setSupplierName(""); setEntryNotes(""); };
  const closeModal = () => { setSelectedItem(null); setMode(null); setQty(""); setUnitCost(0); setSupplierName(""); setEntryNotes(""); };

  const handleConfirm = async () => {
    if (!selectedItem || !mode) return;
    const value = parseInt(qty) || 0;
    if (value <= 0) {
      toast({ title: "Insira uma quantidade válida", variant: "destructive" });
      return;
    }
    const newQty =
      mode === "add"
        ? selectedItem.stock_qty + value
        : Math.max(0, selectedItem.stock_qty - value);

    // Log stock change
    await supabase.from("stock_changes").insert({
      product_type: selectedItem.type === "Peça" ? "part" : "bike",
      product_id: selectedItem.id,
      product_name: selectedItem.name,
      old_qty: selectedItem.stock_qty,
      new_qty: newQty,
      responsible_name: currentUserName,
    });

    // Insert stock_entry for price history on "add" mode
    if (mode === "add") {
      await insertStockEntry.mutateAsync({
        item_id: selectedItem.id,
        item_type: selectedItem.type === "Peça" ? "part" : "bike",
        quantity: value,
        unit_cost: unitCost,
        supplier_name: supplierName || undefined,
        notes: entryNotes || undefined,
      });
    }

    if (selectedItem.type === "Peça") {
      updatePart.mutate({ id: selectedItem.id, stock_qty: newQty } as any);
    } else {
      updateBike.mutate({ id: selectedItem.id, stock_qty: newQty });
    }

    toast({
      title: mode === "add" ? "Estoque adicionado" : "Estoque subtraído",
      description: `${selectedItem.name}: ${selectedItem.stock_qty} → ${newQty}`,
    });
    closeModal();
  };

  return (
    <div className="min-h-full bg-background text-foreground font-sans selection:bg-primary/30 pb-24 lg:pb-0">
      <div className="max-w-7xl mx-auto w-full p-4 lg:p-8 space-y-6 lg:space-y-8">

        {/* Header — Mobile */}
        <header className="md:hidden flex items-center justify-between gap-2 mb-0">
          <h1 className="text-lg font-black">Estoque Geral</h1>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => exportInventoryCSV(parts, bikes as any[])}
              className="h-9 px-3 text-xs font-bold rounded-xl border border-border/80 whitespace-nowrap flex items-center gap-1.5"
            >
              <Download size={14} /> Exportar
            </button>
            <button className="h-9 px-3 text-xs font-bold rounded-xl bg-primary text-white whitespace-nowrap flex items-center gap-1.5">
              <Plus size={14} /> Entrada Manual
            </button>
          </div>
        </header>

        {/* Header — Desktop */}
        <header className="hidden md:flex md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-800 rounded-2xl flex items-center justify-center shadow-black/20">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-black tracking-widest text-primary">HUB DE OPERAÇÕES</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">Estoque Geral</h1>
          </div>
          <div className="flex items-center gap-3">
            <Btn variant="secondary" size="lg" className="rounded-2xl" onClick={() => exportInventoryCSV(parts, bikes as any[])}>
              <Download className="w-5 h-5 mr-2" />
              Exportar
            </Btn>
            <Btn variant="primary" size="lg" onClick={() => document.getElementById('inventory-search')?.focus()}>
              <Plus className="w-5 h-5 mr-2 stroke-[3]" />
              Entrada Manual
            </Btn>
          </div>
        </header>

        {/* Summary Cards — Mobile compact */}
        <div className="md:hidden grid grid-cols-2 gap-3 mb-0">
          {(["critical", "warning", "ok"] as StockStatus[]).map((status) => {
            const cfg = statusConfig[status];
            const Icon = cfg.icon;
            return (
              <button
                key={status}
                onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}
                className={`p-3 rounded-2xl bg-background border text-left ${
                  filterStatus === status ? "border-primary" : "border-border"
                } ${status === "ok" ? "col-span-2" : ""}`}
              >
                <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center mb-2`}>
                  <Icon size={14} className={cfg.color} />
                </div>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{cfg.label}</p>
                <p className={`text-xl font-black ${cfg.color}`}>
                  {counts[status]} <span className="text-xs font-normal text-muted-foreground/70">itens</span>
                </p>
              </button>
            );
          })}
        </div>

        {/* Summary Cards — Desktop */}
        <div className="hidden md:grid md:grid-cols-3 gap-6">
          {(["critical", "warning", "ok"] as StockStatus[]).map((status) => (
            <SummaryCard
              key={status}
              status={status}
              count={counts[status]}
              active={filterStatus === status}
              onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}
            />
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 md:pt-4">
          <div className="flex-1 w-full relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="inventory-search"
              type="text"
              placeholder="Buscar por nome ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-11 md:h-14 bg-card border border-border rounded-2xl pl-12 pr-4 text-sm text-foreground/90 outline-none focus:border-primary transition-all placeholder:text-muted-foreground/70"
            />
          </div>
          <div className="flex w-full md:w-auto p-1 bg-card border border-border rounded-2xl shrink-0">
            {(["all", "Peça", "Bike"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  filterType === t ? "bg-secondary text-white" : "text-muted-foreground hover:text-foreground/80"
                }`}
              >
                {t === "all" ? "Tudo" : t + "s"}
              </button>
            ))}
          </div>
        </div>

        {/* Loading / Empty */}
        {isLoading ? (
          <div className="p-20 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-20 text-center text-muted-foreground/70 text-sm">
            {search || filterStatus !== "all" || filterType !== "all"
              ? "Nenhum item encontrado com esses filtros"
              : "Nenhum item cadastrado"}
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="block md:hidden space-y-2">
              {filtered.map((item) => {
                const cfg = statusConfig[item.status];
                return (
                  <button
                    key={`m-${item.type}-${item.id}`}
                    onClick={() => openModal(item)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-background border border-border text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground/70 overflow-hidden shrink-0">
                      {item.image ? (
                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                      ) : item.type === "Bike" ? (
                        <Bike size={20} />
                      ) : (
                        <Package size={20} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{item.category || "Sem Categoria"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[9px] px-2 py-0.5 rounded-full border border-border/80 text-muted-foreground block mb-1">
                        {item.type}
                      </span>
                      <p className={`text-sm font-black ${cfg.color}`}>{item.stock_qty}</p>
                      <p className="text-[9px] text-muted-foreground/70">un.</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-card border border-border rounded-[32px] overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-border/50 flex items-center justify-between gap-2">
                <h3 className="font-bold text-lg">Itens em Inventário</h3>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {filtered.length} {filtered.length !== 1 ? "itens" : "item"} filtrado{filtered.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-left">
                      <th className="px-8 py-4">Item / Categoria</th>
                      <th className="px-8 py-4">Tipo</th>
                      <th className="px-8 py-4 text-center">Disponível</th>
                      <th className="px-8 py-4 text-center">Alerta</th>
                      <th className="px-8 py-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30 text-sm">
                    {filtered.map((item) => {
                      const cfg = statusConfig[item.status];
                      const StatusIcon = cfg.icon;
                      return (
                        <tr
                          key={`d-${item.type}-${item.id}`}
                          onClick={() => openModal(item)}
                          className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
                        >
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-background border border-border flex items-center justify-center text-muted-foreground/70 group-hover:border-primary/50 transition-colors overflow-hidden shrink-0">
                                {item.image ? (
                                  <img src={item.image} alt="" className="w-full h-full object-cover" />
                                ) : item.type === "Bike" ? (
                                  <Bike className="w-6 h-6" />
                                ) : (
                                  <Package className="w-6 h-6" />
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-foreground">{item.name}</p>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                  {item.category || "Sem Categoria"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6"><BadgeEl>{item.type}</BadgeEl></td>
                          <td className="px-8 py-6 text-center">
                            <span className={`text-lg font-black ${cfg.color}`}>{item.stock_qty}</span>
                          </td>
                          <td className="px-8 py-6 text-center text-muted-foreground font-medium">
                            {item.alert_stock > 0 ? item.alert_stock : "—"}
                          </td>
                          <td className="px-8 py-6">
                            <div className={`flex items-center justify-end gap-2 ${cfg.color} font-bold text-xs uppercase tracking-tighter`}>
                              {cfg.label}
                              <StatusIcon className="w-4 h-4" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de Ajuste */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="bg-secondary w-full max-w-md rounded-2xl md:rounded-[40px] border border-border overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-10 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white">Ajustar Estoque</h2>
                  <p className="text-muted-foreground text-sm">Gerencie entrada e saída de itens</p>
                </div>
                <button
                  onClick={closeModal}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-white transition-colors"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              {/* Preview */}
              <div className="p-4 bg-background rounded-3xl border border-border flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground overflow-hidden shrink-0">
                  {selectedItem.image ? (
                    <img src={selectedItem.image} alt="" className="w-full h-full object-cover" />
                  ) : selectedItem.type === "Bike" ? (
                    <Bike size={24} />
                  ) : (
                    <Package size={24} />
                  )}
                </div>
                <div>
                  <p className="font-bold text-white">{selectedItem.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Estoque atual:{" "}
                    <span className="text-primary font-black">{selectedItem.stock_qty}</span>
                  </p>
                </div>
              </div>

              {!mode ? (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setMode("add")}
                    className="h-32 rounded-3xl border border-zinc-500/20 bg-zinc-500/5 hover:bg-zinc-500/10 flex flex-col items-center justify-center gap-3 transition-all"
                  >
                    <Plus className="w-8 h-8 text-zinc-500" />
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Entrada</span>
                  </button>
                  <button
                    onClick={() => setMode("subtract")}
                    className="h-32 rounded-3xl border border-zinc-500/20 bg-zinc-500/5 hover:bg-zinc-500/10 flex flex-col items-center justify-center gap-3 transition-all"
                  >
                    <Minus className="w-8 h-8 text-zinc-500" />
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Saída</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                      Quantidade para {mode === "add" ? "Adicionar" : "Retirar"}
                    </label>
                    <input
                      type="number"
                      autoFocus
                      min={1}
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      placeholder="0"
                      className="w-full h-14 bg-card border border-border rounded-2xl px-6 text-2xl font-black text-foreground outline-none focus:border-primary transition-all"
                    />
                  </div>

                  {mode === "add" && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                          Preço de Custo Unitário *
                        </label>
                        <CurrencyInput value={unitCost} onChange={setUnitCost} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                          Fornecedor
                        </label>
                        <input
                          placeholder="Ex: Shimano Brasil, fornecedor local..."
                          value={supplierName}
                          onChange={(e) => setSupplierName(e.target.value)}
                          className="w-full h-11 bg-card border border-border rounded-2xl px-4 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-muted-foreground/70"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                          Observações
                        </label>
                        <input
                          placeholder="Opcional..."
                          value={entryNotes}
                          onChange={(e) => setEntryNotes(e.target.value)}
                          className="w-full h-11 bg-card border border-border rounded-2xl px-4 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-muted-foreground/70"
                        />
                      </div>
                    </>
                  )}

                  {qty && parseInt(qty) > 0 && (
                    <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                      <span>{selectedItem.stock_qty}</span>
                      <ArrowRight size={14} />
                      <span className="font-black text-foreground text-lg">
                        {mode === "add"
                          ? selectedItem.stock_qty + (parseInt(qty) || 0)
                          : Math.max(0, selectedItem.stock_qty - (parseInt(qty) || 0))}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Btn variant="ghost" className="flex-1 h-12" onClick={() => { setMode(null); setQty(""); }}>
                      Voltar
                    </Btn>
                    <Btn variant="primary" className="flex-[2] h-12" onClick={handleConfirm}>
                      Confirmar Ajuste
                    </Btn>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
