import { useState, useEffect } from "react";
import { 
  Activity, 
  Pause, 
  Pencil, 
  Trash2, 
  AlertTriangle, 
  RotateCcw, 
  Check, 
  X, 
  Clock, 
  Plus, 
  Loader2,
  Tag,
  CheckCircle,
  LucideIcon
} from "lucide-react";
import { formatBRL } from "@/lib/format";
import { getTotalPrice, getAdditionTotal } from "@/utils/mechanicUtils";
import { 
  MechanicJob, 
  MechanicJobAddition, 
  useDeleteMechanicJob, 
  useCancelAndArchiveMechanicJob, 
  useAdvanceMechanicJob, 
  useRestoreCancelledJob,
  useUpdateAdditionApproval
} from "@/hooks/useMechanicJobs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface MechanicCardProps {
  job: MechanicJob;
  isLast: boolean;
  columnKey: string;
  onAddRepair: (j: MechanicJob) => void;
  onEdit: (j: MechanicJob) => void;
  onRetreat?: (j: MechanicJob) => void;
  onAdvance?: (j: MechanicJob) => void;
  onFinalize?: (j: MechanicJob) => void;
  onOpenControl: (j: MechanicJob) => void;
  isMechanicView?: boolean;
}

export function MechanicCard({ 
  job, 
  isLast, 
  columnKey, 
  onAddRepair, 
  onEdit, 
  onRetreat, 
  onAdvance, 
  onFinalize, 
  onOpenControl, 
  isMechanicView 
}: MechanicCardProps) {
  const remove = useDeleteMechanicJob();
  const archive = useCancelAndArchiveMechanicJob();
  const advanceMutation = useAdvanceMechanicJob();
  const total = getTotalPrice(job);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cancelConfirmAction, setCancelConfirmAction] = useState<'retirar' | 'ok' | null>(null);
  const restoreJob = useRestoreCancelledJob();
  const [aiActive, setAiActive] = useState<boolean | null>(null);

  useEffect(() => {
    if (!job.customer_whatsapp) return;
    const phone = job.customer_whatsapp.replace(/\D/g, '').slice(-10);
    supabase
      .from('whatsapp_conversations')
      .select('ai_enabled, human_takeover')
      .ilike('contact_phone', `%${phone}%`)
      .limit(1)
      .then(({ data }) => {
        const conv = (data as any)?.[0];
        if (conv) setAiActive(conv.ai_enabled === true && conv.human_takeover !== true);
      });
  }, [job.customer_whatsapp]);

  const showApprovalActions = columnKey === "in_approval";
  const showRetreat = false;

  const handleAdvance = () => {
    if (isLast && onFinalize) {
      onFinalize(job);
      return;
    }
    if (onAdvance) {
      onAdvance(job);
      return;
    }
    advanceMutation.mutate({ id: job.id, status: job.status }, {
      onSuccess: () => toast.success("Card avançado!"),
      onError: () => toast.error("Erro ao avançar")
    });
  };

  const handleConfirmDelete = () => {
    if (job.status === 'cancelado') {
      archive.mutate(job, {
        onSuccess: () => { toast.success("Serviço arquivado (cancelado)"); setDeleteDialogOpen(false); },
        onError: () => toast.error("Erro ao arquivar"),
      });
    } else {
      remove.mutate(job.id, {
        onSuccess: () => { toast.success("Serviço excluído"); setDeleteDialogOpen(false); },
        onError: () => toast.error("Erro ao excluir"),
      });
    }
  };

  return (
    <>
      <div 
        onClick={() => onOpenControl(job)}
        className="bg-card border rounded-lg shadow-sm overflow-hidden mb-3 hover:shadow-md transition-shadow relative cursor-pointer"
      >
        {job.status === 'cancelado' && (
          <div 
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 z-10 bg-destructive/90 rounded-lg flex flex-col items-center justify-center gap-4 p-6 backdrop-blur-sm"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <AlertTriangle size={28} className="text-white" />
            </div>
            <div className="text-center">
              <p className="text-white font-black text-lg uppercase tracking-widest leading-none">OS Cancelada</p>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-1">{job.customer_name || 'Cliente'}</p>
              <p className="text-white/40 text-[10px] font-medium mt-0.5 italic">{job.bike_name || 'Bike'}</p>
            </div>
            <div className="flex gap-2 w-full">
              <button
                onClick={(e) => { e.stopPropagation(); setCancelConfirmAction('retirar'); }}
                className="flex-1 h-10 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all"
              >
                Retirar
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setCancelConfirmAction('ok'); }}
                className="flex-1 h-10 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[10px] font-black uppercase tracking-widest border border-white/20 transition-all"
              >
                Excluir
              </button>
            </div>
          </div>
        )}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="text-sm font-bold text-foreground truncate">{job.bike_name || "Sem Identificação"}</h3>
                <PaymentBadge job={job} />
              </div>
              <p className="text-xs text-muted-foreground">{job.customer_name || "Cliente Avulso"}</p>
            </div>
            <div className="flex gap-2 items-center">
              {aiActive !== null && (
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${aiActive ? 'bg-zinc-500/20 text-zinc-400' : 'bg-zinc-500/20 text-zinc-400'}`} title={aiActive ? 'IA ativa' : 'IA pausada'}>
                  {aiActive ? <Activity size={10} /> : <Pause size={10} />}
                </div>
              )}
              <div className="flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); onEdit(job); }} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"><Pencil size={14} /></button>
                <button onClick={(e) => { e.stopPropagation(); setDeleteDialogOpen(true); }} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2">{job.problem}</p>
          
          {isMechanicView && job.additions && job.additions.length > 0 && (
            <div className="space-y-2 mt-2">
              {job.additions.map(a => {
                const notes = (a as any).mechanic_notes;
                const status = (a.approval as string);
                const approved = status === 'accepted' || status === 'aprovado';
                
                if (notes && approved) {
                  return (
                    <div key={a.id} className="p-3 rounded-lg bg-zinc-500/5 border border-zinc-500/20">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-2">Instrução Adicional</p>
                      <p className="text-xs font-medium text-foreground leading-relaxed">{notes}</p>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}

          {job.additions && job.additions.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              {job.additions.map((a) => (
                <AdditionBadge 
                  key={a.id} 
                  addition={a} 
                  job={job}
                  showActions={showApprovalActions} 
                  isMechanicView={isMechanicView}
                  onAdvance={onAdvance}
                  columnKey={columnKey}
                />
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-muted/30 border-t flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total</p>
            <p className="text-sm font-bold">{formatBRL(total)}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={(e) => { e.stopPropagation(); onAddRepair(job); }} className="p-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors" title="Reparo Extra"><Plus size={16} /></button>
            {showRetreat && onRetreat && <button onClick={(e) => { e.stopPropagation(); onRetreat(job); }} className="h-9 px-3 rounded-md bg-zinc-100 dark:bg-zinc-900/30 text-zinc-600 font-bold text-xs uppercase hover:bg-zinc-200 transition-colors">Voltar</button>}
            <button onClick={(e) => { e.stopPropagation(); handleAdvance(); }} disabled={advanceMutation.isPending} className={`h-9 px-4 rounded-md text-white font-bold text-xs uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 ${isLast ? "bg-zinc-500 hover:bg-zinc-600" : "bg-primary hover:bg-primary/90"}`}>
              {advanceMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : (isLast ? "Finalizar" : "Avançar")}
            </button>
          </div>
        </div>
      </div>
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Confirmar exclusão"
        description={`Tem certeza que deseja excluir o serviço "${job.bike_name || "Bike não informada"}"? Esta ação não pode ser desfeita.`}
      />

      <Dialog open={cancelConfirmAction === 'retirar'} onOpenChange={(v) => !v && setCancelConfirmAction(null)}>
        <DialogContent className="max-w-xs p-6 bg-card border-border rounded-3xl text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 bg-primary/20 text-primary">
            <RotateCcw size={32} />
          </div>
          <h3 className="text-lg font-black uppercase tracking-tight mb-2">Reverter Cancelamento?</h3>
          <p className="text-xs text-muted-foreground mb-6 font-medium">O serviço voltará para o status de Aprovação.</p>
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => {
                restoreJob.mutate(job, {
                  onSuccess: () => {
                    toast.success("Cancelamento revertido!");
                    setCancelConfirmAction(null);
                  },
                  onError: () => toast.error("Erro ao reverter")
                });
              }}
              className="h-12 rounded-xl text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 bg-primary"
            >
              Confirmar
            </button>
            <button onClick={() => setCancelConfirmAction(null)} className="h-10 text-[10px] font-bold text-muted-foreground uppercase">Desistir</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelConfirmAction === 'ok'} onOpenChange={(v) => !v && setCancelConfirmAction(null)}>
        <DialogContent className="max-w-xs p-6 bg-card border-border rounded-3xl text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 bg-destructive/20 text-destructive">
            <Trash2 size={32} />
          </div>
          <h3 className="text-lg font-black uppercase tracking-tight mb-2">Confirmar Exclusão?</h3>
          <p className="text-xs text-muted-foreground mb-6 font-medium">Esta bike será removida permanentemente do sistema.</p>
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => {
                handleConfirmDelete();
                setCancelConfirmAction(null);
              }}
              className="h-12 rounded-xl text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 bg-destructive"
            >
              Confirmar
            </button>
            <button onClick={() => setCancelConfirmAction(null)} className="h-10 text-[10px] font-bold text-muted-foreground uppercase">Desistir</button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

const PaymentBadge = ({ job }: { job: MechanicJob }) => {
  if (job.sem_custo) {
    return (
      <div className="bg-slate-500/10 text-slate-400 border-slate-500/20 border px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shrink-0">
        <Tag size={8} /> Sem custo
      </div>
    );
  }
  const total = getTotalPrice(job);
  const paid = Number(job.payment?.valor_pago || 0);
  const discount = Number((Array.isArray(job.payment_history) ? job.payment_history : []).reduce((s, h) => s + (Number(h?.desconto_valor) || 0), 0));
  const remaining = total - (paid + discount);

  if (remaining <= 0) {
    return (
      <div className="flex gap-1 items-center shrink-0">
        <div className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 border px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
          <CheckCircle size={8} /> Quitado
        </div>
        {discount > 0 && (
          <div className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 border px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
             <Tag size={8} /> Desconto {formatBRL(discount)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-zinc-500/10 text-zinc-500 border-zinc-500/20 border px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shrink-0">
      <Clock size={8} /> Falta {formatBRL(remaining)}
    </div>
  );
};

function AdditionBadge({ addition, job, showActions, isMechanicView, onAdvance, columnKey }: { addition: MechanicJobAddition; job: MechanicJob; showActions: boolean; isMechanicView?: boolean; onAdvance?: (j: MechanicJob) => void; columnKey: string }) {
  const updateApproval = useUpdateAdditionApproval();
  const total = getAdditionTotal(addition);

  const handleApproval = async (status: "accepted" | "refused") => {
    const isV2 = (addition as any).is_v2;
    await updateApproval.mutateAsync({ id: addition.id, approval: status, is_v2: isV2 });

    if (status === "accepted") {
      const adicionalTotal = total;
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

      if (columnKey === "in_approval" && onAdvance) {
        onAdvance(job);
      }
    }
  };

  const isAccepted = (addition.approval as string) === "accepted" || (addition.approval as string) === "aprovado";
  const isRefused = (addition.approval as string) === "refused" || (addition.approval as string) === "recusado" || (addition.approval as string) === "negado";

  const approvalColor =
    isAccepted ? "border-zinc-500/30 bg-zinc-500/5 text-zinc-400"
    : isRefused ? "border-destructive/30 bg-destructive/5 text-destructive"
    : "border-zinc-500/30 bg-zinc-500/5 text-zinc-500";

  const displayText = (isMechanicView && (addition as any).mechanic_notes) 
    ? (addition as any).mechanic_notes 
    : addition.problem;

  if (isMechanicView && !isAccepted) return null;

  return (
    <div className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${approvalColor}`}>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold truncate">{displayText}</p>
        <p className="text-[10px] font-bold">{formatBRL(total)}</p>
      </div>
      {showActions && !isAccepted && !isRefused && (
        <div className="flex gap-1 shrink-0">
          <button onClick={() => handleApproval("refused")} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors">
            <X size={14} />
          </button>
          <button onClick={() => handleApproval("accepted")} className="p-1.5 rounded-md hover:bg-zinc-500/10 text-zinc-500/60 hover:text-zinc-500 transition-colors">
            <Check size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
