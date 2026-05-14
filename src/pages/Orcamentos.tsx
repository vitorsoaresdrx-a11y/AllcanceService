import { useState, useMemo } from "react";
import { CustomerAutocomplete } from "@/components/CustomerAutocomplete";
import type { Customer } from "@/hooks/useCustomers";
import { maskPhone, maskCpfCnpj } from "@/lib/masks";
import {
  FileText,
  Plus,
  Search,
  Trash2,
  User,
  Phone,
  CreditCard,
  Loader2,
  Package,
  X,
  Check,
  Minus,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { useQuotes, useCreateQuote, useDeleteQuote, type Quote } from "@/hooks/useQuotes";
import { useParts, type Part } from "@/hooks/useParts";
import { useCreateMechanicJob } from "@/hooks/useMechanicJobs";
import { useCreateServiceOrder } from "@/hooks/useServiceOrders";
import { useSendMessage } from "@/hooks/useWhatsApp";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

interface QuoteLineItem {
  part_id: string | null;
  part_name: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
}

const InputGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">{label}</label>
    {children}
  </div>
);

const PremiumInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className="w-full h-14 bg-card border border-border rounded-2xl px-5 text-sm font-semibold text-foreground outline-none focus:border-primary focus:shadow-[0_0_0_1px_rgba(161,161,170,0.1)] transition-all placeholder:text-muted-foreground/70"
    {...props}
  />
);

const PremiumTextarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className="w-full bg-card border border-border rounded-[20px] p-5 text-sm text-foreground outline-none focus:border-primary transition-all resize-none placeholder:text-muted-foreground/70 leading-relaxed"
    {...props}
  />
);

