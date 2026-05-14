import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FileCheck, Printer, Phone } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { getTotalPrice } from "@/utils/mechanicUtils";
import { toast } from "sonner";
import { MechanicJob, MechanicJobPaymentHistory } from "@/hooks/useMechanicJobs";
import { useEffect, useCallback } from "react";
import html2canvas from "html2canvas";

interface ReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: {
    job: MechanicJob;
    history: MechanicJobPaymentHistory;
    autoSend?: boolean;
  } | null;
  onSendMessage: (payload: { 
    phone: string; 
    message: string; 
    media?: string; 
    mediatype?: string; 
    mimetype?: string; 
    fileName?: string; 
  }) => void;
}

export function ReceiptModal({ open, onOpenChange, data, onSendMessage }: ReceiptModalProps) {
  useEffect(() => {
    if (open && data?.autoSend) {
      // Pequeno timeout para garantir que o modal abriu e faliu o render inicial
      const timer = setTimeout(async () => {
        const el = document.getElementById("receipt-capture-area");
        if (el && data.job.customer_whatsapp) {
          try {
            toast.info("Gerando recibo para envio...", { id: "receipt-gen" });
            const canvas = await html2canvas(el, { backgroundColor: "#000", scale: 1 });
            const base64Data = canvas.toDataURL("image/jpeg", 0.8);
            
            const phone = data.job.customer_whatsapp.replace(/\D/g, "");
            const formattedPhone = (phone.length >= 10 && phone.length <= 11 && !phone.startsWith("55")) ? `55${phone}` : phone;

            onSendMessage({
              phone: formattedPhone,
              message: `🧾 *Opa, ${data.job.customer_name}!* Recebemos seu pagamento referente à ${data.job.bike_name || 'bike'}. O comprovante segue anexo. Conta com a gente!`,
              media: base64Data,
              mediatype: 'image',
              mimetype: 'image/jpeg',
              fileName: `recibo_${data.job.id.slice(0, 4)}.jpg`
            });
            toast.success("Foto do recibo enviada via WhatsApp!", { id: "receipt-gen" });
          } catch (e) {
            console.error("Erro ao enviar recibo:", e);
            toast.error("Erro ao gerar imagem do recibo.");
          }
        }
      }, 1000); // 1s buffer para garantir render estável no mobile tbm
      return () => clearTimeout(timer);
    }
  }, [open, data, onSendMessage]);

  if (!data) return null;

  const handlePrintOSReceipt = () => {
    const { job, history } = data;
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;

    const arr = Array.isArray(job.payment_history) ? [...job.payment_history] : [];
    if (!arr.find((h: any) => h.id === history.id)) arr.push(history);
    const paid = arr
      .filter((h: any) => new Date(h.criado_em) <= new Date(history.criado_em))
      .reduce((s: any, h: any) => s + Number(h.valor) + Number(h.desconto_valor), 0);
    const remainingBalance = Math.max(0, getTotalPrice(job) - paid);

    const html = `
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <title>Comprovante O.S. #${job.id.slice(0, 4).toUpperCase()}</title>
  <style>
    body { font-family: 'Courier New', Courier, monospace; width: 300px; margin: 0 auto; color: #000; padding: 20px 0; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .uppercase { text-transform: uppercase; }
    .mt4 { margin-top: 4px; }
    .mt8 { margin-top: 8px; }
    .divider { border-top: 1.5px dashed #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; align-items: center; }
    .small { font-size: 13px; }
    .xsmall { font-size: 11px; }
    .total { font-size: 15px; font-weight: bold; margin-top: 8px; }
    .section-label { font-size: 10px; opacity: 0.7; text-transform: uppercase; margin-bottom: 2px; }
  </style>
</head>
<body>
  <div class="center">
    <p class="bold uppercase" style="font-size: 18px; margin-bottom: 4px;">Allcance</p>
    <p class="xsmall">SOROCABA - SP</p>
    <p class="xsmall">Rua Dr João Tavares, 131</p>
    <p class="xsmall">(15) 99612-8054</p>
  </div>

  <div class="divider"></div>

  <p class="section-label">Comprovante de Serviço</p>
  <div class="row small">
    <span>O.S. #${(job as any).code || job.id.slice(0, 4).toUpperCase()}</span>
    <span>${new Date(history.criado_em).toLocaleDateString()}</span>
  </div>

  <div class="divider"></div>

  <div class="row small"><span>Cliente:</span><span class="bold">${job.customer_name}</span></div>
  <div class="row small"><span>Bike:</span><span>${job.bike_name}</span></div>

  <div class="divider"></div>

  <p class="section-label">Financeiro</p>
  <div class="row small">
    <span>Valor Total O.S.</span>
    <span>${formatBRL(getTotalPrice(job))}</span>
  </div>
  <div class="row total mt4">
    <span>ESTE PAGAMENTO</span>
    <span>${formatBRL(history.valor)}</span>
  </div>
  <div class="row small mt4">
    <span>Forma</span>
    <span>${(history.payment_method || 'PIX').toUpperCase()}</span>
  </div>
  
  ${history.desconto_valor > 0 ? `<div class="row small"><span>Desconto</span><span>-${formatBRL(history.desconto_valor)}</span></div>` : ''}

  <div class="divider"></div>

  <div class="row small font-bold">
    <span>SALDO RESTANTE</span>
    <span>${formatBRL(remainingBalance)}</span>
  </div>

  <div class="divider"></div>

  <div class="center mt8">
    <p class="small">Obrigado pela preferência!</p>
    <p class="xsmall mt4 uppercase">DEUS ACIMA DE TUDO</p>
    <p class="xsmall mt4">${new Date().toLocaleString("pt-BR")}</p>
  </div>
  
  <script>
    window.onload = function() {
      setTimeout(() => { window.print(); window.close(); }, 300);
    };
  </script>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleSendWhatsApp = () => {
    if (!data) return;
    const { job, history } = data;
    const msg = `📋 *Recibo de Serviço - Allcance*\n\n*Cliente:* ${job.customer_name}\n*Bike:* ${job.bike_name}\n*Data:* ${new Date(history.criado_em).toLocaleDateString()}\n\n*Pagamento:* ${formatBRL(history.valor)}\n*Forma:* ${history.payment_method?.toUpperCase() || 'PIX'}\n*Total do Serviço:* ${formatBRL(getTotalPrice(job))}\n\nObrigado pela preferência! 🚴✨`;
    
    onSendMessage({
      phone: job.customer_whatsapp!,
      message: msg
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-secondary border-border rounded-2xl p-0 overflow-hidden max-w-md shadow-2xl w-full">
        <div className="p-8 space-y-6" id="receipt-capture-area" style={{ WebkitTextStroke: "0.4px currentColor", fontWeight: 900 }}>
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto border border-primary/20">
              <FileCheck size={24} className="text-primary" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight">Comprovante de Serviço</h2>
          </div>
          
          <div className="space-y-4 text-xs font-bold uppercase tracking-wider">
            <div className="p-4 bg-background rounded-2xl border border-border space-y-3">
              <div className="flex justify-between pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Cliente</span>
                <span className="text-foreground">{data.job.customer_name}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Bike</span>
                <span className="text-foreground">{data.job.bike_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data</span>
                <span className="text-foreground">{new Date(data.history.criado_em).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="p-4 bg-background rounded-2xl border border-border space-y-2">
              <p className="text-[8px] text-muted-foreground mb-2">Resumo Financeiro</p>
              <div className="flex justify-between text-muted-foreground">
                <span>Valor Total</span>
                <span>{formatBRL(getTotalPrice(data.job))}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Este Pagamento ({data.history.payment_method || 'PIX'})</span>
                <span>{formatBRL(data.history.valor)}</span>
              </div>
              {data.history.desconto_valor > 0 && (
                <div className="flex justify-between text-zinc-400">
                  <span>Desconto Concedido</span>
                  <span>{formatBRL(data.history.desconto_valor)}</span>
                </div>
              )}
              <div className="h-px bg-border/40 my-1" />
              <div className="flex justify-between text-foreground">
                <span>Saldo Restante</span>
                <span>{(() => {
                  const arr = Array.isArray(data.job.payment_history) ? [...data.job.payment_history] : [];
                  if (!arr.find((h: any) => h.id === data.history.id)) arr.push(data.history);
                  const paid = arr
                    .filter((h: any) => new Date(h.criado_em) <= new Date(data.history.criado_em))
                    .reduce((s: any, h: any) => s + Number(h.valor) + Number(h.desconto_valor), 0);
                  return formatBRL(Math.max(0, getTotalPrice(data.job) - paid));
                })()}</span>
              </div>
            </div>
            
            <div className="text-center pt-2 pb-1 space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase">Obrigado pela preferência!</p>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">DEUS ACIMA DE TUDO</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3" data-html2canvas-ignore="true">
            <button 
              onClick={handlePrintOSReceipt}
              className="w-full h-12 rounded-2xl bg-black text-white hover:bg-zinc-800 font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 shadow-xl shadow-black/10"
            >
              <Printer size={16} /> Imprimir Recibo
            </button>

            <button 
              onClick={handleSendWhatsApp}
              className="w-full h-12 rounded-2xl bg-zinc-500 text-white hover:bg-zinc-400 font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/10"
            >
              <Phone size={16} /> WhatsApp
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
