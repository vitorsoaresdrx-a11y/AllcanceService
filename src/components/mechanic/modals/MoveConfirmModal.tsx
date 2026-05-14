import { AlertTriangle } from "lucide-react";
import { 
  Dialog, 
  DialogContent 
} from "@/components/ui/dialog";

interface MoveConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function MoveConfirmModal({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
}: MoveConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-secondary border-border rounded-[40px] p-6 md:p-10 max-w-md w-full overflow-hidden shadow-2xl">
        <div className="space-y-6 text-center">
          <div className="relative">
            <div className="w-20 h-20 bg-zinc-500/10 rounded-full flex items-center justify-center mx-auto border border-zinc-500/20 shadow-inner">
              <AlertTriangle size={36} className="text-zinc-500" />
            </div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-20 bg-zinc-500/20 rounded-full blur-2xl -z-10" />
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight italic">Confirmar Movimentação</h2>
            <p className="text-[11px] text-muted-foreground font-medium leading-relaxed uppercase tracking-widest px-4">
              Ao mover este card manualmente, a <span className="text-primary font-black">IA deixará de monitorar</span> este atendimento automaticamente. 
              <br /><br />
              O acompanhamento passará a ser feito pelo atendente humano.
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              onClick={onCancel} 
              className="flex-1 h-14 rounded-2xl border border-border text-muted-foreground hover:bg-muted font-black uppercase tracking-widest transition-all text-[10px] active:scale-95"
            >
              Cancelar
            </button>
            <button 
              onClick={onConfirm} 
              className="flex-1 h-14 rounded-2xl bg-zinc-500 text-white hover:bg-zinc-400 font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-amber-500/20 active:scale-95"
            >
              Confirmar alteração
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
