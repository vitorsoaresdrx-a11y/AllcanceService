import { useState } from "react";
import { Receipt, Zap, Droplets, CreditCard, FileText, Copy, CheckCircle, Trash2, MoreVertical, ScanLine, Sparkles } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { toast } from "sonner";
import { formatBRL } from "@/lib/format";
import { parseBarcode, type ParsedBill } from "@/lib/barcode-parser";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { BillPhotoCapture } from "@/components/BillPhotoCapture";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { useBills, useCreateBill, useUpdateBillStatus, useDeleteBill, useAutoUpdateOverdue, useBillAlerts, type Bill } from "@/hooks/useBills";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TYPE_CONFIG: Record<string, { icon: typeof Receipt; bg: string; color: string }> = {
  boleto: { icon: FileText, bg: "bg-primary/10", color: "text-primary" },
  concessionaria: { icon: Zap, bg: "bg-zinc-500/10", color: "text-zinc-500" },
  cartao: { icon: CreditCard, bg: "bg-zinc-500/10", color: "text-zinc-500" },
  desconhecido: { icon: Receipt, bg: "bg-muted", color: "text-muted-foreground" },
};

const FILTERS = [
  { key: "all", label: "Todas" },
  { key: "pending", label: "Pendentes" },
  { key: "overdue", label: "Vencidas" },
  { key: "paid", label: "Pagas" },
  { key: "due_1", label: "Vence hoje" },
  { key: "due_7", label: "7 dias" },
  { key: "due_15", label: "15 dias" },
  { key: "due_30", label: "30 dias" },
];

function daysUntilDue(dueDate: string | null): number | null {
  if (!dueDate) return null;
  return differenceInDays(parseISO(dueDate + "T12:00:00"), new Date());
}

function applyFilter(bills: Bill[], filter: string): Bill[] {
  switch (filter) {
    case "pending":
      return bills.filter((b) => b.status === "pending");
    case "overdue":
      return bills.filter((b) => b.status === "overdue");
    case "paid":
      return bills.filter((b) => b.status === "paid");
    case "due_1":
      return bills.filter((b) => {
        if (b.status === "paid") return false;
        const d = daysUntilDue(b.due_date);
        return d !== null && d <= 1 && d >= 0;
      });
    case "due_7":
      return bills.filter((b) => {
        if (b.status === "paid") return false;
        const d = daysUntilDue(b.due_date);
        return d !== null && d <= 7 && d >= 0;
      });
    case "due_15":
      return bills.filter((b) => {
        if (b.status === "paid") return false;
        const d = daysUntilDue(b.due_date);
        return d !== null && d <= 15 && d >= 0;
      });
    case "due_30":
      return bills.filter((b) => {
        if (b.status === "paid") return false;
        const d = daysUntilDue(b.due_date);
        return d !== null && d <= 30 && d >= 0;
      });
    default:
      return bills;
  }
}

function StatusBadge({ status, dueDate }: { status: string; dueDate: string | null }) {
  if (status === "paid") {
    return <span className="text-[9px] font-bold uppercase text-zinc-400 bg-zinc-400/10 px-2 py-0.5 rounded-full">Pago</span>;
  }
  if (status === "overdue") {
    return <span className="text-[9px] font-bold uppercase text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">Vencida</span>;
  }

  const days = daysUntilDue(dueDate);
  if (days !== null && days <= 1) {
    return <span className="text-[9px] font-bold uppercase text-zinc-400 bg-zinc-400/10 px-2 py-0.5 rounded-full">Vence hoje</span>;
  }
  if (days !== null && days <= 7) {
    return <span className="text-[9px] font-bold uppercase text-zinc-400 bg-zinc-400/10 px-2 py-0.5 rounded-full">Vence em {days}d</span>;
  }

  return <span className="text-[9px] font-bold uppercase text-zinc-400 bg-zinc-400/10 px-2 py-0.5 rounded-full">Pendente</span>;
}

