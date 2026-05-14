import { useCallback, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, Plus, Minus, ChevronDown, ChevronUp, Package } from "lucide-react";
import { type BikeModel } from "@/hooks/useBikes";

interface BatchQRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bikes: BikeModel[];
}

export function BatchQRCodeModal({ open, onOpenChange, bikes }: BatchQRCodeModalProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isExpanded, setIsExpanded] = useState(true);

  // Initialize/Update quantities when bikes prop changes
  const getQuantity = (id: string) => quantities[id] || 1;

  const updateQuantity = (id: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 1) + delta)
    }));
  };

  const handlePrint = useCallback(() => {
    const win = window.open("", "_blank");
    if (!win) return;

    // Filter bikes with quantity > 0
    const selectedBikes = bikes.filter(b => getQuantity(b.id) > 0);

    const tagsHtml = selectedBikes.flatMap(bike => {
      const q = getQuantity(bike.id);
      return Array(q).fill(0).map(() => `
        <div class="qr-item">
          <div id="qr-${bike.id}-${Math.random().toString(36).substr(2, 5)}" class="qr-code-placeholder" data-sku="${bike.sku}"></div>
          <div class="sku">${bike.sku}</div>
          <div class="name">${bike.name}</div>
        </div>
      `);
    }).join('');

    win.document.write(`
      <html>
        <head>
          <title>Impressão em Lote - QR Codes</title>
          <style>
            @media print { @page { margin: 1cm; } }
            body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: white; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }
            .qr-item { display: flex; flex-direction: column; align-items: center; padding: 15px; border: 1px solid #eee; border-radius: 8px; page-break-inside: avoid; }
            .qr-code-placeholder { width: 140px; height: 140px; margin-bottom: 10px; }
            .sku { font-family: -apple-system, system-ui, sans-serif; font-weight: 900; font-size: 14px; margin: 5px 0; letter-spacing: 0.1em; color: #000; }
            .name { font-size: 12px; color: #000; text-align: center; max-width: 140px; font-weight: 800; }
          </style>
        </head>
        <body>
          <div class="grid">${tagsHtml}</div>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
          <script>
            window.onload = function() {
              document.querySelectorAll('.qr-code-placeholder').forEach(el => {
                new QRCode(el, {
                  text: "${window.location.origin}/produto/" + el.dataset.sku,
                  width: 140,
                  height: 140
                });
              });
              setTimeout(() => { window.print(); window.close(); }, 800);
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  }, [bikes, quantities]);

  const totalTags = bikes.reduce((sum, b) => sum + getQuantity(b.id), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border p-0 overflow-hidden rounded-[32px]">
        <div className="p-6 border-b border-border bg-muted/20">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="text-primary" />
                <span>Impressão em Lote</span>
              </div>
              <span className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full uppercase tracking-widest">
                {totalTags} Etiquetas no total
              </span>
            </DialogTitle>
          </DialogHeader>
        </div>
        
        <div className="p-6 space-y-4">
          {/* List Toggle */}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full h-14 px-5 rounded-2xl bg-muted/10 border border-border flex items-center justify-between hover:bg-muted/20 transition-all group"
          >
            <div className="flex items-center gap-3">
              <Package size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm font-bold text-foreground">Bikes Selecionadas ({bikes.length})</span>
            </div>
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {/* List Content */}
          {isExpanded && (
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar animate-in fade-in slide-in-from-top-2">
              {bikes.map(bike => (
                <div 
                  key={bike.id} 
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                    getQuantity(bike.id) > 0 ? 'bg-background border-primary/30 shadow-lg' : 'bg-muted/5 border-border opacity-50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white truncate pr-4">{bike.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase">{bike.sku}</p>
                  </div>

                  <div className="flex items-center gap-4 bg-muted/20 p-2 rounded-xl border border-border/50">
                    <button 
                      onClick={() => updateQuantity(bike.id, -1)}
                      className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center hover:text-primary transition-all active:scale-90"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center text-sm font-black text-primary">
                      {getQuantity(bike.id)}
                    </span>
                    <button 
                      onClick={() => updateQuantity(bike.id, 1)}
                      className="w-8 h-8 rounded-lg bg-background border border-border flex items-center justify-center hover:text-primary transition-all active:scale-90"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              className="flex-1 py-7 rounded-2xl border-border text-xs font-bold uppercase tracking-widest hover:bg-muted" 
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              className="flex-1 py-7 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-sm uppercase italic tracking-tight shadow-2xl shadow-primary/20" 
              onClick={handlePrint} 
              disabled={totalTags === 0}
            >
              <Printer size={20} className="mr-2" />
              Gerar {totalTags} Etiquetas
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
