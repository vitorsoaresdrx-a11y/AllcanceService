import { useState, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Trash2,
  QrCode,
  Package,
  Eye,
  EyeOff,
  Bike,
  Search,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import {
  useBikeModels,
  useBikePartsCount,
  useUpdateBikeModel,
  useDeleteBikeModel,
  type BikeModel,
} from "@/hooks/useBikes";
import { QRCodeModal } from "@/components/QRCodeModal";
import { BatchQRCodeModal } from "@/components/BatchQRCodeModal";
import { getOptimizedImageUrl } from "@/lib/image";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { CheckSquare, Square, Check } from "lucide-react";

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

const Badge = ({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "active";
}) => {
  const s =
    variant === "active"
      ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
      : "bg-muted text-muted-foreground border-border/80";
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${s}`}>
      {children}
    </span>
  );
};

function StatCard({
  title,
  value,
  color = "text-white",
}: {
  title: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="p-3 rounded-2xl bg-card border border-border">
      <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground leading-tight mb-1">{title}</p>
      <p className={`text-xl font-black ${color}`}>{value}</p>
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="py-16 md:py-24 flex flex-col items-center text-center space-y-6 bg-card border border-dashed border-border rounded-2xl md:rounded-[40px]">
      <div className="w-16 h-16 md:w-20 md:h-20 bg-background rounded-2xl md:rounded-[30px] flex items-center justify-center text-muted-foreground/50">
        <Bike size={32} className="md:w-10 md:h-10" />
      </div>
      <div className="space-y-2">
        <h4 className="text-base md:text-xl font-bold text-foreground/80">Nenhuma bike no catálogo</h4>
        <p className="text-xs md:text-sm text-muted-foreground max-w-xs mx-auto px-4">
          Comece adicionando modelos de bicicletas para gerenciar peças e visibilidade.
        </p>
      </div>
      <button 
        className="h-10 px-6 rounded-xl bg-transparent border border-border/80 text-foreground/80 text-sm font-medium hover:bg-muted transition-colors"
        onClick={onNew}
      >
        Cadastrar Primeiro Modelo
      </button>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function Bikes() {
  const { data: bikes = [], isLoading } = useBikeModels();
  const { data: partsCounts = {} } = useBikePartsCount();
  const updateBike = useUpdateBikeModel();
  const deleteBike = useDeleteBikeModel();
  const navigate = useNavigate();
  const [qrBike, setQrBike] = useState<BikeModel | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  
  // Batch selection states
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchPrintOpen, setBatchPrintOpen] = useState(false);

  const handleToggle = (id: string, current: boolean) => {
    updateBike.mutate({ id, visible_on_storefront: !current });
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(b => b.id)));
  };

  const categories = useMemo(() => {
    const cats = bikes.map((b) => b.category || "").filter(Boolean);
    return [...new Set(cats)].sort();
  }, [bikes]);

  const debouncedSearch = useDebounce(search, 300);
  const filtered = useMemo(() => 
    bikes.filter((b) => {
      const matchesSearch =
        b.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (b.category || "").toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || (b.category || "") === categoryFilter;
      return matchesSearch && matchesCategory;
    }),
    [bikes, debouncedSearch, categoryFilter]
  );

  const totalParts = Object.values(partsCounts as Record<string, number>).reduce(
    (a, b) => a + b,
    0
  );

  return (
    <div className="min-h-full bg-background text-foreground font-sans selection:bg-primary/30 pb-24 lg:pb-0">
      <div className="max-w-7xl mx-auto w-full p-4 lg:p-8 space-y-4">

        {/* Header Mobile */}
        <header className="flex items-center justify-between mb-4 md:hidden">
          <h1 className="text-lg font-black">Modelos de Bikes</h1>
          <button 
            className="h-9 px-3 text-xs font-bold rounded-xl bg-primary text-primary-foreground whitespace-nowrap flex items-center gap-1.5 shrink-0"
            onClick={() => navigate("/bikes/nova")}
          >
            <Plus size={14} />
            Nova Bike
          </button>
        </header>

        {/* Header Desktop */}
        <header className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-primary/30">
                <Bike className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-black tracking-widest text-primary">CATÁLOGO</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">Modelos de Bikes</h1>
          </div>

          <div className="flex items-center gap-3">
            <Btn 
              variant={selectionMode ? "secondary" : "outline"} 
              className={`hidden md:flex rounded-2xl ${selectionMode ? 'bg-primary/20 text-primary border-primary/30' : ''}`}
              onClick={() => {
                setSelectionMode(!selectionMode);
                if (selectionMode) setSelectedIds(new Set());
              }}
            >
              <CheckSquare className="w-5 h-5 mr-2" />
              {selectionMode ? "Cancelar Seleção" : "Imprimir em Lote"}
            </Btn>
            <div className="hidden md:flex items-center bg-card border border-border rounded-2xl px-4 py-2 text-muted-foreground focus-within:border-primary/50 transition-colors">
              <Search className="w-4 h-4 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Buscar modelo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-foreground/90 w-48 placeholder:text-muted-foreground/70"
              />
            </div>
            <Btn variant="primary" size="lg" onClick={() => navigate("/bikes/nova")}>
              <Plus className="w-5 h-5 mr-2 stroke-[3]" />
              Nova Bike
            </Btn>
          </div>
        </header>

        {/* Batch Actions Toolbar */}
        {selectionMode && (
          <div className="bg-primary/10 border border-primary/20 p-4 rounded-3xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-black text-primary uppercase tracking-widest bg-primary/20 px-4 py-2 rounded-xl">
                {selectedIds.size} selecionadas
              </span>
              <button 
                className="text-xs font-bold text-muted-foreground hover:text-white transition-colors"
                onClick={selectAll}
              >
                {selectedIds.size === filtered.length ? "Desmarcar Tudo" : "Selecionar Tudo"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Btn 
                variant="primary" 
                size="md" 
                className="px-6 rounded-xl font-bold"
                disabled={selectedIds.size === 0}
                onClick={() => setBatchPrintOpen(true)}
              >
                <QrCode className="w-4 h-4 mr-2" />
                Imprimir QR Codes
              </Btn>
            </div>
          </div>
        )}

        {/* Stats Mobile */}
        <div className="grid grid-cols-3 gap-2 md:hidden">
          <StatCard title="Total de Modelos" value={bikes.length} />
          <StatCard
            title="Visíveis na Loja"
            value={bikes.filter((b) => b.visible_on_storefront).length}
            color="text-zinc-400"
          />
          <StatCard
            title="Total de Peças"
            value={totalParts}
            color="text-primary"
          />
        </div>

        {/* Stats Desktop */}
        <div className="hidden md:grid grid-cols-3 gap-6">
          <StatCard title="Total de Modelos" value={bikes.length} />
          <StatCard
            title="Visíveis na Loja"
            value={bikes.filter((b) => b.visible_on_storefront).length}
            color="text-zinc-400"
          />
          <StatCard
            title="Total de Peças"
            value={totalParts}
            color="text-primary"
          />
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`h-8 px-3 text-xs font-bold rounded-xl whitespace-nowrap transition-all shrink-0 ${
                categoryFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-white hover:border-border/70"
              }`}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`h-8 px-3 text-xs font-bold rounded-xl whitespace-nowrap transition-all shrink-0 ${
                  categoryFilter === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:text-white hover:border-border/70"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 && search === "" ? (
          <EmptyState onNew={() => navigate("/bikes/nova")} />
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground/70 text-sm">
            Nenhum resultado para "{search}"
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {filtered.map((bike) => {
              const firstImage = (bike as any).images?.[0];
              return (
                <div
                  key={bike.id}
                  className={`group relative bg-card border rounded-2xl md:rounded-[40px] overflow-hidden transition-all duration-500 cursor-pointer ${
                    selectedIds.has(bike.id) 
                      ? 'border-primary ring-2 ring-primary/20 shadow-[0_20px_40px_rgba(0,0,0,0.5)]' 
                      : 'border-border hover:border-primary/50 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]'
                  }`}
                  onClick={() => {
                    if (selectionMode) toggleSelect(bike.id);
                    else navigate(`/bikes/${bike.id}`);
                  }}
                >
                  {/* Selection Indicator */}
                  {selectionMode && (
                    <div className="absolute top-4 left-4 z-[40]">
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedIds.has(bike.id) 
                          ? 'bg-primary border-primary text-white scale-110' 
                          : 'bg-black/50 border-white/30 text-transparent'
                      }`}>
                        <Check size={18} strokeWidth={4} />
                      </div>
                    </div>
                  )}
                  {/* Imagem Mobile */}
                  <div className="md:hidden relative">
                    <img 
                      src={firstImage || undefined} 
                      alt={bike.name} 
                      loading="lazy" 
                      className="w-full h-44 object-cover" 
                    />
                    {bike.visible_on_storefront && (
                      <span className="absolute top-2 right-2 text-[9px] font-black px-2 py-0.5 rounded-full bg-zinc-500/20 text-zinc-400 border border-zinc-500/30 uppercase">
                        No Ar
                      </span>
                    )}
                  </div>

                  {/* Imagem Desktop */}
                  <div className="hidden md:block aspect-[4/3] bg-background relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent z-10" />
                    <div className="absolute top-4 right-4 z-20">
                      <Badge variant={bike.visible_on_storefront ? "active" : "default"}>
                        {bike.visible_on_storefront ? "NO AR" : "OCULTO"}
                      </Badge>
                    </div>

                    <div className="w-full h-full flex items-center justify-center group-hover:scale-110 transition-transform duration-700">
                      {firstImage ? (
                        <img src={firstImage} alt={bike.name} loading="lazy" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-16 h-16 text-muted" />
                      )}
                    </div>

                    {/* Hover Actions Desktop */}
                    <div
                      className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 z-30 transition-all backdrop-blur-sm bg-black/20"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {bike.sku && (
                        <Btn
                          variant="secondary"
                          size="icon"
                          className="rounded-2xl w-12 h-12 shadow-2xl"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQrBike(bike);
                          }}
                        >
                          <QrCode className="w-5 h-5" />
                        </Btn>
                      )}
                      <Btn
                        variant="primary"
                        size="icon"
                        className="rounded-2xl w-12 h-12 shadow-2xl"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/bikes/${bike.id}`);
                        }}
                      >
                        <ArrowRight className="w-5 h-5" />
                      </Btn>
                    </div>
                  </div>

                  {/* Conteúdo Mobile */}
                  <div className="p-4 md:hidden">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-sm font-black truncate pr-2">{bike.name}</h3>
                      <button
                        className="text-muted-foreground/70 hover:text-zinc-400 transition-colors shrink-0 ml-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(bike.id);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] font-bold text-primary uppercase">
                        {bike.category || "Sem categoria"}
                      </span>
                      {bike.sku && (
                        <>
                          <span className="text-muted-foreground/50">•</span>
                          <span className="text-[10px] text-muted-foreground">{bike.sku}</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border/50">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <TrendingUp size={12} /> {(partsCounts as Record<string, number>)[bike.id] || 0} Peças
                      </span>
                      <button 
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(bike.id, bike.visible_on_storefront);
                        }}
                      >
                        {bike.visible_on_storefront ? 'Desativar' : 'Ativar'}
                        <Eye size={14} className={bike.visible_on_storefront ? 'text-zinc-400' : 'text-muted-foreground/70'} />
                      </button>
                    </div>
                  </div>

                  {/* Conteúdo Desktop */}
                  <div className="hidden md:block p-8 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-xl font-black text-white truncate pr-2">{bike.name}</h3>
                        <button
                          className="text-muted-foreground/70 hover:text-zinc-500 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(bike.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
                          {bike.category || "Sem categoria"}
                        </span>
                        {bike.sku && (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            <span className="text-[10px] font-mono text-muted-foreground uppercase">{bike.sku}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-muted/50 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <span className="text-xs font-bold text-muted-foreground">
                          {(partsCounts as Record<string, number>)[bike.id] || 0} Peças
                        </span>
                      </div>

                      <button
                        className="flex items-center gap-2 group/toggle"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggle(bike.id, bike.visible_on_storefront);
                        }}
                      >
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider group-hover/toggle:text-foreground/80 transition-colors">
                          {bike.visible_on_storefront ? "Desativar" : "Ativar"}
                        </span>
                        {bike.visible_on_storefront ? (
                          <Eye className="w-5 h-5 text-zinc-500" />
                        ) : (
                          <EyeOff className="w-5 h-5 text-muted-foreground/50" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QR Modal — lógica original do Lovable */}
      {qrBike?.sku && (
        <QRCodeModal
          open={!!qrBike}
          onOpenChange={(open) => !open && setQrBike(null)}
          sku={qrBike.sku}
          productName={qrBike.name}
        />
      )}

      <BatchQRCodeModal
        open={batchPrintOpen}
        onOpenChange={setBatchPrintOpen}
        bikes={bikes.filter(b => selectedIds.has(b.id))}
      />
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteBike.mutate(deleteTarget);
          setDeleteTarget(null);
        }}
        title="Excluir bike"
        description="Tem certeza que deseja excluir este modelo de bike? Esta ação não pode ser desfeita."
      />
    </div>
  );
}