export default function Contas() {
  const { data: bills = [], isLoading } = useBills();
  const { mutateAsync: createBill, isPending: isCreating } = useCreateBill();
  const { mutateAsync: updateStatus } = useUpdateBillStatus();
  const { mutateAsync: deleteBill } = useDeleteBill();

  useAutoUpdateOverdue();
  useBillAlerts(bills);

  const [filter, setFilter] = useState("all");
  const [showScanModal, setShowScanModal] = useState(false);
  const [parsed, setParsed] = useState<ParsedBill | null>(null);
  const [editBeneficiary, setEditBeneficiary] = useState("");
  const [editAmount, setEditAmount] = useState<number | null>(null);
  const [editDueDate, setEditDueDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [inputMode, setInputMode] = useState<"scan" | "photo">("scan");

  const totalPending = bills.filter((b) => b.status === "pending").reduce((s, b) => s + (b.amount || 0), 0);
  const totalOverdue = bills.filter((b) => b.status === "overdue").reduce((s, b) => s + (b.amount || 0), 0);
  const totalPaid = bills.filter((b) => b.status === "paid").reduce((s, b) => s + (b.amount || 0), 0);

  const filtered = applyFilter(bills, filter);

  const handleScanned = (code: string) => {
    const result = parseBarcode(code);
    setParsed(result);
    setEditBeneficiary(result.beneficiary || "");
    setEditAmount(result.amount);
    setEditDueDate(result.due_date || "");
    setEditNotes("");
    setShowScanModal(true);
  };

  const handleManualSubmit = () => {
    if (!manualBarcode.trim()) return;
    handleScanned(manualBarcode.trim());
    setManualBarcode("");
    setShowManualInput(false);
  };

  const handleSave = async () => {
    if (!parsed) return;
    try {
      await createBill({
        barcode: parsed.barcode,
        barcode_type: parsed.type,
        bank_name: parsed.bank_name,
        beneficiary: editBeneficiary || parsed.beneficiary,
        amount: editAmount,
        due_date: editDueDate || null,
        notes: editNotes || null,
      });
      toast.success("Conta salva!");
      setShowScanModal(false);
      setParsed(null);
    } catch {
      toast.error("Erro ao salvar conta");
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      await updateStatus({ id, status: "paid" });
      toast.success("Conta marcada como paga!");
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBill(id);
      toast.success("Conta excluída");
    } catch {
      toast.error("Erro ao excluir");
    }
  };

  const copyBarcode = (barcode: string) => {
    navigator.clipboard.writeText(barcode);
    toast.success("Código copiado!");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Receipt size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-black uppercase tracking-tight text-foreground">Contas</h1>
          <p className="text-xs text-muted-foreground">Gerencie suas contas a pagar</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="p-3 rounded-2xl bg-card border border-border">
          <p className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider">A Pagar</p>
          <p className="text-lg font-black text-foreground">{formatBRL(totalPending)}</p>
        </div>
        <div className="p-3 rounded-2xl bg-card border border-border">
          <p className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider">Vencidas</p>
          <p className="text-lg font-black text-destructive">{formatBRL(totalOverdue)}</p>
        </div>
        <div className="p-3 rounded-2xl bg-card border border-border">
          <p className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider">Pagas</p>
          <p className="text-lg font-black text-zinc-400">{formatBRL(totalPaid)}</p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setInputMode("scan")}
          className={`h-10 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
            inputMode === "scan"
              ? "bg-primary border-primary text-primary-foreground"
              : "bg-secondary border-border text-muted-foreground"
          }`}
        >
          <ScanLine size={14} /> Escanear
        </button>
        <button
          onClick={() => setInputMode("photo")}
          className={`h-10 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
            inputMode === "photo"
              ? "bg-primary border-primary text-primary-foreground"
              : "bg-secondary border-border text-muted-foreground"
          }`}
        >
          <Sparkles size={14} /> Foto com IA
        </button>
      </div>

      {inputMode === "scan" && <BarcodeScanner onScanned={handleScanned} />}
      {inputMode === "photo" && (
        <BillPhotoCapture
          onExtracted={async (items) => {
            let saved = 0;
            for (const data of items) {
              try {
                await createBill({
                  barcode: data.barcode,
                  barcode_type: data.type,
                  bank_name: data.bank_name,
                  beneficiary: data.beneficiary,
                  amount: data.amount,
                  due_date: data.due_date || null,
                  notes: null,
                });
                saved++;
              } catch {
                toast.error(`Erro ao salvar conta: ${data.beneficiary || "boleto"}`);
              }
            }
            if (saved > 0) {
              toast.success(`${saved} conta${saved > 1 ? "s" : ""} salva${saved > 1 ? "s" : ""}!`);
            }
          }}
        />
      )}

      {/* Manual input */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowManualInput(!showManualInput)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
        >
          Digitar código manualmente
        </button>
      </div>

      {showManualInput && (
        <div className="flex gap-2">
          <input
            type="text"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            placeholder="Cole ou digite o código de barras..."
            className="flex-1 h-10 px-3 rounded-xl bg-secondary border border-border text-sm text-foreground"
          />
          <button
            onClick={handleManualSubmit}
            disabled={!manualBarcode.trim()}
            className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40"
          >
            OK
          </button>
        </div>
      )}

      {/* Filters — scroll horizontal em mobile */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`h-8 px-3 rounded-xl text-xs font-bold border transition-all whitespace-nowrap shrink-0 ${
              filter === f.key
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-secondary border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Contagem do filtro ativo */}
      {filter !== "all" && (
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest px-1">
          {filtered.length} conta{filtered.length !== 1 ? "s" : ""} encontrada{filtered.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* Bills list */}
      <div className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma conta encontrada.</p>
        )}
        {filtered.map((bill) => {
          const cfg = TYPE_CONFIG[bill.barcode_type] || TYPE_CONFIG.desconhecido;
          const Icon = cfg.icon;
          const days = daysUntilDue(bill.due_date);
          const isUrgent = bill.status !== "paid" && days !== null && days <= 1;
          return (
            <div
              key={bill.id}
              className={`flex items-center gap-3 p-4 rounded-2xl bg-card border transition-colors ${
                isUrgent ? "border-zinc-500/30 bg-zinc-500/5" : "border-border"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                <Icon size={18} className={cfg.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate text-foreground">
                  {bill.beneficiary || bill.bank_name || "Conta"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {bill.due_date
                    ? `Vence ${format(new Date(bill.due_date + "T12:00:00"), "dd/MM/yyyy")}`
                    : "Sem vencimento"}
                  {days !== null && bill.status !== "paid" && days >= 0 && (
                    <span className={`ml-1 font-bold ${days <= 1 ? "text-zinc-400" : days <= 7 ? "text-zinc-400" : "text-muted-foreground"}`}>
                      · {days === 0 ? "hoje" : `em ${days}d`}
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-black text-foreground">{formatBRL(bill.amount)}</p>
                <StatusBadge status={bill.status} dueDate={bill.due_date} />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                    <MoreVertical size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => copyBarcode(bill.barcode)}>
                    <Copy size={14} className="mr-2" /> Copiar código
                  </DropdownMenuItem>
                  {bill.status !== "paid" && (
                    <DropdownMenuItem onClick={() => handleMarkAsPaid(bill.id)}>
                      <CheckCircle size={14} className="mr-2" /> Marcar como pago
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handleDelete(bill.id)} className="text-destructive">
                    <Trash2 size={14} className="mr-2" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>

      {/* Scan confirmation modal */}
      <Dialog open={showScanModal} onOpenChange={setShowScanModal}>
        <DialogContent className="w-[92vw] max-w-sm max-h-[85vh] overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle className="text-base font-black">Confirmar Conta</DialogTitle>
          </DialogHeader>
          {parsed && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[9px] uppercase text-muted-foreground font-bold mb-1">Tipo</p>
                  <p className="text-sm font-bold capitalize text-foreground truncate">{parsed.type}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase text-muted-foreground font-bold mb-1">Banco</p>
                  <p className="text-sm font-bold text-foreground truncate">{parsed.bank_name || "—"}</p>
                </div>
              </div>

              <div>
                <p className="text-[9px] uppercase text-muted-foreground font-bold mb-1">Valor</p>
                <CurrencyInput
                  value={editAmount ?? undefined}
                  onChange={(val) => setEditAmount(val)}
                  placeholder="R$ 0,00"
                />
              </div>

              <div>
                <p className="text-[9px] uppercase text-muted-foreground font-bold mb-1">Vencimento</p>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-secondary border border-border text-sm text-foreground"
                />
              </div>

              <div>
                <p className="text-[9px] uppercase text-muted-foreground font-bold mb-1">Beneficiário</p>
                <input
                  value={editBeneficiary}
                  onChange={(e) => setEditBeneficiary(e.target.value)}
                  placeholder="Ex: Copasa, Enel, Claro..."
                  className="w-full h-10 px-3 rounded-xl bg-secondary border border-border text-sm text-foreground"
                />
              </div>

              <div>
                <p className="text-[9px] uppercase text-muted-foreground font-bold mb-1">Observações</p>
                <input
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Anotações opcionais..."
                  className="w-full h-10 px-3 rounded-xl bg-secondary border border-border text-sm text-foreground"
                />
              </div>

              {parsed.barcode && (
                <div className="bg-secondary border border-border rounded-xl px-3 py-2 flex items-center gap-2 min-w-0">
                  <p className="text-[10px] text-muted-foreground truncate flex-1 font-mono break-all">{parsed.barcode}</p>
                  <button
                    onClick={() => copyBarcode(parsed.barcode)}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={isCreating}
                className="w-full h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-black disabled:opacity-40"
              >
                Salvar Conta
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
