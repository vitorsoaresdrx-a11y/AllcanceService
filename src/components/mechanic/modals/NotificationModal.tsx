import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle, X, Activity, Phone } from "lucide-react";
import { toast } from "sonner";

interface NotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: {
    job: any;
    status: string;
    problem: string;
    timestamp?: number;
  } | null;
}

export function NotificationModal({ open, onOpenChange, data }: NotificationModalProps) {
  if (!data) return null;

  const handleRemindLater = () => {
    localStorage.removeItem('pendingAlert');
    onOpenChange(false);
    
    // Configura o lembrete (isso deve ser tratado pelo pai para ser consistente, 
    // mas mantendo a lógica do código original aqui)
    setTimeout(() => {
      localStorage.setItem('pendingAlert', JSON.stringify({ ...data, timestamp: Date.now() }));
      onOpenChange(true);
    }, 15 * 60 * 1000);
    
    toast.info("Avisaremos você novamente em 15 minutos.");
  };

  const handleOpenWhatsApp = () => {
    if (!data.job?.customer_whatsapp) return;
    const phone = data.job.customer_whatsapp.replace(/\D/g, "");
    window.open(`https://wa.me/${phone.startsWith('55') ? phone : '55' + phone}`, '_blank');
    localStorage.removeItem('pendingAlert');
    onOpenChange(false);
  };

  const handleAssumeChat = () => {
    localStorage.removeItem('pendingAlert');
    onOpenChange(false);
    toast.success("Ótimo atendimento! Conversa assumida.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-none bg-background p-0 max-w-none w-screen h-screen m-0 rounded-none flex items-center justify-center animate-in fade-in zoom-in duration-500 outline-none">
        {data.status === 'cancelamento_total' ? (
          /* ESCUDO DE CANCELAMENTO TOTAL */
          <div className="max-w-2xl w-full p-8 md:p-12 space-y-10 text-center relative">
            <div className="w-28 h-28 mx-auto rounded-[2.5rem] flex items-center justify-center border-4 border-destructive text-destructive bg-destructive/10 shadow-2xl shadow-destructive/20 animate-pulse">
              <AlertTriangle size={64} className="stroke-[2.5]" />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic leading-none text-destructive">
                Serviço Cancelado!
              </h2>
              <div className="space-y-2">
                <p className="text-xl md:text-2xl font-bold text-foreground uppercase tracking-widest">{data.job?.customer_name || 'Cliente'}</p>
                <p className="text-lg text-muted-foreground font-medium italic">Bike: {data.job?.bike_name || 'N/A'}</p>
              </div>
            </div>

            <div className="p-8 bg-destructive/5 border border-destructive/20 rounded-[3rem] space-y-3">
               <p className="text-[10px] font-black text-destructive uppercase tracking-[0.4em]">Decisão do Cliente</p>
               <p className="text-2xl font-bold text-foreground leading-tight italic">O cliente optou por CANCELAR TODOS os serviços da bike pelo WhatsApp.</p>
            </div>

            <div className="flex flex-col gap-4 pt-10">
              <div className="flex flex-col md:flex-row gap-4">
                <button 
                  onClick={handleRemindLater}
                  className="flex-1 h-20 rounded-[2rem] bg-card border-2 border-border text-muted-foreground hover:bg-muted hover:text-foreground text-xl font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  Me lembre em 15 min
                </button>
                
                <button 
                  onClick={handleOpenWhatsApp}
                  className="flex-1 h-20 rounded-[2rem] bg-zinc-500 text-white hover:bg-zinc-400 text-xl font-black uppercase tracking-widest transition-all shadow-[0_0_50px_rgba(161,161,170,0.3)] active:scale-95 flex items-center justify-center gap-4"
                >
                  <Phone size={32} /> Entrar em Contato
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* MODAL PADRÃO DE APROVAÇÃO / NEGAÇÃO */
          <div className="max-w-2xl w-full p-8 md:p-12 space-y-10 text-center relative">
            {/* Dynamic Icon & Circle */}
            <div 
              className={`w-28 h-28 mx-auto rounded-[2.5rem] flex items-center justify-center border-4 shadow-2xl animate-bounce 
                ${(data.status === 'aprovado' || data.status === 'accepted')
                  ? 'bg-zinc-500/20 border-zinc-500 text-zinc-400 shadow-emerald-500/20' 
                  : 'bg-destructive/20 border-destructive text-destructive shadow-destructive/20'}`}
            >
              {(data.status === 'aprovado' || data.status === 'accepted')
                ? <CheckCircle size={56} className="stroke-[2.5]" /> 
                : <X size={56} className="stroke-[2.5]" />}
            </div>
            
            <div className="space-y-4">
              <h2 className={`text-5xl md:text-7xl font-black uppercase tracking-tighter italic leading-none 
                ${(data.status === 'aprovado' || data.status === 'accepted') ? 'text-zinc-400' : 'text-destructive'}`}
              >
                Serviço Extra {(data.status === 'aprovado' || data.status === 'accepted') ? 'Aprovado!' : 'Negado!'}
              </h2>
              <div className="space-y-2">
                <p className="text-xl md:text-2xl font-bold text-foreground uppercase tracking-widest">{data.job?.customer_name || 'Cliente'}</p>
                <p className="text-lg text-muted-foreground font-medium italic">Bike: {data.job?.bike_name || 'N/A'}</p>
              </div>
            </div>

            <div className="p-8 bg-card/50 border border-border/50 rounded-[3rem] space-y-3 relative group overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Activity size={80} />
               </div>
               <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Resumo do Adicional</p>
               <p className="text-2xl font-bold text-foreground leading-tight italic">{data.problem || 'Sem descrição'}</p>
            </div>

            <div className="flex flex-col gap-4 pt-10">
              <div className="flex flex-col md:flex-row gap-4">
                <button 
                  onClick={handleRemindLater}
                  className="flex-1 h-20 rounded-[2rem] bg-card border-2 border-border text-muted-foreground hover:bg-muted hover:text-foreground text-xl font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  Me lembre em 15 min
                </button>
                
                <button 
                  onClick={handleAssumeChat}
                  className="flex-1 h-20 rounded-[2rem] bg-zinc-600 text-white hover:bg-zinc-500 text-xl font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  Vou assumir o chat
                </button>
              </div>

              <button 
                onClick={handleOpenWhatsApp}
                className="w-full h-20 rounded-[2rem] bg-zinc-500 text-white hover:bg-zinc-400 text-xl font-black uppercase tracking-widest transition-all shadow-[0_0_50px_rgba(161,161,170,0.3)] active:scale-95 flex items-center justify-center gap-4"
              >
                <Phone size={32} /> Ver no WhatsApp
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
