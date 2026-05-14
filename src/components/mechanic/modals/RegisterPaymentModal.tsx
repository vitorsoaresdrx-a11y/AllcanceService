import { Loader2 } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  InputGroup, 
  PremiumInput, 
  CurrencyInput 
} from "../CommonComponents";

interface RegisterPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: {
    tipo: 'parcial' | 'integral' | 'desconto';
    valor: number;
    method: string;
    desconto_valor: number;
    desconto_motivo: string;
  };
  setForm: (val: any) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function RegisterPaymentModal({
  open,
  onOpenChange,
  form,
  setForm,
  onConfirm,
  isPending,
}: RegisterPaymentModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-secondary border-border rounded-2xl p-0 overflow-hidden max-w-md shadow-2xl w-full">
        <div className="p-6 md:p-10 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-foreground uppercase tracking-tight italic">Registrar Pagamento</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'parcial', label: 'Parcial' },
                { key: 'integral', label: 'Quitar' },
                { key: 'desconto', label: 'Desconto' },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setForm({ ...form, tipo: t.key as any })}
                  className={`h-10 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                    form.tipo === t.key 
                      ? "border-primary bg-primary/10 text-primary shadow-lg shadow-primary/5" 
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {form.tipo === 'desconto' ? (
              <div className="space-y-4 pt-2">
                <InputGroup label="Valor do Desconto *">
                  <CurrencyInput 
                    value={form.desconto_valor} 
                    onChange={(val) => setForm({ ...form, desconto_valor: val })} 
                  />
                </InputGroup>
                <InputGroup label="Motivo do Desconto *">
                  <PremiumInput 
                    placeholder="Ex: Cliente antigo, erro no prazo..." 
                    value={form.desconto_motivo} 
                    onChange={(e) => setForm({ ...form, desconto_motivo: e.target.value })} 
                  />
                </InputGroup>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <InputGroup label="Valor do Pagamento *">
                  <CurrencyInput 
                    value={form.valor} 
                    onChange={(val) => setForm({ ...form, valor: val })} 
                  />
                </InputGroup>
                <InputGroup label="Forma de Pagamento *">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "pix", label: "PIX" },
                      { key: "dinheiro", label: "Dinheiro" },
                      { key: "cartao_debito", label: "Débito" },
                      { key: "cartao_credito", label: "Crédito" }
                    ].map((m) => (
                      <button
                        key={m.key}
                        onClick={() => setForm({ ...form, method: m.key })}
                        className={`h-11 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                          form.method === m.key 
                            ? "border-primary bg-primary/10 text-primary" 
                            : "border-border bg-card text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </InputGroup>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              onClick={() => onOpenChange(false)} 
              className="flex-1 h-12 rounded-2xl border border-border text-muted-foreground hover:bg-muted text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={onConfirm} 
              disabled={isPending} 
              className="flex-[2] h-12 rounded-2xl bg-primary text-white hover:bg-primary/80 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Confirmar Recebimento"
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
