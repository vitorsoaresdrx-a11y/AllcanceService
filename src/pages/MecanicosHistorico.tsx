import { useState, useEffect, useMemo } from "react";
import {
  History,
  Wrench,
  User,
  Phone,
  CreditCard,
  Calendar,
  ChevronRight,
  Loader2,
  X,
  Ban,
  Trash2,
  Search,
} from "lucide-react";
import { useBikeServiceHistory, type GroupedBikeHistory, useCancelHistoryRecord, useDeleteHistoryRecord } from "@/hooks/useBikeServiceHistory";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatBRL } from "@/lib/format";

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export default function MecanicosHistorico() {
  const { data: groups = [], isLoading } = useBikeServiceHistory();
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);
  const selected = selectedFrame ? (groups.find(g => g.frame_number === selectedFrame) ?? null) : null;
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const lowerQ = searchQuery.toLowerCase();
    const numericQ = lowerQ.replace(/\D/g, '');
    
    return groups.filter(g => {
      if (g.frame_number?.toLowerCase().includes(lowerQ)) return true;
      if (g.bike_name?.toLowerCase().includes(lowerQ)) return true;
      return g.records.some(r => {
        if (r.customer_name?.toLowerCase().includes(lowerQ)) return true;
        
        if (numericQ) {
          if (r.customer_cpf && r.customer_cpf.replace(/\D/g, '').includes(numericQ)) return true;
          if (r.customer_phone && r.customer_phone.replace(/\D/g, '').includes(numericQ)) return true;
        }
        
        return false;
      });
    });
  }, [groups, searchQuery]);
  
  const cancelHistory = useCancelHistoryRecord();
  const deleteHistory = useDeleteHistoryRecord();

  // Auto-fecha se o grupo foi deletado
  useEffect(() => {
    if (selectedFrame && !selected) setSelectedFrame(null);
  }, [selectedFrame, selected]);

  return (
    <div className="min-h-full bg-background text-foreground pb-24 lg:pb-0">
      <div className="w-full max-w-7xl mx-auto p-4 lg:p-8 space-y-6 lg:space-y-8">
        {/* Header */}
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-primary/30">
              <History className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-black tracking-widest text-primary">HISTÓRICO</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tight italic uppercase text-white">
            Histórico de Mecânicos
          </h1>
          <p className="text-muted-foreground font-medium text-sm">Todos os atendimentos agrupados por quadro</p>
        </header>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, telefone, CPF ou quadro da bike..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-14 pl-12 pr-4 bg-card border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm font-medium"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/70" />
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-20 space-y-3 opacity-30">
            <History className="mx-auto" size={40} />
            <p className="text-xs font-black uppercase tracking-widest">Nenhum histórico encontrado</p>
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {filteredGroups.map((group) => {
              const isCancelled = group.records[0]?.status === 'cancelado';
              return (
                <button
                  key={group.frame_number}
                  onClick={() => setSelectedFrame(group.frame_number)}
                  className={`w-full border rounded-2xl p-4 flex items-center justify-between transition-all text-left group ${
                    isCancelled 
                      ? 'bg-destructive/10 border-destructive/40 hover:border-destructive/60' 
                      : 'bg-card border-border hover:border-border/80'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-3">
                      <p className={`text-sm font-black uppercase truncate ${isCancelled ? 'text-destructive' : 'text-white'}`}>
                        {group.bike_name}
                      </p>
                      {isCancelled && (
                        <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-destructive/20 text-destructive border border-destructive/30">
                          Cancelada
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                       Quadro: <span className={isCancelled ? 'text-destructive/60' : 'text-primary/60'}>{group.frame_number}</span> 
                       <span className="opacity-20">•</span> 
                       {group.records.length} atendimento(s)
                    </p>
                  </div>
                  <div className={`p-2 rounded-xl transition-all ${isCancelled ? 'bg-destructive/20 text-destructive' : 'bg-secondary text-muted-foreground group-hover:text-primary group-hover:bg-primary/10'}`}>
                    <ChevronRight size={16} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelectedFrame(null); }}>
        <SheetContent className="bg-secondary border-border w-full sm:max-w-lg overflow-y-auto max-h-[90vh] p-0 gap-0">
          <div className="p-6 border-b border-border/50">
            <SheetHeader>
              <div className="flex items-center justify-between gap-4">
                <SheetTitle className="text-xl font-black text-white italic uppercase truncate flex-1">
                  {selected?.bike_name}
                </SheetTitle>
                <div className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[8px] font-black uppercase tracking-widest">
                  Atendimentos
                </div>
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-2 ml-0.5">
                Nº Quadro: <span className="text-white">{selected?.frame_number}</span>
              </p>
            </SheetHeader>
          </div>

          <div className="p-6 space-y-6">
            {selected?.records.map((record, i) => (
              <div key={record.id} className="bg-background/40 border border-border/40 rounded-3xl p-6 space-y-5 relative overflow-hidden group hover:border-border/60 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest block">
                      Atendimento #{selected.records.length - i}
                    </span>
                    <div className="flex gap-2 flex-wrap">
                      {record.status === 'cancelado' && (
                        <span className="px-2 py-0.5 rounded-full bg-destructive/20 text-destructive border border-destructive/30 text-[8px] font-black uppercase tracking-wider">Cancelado</span>
                      )}
                      {record.sem_custo && (
                        <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/50 text-[8px] font-black uppercase tracking-wider">Sem custo</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-background/80 px-3 py-1.5 rounded-xl border border-border/50 flex items-center gap-2">
                    <Calendar size={10} className="text-primary/60" />
                    <span className="text-[10px] font-bold text-muted-foreground tracking-tight">
                      {formatDate(record.completed_at || record.created_at)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Cliente</p>
                    <p className="text-xs font-bold text-white truncate">{record.customer_name || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">WhatsApp</p>
                    <p className="text-xs font-bold text-white truncate">{record.customer_phone || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">CPF / CNPJ</p>
                    <p className="text-xs font-bold text-white truncate">{record.customer_cpf || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Bike</p>
                    <p className="text-xs font-bold text-white truncate">{record.bike_name}</p>
                  </div>
                </div>

                <div className="p-4 bg-background/60 rounded-2xl border border-border/50">
                  <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-2 opacity-50">Problema / Observações</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{record.problem}</p>
                </div>

                <div className="pt-4 border-t border-border/50 flex items-center justify-between gap-3 min-h-[40px]">
                   {record.status === 'cancelado' ? (
                     <div className="flex items-center gap-2 text-destructive bg-destructive/5 px-3 py-1.5 rounded-lg border border-destructive/20">
                       <X size={12} className="opacity-60" />
                       <span className="text-[10px] font-black uppercase tracking-widest">Sem mecânico responsável</span>
                     </div>
                   ) : (
                     <div className="flex items-center gap-2 text-muted-foreground">
                       <Wrench size={12} className="opacity-60" />
                       <span className="text-[10px] font-black uppercase tracking-widest">{record.mechanic_name || '—'}</span>
                     </div>
                   )}

                    {/* Add record.price if available in the future. Condition: !record.status === 'cancelado' */}
                    {record.status !== 'cancelado' && (record as any).price && (
                       <div className="text-right">
                         <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Total</p>
                         <p className="text-sm font-black text-white">{formatBRL((record as any).price)}</p>
                       </div>
                    )}
                 </div>

                 <div className="flex items-center gap-3 pt-4 border-t border-border/20">
                    {record.status !== 'cancelado' && (
                      <button
                        onClick={() => setCancelId(record.id)}
                        className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 hover:text-zinc-400 transition-colors"
                      >
                        <Ban size={12} /> Cancelar
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteId(record.id)}
                      className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 hover:text-zinc-400 transition-colors ml-auto"
                    >
                      <Trash2 size={12} /> Excluir
                    </button>
                 </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDeleteDialog
        open={!!cancelId}
        onOpenChange={(o) => !o && setCancelId(null)}
        onConfirm={() => {
          if (cancelId) {
            const idToCancel = cancelId;
            setCancelId(null); // limpa ANTES
            cancelHistory.mutate(idToCancel, {
              onSuccess: () => {
                toast.success("Atendimento cancelado");
              },
              onError: () => {
                toast.error("Erro ao cancelar atendimento");
                setCancelId(idToCancel); // restaura só se der erro
              }
            });
          }
        }}
        title="Cancelar atendimento"
        description="O atendimento será marcado como cancelado. Se houver uma venda vinculada, ela também será cancelada."
      />

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            const idToDelete = deleteId;
            setDeleteId(null); // limpa ANTES para evitar reabrir
            deleteHistory.mutate(idToDelete, {
              onSuccess: () => {
                toast.success("Atendimento excluído");
                if (selected?.records.length === 1) {
                  setSelectedFrame(null);
                }
              },
              onError: () => {
                toast.error("Erro ao excluir atendimento");
                setDeleteId(idToDelete); // restaura só se der erro
              }
            });
          }
        }}
        title="Excluir atendimento"
        description="Esta ação removerá permanentemente o histórico deste atendimento. Esta ação NÃO pode ser desfeita."
      />
    </div>
  );
}
