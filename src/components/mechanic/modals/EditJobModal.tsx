import { useState } from "react";
import { 
  X, 
  Pencil, 
  Bike, 
  User, 
  FileText, 
  Activity, 
  FileCheck, 
  Wrench, 
  Settings, 
  Eye, 
  CheckCircle2, 
  DollarSign, 
  Tag, 
  Receipt, 
  Plus, 
  Layers, 
  Camera, 
  PlusCircle, 
  Trash2, 
  Loader2 
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  MechanicJob, 
  MechanicJobAddition, 
  AdditionPart, 
  useDeleteAddition, 
  useUpdateAddition, 
  useUpdateAdditionApproval 
} from "@/hooks/useMechanicJobs";
import { formatBRL } from "@/lib/format";
import { maskPhone, maskCpfCnpj } from "@/lib/masks";
import { getTotalPrice, getAdditionTotal } from "@/utils/mechanicUtils";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { 
  PremiumInput, 
  PremiumTextarea, 
  InputGroup, 
  CurrencyInput 
} from "../CommonComponents";
import { OSPhotosSection } from "../MechanicCardComponents";

interface EditJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editJob: MechanicJob | null;
  editForm: any;
  setEditForm: (val: any) => void;
  onSave: () => void;
  isSaving: boolean;
  onRegisterPayment: (job: MechanicJob) => void;
  onShowReceipt: (job: MechanicJob, history: any) => void;
}

const SectionTitle = ({ icon: Icon, title, step }: { icon: any, title: string, step: number }) => (
  <div className="flex items-center gap-3 mb-4 mt-6 first:mt-0">
    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
      <Icon size={16} />
    </div>
    <div>
      <h3 className="text-sm font-black text-foreground uppercase tracking-tight">{title}</h3>
      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest leading-none">Seção {step}</p>
    </div>
  </div>
);

