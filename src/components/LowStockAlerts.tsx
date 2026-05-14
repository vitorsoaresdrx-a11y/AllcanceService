import { useParts } from "@/hooks/useParts";
import { useBikeModels } from "@/hooks/useBikes";
import { AlertTriangle, Package, Bike, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LowStockItem {
  id: string;
  name: string;
  stock_qty: number;
  alert_stock: number;
  type: "part" | "bike";
}

export function LowStockAlerts() {
  const { data: parts = [] } = useParts();
  const { data: bikes = [] } = useBikeModels();
  const navigate = useNavigate();

  const lowStock: LowStockItem[] = [];

  for (const p of parts) {
    if (p.stock_qty <= p.alert_stock && p.alert_stock > 0) {
      lowStock.push({ id: p.id, name: p.name, stock_qty: p.stock_qty, alert_stock: p.alert_stock, type: "part" });
    }
  }
  for (const b of bikes as any[]) {
    if (b.stock_qty <= b.alert_stock && b.alert_stock > 0) {
      lowStock.push({ id: b.id, name: b.name, stock_qty: b.stock_qty, alert_stock: b.alert_stock, type: "bike" });
    }
  }

  if (lowStock.length === 0) return null;

  const critical = lowStock.filter((i) => i.stock_qty === 0);
  const warning = lowStock.filter((i) => i.stock_qty > 0);

  return (
    <div className="rounded-2xl bg-card border border-zinc-500/20 overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <div className="w-9 h-9 rounded-xl bg-zinc-500/10 flex items-center justify-center">
          <AlertTriangle size={18} className="text-zinc-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-xs font-black text-white uppercase tracking-wider">Alertas de Estoque</h3>
          <p className="text-[10px] text-muted-foreground">{lowStock.length} produto{lowStock.length > 1 ? "s" : ""} abaixo do mínimo</p>
        </div>
        <button
          onClick={() => navigate("/estoque")}
          className="text-[10px] font-bold text-zinc-500 hover:text-zinc-400 flex items-center gap-1 uppercase tracking-wider"
        >
          Ver tudo <ChevronRight size={12} />
        </button>
      </div>

      <div className="divide-y divide-border/50 max-h-[280px] overflow-y-auto">
        {[...critical, ...warning].slice(0, 8).map((item) => {
          const isCritical = item.stock_qty === 0;
          return (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isCritical ? "bg-zinc-500/10" : "bg-zinc-500/10"}`}>
                {item.type === "bike" ? (
                  <Bike size={14} className={isCritical ? "text-zinc-400" : "text-zinc-400"} />
                ) : (
                  <Package size={14} className={isCritical ? "text-zinc-400" : "text-zinc-400"} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground/90 truncate">{item.name}</p>
                <p className="text-[10px] text-muted-foreground">{item.type === "bike" ? "Bike" : "Peça"}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-black ${isCritical ? "text-zinc-400" : "text-zinc-400"}`}>
                  {item.stock_qty}
                </p>
                <p className="text-[9px] text-muted-foreground/70">min: {item.alert_stock}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
