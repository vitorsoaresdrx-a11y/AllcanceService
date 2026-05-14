import { Check, CheckCircle2, Loader2 } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { MechanicJob } from "@/hooks/useMechanicJobs";
import { formatBRL } from "@/lib/format";
import { getTotalPrice } from "@/utils/mechanicUtils";
import { InputGroup } from "../CommonComponents";

interface FinalizeJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: MechanicJob | null;
  paymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function FinalizeJobModal({
  open,
  onOpenChange,
  job,
  paymentMethod,
  onPaymentMethodChange,
  onConfirm,
  isPending,
}: FinalizeJobModalProps) {
  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-secondary border-border rounded-2xl md:rounded-[40px] p-0 overflow-hidden max-w-md shadow-2xl w-full">
        <div className="p-6 md:p-10 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-foreground uppercase tracking-tight italic">Finalizar OS</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="p-5 bg-background rounded-2xl border border-border shadow-sm">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Resumo do Serviço</p>
              <p className="font-black text-white text-sm uppercase tracking-tight">{job.bike_name || "Bicicleta"}</p>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1 italic">"{job.problem}"</p>
              <div className="h-px bg-border/40 my-3" />
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-muted-foreground uppercase">Valor Total</span>
                <span className="text-xl font-black text-primary">{formatBRL(getTotalPrice(job))}</span>
              </div>
            </div>

            <InputGroup label="Forma de Pagamento Final *">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "pix", label: "PIX" },
                  { key: "dinheiro", label: "Dinheiro" },
                  { key: "cartao_debito", label: "Débito" },
                  { key: "cartao_credito", label: "Crédito" },
                ].map((pm) => (
                  <button
                    key={pm.key}
                    type="button"
                    onClick={() => onPaymentMethodChange(pm.key)}
                    className={`h-12 rounded-xl border text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                      paymentMethod === pm.key
                        ? "border-primary bg-primary/10 text-primary shadow-lg shadow-primary/5"
                        : "border-border bg-card text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {paymentMethod === pm.key && <Check size={12} />}
                    {pm.label}
                  </button>
                ))}
              </div>
            </InputGroup>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              onClick={() => onOpenChange(false)} 
              className="flex-1 h-12 rounded-2xl border border-border text-muted-foreground hover:bg-muted text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="flex-[2] h-12 rounded-2xl bg-zinc-500 text-white hover:bg-zinc-600 text-xs font-black uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={16} /> 
                  Confirmar e Finalizar
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
