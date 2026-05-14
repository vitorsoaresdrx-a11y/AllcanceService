import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Package, Bike, User, Wrench, X, Command } from "lucide-react";
import { useParts } from "@/hooks/useParts";
import { useBikeModels } from "@/hooks/useBikes";
import { useCustomers } from "@/hooks/useCustomers";
import { useServiceOrders } from "@/hooks/useServiceOrders";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: "part" | "bike" | "customer" | "service";
  route: string;
}

const typeConfig = {
  part: { icon: Package, label: "Peça", color: "text-zinc-400 bg-zinc-500/10" },
  bike: { icon: Bike, label: "Bike", color: "text-zinc-400 bg-zinc-500/10" },
  customer: { icon: User, label: "Cliente", color: "text-zinc-400 bg-zinc-500/10" },
  service: { icon: Wrench, label: "O.S.", color: "text-zinc-400 bg-zinc-500/10" },
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query, 200);

  const { data: parts = [] } = useParts();
  const { data: bikes = [] } = useBikeModels();
  const { data: customers = [] } = useCustomers();
  const { data: orders = [] } = useServiceOrders();

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Reset on close
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase();
    const matches: SearchResult[] = [];

    for (const p of parts) {
      if (
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      ) {
        matches.push({
          id: p.id,
          title: p.name,
          subtitle: [p.sku, p.category].filter(Boolean).join(" · "),
          type: "part",
          route: "/produtos",
        });
      }
    }

    for (const b of bikes as any[]) {
      if (
        b.name.toLowerCase().includes(q) ||
        b.sku?.toLowerCase().includes(q) ||
        b.brand?.toLowerCase().includes(q)
      ) {
        matches.push({
          id: b.id,
          title: b.name,
          subtitle: [b.sku, b.brand].filter(Boolean).join(" · "),
          type: "bike",
          route: "/bikes",
        });
      }
    }

    for (const c of customers) {
      if (
        c.name.toLowerCase().includes(q) ||
        c.whatsapp?.includes(q) ||
        c.cpf?.includes(q)
      ) {
        matches.push({
          id: c.id,
          title: c.name,
          subtitle: [c.whatsapp, c.cpf].filter(Boolean).join(" · "),
          type: "customer",
          route: `/clientes/${c.id}`,
        });
      }
    }

    for (const o of orders) {
      if (
        o.customer_name?.toLowerCase().includes(q) ||
        o.bike_name?.toLowerCase().includes(q) ||
        o.problem.toLowerCase().includes(q) ||
        o.frame_number?.toLowerCase().includes(q)
      ) {
        matches.push({
          id: o.id,
          title: o.customer_name || "Sem cliente",
          subtitle: [o.bike_name, o.problem.slice(0, 40)].filter(Boolean).join(" · "),
          type: "service",
          route: "/mecanica",
        });
      }
    }

    return matches.slice(0, 12);
  }, [debouncedQuery, parts, bikes, customers, orders]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      navigate(result.route);
    },
    [navigate]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-border">
          <Search size={18} className="text-muted-foreground shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar produtos, clientes, ordens..."
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-muted-foreground/70"
          />
          <kbd className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground/70 border border-border rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {debouncedQuery.trim() && (
          <div className="max-h-[360px] overflow-y-auto">
            {results.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground/70">
                Nenhum resultado encontrado
              </div>
            ) : (
              <div className="py-2">
                {results.map((result) => {
                  const config = typeConfig[result.type];
                  const Icon = config.icon;
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleSelect(result)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.color}`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground/90 truncate">{result.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{result.subtitle}</p>
                      </div>
                      <span className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-wider shrink-0">
                        {config.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!debouncedQuery.trim() && (
          <div className="py-10 text-center space-y-2">
            <p className="text-xs text-muted-foreground">Digite para buscar em todo o sistema</p>
            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground/70">
              <kbd className="border border-border rounded px-1.5 py-0.5 flex items-center gap-0.5">
                <Command size={10} /> K
              </kbd>
              <span>para abrir/fechar</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