function PartSearch({ parts, onAdd }: { parts: Part[]; onAdd: (part: Part) => void }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return parts.slice(0, 20);
    const q = search.toLowerCase();
    return parts.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [parts, search]);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full h-14 bg-card border border-dashed border-border/80 rounded-2xl px-5 text-sm font-semibold text-muted-foreground hover:border-primary hover:text-primary transition-all flex items-center gap-3"
      >
        <Plus size={16} /> Adicionar Peça
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-secondary border-border rounded-2xl md:rounded-[40px] p-0 overflow-hidden max-w-lg shadow-2xl w-[90vw] max-h-[80vh] flex flex-col">
          <div className="p-4 lg:p-6 space-y-4 flex flex-col min-h-0 flex-1">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-white italic uppercase tracking-tight">Buscar Peça</DialogTitle>
            </DialogHeader>
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
              <input
                className="w-full h-12 bg-card border border-border rounded-2xl pl-11 pr-4 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-muted-foreground/70"
                placeholder="Buscar por nome, SKU ou categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {filtered.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Nenhuma peça encontrada</p>
              ) : (
                filtered.map((part) => (
                  <button
                    key={part.id}
                    onClick={() => { onAdd(part); setOpen(false); setSearch(""); }}
                    className="w-full bg-card border border-border rounded-2xl p-4 text-left hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center shrink-0">
                      <Package size={16} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{part.name}</p>
                      <div className="flex gap-3 text-[10px] text-muted-foreground font-bold uppercase">
                        {part.sku && <span>{part.sku}</span>}
                        <span>Estoque: {part.stock_qty}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-white">{formatBRL(Number(part.sale_price || part.pix_price || 0))}</p>
                      <p className="text-[10px] text-muted-foreground">Custo: {formatBRL(Number(part.unit_cost || 0))}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuoteCard({ quote, onDelete }: { quote: Quote; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  const statusColors: Record<string, string> = {
    pending: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    sent: "bg-primary/10 text-primary border-primary/20",
    approved: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };

  const statusLabels: Record<string, string> = {
    pending: "Pendente",
    sent: "Enviado",
    approved: "Aprovado",
  };

  const partsTotal = (quote.items || []).reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  return (
    <div className="bg-card border border-border rounded-2xl lg:rounded-[32px] p-4 lg:p-6 space-y-4 hover:border-border/80 transition-all overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="space-y-1 min-w-0">
          {quote.customer_name && (
            <div className="flex items-center gap-2">
              <User size={14} className="text-primary shrink-0" />
              <span className="text-sm font-black tracking-tight text-white uppercase italic truncate">{quote.customer_name}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {quote.customer_whatsapp && <span className="flex items-center gap-1"><Phone size={10} /> {quote.customer_whatsapp}</span>}
            {quote.customer_cpf && <span className="flex items-center gap-1"><CreditCard size={10} /> {quote.customer_cpf}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${statusColors[quote.status] || statusColors.pending}`}>
            {statusLabels[quote.status] || quote.status}
          </span>
          <button className="p-2 text-muted-foreground/50 hover:text-zinc-500 transition-colors" onClick={() => onDelete(quote.id)}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {quote.notes && (
        <div className="p-3 bg-background rounded-xl border border-border/50">
          <p className="text-xs text-muted-foreground">{quote.notes}</p>
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-background rounded-xl border border-border/50 hover:border-border/80 transition-all"
      >
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
          {(quote.items || []).length} {(quote.items || []).length === 1 ? "item" : "itens"}
        </span>
        <ChevronRight size={14} className={`text-muted-foreground/70 transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>

      {expanded && (quote.items || []).length > 0 && (
        <div className="space-y-2">
          {quote.items!.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-background rounded-xl border border-border/50">
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground/80 truncate">{item.part_name}</p>
                <p className="text-[10px] text-muted-foreground/70">
                  {item.quantity}x • Custo: {formatBRL(item.unit_cost)} • Venda: {formatBRL(item.unit_price)}
                </p>
              </div>
              <span className="text-xs font-black text-white shrink-0 ml-2">{formatBRL(item.unit_price * item.quantity)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div className="space-y-1">
          <div className="flex gap-4 text-[10px] text-muted-foreground font-bold">
            <span>Peças: {formatBRL(partsTotal)}</span>
            <span>Mão de obra: {formatBRL(Number(quote.labor_cost))}</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[8px] font-black text-muted-foreground/70 uppercase tracking-widest">Total</span>
          <span className="text-lg font-black text-white tracking-tighter">{formatBRL(Number(quote.total))}</span>
        </div>
      </div>
    </div>
  );
}

export default function Orcamentos() {
  const { data: quotes = [], isLoading } = useQuotes();
  const { data: parts = [] } = useParts();
  const createQuote = useCreateQuote();
  const deleteQuote = useDeleteQuote();
  const createMechanicJob = useCreateMechanicJob();
  const createServiceOrder = useCreateServiceOrder();
  const sendMessage = useSendMessage();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    customer_cpf: "",
    customer_whatsapp: "",
    customer_id: null as string | null,
    notes: "",
  });
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([]);
  const [laborCost, setLaborCost] = useState(0);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const partsTotal = lineItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const grandTotal = partsTotal + laborCost;

  const handleAddPart = (part: Part) => {
    const existing = lineItems.findIndex((li) => li.part_id === part.id);
    if (existing >= 0) {
      setLineItems((prev) => prev.map((li, i) => (i === existing ? { ...li, quantity: li.quantity + 1 } : li)));
      return;
    }
    setLineItems((prev) => [...prev, {
      part_id: part.id,
      part_name: part.name,
      quantity: 1,
      unit_cost: Number(part.unit_cost || 0),
      unit_price: Number(part.sale_price || part.pix_price || 0),
    }]);
  };

  const handleRemoveItem = (index: number) => setLineItems((prev) => prev.filter((_, i) => i !== index));

  const handleChangeQty = (index: number, delta: number) => {
    setLineItems((prev) => prev.map((li, i) => i !== index ? li : { ...li, quantity: Math.max(1, li.quantity + delta) }));
  };

  const resetForm = () => {
    setForm({ customer_name: "", customer_cpf: "", customer_whatsapp: "", customer_id: null, notes: "" });
    setLineItems([]);
    setLaborCost(0);
  };

  const handleSave = () => {
    if (lineItems.length === 0 && laborCost === 0) {
      toast.error("Adicione pelo menos uma peça ou mão de obra");
      return;
    }

    if (!form.customer_name || !form.customer_whatsapp) {
      toast.error("Nome e WhatsApp são obrigatórios!");
      return;
    }

    const problemDescription = lineItems.length > 0
      ? `Orçamento: ${lineItems.map((li) => `${li.quantity}x ${li.part_name}`).join(", ")}${laborCost > 0 ? ` + Mão de obra ${formatBRL(laborCost)}` : ""}`
      : `Mão de obra: ${formatBRL(laborCost)}`;

    createQuote.mutate(
      {
        customer_name: form.customer_name || undefined,
        customer_cpf: form.customer_cpf || undefined,
        customer_whatsapp: form.customer_whatsapp || undefined,
        customer_id: form.customer_id || undefined,
        notes: form.notes || undefined,
        labor_cost: laborCost,
        total: grandTotal,
        items: lineItems,
      },
      {
        onSuccess: () => {
          const orderData = {
            customer_name: form.customer_name || undefined,
            customer_cpf: form.customer_cpf || undefined,
            customer_whatsapp: form.customer_whatsapp || undefined,
            customer_id: form.customer_id || undefined,
            problem: problemDescription,
            price: grandTotal,
          };
          createMechanicJob.mutate(orderData, {
            onSuccess: (newJob) => {
              createServiceOrder.mutate({ 
                ...orderData, 
                id: newJob.id,
                bike_name: form.customer_name || undefined 
              });
            },
          });

          if (form.customer_whatsapp) {
            const phone = form.customer_whatsapp.replace(/\D/g, "");
            const formattedPhone = (phone.length >= 10 && phone.length <= 11 && !phone.startsWith("55")) ? `55${phone}` : phone;
            sendMessage.mutate({
              phone: formattedPhone,
              message: `Olá, ${form.customer_name || "cliente"}! Seu orçamento já está na oficina. Quando um mecânico começar o serviço, te avisaremos!`
            });
          }

          toast.success("Orçamento criado e enviado para mecânica!");
          resetForm();
          setOpen(false);
        },
        onError: () => toast.error("Erro ao criar orçamento"),
      }
    );
  };

  const confirmDelete = () => {
    if (!deleteTargetId) return;
    deleteQuote.mutate(deleteTargetId, {
      onSuccess: () => toast.success("Orçamento excluído"),
      onError: () => toast.error("Erro ao excluir"),
    });
    setDeleteTargetId(null);
  };

  return (
    <div className="min-h-full bg-background text-foreground pb-24 lg:pb-0">
      <div className="w-full max-w-7xl mx-auto p-4 lg:p-8 space-y-6 lg:space-y-8">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-primary/30">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-black tracking-widest text-primary">ORÇAMENTOS</span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl lg:text-4xl font-black tracking-tight italic uppercase text-white">Orçamentos</h1>
              <p className="text-muted-foreground font-medium text-sm">Crie e gerencie orçamentos com peças do estoque</p>
            </div>
            <Button
              onClick={() => { resetForm(); setOpen(true); }}
              className="h-12 px-6 bg-primary hover:bg-primary/80 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-primary/30 transition-all active:scale-95"
            >
              <Plus size={16} className="mr-2" /> Novo Orçamento
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-card border border-border p-3 rounded-2xl">
            <p className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest">Total</p>
            <p className="text-xl font-black text-white">{quotes.length}</p>
          </div>
          <div className="bg-card border border-zinc-400/20 p-3 rounded-2xl">
            <p className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest">Pendentes</p>
            <p className="text-xl font-black text-zinc-400">{quotes.filter((q) => q.status === "pending").length}</p>
          </div>
          <div className="bg-card border border-zinc-400/20 p-3 rounded-2xl">
            <p className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest">Valor Total</p>
            <p className="text-xl font-black text-zinc-400">{formatBRL(quotes.reduce((sum, q) => sum + Number(q.total), 0))}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground/70" /></div>
        ) : quotes.length === 0 ? (
          <div className="text-center py-20 space-y-3 opacity-30">
            <FileText size={48} className="mx-auto" />
            <p className="text-sm font-black uppercase tracking-widest">Nenhum orçamento</p>
            <p className="text-xs text-muted-foreground">Crie um orçamento para começar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
            {quotes.map((quote) => <QuoteCard key={quote.id} quote={quote} onDelete={setDeleteTargetId} />)}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-secondary border-border rounded-2xl md:rounded-[40px] p-0 overflow-hidden max-w-2xl shadow-2xl w-[90vw] max-h-[90vh] flex flex-col">
          <div className="p-4 lg:p-8 space-y-6 overflow-y-auto flex-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted/80 [&::-webkit-scrollbar-thumb]:rounded-full">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-white italic uppercase tracking-tight">Novo Orçamento</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <CustomerAutocomplete
                customerName={form.customer_name}
                customerWhatsapp={form.customer_whatsapp}
                customerCpf={form.customer_cpf}
                onSelect={(c: Customer) => setForm({ ...form, customer_name: c.name, customer_whatsapp: c.whatsapp || "", customer_cpf: c.cpf || "", customer_id: c.id })}
                onChange={(field, value) => {
                  const key = field === "name" ? "customer_name" : field === "whatsapp" ? "customer_whatsapp" : "customer_cpf";
                  setForm({ ...form, [key]: value });
                }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputGroup label="Nome do Cliente *">
                  <PremiumInput placeholder="Nome completo *" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
                </InputGroup>
                <InputGroup label="WhatsApp *">
                  <PremiumInput placeholder="(00) 00000-0000 *" value={form.customer_whatsapp} onChange={(e) => setForm({ ...form, customer_whatsapp: maskPhone(e.target.value) })} />
                </InputGroup>
                <InputGroup label="CPF / CNPJ (Opcional)">
                  <PremiumInput placeholder="000.000.000-00 (Opcional)" value={form.customer_cpf} onChange={(e) => setForm({ ...form, customer_cpf: maskCpfCnpj(e.target.value) })} />
                </InputGroup>
                <InputGroup label="Observações (Opcional)">
                  <PremiumInput placeholder="Detalhes adicionais (Opcional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </InputGroup>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-primary" />
                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Peças do Orçamento</h3>
              </div>
              {lineItems.length > 0 && (
                <div className="space-y-2">
                  {lineItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{item.part_name}</p>
                        <div className="flex gap-3 text-[10px] text-muted-foreground font-bold">
                          <span>Custo: {formatBRL(item.unit_cost)}</span>
                          <span>Venda: {formatBRL(item.unit_price)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handleChangeQty(index, -1)} className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-muted-foreground hover:text-white transition-colors"><Minus size={14} /></button>
                        <span className="text-sm font-black text-white w-8 text-center">{item.quantity}</span>
                        <button onClick={() => handleChangeQty(index, 1)} className="w-8 h-8 rounded-lg bg-background flex items-center justify-center text-muted-foreground hover:text-white transition-colors"><Plus size={14} /></button>
                      </div>
                      <span className="text-sm font-black text-white shrink-0 w-24 text-right">{formatBRL(item.unit_price * item.quantity)}</span>
                      <button onClick={() => handleRemoveItem(index)} className="p-2 text-muted-foreground/70 hover:text-zinc-500 transition-colors shrink-0"><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
              <PartSearch parts={parts} onAdd={handleAddPart} />
            </div>

            <InputGroup label="Mão de Obra">
              <CurrencyInput value={laborCost} onChange={setLaborCost} placeholder="0,00" />
            </InputGroup>

            <div className="p-5 bg-background rounded-2xl border border-border/50 space-y-3">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Peças ({lineItems.length} itens)</span>
                <span className="font-bold">{formatBRL(partsTotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Mão de Obra</span>
                <span className="font-bold">{formatBRL(laborCost)}</span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Total do Orçamento</span>
                <span className="text-xl font-black text-white">{formatBRL(grandTotal)}</span>
              </div>
            </div>
          </div>

          <div className="p-4 lg:p-6 border-t border-border flex gap-3">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 h-14 rounded-2xl border-border/80 text-muted-foreground hover:bg-muted font-black text-xs uppercase tracking-widest">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={createQuote.isPending} className="flex-1 h-14 rounded-2xl bg-primary hover:bg-primary/80 text-white font-black text-xs uppercase tracking-widest shadow-primary/30 transition-all active:scale-[0.98] disabled:opacity-50">
              {createQuote.isPending ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} className="mr-2" /> Criar Orçamento</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        onConfirm={confirmDelete}
        title="Excluir orçamento"
        description="Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita."
      />
    </div>
  );
}
