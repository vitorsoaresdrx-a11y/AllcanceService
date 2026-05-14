import { useState, useEffect } from "react";
import { 
  Phone, 
  CheckCircle, 
  Pause, 
  Play, 
  RotateCcw, 
  AlertTriangle, 
  X 
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  MechanicJob, 
  useUpdateAdditionApproval 
} from "@/hooks/useMechanicJobs";
import { useSendMessage } from "@/hooks/useWhatsApp";
import { supabase } from "@/integrations/supabase/client";
import { getAdditionTotal } from "@/utils/mechanicUtils";
import { toast } from "sonner";

interface OSControlModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: MechanicJob | null;
  onEdit: (j: MechanicJob) => void;
  onAdvance?: (j: MechanicJob) => void;
}

export function OSControlModal({ open, onOpenChange, job, onEdit, onAdvance }: OSControlModalProps) {
  const sendMessage = useSendMessage();
  const updateApproval = useUpdateAdditionApproval();
  
  const [convInfo, setConvInfo] = useState<{ id: string, ai_enabled: boolean, human_takeover: boolean } | null>(null);
  const [loadingConv, setLoadingConv] = useState(false);
  const [multipleOS, setMultipleOS] = useState(false);
  const [aiLogs, setAiLogs] = useState<{ content: string; created_at: string }[]>([]);

  useEffect(() => {
    if (open && job?.customer_whatsapp) {
      const fetchExtraData = async () => {
        setLoadingConv(true);
        const phone = job.customer_whatsapp.replace(/\D/g, '');
        const phoneSuffix = phone.slice(-10);

        const { count } = await supabase
          .from('mechanic_jobs')
          .select('*', { count: 'exact', head: true })
          .eq('customer_whatsapp', job.customer_whatsapp)
          .in('status', ['in_approval', 'in_repair', 'in_maintenance', 'in_analysis', 'ready']);
        setMultipleOS(!!(count && count > 1));

        const { data: convs } = await supabase
          .from('whatsapp_conversations' as any)
          .select('id, ai_enabled, human_takeover')
          .ilike('contact_phone', `%${phoneSuffix}%`)
          .limit(1);
        
        const conv = convs?.[0] || null;
        setConvInfo(conv);

        if (conv?.id) {
          const { data: messages } = await supabase
            .from('whatsapp_messages' as any)
            .select('content, created_at')
            .eq('conversation_id', conv.id)
            .eq('from_me', true)
            .order('created_at', { ascending: false })
            .limit(3);
          setAiLogs(messages || []);
        }

        setLoadingConv(false);
      };
      fetchExtraData();
    }
  }, [open, job]);

  if (!job) return null;

  const handleSendStatus = async () => {
     let message = "";
     switch(job.status) {
       case 'in_repair': message = "Sua bike está na fila para manutenção."; break;
       case 'in_maintenance': message = "Sua bike está em manutenção com nossos mecânicos 🔧"; break;
       case 'in_analysis': message = "Sua bike foi finalizada e está em análise final."; break;
       case 'ready': message = "Sua bike está PRONTA para retirada! 🚲✨"; break;
     }

     if (message && job.customer_whatsapp) {
       const phone = job.customer_whatsapp.replace(/\D/g, '');
       const formattedPhone = (phone.length >= 10 && phone.length <= 11 && !phone.startsWith("55")) ? `55${phone}` : phone;
       await sendMessage.mutateAsync({ phone: formattedPhone, message });
       toast.success("Status enviado!");
     }
  };

  const handleApproveManually = async () => {
    const pendingAddition = job.additions?.find(a => (a.approval as string) === 'pending' || (a.approval as string) === 'pendente');
    if (pendingAddition) {
      await updateApproval.mutateAsync({ id: pendingAddition.id, approval: 'accepted', is_v2: (pendingAddition as any).is_v2 });
      
      const adicionalTotal = getAdditionTotal(pendingAddition);
      if (adicionalTotal > 0) {
        const { data: pgData } = await supabase
          .from('os_pagamentos')
          .select('*')
          .eq('os_id', job.id)
          .maybeSingle();

        if (pgData) {
          await supabase.from('os_pagamentos').update({
            valor_total: Number(pgData.valor_total) + adicionalTotal,
            valor_restante: Number(pgData.valor_restante) + adicionalTotal
          }).eq('os_id', job.id);
        }
      }

      if (job.customer_whatsapp && job.status !== 'in_approval') {
        const phone = job.customer_whatsapp.replace(/\D/g, '');
        const formattedPhone = (phone.length >= 10 && phone.length <= 11 && !phone.startsWith("55")) ? `55${phone}` : phone;
        await sendMessage.mutateAsync({ phone: formattedPhone, message: "Ótima notícia! O serviço adicional foi aprovado pela nossa equipe e já estamos dando continuidade. Qualquer dúvida é só chamar! 🔧" });
      }

      if (job.status === "in_approval" && onAdvance) {
        onAdvance(job);
      }

      toast.success("Aprovado manualmente!");
      onOpenChange(false);
    }
  };

  const toggleAI = async (enable: boolean) => {
    if (!convInfo) return;
    const { error } = await supabase
      .from('whatsapp_conversations')
      .update({ ai_enabled: enable, human_takeover: !enable })
      .eq('id', convInfo.id);
    
    if (!error) {
      setConvInfo({ ...convInfo, ai_enabled: enable, human_takeover: !enable });
      toast.success(enable ? "IA Ativada" : "IA Pausada");
    } else {
      toast.error("Erro ao atualizar conversa");
    }
  };

  const returnToAI = async () => {
    if (!convInfo) return;
    const { error } = await supabase
      .from('whatsapp_conversations')
      .update({ ai_enabled: true, human_takeover: false })
      .eq('id', convInfo.id);
    
    if (!error) {
       setConvInfo({ ...convInfo, ai_enabled: true, human_takeover: false });
       toast.success("Devolvido para IA");
    } else {
      toast.error("Erro ao atualizar conversa");
    }
  };

  const statusConfig: any = {
    in_approval: { label: 'Em Aprovação', color: 'bg-zinc-400/20 text-zinc-600 border-zinc-400/30' },
    in_repair: { label: 'Na Mecânica', color: 'bg-zinc-400/20 text-zinc-600 border-zinc-400/30' },
    in_maintenance: { label: 'Em Manutenção', color: 'bg-zinc-400/20 text-zinc-600 border-zinc-400/30' },
    in_analysis: { label: 'Em Análise', color: 'bg-zinc-400/20 text-zinc-600 border-zinc-400/30' },
    ready: { label: 'Pronto', color: 'bg-primary/20 text-primary border-primary/30' },
    delivered: { label: 'Entregue', color: 'bg-zinc-500/20 text-zinc-600 border-zinc-500/30' },
    cancelado: { label: 'Cancelado', color: 'bg-destructive/20 text-destructive border-destructive/30' }
  };
  const currentStatus = statusConfig[job.status] || { label: job.status, color: 'bg-muted text-muted-foreground' };
  const hasPending = job.additions?.some(a => (a.approval as string) === 'pending' || (a.approval as string) === 'pendente');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[95vw] md:w-full max-h-[90vh] overflow-y-auto custom-scrollbar p-5 md:p-6 bg-secondary border-border rounded-3xl md:rounded-[32px] shadow-2xl">
        <DialogHeader className="pr-6 md:pr-8 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-left">
             <div className="min-w-0 flex-1">
               <DialogTitle className="text-base md:text-lg font-black text-white italic uppercase">{job.bike_name || 'Bike'}</DialogTitle>
               <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1 truncate">{job.customer_name || 'Cliente'}</p>
             </div>
             <div className={`self-start shrink-0 px-2.5 py-1 rounded-full border text-[9px] md:text-[10px] font-black uppercase tracking-widest shrink-0 ${currentStatus.color}`}>
               {currentStatus.label}
             </div>
          </div>
        </DialogHeader>

        {multipleOS && (
          <div className="mb-4 p-3 bg-zinc-500/10 border border-zinc-500/30 rounded-xl text-zinc-500 text-[10px] font-bold flex items-center gap-2">
            <AlertTriangle size={14} />
            Este cliente tem múltiplas OS ativas. A IA pode confundir as bikes.
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          <button onClick={handleSendStatus} className="flex items-center gap-4 p-4 rounded-2xl bg-background/40 border border-border/50 hover:bg-background/60 hover:border-border transition-all text-left">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Phone size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-white uppercase tracking-widest">Enviar status agora</p>
              <p className="text-[10px] text-muted-foreground mt-1">Notificar cliente via WhatsApp</p>
            </div>
          </button>

          {hasPending && (
            <button onClick={handleApproveManually} className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-500/10 border border-zinc-500/40 hover:bg-zinc-500/20 hover:border-border-zinc-500/60 transition-all text-left">
              <div className="w-12 h-12 rounded-xl bg-zinc-500/20 flex items-center justify-center text-zinc-500">
                <CheckCircle size={24} />
              </div>
              <div>
                <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">Aprovar adicional manualmente</p>
                <p className="text-[10px] text-zinc-500/60 mt-1">Pular fluxo de aprovação da IA</p>
              </div>
            </button>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => toggleAI(!convInfo?.ai_enabled)}
              disabled={!convInfo}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all ${
                !convInfo ? 'opacity-50 cursor-not-allowed bg-muted border-border' :
                convInfo.ai_enabled ? 'bg-zinc-500/10 border-zinc-500/40 hover:bg-zinc-500/20 text-zinc-500' : 'bg-zinc-500/10 border-zinc-500/40 hover:bg-zinc-500/20 text-zinc-500'
              }`}
            >
              {convInfo?.ai_enabled ? <Pause size={20} /> : <Play size={20} />}
              <span className="text-[10px] font-black uppercase tracking-widest">{convInfo?.ai_enabled ? 'Pausar IA' : 'Retomar IA'}</span>
            </button>

            <button onClick={returnToAI} disabled={!convInfo || convInfo.ai_enabled} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-primary/10 border border-primary/40 hover:bg-primary/20 text-primary transition-all disabled:opacity-50">
              <RotateCcw size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest">Devolver para IA</span>
            </button>
          </div>
        </div>

        {aiLogs.length > 0 && (
          <div className="mt-6 space-y-2">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Últimas mensagens da IA</p>
            <div className="space-y-1.5">
              {aiLogs.map((log, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-background/30 border border-border/40 text-[10px]">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <span className="text-primary font-bold uppercase tracking-widest">IA Allcance</span>
                    <span className="text-muted-foreground/60">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-white/80 line-clamp-2 leading-relaxed">{log.content.length > 60 ? log.content.substring(0, 60) + '...' : log.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-border/40 flex gap-4">
           <button onClick={() => { onOpenChange(false); onEdit(job); }} className="flex-1 h-12 rounded-2xl bg-secondary border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground text-[10px] font-black uppercase tracking-widest transition-all">Editar OS</button>
           <button onClick={() => onOpenChange(false)} className="flex-1 h-12 rounded-2xl bg-background border border-border/40 text-muted-foreground text-[10px] font-black uppercase tracking-widest transition-all">Fechar</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
