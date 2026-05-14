import { useState, useMemo, useCallback } from "react";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Receipt,
  Repeat,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Wallet,
  TrendingUp,
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import {
  useFixedExpenses,
  useCreateFixedExpense,
  useUpdateFixedExpense,
  useDeleteFixedExpense,
  useVariableExpenses,
  useCreateVariableExpense,
  useDeleteVariableExpense,
} from "@/hooks/useExpenses";

// ─── Design System ────────────────────────────────────────────────────────────

const Btn = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
}) => {
  const v = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/80 shadow-primary/20",
    secondary: "bg-secondary text-foreground hover:bg-secondary/80 border border-border",
    ghost: "hover:bg-muted/50 text-muted-foreground hover:text-white",
    destructive: "bg-zinc-500/10 text-zinc-500 hover:bg-zinc-500/20",
  };
  const s = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 py-2 text-sm",
    lg: "h-12 px-8 rounded-2xl text-base font-bold",
    icon: "h-9 w-9 flex items-center justify-center",
  };
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 ${v[variant]} ${s[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={`flex h-12 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all ${className}`}
    {...props}
  />
);

const Label = ({ children, className = "", ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    className={`text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-1.5 block ${className}`}
    {...props}
  >
    {children}
  </label>
);

const Badge = ({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "active" }) => {
  const s =
    variant === "active"
      ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
      : "bg-muted text-muted-foreground border-border/80";
  return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${s}`}>{children}</span>;
};

// ─── Constantes ───────────────────────────────────────────────────────────────

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

import { formatBRL } from "@/lib/format";

const fixedSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(100),
  amount: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  notes: z.string().max(500).optional(),
});

const variableSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(100),
  amount: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  expense_date: z.string().optional(),
  notes: z.string().max(500).optional(),
});

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function Gastos() {
  const { data: fixedExpenses = [], isLoading: fixedLoading } = useFixedExpenses();
  const { data: variableExpenses = [], isLoading: varLoading } = useVariableExpenses();
  const createFixed = useCreateFixedExpense();
  const updateFixed = useUpdateFixedExpense();
  const deleteFixed = useDeleteFixedExpense();
  const createVariable = useCreateVariableExpense();
  const deleteVariable = useDeleteVariableExpense();

  const [tab, setTab] = useState<"fixed" | "variable">("fixed");
  const [fixedModal, setFixedModal] = useState(false);
  const [varModal, setVarModal] = useState(false);

  const now = new Date();
  const [varMonth, setVarMonth] = useState(now.getMonth());
  const [varYear, setVarYear] = useState(now.getFullYear());

  const [fName, setFName] = useState("");
  const [fAmount, setFAmount] = useState(0);
  const [fNotes, setFNotes] = useState("");
  const [vName, setVName] = useState("");
  const [vAmount, setVAmount] = useState(0);
  const [vDate, setVDate] = useState("");
  const [vNotes, setVNotes] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: "fixed" | "variable" } | null>(null);

  const resetFixed = () => { setFName(""); setFAmount(0); setFNotes(""); };
  const resetVar = () => { setVName(""); setVAmount(0); setVDate(""); setVNotes(""); };

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "fixed") {
      deleteFixed.mutate(deleteTarget.id, { onSuccess: () => toast.success("Removido") });
    } else {
      deleteVariable.mutate(deleteTarget.id, { onSuccess: () => toast.success("Removido") });
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteFixed, deleteVariable]);

  const filteredVariable = useMemo(() =>
    variableExpenses.filter((e) => {
      const d = new Date(e.expense_date + "T00:00:00");
      return d.getMonth() === varMonth && d.getFullYear() === varYear;
    }),
    [variableExpenses, varMonth, varYear]
  );

  const varTotal = useMemo(() => filteredVariable.reduce((s, e) => s + Number(e.amount), 0), [filteredVariable]);
  const fixedTotal = useMemo(() => fixedExpenses.filter((e) => e.active).reduce((s, e) => s + Number(e.amount), 0), [fixedExpenses]);

  const handleCreateFixed = () => {
    const result = fixedSchema.safeParse({ name: fName, amount: fAmount, notes: fNotes || undefined });
    if (!result.success) { toast.error(result.error.errors[0].message); return; }
    createFixed.mutate(
      { name: result.data.name, amount: result.data.amount, notes: result.data.notes || null },
      { onSuccess: () => { setFixedModal(false); resetFixed(); toast.success("Gasto fixo adicionado"); } }
    );
  };

  const handleCreateVariable = () => {
    const result = variableSchema.safeParse({ name: vName, amount: vAmount, expense_date: vDate || undefined, notes: vNotes || undefined });
    if (!result.success) { toast.error(result.error.errors[0].message); return; }
    createVariable.mutate(
      { name: result.data.name, amount: result.data.amount, expense_date: result.data.expense_date || undefined, notes: result.data.notes || null },
      { onSuccess: () => { setVarModal(false); resetVar(); toast.success("Gasto variável adicionado"); } }
    );
  };

  const prevMonth = () => {
    if (varMonth === 0) { setVarMonth(11); setVarYear((y) => y - 1); }
    else setVarMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (varMonth === 11) { setVarMonth(0); setVarYear((y) => y + 1); }
    else setVarMonth((m) => m + 1);
  };

  const isLoading = fixedLoading || varLoading;
  const activeList = tab === "fixed" ? fixedExpenses : filteredVariable;

  return (
    <div className="min-h-full bg-background text-foreground font-sans selection:bg-primary/30 pb-24 lg:pb-0">
      <div className="max-w-5xl mx-auto w-full p-4 lg:p-8 space-y-6 lg:space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-primary/30">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-black tracking-widest text-primary">GESTÃO</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">Finanças</h1>
          </div>
          <Btn variant="primary" size="lg" className="w-full sm:w-auto" onClick={() => tab === "fixed" ? setFixedModal(true) : setVarModal(true)}>
            <Plus className="w-5 h-5 mr-2 stroke-[3]" />
            Adicionar Lançamento
          </Btn>
        </header>

        {/* Cards Resumo — mobile: 2 cols compacto, desktop: cards grandes */}
        <div className="grid grid-cols-2 gap-3 md:gap-6">
          <div className="relative group bg-card border border-border rounded-2xl md:rounded-[32px] p-3 md:p-8 hover:border-primary/50 transition-all duration-500 overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity hidden md:block">
              <Repeat size={180} />
            </div>
            <div className="relative z-10 flex flex-col justify-between h-full space-y-3 md:space-y-12">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 md:w-12 md:h-12 bg-white/5 rounded-xl md:rounded-2xl flex items-center justify-center text-primary">
                  <Repeat className="w-4 h-4 md:w-6 md:h-6" />
                </div>
                <span className="hidden md:inline"><Badge>CUSTO FIXO</Badge></span>
              </div>
              <div>
                <p className="text-[9px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Gastos Fixos</p>
                <h2 className="text-lg md:text-2xl lg:text-4xl font-black tracking-tighter">
                  {isLoading ? <span className="text-muted-foreground/50 text-sm md:text-2xl">...</span> : formatBRL(fixedTotal)}
                </h2>
              </div>
            </div>
          </div>

          <div className="relative group bg-card border border-border rounded-2xl md:rounded-[32px] p-3 md:p-8 hover:border-zinc-500/50 transition-all duration-500 overflow-hidden">
            <div className="absolute -right-4 -top-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity hidden md:block">
              <CreditCard size={180} />
            </div>
            <div className="relative z-10 flex flex-col justify-between h-full space-y-3 md:space-y-12">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 md:w-12 md:h-12 bg-white/5 rounded-xl md:rounded-2xl flex items-center justify-center text-zinc-500">
                  <CreditCard className="w-4 h-4 md:w-6 md:h-6" />
                </div>
                <span className="hidden md:inline"><Badge>{MONTHS[varMonth].toUpperCase()}</Badge></span>
              </div>
              <div>
                <p className="text-[9px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Gastos Variáveis</p>
                <h2 className="text-lg md:text-2xl lg:text-4xl font-black tracking-tighter">
                  {isLoading ? <span className="text-muted-foreground/50 text-sm md:text-2xl">...</span> : formatBRL(varTotal)}
                </h2>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex p-1 bg-card border border-border rounded-2xl mx-auto md:mx-0 self-center md:self-start">
            <button
              onClick={() => setTab("fixed")}
              className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === "fixed" ? "bg-secondary text-white shadow-xl" : "text-muted-foreground hover:text-foreground/80"}`}
            >
              Fixo
            </button>
            <button
              onClick={() => setTab("variable")}
              className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === "variable" ? "bg-secondary text-white shadow-xl" : "text-muted-foreground hover:text-foreground/80"}`}
            >
              Variável
            </button>
          </div>

          {tab === "variable" && (
            <div className="flex items-center bg-card border border-border rounded-2xl p-1">
              <Btn variant="ghost" size="icon" onClick={prevMonth}>
                <ChevronLeft className="w-4 h-4 text-foreground" />
              </Btn>
              <span className="text-xs font-black uppercase tracking-widest text-foreground px-6 min-w-[160px] text-center">
                {MONTHS[varMonth]} {varYear}
              </span>
              <Btn variant="ghost" size="icon" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4 text-foreground" />
              </Btn>
            </div>
          )}
        </div>

        {/* Lista */}
        <div className="bg-card border border-border rounded-2xl md:rounded-[32px] overflow-hidden shadow-2xl">
          <div className="p-4 md:p-8 border-b border-border/50 flex items-center justify-between">
            <h3 className="text-sm md:text-lg font-black whitespace-nowrap">Histórico de Lançamentos</h3>
            <span className="flex items-center gap-1 md:gap-2 text-[9px] md:text-[10px] text-muted-foreground shrink-0 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Tempo Real
            </span>
          </div>

          <div className="divide-y divide-border/30">
            {isLoading ? (
              <div className="p-20 text-center text-muted-foreground/70 text-sm">Carregando...</div>
            ) : activeList.length === 0 ? (
              <div className="p-20 flex flex-col items-center text-center space-y-4">
                <div className="p-6 bg-background rounded-[30px] border border-border text-muted-foreground/50">
                  {tab === "fixed" ? <Repeat size={40} /> : <CreditCard size={40} />}
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-foreground/80">Nenhum registro encontrado</h4>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Sua lista de {tab === "fixed" ? "gastos fixos" : "gastos variáveis"} está vazia.
                  </p>
                </div>
              </div>
            ) : (
              activeList.map((exp) => (
                <div key={exp.id} className="group flex items-center gap-3 px-4 py-3 md:px-8 md:py-5 hover:bg-white/[0.02] transition-colors">
                  <div className={`w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-[20px] flex items-center justify-center shrink-0 ${tab === "fixed" ? "bg-zinc-500/5 text-zinc-400" : "bg-zinc-500/5 text-zinc-400"}`}>
                    {tab === "fixed" ? <Receipt className="w-4 h-4 md:w-6 md:h-6 stroke-[1.5]" /> : <CreditCard className="w-4 h-4 md:w-6 md:h-6 stroke-[1.5]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm md:text-lg font-bold truncate ${"active" in exp && !exp.active ? "text-muted-foreground/70 line-through" : "text-foreground"}`}>
                      {exp.name}
                    </h4>
                    <p className="text-xs text-muted-foreground font-medium truncate">
                      {tab === "fixed"
                        ? (exp.notes || "Recorrência mensal")
                        : format(new Date((exp as any).expense_date + "T00:00:00"), "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm md:text-xl font-black text-foreground">{formatBRL(Number(exp.amount))}</p>
                    {tab === "fixed" && (
                      <Badge variant={"active" in exp && exp.active ? "active" : "default"}>
                        {"active" in exp && exp.active ? "ATIVO" : "PAUSADO"}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 md:gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all shrink-0">
                    {tab === "fixed" && "active" in exp && (
                      <button
                        onClick={() => updateFixed.mutate({ id: exp.id, active: !exp.active })}
                        className="p-1.5 md:p-2 hover:bg-white/5 rounded-xl transition-colors"
                      >
                        {exp.active
                          ? <ToggleRight className="w-5 h-5 md:w-7 md:h-7 text-zinc-500" />
                          : <ToggleLeft className="w-5 h-5 md:w-7 md:h-7 text-muted-foreground/50" />}
                      </button>
                    )}
                    <Btn
                      variant="destructive"
                      size="icon"
                      className="rounded-xl w-8 h-8 md:w-9 md:h-9"
                      onClick={() => setDeleteTarget({ id: exp.id, type: tab })}
                    >
                      <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </Btn>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-3 md:p-8 bg-black/20 flex items-center justify-between">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                  {i}
                </div>
              ))}
            </div>
            <div className="text-right min-w-0">
              <p className="text-[9px] md:text-xs uppercase text-muted-foreground font-bold tracking-[0.2em]">Total Acumulado</p>
              <p className="text-sm md:text-2xl font-black text-white whitespace-nowrap">{formatBRL(tab === "fixed" ? fixedTotal : varTotal)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Fixo */}
      {fixedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="bg-secondary w-full max-w-md rounded-2xl md:rounded-[40px] border border-border shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 md:p-10 space-y-6 md:space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white">Novo Gasto Fixo</h2>
                  <p className="text-muted-foreground text-sm">Defina um custo fixo mensal</p>
                </div>
                <button onClick={() => { setFixedModal(false); resetFixed(); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-white transition-colors">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <Label>Nome *</Label>
                  <Input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Ex: Aluguel, Internet..." maxLength={100} />
                </div>
                <div className="space-y-1.5">
                  <Label>Valor Mensal (R$) *</Label>
                  <CurrencyInput value={fAmount} onChange={setFAmount} />
                </div>
                <div className="space-y-1.5">
                  <Label>Observação</Label>
                  <textarea value={fNotes} onChange={(e) => setFNotes(e.target.value)} placeholder="Informações adicionais..." maxLength={500}
                    className="w-full rounded-xl border border-border bg-card p-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary h-24 resize-none transition-all" />
                </div>
              </div>
              <div className="flex gap-4">
                <Btn variant="ghost" className="flex-1 h-12 rounded-2xl font-bold" onClick={() => { setFixedModal(false); resetFixed(); }}>Voltar</Btn>
                <Btn variant="primary" className="flex-[2] h-12 rounded-2xl font-bold" onClick={handleCreateFixed} disabled={createFixed.isPending}>
                  {createFixed.isPending ? "Salvando..." : "Confirmar"}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Variável */}
      {varModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="bg-secondary w-full max-w-md rounded-2xl md:rounded-[40px] border border-border shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-6 md:p-10 space-y-6 md:space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-white">Novo Gasto Variável</h2>
                  <p className="text-muted-foreground text-sm">Registre uma despesa pontual</p>
                </div>
                <button onClick={() => { setVarModal(false); resetVar(); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-white transition-colors">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
              <div className="space-y-6">
                <div className="space-y-1.5">
                  <Label>Nome *</Label>
                  <Input value={vName} onChange={(e) => setVName(e.target.value)} placeholder="Ex: Manutenção, Frete..." maxLength={100} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Valor (R$) *</Label>
                    <CurrencyInput value={vAmount} onChange={setVAmount} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Data</Label>
                    <Input type="date" value={vDate} onChange={(e) => setVDate(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Observação</Label>
                  <textarea value={vNotes} onChange={(e) => setVNotes(e.target.value)} placeholder="Informações adicionais..." maxLength={500}
                    className="w-full rounded-xl border border-border bg-card p-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary h-24 resize-none transition-all" />
                </div>
              </div>
              <div className="flex gap-4">
                <Btn variant="ghost" className="flex-1 h-12 rounded-2xl font-bold" onClick={() => { setVarModal(false); resetVar(); }}>Voltar</Btn>
                <Btn variant="primary" className="flex-[2] h-12 rounded-2xl font-bold" onClick={handleCreateVariable} disabled={createVariable.isPending}>
                  {createVariable.isPending ? "Salvando..." : "Confirmar"}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Excluir lançamento"
        description="Tem certeza que deseja excluir este gasto? Esta ação não pode ser desfeita."
      />
    </div>
  );
}