export function EditJobModal({ 
  open, 
  onOpenChange, 
  editJob, 
  editForm, 
  setEditForm, 
  onSave, 
  isSaving, 
  onRegisterPayment, 
  onShowReceipt 
}: EditJobModalProps) {
  const deleteAddition = useDeleteAddition();
  const updateAddition = useUpdateAddition();
  const updateApproval = useUpdateAdditionApproval();

  const [editingAddition, setEditingAddition] = useState<string | null>(null);
  const [additionEdits, setAdditionEdits] = useState<Record<string, { problem: string; labor_cost: number; parts: AdditionPart[] }>>({});
  const [deleteAdditionDialog, setDeleteAdditionDialog] = useState<{ open: boolean; id: string; name: string; is_v2?: boolean }>({ open: false, id: "", name: "" });

  const startEditAddition = (a: MechanicJobAddition) => {
    setAdditionEdits((prev) => ({ 
      ...prev, 
      [a.id]: { 
        problem: a.problem, 
        labor_cost: a.labor_cost, 
        parts: (a as any).parts_used || [] 
      } 
    }));
    setEditingAddition(a.id);
  };

  const saveAddition = (a: MechanicJobAddition) => {
    const edits = additionEdits[a.id];
    if (!edits) return;
    const partsTotal = edits.parts.reduce((s, p) => s + (p.quantity * p.unit_price), 0);
    updateAddition.mutate({ 
      id: a.id, 
      problem: edits.problem, 
      price: edits.labor_cost + partsTotal, 
      labor_cost: edits.labor_cost, 
      parts_used: edits.parts, 
      is_v2: (a as any).is_v2 
    }, {
      onSuccess: () => { 
        toast.success("Reparo atualizado"); 
        setEditingAddition(null); 
      },
      onError: () => toast.error("Erro ao atualizar reparo"),
    });
  };

  const confirmDeleteAddition = () => {
    deleteAddition.mutate({ id: deleteAdditionDialog.id, is_v2: deleteAdditionDialog.is_v2 }, {
      onSuccess: () => { 
        toast.success("Reparo excluído"); 
        setDeleteAdditionDialog({ open: false, id: "", name: "" }); 
      },
      onError: () => toast.error("Erro ao excluir reparo"),
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 bg-background border-none shadow-2xl">
          <div className="bg-primary/5 p-6 border-b border-primary/10 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Pencil className="w-5 h-5 text-primary" />
                Editar Ordem de Serviço
              </DialogTitle>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Atualização de Atendimento</p>
            </div>
            <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all">
              <X size={16} />
            </button>
          </div>

          {editJob && (
            <div className="p-6 md:p-8 space-y-8 custom-scrollbar">
              <section>
                <SectionTitle icon={Bike} title="Identificação" step={1} />
                <InputGroup label="Bike / Marca / Modelo">
                  <PremiumInput 
                    value={editForm.bike_name} 
                    onChange={(e) => setEditForm({ ...editForm, bike_name: e.target.value })} 
                    placeholder="Ex: Specialized Epic"
                  />
                </InputGroup>
              </section>

              <hr className="border-border/40" />

              <section>
                <SectionTitle icon={User} title="Dados do Cliente" step={2} />
                <div className="space-y-4">
                  <InputGroup label="Nome Completo">
                    <PremiumInput 
                      value={editForm.customer_name} 
                      onChange={(e) => setEditForm({ ...editForm, customer_name: e.target.value })} 
                    />
                  </InputGroup>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputGroup label="WhatsApp">
                      <PremiumInput 
                        value={editForm.customer_whatsapp} 
                        onChange={(e) => setEditForm({ ...editForm, customer_whatsapp: maskPhone(e.target.value) })} 
                      />
                    </InputGroup>
                    <InputGroup label="CPF">
                      <PremiumInput 
                        value={editForm.customer_cpf} 
                        onChange={(e) => setEditForm({ ...editForm, customer_cpf: maskCpfCnpj(e.target.value) })} 
                      />
                    </InputGroup>
                  </div>
                </div>
              </section>

              <hr className="border-border/40" />

              <section>
                <SectionTitle icon={FileText} title="Serviço" step={3} />
                <InputGroup label="O que fazer?">
                  <PremiumTextarea 
                    rows={4} 
                    value={editForm.problem} 
                    onChange={(e) => setEditForm({ ...editForm, problem: e.target.value })} 
                    placeholder="Descrição do serviço..."
                  />
                </InputGroup>
              </section>

              <hr className="border-border/40" />

              <section>
                <SectionTitle icon={Activity} title="Status do Fluxo" step={4} />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { key: "in_approval", label: "Aprovação", icon: FileCheck },
                    { key: "in_repair", label: "Na Mecânica", icon: Wrench },
                    { key: "in_maintenance", label: "Manutenção", icon: Settings },
                    { key: "in_analysis", label: "Análise", icon: Eye },
                    { key: "ready", label: "Pronto", icon: CheckCircle2 },
                  ].map((col) => (
                    <button
                      key={col.key}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, status: col.key })}
                      className={`h-12 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                        editForm.status === col.key
                          ? "border-primary bg-primary/10 text-primary shadow-sm ring-2 ring-primary/20"
                          : "border-border bg-card text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <col.icon size={14} />
                      {col.label}
                    </button>
                  ))}
                </div>
              </section>

              <hr className="border-border/40" />

              <section>
                <SectionTitle icon={DollarSign} title="Financeiro" step={5} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end bg-primary/5 p-6 rounded-[2rem] border border-primary/10">
                  <div className="flex items-center justify-between p-4 bg-background rounded-2xl border border-border">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary leading-none">Sem Custo</p>
                      <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest mt-1 opacity-60">Garantia / Cortesia</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, sem_custo: !editForm.sem_custo })}
                      className={`w-12 h-6 rounded-full relative transition-all duration-300 ${editForm.sem_custo ? "bg-zinc-500 shadow-lg shadow-emerald-500/20" : "bg-muted-foreground/30"}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${editForm.sem_custo ? "left-7" : "left-1"}`} />
                    </button>
                  </div>

                  {!editForm.sem_custo && (
                    <InputGroup label="Mão de Obra">
                      <div className="relative group">
                        <CurrencyInput 
                          value={editForm.price} 
                          onChange={(val) => setEditForm({ ...editForm, price: val })} 
                          className="h-14 font-black text-lg bg-background"
                        />
                        <Tag className="absolute right-4 top-4 text-primary/30 group-focus-within:text-primary transition-colors" size={20} />
                      </div>
                    </InputGroup>
                  )}
                </div>
              </section>

              <hr className="border-border/40" />

              {!editForm.sem_custo && (
                <section>
                  <SectionTitle icon={Receipt} title="Pagamentos" step={6} />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Histórico</p>
                      <button 
                        onClick={() => onRegisterPayment(editJob)} 
                        className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-primary/20"
                      >
                        <Plus size={14} /> Novo Pagamento
                      </button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                      {(editJob?.payment_history || []).length > 0 ? (
                        editJob.payment_history.map((h: any) => (
                          <div key={h.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/40 hover:border-primary/20 transition-all group">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center border border-border/40 group-hover:border-primary/20 transition-all">
                                <span className="text-[10px] font-black text-primary uppercase">
                                  {h.payment_method?.slice(0, 3).toUpperCase() || "PX"}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-black text-white leading-none mb-1">{h.tipo === "desconto" ? formatBRL(h.desconto_valor) : formatBRL(h.valor)}</p>
                                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">{new Date(h.criado_em).toLocaleDateString()} · {h.tipo === "desconto" ? "Desconto" : "Recebido"}</p>
                              </div>
                            </div>
                            <button onClick={() => onShowReceipt(editJob!, h)} className="w-10 h-10 rounded-xl bg-background border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/40 transition-all flex items-center justify-center">
                              <FileText size={16} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="py-12 text-center bg-muted/5 border border-dashed border-border/40 rounded-3xl opacity-40">
                          <Layers size={32} className="mx-auto mb-3" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Nenhum pagamento registrado</p>
                        </div>
                      )}
                    </div>
                    <div className="p-5 bg-card border border-border rounded-2xl flex justify-between items-center shadow-inner">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Restante</span>
                      <span className={`text-xl font-black ${getTotalPrice(editJob) - ((Array.isArray(editJob?.payment_history) ? editJob.payment_history : []).reduce((s, h) => s + (Number(h?.valor) || 0) + (Number(h?.desconto_valor) || 0), 0)) <= 0 ? "text-zinc-500" : "text-zinc-500 animate-pulse"}`}>
                        {formatBRL(Math.max(0, getTotalPrice(editJob) - ((Array.isArray(editJob?.payment_history) ? editJob.payment_history : []).reduce((s, h) => s + (Number(h?.valor) || 0) + (Number(h?.desconto_valor) || 0), 0))))}
                      </span>
                    </div>
                  </div>
                </section>
              )}

              <section>
                <SectionTitle icon={Camera} title="Documentação Fotográfica" step={7} />
                <OSPhotosSection osId={editJob?.id || ""} />
              </section>

              <hr className="border-border/40" />

              <section>
                <SectionTitle icon={PlusCircle} title="Reparos Extras" step={8} />
                <div className="space-y-4">
                  {(!Array.isArray(editJob?.additions) || editJob.additions.length === 0) ? (
                    <div className="py-12 text-center bg-muted/5 border border-dashed border-border/40 rounded-3xl opacity-40">
                      <Wrench size={32} className="mx-auto mb-3" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Sem reparos extras</p>
                    </div>
                  ) : (
                    editJob.additions.map((a: any) => {
                      const isEditing = editingAddition === a.id;
                      const edits = additionEdits[a.id];
                      return (
                        <div key={a.id} className="bg-muted/10 border border-border/40 rounded-2xl p-5 space-y-4 hover:border-primary/20 transition-all group">
                          {isEditing ? (
                            <div className="space-y-4 bg-background p-4 rounded-xl border border-primary/20 shadow-xl">
                              <InputGroup label="Problema">
                                <PremiumInput 
                                  value={edits.problem} 
                                  onChange={(e) => setAdditionEdits(p => ({ ...p, [a.id]: { ...edits, problem: e.target.value } }))} 
                                />
                              </InputGroup>
                              <div className="flex gap-3">
                                <div className="flex-1">
                                  <CurrencyInput 
                                    value={edits.labor_cost} 
                                    onChange={(val) => setAdditionEdits(p => ({ ...p, [a.id]: { ...edits, labor_cost: val } }))} 
                                  />
                                </div>
                                <button onClick={() => saveAddition(a)} className="h-12 px-6 bg-zinc-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-600 transition-all">Salvar</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-black text-foreground uppercase tracking-tight mb-2">{a.problem}</p>
                                  <div className="flex items-center gap-3">
                                    <div className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
                                      {formatBRL(getAdditionTotal(a))}
                                    </div>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                                      {a.approval === "accepted" ? "Aprovado" : a.approval === "refused" ? "Negado" : "Pendente"}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button onClick={() => startEditAddition(a)} className="w-9 h-9 rounded-xl bg-background border border-border/40 text-muted-foreground hover:text-primary flex items-center justify-center"><Pencil size={14} /></button>
                                  <button onClick={() => setDeleteAdditionDialog({ open: true, id: a.id, name: a.problem, is_v2: (a as any).is_v2 })} className="w-9 h-9 rounded-xl bg-background border border-border/40 text-muted-foreground hover:text-destructive flex items-center justify-center"><Trash2 size={14} /></button>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {["none", "pending", "accepted", "refused"].map((status) => (
                                  <button
                                    key={status}
                                    onClick={() => updateApproval.mutate({ id: a.id, approval: status as any, is_v2: (a as any).is_v2 })}
                                    className={`flex-1 h-9 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                                      (a.approval === status || (status === "none" && !a.approval))
                                        ? status === "accepted" ? "border-zinc-500 bg-zinc-500/10 text-zinc-600" 
                                          : status === "refused" ? "border-destructive bg-destructive/10 text-destructive"
                                          : "border-primary bg-primary/10 text-primary"
                                        : "border-border/60 bg-background text-muted-foreground hover:bg-muted"
                                    }`}
                                  >
                                    {status === "none" ? "—" : status === "pending" ? "Pendente" : status === "accepted" ? "Sim" : "Não"}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </div>
          )}

          <div className="p-6 md:p-8 bg-background border-t border-border flex gap-4 sticky bottom-0 z-10 backdrop-blur-md">
            <button onClick={() => onOpenChange(false)} className="flex-1 h-14 rounded-2xl border border-border text-muted-foreground hover:bg-muted font-bold transition-all text-sm uppercase tracking-widest">Cancelar</button>
            <button 
              onClick={onSave} 
              disabled={isSaving} 
              className="flex-[2] h-14 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 shadow-2xl shadow-primary/20"
            >
              {isSaving ? <Loader2 size={20} className="animate-spin" /> : <><FileCheck size={20} /> Salvar Alterações</>}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmDeleteDialog 
        open={deleteAdditionDialog.open} 
        onOpenChange={(o) => setDeleteAdditionDialog((prev) => ({ ...prev, open: o }))} 
        onConfirm={confirmDeleteAddition} 
        title="Excluir Reparo Adicional" 
        description={`Deseja excluir o reparo "${deleteAdditionDialog.name}"?`} 
      />
    </>
  );
}
