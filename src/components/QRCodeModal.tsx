import { useRef, useCallback, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Plus, Minus } from "lucide-react";

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sku: string;
  productName: string;
}

export function QRCodeModal({ open, onOpenChange, sku, productName }: QRCodeModalProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [quantity, setQuantity] = useState(1);
  const productUrl = `${window.location.origin}/produto/${sku}`;

  const handleDownload = useCallback(() => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sku}.png`;
    a.click();
  }, [sku]);

  const handlePrint = useCallback(() => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const win = window.open("", "_blank");
    if (!win) return;
    
    const tagsHtml = Array(quantity).fill(0).map(() => `
      <div class="tag">
        <img src="${dataUrl}" width="180" height="180" />
        <div class="sku">${sku}</div>
        <div class="name">${productName}</div>
      </div>
    `).join('');

    win.document.write(`
      <html>
        <head>
          <title>${sku} - Etiquetas</title>
          <style>
            @media print { @page { margin: 1cm; } }
            body { font-family: system-ui, sans-serif; display: flex; flex-wrap: wrap; gap: 20px; padding: 20px; }
            .tag { 
              display: flex; flex-direction: column; align-items: center; justify-content: center; 
              padding: 15px; border: 1px solid #eee; border-radius: 8px; width: 200px; page-break-inside: avoid;
            }
            .sku { font-family: -apple-system, system-ui, sans-serif; font-weight: 900; font-size: 16px; margin: 8px 0 2px; letter-spacing: 0.1em; }
            .name { font-size: 14px; color: #000; text-align: center; font-weight: 800; }
          </style>
        </head>
        <body>
          ${tagsHtml}
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  }, [sku, productName, quantity]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-foreground">QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div ref={qrRef} className="p-4 bg-white rounded-lg">
            <QRCodeCanvas value={productUrl} size={200} level="H" />
          </div>
          <p className="text-sm font-mono font-semibold text-foreground tracking-widest">{sku}</p>
          <p className="text-xs text-muted-foreground text-center mb-2">{productName}</p>
          
          <div className="w-full flex items-center justify-between border-y border-border py-6 my-2 bg-muted/20 px-4 rounded-xl">
            <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Quantidade:</span>
            <div className="flex items-center gap-6">
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); setQuantity(Math.max(1, quantity - 1)); }}
                className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center hover:text-primary hover:border-primary active:scale-95 transition-all text-foreground/70"
              >
                <Minus size={18} />
              </button>
              <span className="w-8 text-center text-xl font-black text-primary animate-in zoom-in-50 duration-200">{quantity}</span>
              <button 
                type="button"
                onClick={(e) => { e.preventDefault(); setQuantity(Math.min(50, quantity + 1)); }}
                className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center hover:text-primary hover:border-primary active:scale-95 transition-all text-foreground/70"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
          <div className="flex gap-2 w-full">
            <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
            <Button size="sm" className="flex-1 gap-1.5" onClick={handleDownload}>
              <Download className="h-4 w-4" />
              Baixar PNG
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
