import { useState, useMemo } from "react";
import { Search, ChevronDown, Pencil, TrendingUp, Package, Bike } from "lucide-react";
import { useAllStockEntries, useUpdateStockEntry, type StockEntryRow } from "@/hooks/usePriceHistory";
import { useParts } from "@/hooks/useParts";
import { useBikeModels } from "@/hooks/useBikes";
import { calculateWeightedAverage } from "@/lib/cost-average";
import { formatBRL } from "@/lib/format";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { useDebounce } from "@/hooks/useDebounce";
import { getOptimizedImageUrl } from "@/lib/image";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ProductGroup {
  id: string;
  name: string;
  type: "part" | "bike";
  category: string | null;
  image: string | null;
  entries: StockEntryRow[];
  avg: number;
  min: number;
  max: number;
}

export default function Precos() {
  const { data: allEntries = [], isLoading: entriesLoading } = useAllStockEntries();
  const { data: parts = [] } = useParts();
  const { data: bikes = [] } = useBikeModels();
  const updateEntry = useUpdateStockEntry();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"Todos" | "Peças" | "Bikes">("Todos");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState<StockEntryRow | null>(null);
  const [editCost, setEditCost] = useState(0);
  const [editSupplier, setEditSupplier] = useState("");

  const debouncedSearch = useDebounce(search, 300);

  const products: ProductGroup[] = useMemo(() => {
    const grouped = new Map<string, StockEntryRow[]>();
    allEntries.forEach((e) => {
      const key = `${e.item_type}-${e.item_id}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(e);
    });

    const result: ProductGroup[] = [];

    grouped.forEach((entries, key) => {
      const [type, id] = [key.split("-")[0], key.substring(key.indexOf("-") + 1)];
      let name = "Produto desconhecido";
      let category: string | null = null;
      let image: string | null = null;

      if (type === "part") {
        const part = parts.find((p) => p.id === id);
        if (part) {
          name = part.name;
          category = part.category;
          image = getOptimizedImageUrl((part as any).images?.[0], 80, 70);
        }
      } else {
        const bike = bikes.find((b) => b.id === id);
        if (bike) {
          name = bike.name;
          category = bike.category;
          image = getOptimizedImageUrl((bike as any).images?.[0], 80, 70);
        }
      }

      const valid = entries.filter((e) => e.unit_cost > 0);
      const costs = valid.map((e) => e.unit_cost);
      result.push({
        id: key,
        name,
        type: type as "part" | "bike",
        category,
        image,
        entries,
        avg: calculateWeightedAverage(valid),
        min: costs.length > 0 ? Math.min(...costs) : 0,
        max: costs.length > 0 ? Math.max(...costs) : 0,
      });
    });

    return result;
  }, [allEntries, parts, bikes]);

  const filtered = useMemo(() => {
    let list = products;
    if (filter === "Peças") list = list.filter((p) => p.type === "part");
    if (filter === "Bikes") list = list.filter((p) => p.type === "bike");
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [products, filter, debouncedSearch]);

  const openEdit = (entry: StockEntryRow) => {
    setEditEntry(entry);
    setEditCost(entry.unit_cost || 0);
    setEditSupplier(entry.supplier_name || "");
  };

  const saveEdit = async () => {
    if (!editEntry) return;
    try {
      await updateEntry.mutateAsync({ id: editEntry.id, unit_cost: editCost, supplier_name: editSupplier || undefined });
      toast({ title: "Entrada atualizada" });
      setEditEntry(null);
    } catch {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  if (entriesLoading) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background text-foreground font-sans pb-24 lg:pb-0">
      <div className="max-w-7xl mx-auto w-full p-4 lg:p-8 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-zinc-800 rounded-xl md:rounded-2xl flex items-center justify-center">
            <TrendingUp size={16} className="text-white" />
          </div>
          <h1 className="text-lg md:text-2xl font-black">Histórico de Preços</h1>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-2">
          {(["Todos", "Peças", "Bikes"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`h-8 px-3 text-[10px] font-bold uppercase rounded-full border transition-all ${
                filter === f
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-card border-border text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 bg-card border border-border rounded-2xl pl-12 pr-4 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-muted-foreground/70"
          />
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            {allEntries.length === 0
              ? "Nenhuma entrada de estoque registrada ainda. Faça entradas na página de Estoque para começar."
              : "Nenhum produto encontrado com esses filtros."}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((product) => {
              const open = expandedId === product.id;
              return (
                <div key={product.id} className="rounded-2xl bg-card border border-border overflow-hidden">
                  {/* Header */}
                  <button
                    onClick={() => setExpandedId(open ? null : product.id)}
                    className="w-full flex items-center gap-3 p-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {product.image ? (
                        <img src={product.image} alt="" className="w-full h-full object-cover" />
                      ) : product.type === "bike" ? (
                        <Bike size={18} className="text-muted-foreground" />
                      ) : (
                        <Package size={18} className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-bold truncate">{product.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{product.category || "Sem categoria"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[9px] text-muted-foreground uppercase">Média atual</p>
                      <p className="text-sm font-black text-primary">{formatBRL(product.avg)}</p>
                    </div>
                    <ChevronDown
                      size={14}
                      className={`text-muted-foreground ml-2 transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Expandido */}
                  {open && (
                    <div className="border-t border-border">
                      {/* Resumo */}
                      <div className="grid grid-cols-3 gap-px bg-border">
                        <div className="bg-card p-3 text-center">
                          <p className="text-[9px] uppercase text-muted-foreground mb-1">Mínimo</p>
                          <p className="text-sm font-black text-zinc-400">{formatBRL(product.min)}</p>
                        </div>
                        <div className="bg-card p-3 text-center">
                          <p className="text-[9px] uppercase text-muted-foreground mb-1">Média</p>
                          <p className="text-sm font-black text-primary">{formatBRL(product.avg)}</p>
                        </div>
                        <div className="bg-card p-3 text-center">
                          <p className="text-[9px] uppercase text-muted-foreground mb-1">Máximo</p>
                          <p className="text-sm font-black text-zinc-400">{formatBRL(product.max)}</p>
                        </div>
                      </div>

                      {/* Entradas */}
                      <div className="divide-y divide-border/50">
                        {product.entries.map((entry) => (
                          <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold">{entry.unit_cost > 0 ? formatBRL(entry.unit_cost) : "—"}</p>
                                <span className="text-[9px] text-muted-foreground">· {entry.quantity} un.</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {entry.supplier_name || "Fornecedor não informado"} ·{" "}
                                {format(new Date(entry.created_at), "dd/MM/yyyy")}
                              </p>
                            </div>
                            {!entry.unit_cost || entry.unit_cost <= 0 ? (
                              <span className="text-[9px] px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                                Sem preço
                              </span>
                            ) : null}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(entry);
                              }}
                              className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Pencil size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Edição */}
      {editEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="bg-secondary w-full max-w-sm rounded-2xl border border-border overflow-hidden shadow-2xl">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-black text-foreground">Editar Entrada</h3>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Preço de Custo Unitário</p>
                <CurrencyInput value={editCost} onChange={setEditCost} autoFocus />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Fornecedor</p>
                <input
                  placeholder="Ex: Shimano Brasil..."
                  value={editSupplier}
                  onChange={(e) => setEditSupplier(e.target.value)}
                  className="w-full h-11 bg-card border border-border rounded-2xl px-4 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-muted-foreground/70"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditEntry(null)}
                  className="flex-1 h-11 rounded-xl border border-border text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveEdit}
                  disabled={updateEntry.isPending}
                  className="flex-[2] h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 transition-all"
                >
                  {updateEntry.isPending ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
