import { 
  Wrench, 
  Loader2 
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  MechanicJob, 
  AdditionPart, 
  useCreateAddition 
} from "@/hooks/useMechanicJobs";
import { formatBRL } from "@/lib/format";
import { getTotalPrice } from "@/utils/mechanicUtils";
import { 
  PremiumTextarea, 
  InputGroup, 
  CurrencyInput 
} from "../CommonComponents";
import { AddRepairPartSelector } from "../MechanicCardComponents";

interface AddRepairModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: MechanicJob | null;
  form: { 
    problem: string; 
    mechanic_notes: string; 
    labor_cost: number; 
    parts: AdditionPart[] 
  };
  setForm: (val: any) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function AddRepairModal({ 
  open, 
  onOpenChange, 
  job, 
  form, 
  setForm, 
  onSave, 
  isSaving 
}: AddRepairModalProps) {
  const createAddition = useCreateAddition();

  if (!job) return null;

  const totalAddition = form.labor_cost + form.parts.reduce((s, p) => s + p.quantity * p.unit_price, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-secondary border-border rounded-2xl md:rounded-[40px] p-0 overflow-hidden max-w-lg shadow-2xl w-full max-h-[90vh]">
        <div className="p-6 md:p-10 space-y-6 md:space-y-8 overflow-y-auto max-h-[90vh] custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight italic">Registrar Reparo Extra</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="p-5 bg-background rounded-[28px] border border-border flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                <Wrench size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white leading-none mb-1 truncate">{job.customer_name || "Cliente"}</p>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest truncate">{job.problem}</p>
                <p className="text-xs font-bold text-muted-foreground mt-1">Valor atual: {formatBRL(getTotalPrice(job))}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputGroup label="1. Para o cliente (Visível na aprovação)">
                <PremiumTextarea 
                  rows={3} 
                  placeholder="Descrição curta para o WhatsApp: problemas e peças..." 
                  value={form.problem} 
                  onChange={(e) => setForm({ ...form, problem: e.target.value })} 
                />
              </InputGroup>
              <InputGroup label="2. Instruções para o mecânico (Interno)">
                <PremiumTextarea 
                  rows={3} 
                  placeholder="Instruções técnicas, detalhes internos ou segredos do serviço..." 
                  value={form.mechanic_notes} 
                  onChange={(e) => setForm({ ...form, mechanic_notes: e.target.value })} 
                />
              </InputGroup>
            </div>

            <InputGroup label="Peças Utilizadas">
              <AddRepairPartSelector 
                selectedParts={form.parts} 
                onChange={(parts) => setForm({ ...form, parts })} 
              />
            </InputGroup>

            <InputGroup label="Mão de Obra">
              <CurrencyInput 
                value={form.labor_cost} 
                onChange={(val) => setForm({ ...form, labor_cost: val })} 
              />
            </InputGroup>

            <div className="p-4 bg-background rounded-2xl border border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total deste reparo</span>
                <span className="text-lg font-black text-white">{formatBRL(totalAddition)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              onClick={() => onOpenChange(false)} 
              className="flex-1 h-12 rounded-2xl border border-border text-muted-foreground hover:bg-muted text-sm font-bold transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={onSave} 
              disabled={isSaving || createAddition.isPending} 
              className="flex-[2] h-12 rounded-2xl bg-primary text-white hover:bg-primary/80 text-sm font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {(isSaving || createAddition.isPending) ? <Loader2 size={16} className="animate-spin" /> : "Enviar para o Cliente"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
