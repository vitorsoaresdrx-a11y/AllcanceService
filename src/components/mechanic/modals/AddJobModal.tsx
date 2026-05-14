import { useState, useMemo, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Wrench, 
  Camera, 
  Image as ImageIcon, 
  Trash2, 
  Loader2, 
  ChevronRight, 
  ChevronLeft, 
  Activity, 
  TrendingUp, 
  FileCheck, 
  Settings, 
  CheckCircle2, 
  Bike, 
  Check, 
  FileText, 
  AlertTriangle 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatBRL } from "@/lib/format";
import { maskPhone, maskCpfCnpj } from "@/lib/masks";
import { 
  useCreateMechanicJob, 
  useUpdateMechanicJobDetails, 
  useCreateAddition, 
  MechanicJob, 
  MechanicJobPaymentHistory,
  AdditionPart
} from "@/hooks/useMechanicJobs";
import { useCustomers, useCreateCustomer, useUpdateCustomer } from "@/hooks/useCustomers";
import { useUploadPhoto } from "@/hooks/useOSPhotos";
import { useSendMessage } from "@/hooks/useWhatsApp";
import { useCreateServiceOrder } from "@/hooks/useServiceOrders";
import { 
  PremiumInput, 
  PremiumTextarea, 
  InputGroup, 
  CurrencyInput 
} from "../CommonComponents";
import { AddRepairPartSelector } from "../MechanicCardComponents";

interface AddJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (data: { job: MechanicJob; history: MechanicJobPaymentHistory[]; autoSend?: boolean }) => void;
}

const INITIAL_FORM = {
  customer_name: "", bike_name: "", customer_cpf: "", customer_whatsapp: "", customer_id: null, 
  problem: "", price: 0, initialStatus: "in_approval", paymentType: "nenhum", 
  paymentAmount: 0, paymentMethod: "pix", status: "in_approval", sem_custo: false,
  cep: "", address: "", number: "", complement: "", bairro: "", city: "", state: "",
  arrivalPhoto: null, arrivalPhotoPreview: "",
  parts: [] as AdditionPart[], labor_cost: 0, other_cost: 0
};

export function AddJobModal({ open, onOpenChange, onSuccess }: AddJobModalProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<any>(INITIAL_FORM);
  const [suggestionField, setSuggestionField] = useState<'name' | 'whatsapp' | 'cpf' | null>(null);

  const { data: customers = [] } = useCustomers();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const create = useCreateMechanicJob();
  const updateDetails = useUpdateMechanicJobDetails();
  const createAddition = useCreateAddition();
  const uploadPhoto = useUploadPhoto();
  const sendMessage = useSendMessage();
  const createServiceOrder = useCreateServiceOrder();

  const filteredCustomers = useMemo(() => {
    if (!suggestionField) return [];
    const query = suggestionField === 'name' ? form.customer_name 
      : suggestionField === 'whatsapp' ? form.customer_whatsapp.replace(/\D/g, "")
      : form.customer_cpf.replace(/\D/g, "");
    if (query.length < 2) return [];
    return (customers as any[]).filter(c => {
      const name = (c.name || "").toLowerCase();
      const whatsapp = (c.whatsapp || "").replace(/\D/g, "");
      const cpf = (c.cpf || "").replace(/\D/g, "");
      return name.includes(query.toLowerCase()) || whatsapp.includes(query) || cpf.includes(query);
    }).slice(0, 5);
  }, [customers, form.customer_name, form.customer_whatsapp, form.customer_cpf, suggestionField]);

  const selectSuggestedCustomer = (c: any) => {
    setForm((f: any) => ({
      ...f,
      customer_id: c.id,
      customer_name: c.name || "",
      customer_whatsapp: c.whatsapp || "",
      customer_cpf: c.cpf || "",
      cep: c.cep || "",
      address: c.address_street || "",
      number: c.address_number || "",
      complement: c.address_complement || "",
      bairro: c.address_neighborhood || "",
      city: c.address_city || "",
      state: c.address_state || "",
    }));
    setSuggestionField(null);
  };

  const handleSearchCEP = async (cep: string) => {
    if (cep.length !== 8) return;
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await resp.json();
      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }
      setForm((f: any) => ({
        ...f,
        address: data.logradouro,
        bairro: data.bairro,
        city: data.localidade,
        state: data.uf
      }));
    } catch (err) {
      console.error("Erro CEP:", err);
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm((f: any) => ({ 
        ...f, 
        arrivalPhoto: file, 
        arrivalPhotoPreview: URL.createObjectURL(file) 
      }));
    }
  };

  const compositionTotal = (form.parts?.reduce((s: number, p: any) => s + (Number(p.quantity || 0) * Number(p.unit_price || 0)), 0) || 0) + Number(form.labor_cost || 0) + Number(form.other_cost || 0);

  const handleSave = async () => {
    if (!form.problem.trim()) { toast.error("Descreva o problema"); return; }
    if (!form.customer_name || !form.customer_whatsapp || !form.bike_name) {
      toast.error("Nome, WhatsApp e Bike são obrigatórios!");
      return;
    }

    const phoneDigits = form.customer_whatsapp.replace(/\D/g, "");
    if (form.customer_whatsapp && phoneDigits.length < 10) {
      toast.error("WhatsApp inválido — digite o número completo com DDD");
      return;
    }
    
    let resolvedCustomerId = form.customer_id;
    try {
      const customerData = {
        name: form.customer_name.trim(),
        whatsapp: phoneDigits || null,
        cpf: form.customer_cpf?.replace(/\D/g, '') || null,
        cep: form.cep?.replace(/\D/g, '') || null,
        address_street: form.address?.trim() || null,
        address_number: form.number?.trim() || null,
        address_complement: form.complement?.trim() || null,
        address_neighborhood: form.bairro?.trim() || null,
        address_city: form.city?.trim() || null,
        address_state: form.state?.trim() || null,
      };

      if (resolvedCustomerId) {
        await updateCustomer.mutateAsync({ id: resolvedCustomerId, ...customerData });
      } else {
        const created = await createCustomer.mutateAsync(customerData);
        resolvedCustomerId = created.id;
      }
    } catch (err) {
      console.error("Erro ao salvar cliente:", err);
    }

    const orderData = {
      customer_name: form.customer_name || null,
      customer_cpf: form.customer_cpf?.replace(/\D/g, '') || null,
      customer_whatsapp: form.customer_whatsapp?.replace(/\D/g, '') || null,
      customer_id: resolvedCustomerId || null,
      bike_name: form.bike_name || null,
      problem: form.problem || "",
      price: form.sem_custo ? 0 : (Number(form.price) || compositionTotal || 0),
      status: form.initialStatus || "in_approval",
      sem_custo: !!form.sem_custo,
    };

    const paymentData = (!form.sem_custo && form.paymentType !== 'nenhum') ? {
      tipo: form.paymentType,
      valor_pago: form.paymentType === 'integral' ? (Number(form.price) || 0) : (Number(form.paymentAmount) || 0),
      method: form.paymentMethod || 'pix'
    } : undefined;

    create.mutate({ ...orderData, payment: paymentData } as any, {
      onSuccess: async ({ job: newJob, initialPaymentHistory }) => {
        const partsTotal = form.parts.reduce((s: number, p: any) => s + (Number(p.quantity || 0) * Number(p.unit_price || 0)), 0);
        const isApproval = form.initialStatus === "in_approval" || !form.initialStatus;

        if (isApproval) {
          const totalToApprove = partsTotal + Number(form.labor_cost || 0);
          await supabase.from("os_adicionais" as any).insert({
            os_id: newJob.id,
            problem: form.problem,
            observacoes: form.problem,
            price: totalToApprove,
            valor_total: totalToApprove,
            labor_cost: Number(form.labor_cost || 0),
            pecas: form.parts,
            status: "pendente"
          });
          await updateDetails.mutateAsync({ id: newJob.id, price: 0 } as any);
          
          if (form.arrivalPhoto) {
            try {
              await uploadPhoto.mutateAsync({ osId: newJob.id, file: form.arrivalPhoto, tipo: "problema" });
            } catch (err) {
              console.error("Erro ao processar foto inicial:", err);
            }
          }
        } else {
          if (form.parts && form.parts.length > 0) {
            try {
              await createAddition.mutateAsync({
                job_id: newJob.id,
                problem: "Peças iniciais da O.S.",
                price: partsTotal,
                labor_cost: 0,
                parts_used: form.parts,
              } as any);
              await updateDetails.mutateAsync({ id: newJob.id, price: Number(orderData.price) - partsTotal } as any);
            } catch (err) {
               console.error("Erro ao salvar peças da composição:", err);
            }
          }

          if (form.arrivalPhoto) {
            try {
              await uploadPhoto.mutateAsync({ osId: newJob.id, file: form.arrivalPhoto, tipo: "chegada" });
            } catch (err) {
              console.error("Erro ao subir foto de chegada:", err);
            }
          }

          if (form.initialStatus === "in_repair") {
            createServiceOrder.mutate({ 
              id: newJob.id, 
              customer_name: form.customer_name || undefined, 
              customer_cpf: form.customer_cpf || undefined, 
              customer_whatsapp: form.customer_whatsapp || undefined, 
              customer_id: form.customer_id || undefined, 
              bike_name: form.bike_name || undefined, 
              problem: form.problem 
            });
          }

          if (form.customer_whatsapp) {
            const phone = form.customer_whatsapp.replace(/\D/g, "");
            const formattedPhone = (phone.length >= 10 && phone.length <= 11 && !phone.startsWith("55")) ? `55${phone}` : phone;
            sendMessage.mutate({ 
              phone: formattedPhone, 
              message: `Olá, ${form.customer_name || "cliente"}! Sua bicicleta ${form.bike_name ? `(${form.bike_name}) ` : ""}já está na mecânica. Quando algum mecânico começar o serviço, te avisaremos por aqui.` 
            });
          }
        }

        if (initialPaymentHistory) {
          onSuccess({ job: newJob, history: initialPaymentHistory, autoSend: true });
        } else {
          toast.success("Manutenção criada!");
        }

        setForm(INITIAL_FORM);
        onOpenChange(false);
        setStep(1);
      },
      onError: (err: any) => {
        console.error("Erro ao criar OS:", err);
        toast.error("Erro ao criar: " + (err.message || "Valor inválido enviado"));
      },
    });
  };

  const columnsList = [
    { key: "in_approval", label: "Orçamento", icon: FileCheck },
    { key: "in_repair", label: "Na Mecânica", icon: Wrench },
    { key: "in_maintenance", label: "Em Manutenção", icon: Settings },
    { key: "in_analysis", label: "Em Análise", icon: Activity },
    { key: "ready", label: "Pronto", icon: CheckCircle2 }
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => {
      onOpenChange(v);
      if (!v) {
        setStep(1);
        setForm(INITIAL_FORM);
      }
    }}>
      <DialogContent className="max-w-xl p-0 flex flex-col bg-background border-none shadow-2xl max-h-[96vh] sm:max-h-[90vh] my-2 sm:my-4 overflow-hidden">
        <div className="bg-primary/5 p-6 border-b border-primary/10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                Nova Ordem de Serviço
              </DialogTitle>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1">Criação de Atendimento</p>
            </div>
            <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all">
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center justify-between px-2">
            {[1, 2, 3, 4].map((s, idx) => (
              <Fragment key={s}>
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 ${step >= s ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110" : "bg-muted text-muted-foreground"}`}>
                    {s}
                  </div>
                </div>
                {idx < 3 && (
                  <div className={`flex-1 h-0.5 mx-2 rounded-full transition-all duration-700 ${step > s ? "bg-primary" : "bg-muted"}`} />
                )}
              </Fragment>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-1 md:col-span-2">
                    <InputGroup label="Nome Completo *">
                      <div className="relative">
                        <PremiumInput 
                          value={form.customer_name} 
                          onChange={(e) => {
                            setForm((f: any) => ({ ...f, customer_name: e.target.value, customer_id: null }));
                            setSuggestionField('name');
                          }} 
                          onBlur={() => setTimeout(() => setSuggestionField(null), 200)}
                          placeholder="Nome Completo" 
                        />
                        {suggestionField === 'name' && filteredCustomers.length > 0 && (
                          <div className="absolute z-[100] top-full left-0 right-0 mt-1 bg-secondary border border-border rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                            {filteredCustomers.map(c => (
                              <button key={c.id} onClick={() => selectSuggestedCustomer(c)} className="w-full px-4 py-2.5 text-left hover:bg-muted/50 border-b border-border/50 last:border-0 transition-colors">
                                <p className="text-xs font-bold text-white leading-none">{c.name}</p>
                                <p className="text-[9px] text-muted-foreground mt-1.5 uppercase tracking-widest">{c.whatsapp || "Sem whats"} · {c.cpf || "Sem CPF"}</p>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </InputGroup>
                  </div>

                  <InputGroup label="WhatsApp *">
                    <div className="relative">
                      <PremiumInput 
                        value={form.customer_whatsapp} 
                        onChange={(e) => {
                          setForm((f: any) => ({ ...f, customer_whatsapp: maskPhone(e.target.value), customer_id: null }));
                          setSuggestionField('whatsapp');
                        }} 
                        onBlur={() => setTimeout(() => setSuggestionField(null), 200)}
                        placeholder="(00) 00000-0000" 
                      />
                      {suggestionField === 'whatsapp' && filteredCustomers.length > 0 && (
                        <div className="absolute z-[100] top-full left-0 right-0 mt-1 bg-secondary border border-border rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                          {filteredCustomers.map(c => (
                            <button key={c.id} onClick={() => selectSuggestedCustomer(c)} className="w-full px-4 py-2.5 text-left hover:bg-muted/50 border-b border-border/50 last:border-0 transition-colors">
                              <p className="text-xs font-bold text-white font-black">{c.whatsapp}</p>
                              <p className="text-[9px] text-muted-foreground mt-1.5 uppercase tracking-widest">{c.name}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </InputGroup>

                  <InputGroup label="CPF (Opcional)">
                    <div className="relative">
                      <PremiumInput 
                        value={form.customer_cpf} 
                        onChange={(e) => {
                          setForm((f: any) => ({ ...f, customer_cpf: maskCpfCnpj(e.target.value), customer_id: null }));
                          setSuggestionField('cpf');
                        }} 
                        onBlur={() => setTimeout(() => setSuggestionField(null), 200)}
                        placeholder="000.000.000-00" 
                      />
                    </div>
                  </InputGroup>

                  <div className="col-span-1 md:col-span-2 grid grid-cols-4 gap-3 bg-muted/20 p-4 rounded-2xl border border-border/40">
                    <div className="col-span-1">
                      <InputGroup label="CEP">
                        <PremiumInput 
                          value={form.cep} 
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 8);
                            setForm((f: any) => ({ ...f, cep: val }));
                            if (val.length === 8) handleSearchCEP(val);
                          }} 
                          placeholder="00000-000" 
                        />
                      </InputGroup>
                    </div>
                    <div className="col-span-3">
                      <InputGroup label="Endereço">
                        <PremiumInput value={form.address} onChange={(e) => setForm((f: any) => ({ ...f, address: e.target.value }))} placeholder="Rua / Avenida" />
                      </InputGroup>
                    </div>
                    <div className="col-span-2">
                       <InputGroup label="Bairro">
                        <PremiumInput value={form.bairro} onChange={(e) => setForm((f: any) => ({ ...f, bairro: e.target.value }))} placeholder="Bairro" />
                      </InputGroup>
                    </div>
                    <div className="col-span-2">
                       <InputGroup label="Cidade">
                        <PremiumInput value={form.city} onChange={(e) => setForm((f: any) => ({ ...f, city: e.target.value }))} placeholder="Cidade" />
                      </InputGroup>
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2">
                     <InputGroup label="Bike / Marca / Modelo *">
                      <div className="relative">
                        <PremiumInput value={form.bike_name} onChange={(e) => setForm((f: any) => ({ ...f, bike_name: e.target.value }))} placeholder="Ex: Specialized Epic..." />
                        <Bike className="absolute right-3 top-2.5 text-muted-foreground/30" size={18} />
                      </div>
                    </InputGroup>
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <InputGroup label="Foto de Chegada (Opcional)">
                      <div className="flex flex-col gap-3 mt-1">
                        <div className="flex gap-2">
                          <label className="flex-1 h-12 bg-muted/40 border border-border border-dashed rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/60 transition-all text-[10px] font-black uppercase tracking-widest text-muted-foreground group">
                            <Camera size={14} className="group-hover:text-primary transition-colors" /> Tirar Foto
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />
                          </label>
                          <label className="flex-1 h-12 bg-muted/40 border border-border border-dashed rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-muted/60 transition-all text-[10px] font-black uppercase tracking-widest text-muted-foreground group">
                            <ImageIcon size={14} className="group-hover:text-primary transition-colors" /> Galeria
                            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                          </label>
                        </div>
                        {form.arrivalPhotoPreview && (
                          <div className="relative w-24 h-24 rounded-2xl border-2 border-primary/20 overflow-hidden group shadow-xl ring-4 ring-primary/5">
                            <img src={form.arrivalPhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                            <button onClick={() => setForm((f: any) => ({ ...f, arrivalPhoto: null, arrivalPhotoPreview: "" }))} className="absolute inset-0 bg-destructive/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Trash2 size={24} />
                            </button>
                          </div>
                        )}
                      </div>
                    </InputGroup>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6"
              >
                <InputGroup label="Diagnóstico / O que fazer? *">
                  <PremiumTextarea 
                    rows={4} 
                    placeholder="Descreva detalhadamente o problema..." 
                    value={form.problem} 
                    onChange={(e) => setForm((f: any) => ({ ...f, problem: e.target.value }))} 
                  />
                </InputGroup>

                <div className="space-y-6 pt-4 border-t border-border/40">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-1 bg-primary rounded-full" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground">Composição do Serviço</h4>
                  </div>

                  <div className="space-y-4">
                    <InputGroup label="1. Peças do Sistema (Opcional)">
                      <AddRepairPartSelector 
                        selectedParts={form.parts} 
                        onChange={(parts) => setForm((f: any) => ({ ...f, parts }))}
                        PremiumInput={PremiumInput}
                      />
                    </InputGroup>

                    <div className="grid grid-cols-2 gap-4">
                      <InputGroup label="2. Mão de obra">
                        <CurrencyInput value={form.labor_cost} onChange={(val) => setForm((f: any) => ({ ...f, labor_cost: val }))} />
                      </InputGroup>
                      <InputGroup label="3. Outros / Materiais">
                        <CurrencyInput value={form.other_cost} onChange={(val) => setForm((f: any) => ({ ...f, other_cost: val }))} />
                      </InputGroup>
                    </div>

                    <div className="bg-primary/5 border border-primary/20 rounded-3xl p-6 space-y-3 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10">
                         <TrendingUp size={64} />
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        <span>Peças</span>
                        <span>{formatBRL(form.parts.reduce((s: number, p: any) => s + (Number(p.quantity || 0) * Number(p.unit_price || 0)), 0))}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border/40 pb-2">
                        <span>Mão de obra / Outros</span>
                        <span>{formatBRL(Number(form.labor_cost || 0) + Number(form.other_cost || 0))}</span>
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">Total Estimado</span>
                        <span className="text-xl font-black text-white">{formatBRL(compositionTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <InputGroup label="Coluna Inicial no Kanban">
                  <div className="grid grid-cols-2 gap-3">
                    {columnsList.map((s, idx, arr) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setForm((f: any) => ({ ...f, initialStatus: s.key as any }))}
                        className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
                          form.initialStatus === s.key ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20" : "border-border hover:bg-muted/50"
                        } ${idx === arr.length - 1 && arr.length % 2 !== 0 ? "col-span-2 justify-center max-w-[240px] mx-auto w-full" : ""}`}
                      >
                        <div className={`p-2.5 rounded-xl transition-colors ${form.initialStatus === s.key ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "bg-muted text-muted-foreground"}`}>
                          <s.icon size={18} />
                        </div>
                        <span className={`text-[11px] font-bold uppercase tracking-widest ${form.initialStatus === s.key ? "text-primary" : "text-muted-foreground"}`}>
                          {s.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </InputGroup>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6"
              >
                <div className="flex items-center justify-between p-5 bg-primary/5 border border-primary/10 rounded-3xl">
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest text-primary leading-none">Tipo de Cobrança</p>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-1.5 opacity-60">Garantia ou Cortesia da Loja?</p>
                  </div>
                  <button type="button" onClick={() => setForm((f: any) => ({ ...f, sem_custo: !f.sem_custo }))} className={`w-14 h-7 rounded-full relative transition-all duration-500 ${form.sem_custo ? "bg-zinc-500" : "bg-muted-foreground/30"}`}>
                    <motion.div animate={{ x: form.sem_custo ? 30 : 4 }} className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center">
                      {form.sem_custo && <Check size={10} className="text-zinc-600" />}
                    </motion.div>
                  </button>
                </div>

                {!form.sem_custo ? (
                  <div className="space-y-8">
                    <InputGroup label="Valor Previsto da Manutenção *">
                      <div className="relative group">
                        <CurrencyInput value={form.price} onChange={(val) => setForm((f: any) => ({ ...f, price: val }))} className="h-14 text-lg font-black" />
                        <TrendingUp className="absolute right-4 top-4 text-primary/30" size={20} />
                      </div>
                    </InputGroup>
                    
                    <div className="space-y-4">
                      <InputGroup label="Tem adiantamento parcial?">
                        <div className="grid grid-cols-3 gap-3">
                          {['nenhum', 'parcial', 'integral'].map((type) => (
                            <button key={type} type="button" onClick={() => setForm((f: any) => ({ ...f, paymentType: type as any }))} className={`h-12 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${form.paymentType === type ? "border-primary bg-primary/15 text-primary shadow-sm" : "border-border/60 bg-background text-muted-foreground"}`}>
                              {type}
                            </button>
                          ))}
                        </div>
                      </InputGroup>

                      {form.paymentType !== 'nenhum' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4 pt-2">
                          {form.paymentType === 'parcial' && (
                            <InputGroup label="Quanto o cliente pagou agora?">
                               <CurrencyInput value={form.paymentAmount} onChange={(val) => setForm((f: any) => ({ ...f, paymentAmount: val }))} className="h-11" />
                            </InputGroup>
                          )}
                          <InputGroup label="Forma de pagamento usada">
                            <div className="grid grid-cols-4 gap-2">
                              {['PIX', 'Dinheiro', 'Débito', 'Crédito'].map((method) => (
                                <button key={method} type="button" onClick={() => setForm((f: any) => ({ ...f, paymentMethod: method.toLowerCase() }))} className={`h-11 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${form.paymentMethod === method.toLowerCase() ? "border-primary bg-primary/15 text-primary shadow-sm" : "border-border/60 bg-background text-muted-foreground"}`}>
                                  {method}
                                </button>
                              ))}
                            </div>
                          </InputGroup>
                        </motion.div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-14 flex flex-col items-center justify-center bg-zinc-500/5 rounded-3xl border border-dashed border-zinc-500/30">
                    <CheckCircle2 size={40} className="mb-4 text-zinc-500" />
                    <p className="text-[11px] font-black uppercase tracking-[0.2em]">Cortesia / Garantia</p>
                  </div>
                )}
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6"
              >
                <div className="bg-muted/10 border border-border/80 rounded-[32px] overflow-hidden">
                  <div className="bg-primary/5 px-8 py-5 border-b border-primary/10 flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Resumo da O.S</h3>
                    {form.sem_custo && <div className="px-3 py-1 bg-zinc-500/10 text-zinc-600 rounded-full text-[9px] font-black uppercase">Sem Custo</div>}
                  </div>
                  
                  <div className="p-8 space-y-6">
                    <div className="flex gap-6">
                      <div className="flex-1 space-y-4">
                        <div>
                          <p className="text-[9px] text-muted-foreground font-black uppercase">Proprietário</p>
                          <p className="text-sm font-black text-foreground">{form.customer_name || "—"}</p>
                          <p className="text-[10px] font-bold text-muted-foreground">{form.customer_whatsapp}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground font-black uppercase">Equipamento</p>
                          <p className="text-sm font-black text-foreground uppercase">{form.bike_name || "—"}</p>
                        </div>
                      </div>
                      {form.arrivalPhotoPreview && (
                        <img src={form.arrivalPhotoPreview} className="w-24 h-24 object-cover rounded-2xl shadow-lg border" alt="Preview" />
                      )}
                    </div>

                    <div className="p-5 bg-muted/30 rounded-3xl border border-border/40">
                      <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mb-2">Diagnóstico</p>
                      <p className="text-[12px] font-medium leading-relaxed italic">"{form.problem || "—"}"</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-primary/5 rounded-2xl border">
                        <p className="text-[9px] text-primary font-black uppercase">Coluna Inicial</p>
                        <p className="text-[11px] font-bold uppercase">{columnsList.find(c => c.key === form.initialStatus)?.label}</p>
                      </div>
                      <div className="p-4 bg-primary/5 rounded-2xl border">
                        <p className="text-[9px] text-primary font-black uppercase">Valor Previsto</p>
                        <p className="text-sm font-black">{form.sem_custo ? "CORTESIA" : formatBRL(form.price || compositionTotal)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 px-6 py-4 bg-zinc-500/5 border border-zinc-500/20 rounded-2xl">
                   <AlertTriangle size={18} className="text-zinc-600" />
                  <p className="text-[10px] font-medium text-zinc-700/80 leading-tight">
                    Um aviso será enviado para o WhatsApp do cliente ao abrir este atendimento.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="p-6 border-t border-border/40 bg-background/50 backdrop-blur-sm flex items-center justify-between">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="h-12 px-6 rounded-2xl border border-border text-xs font-bold uppercase flex items-center gap-2">
              <ChevronLeft size={16} /> Voltar
            </button>
          ) : (
            <button onClick={() => onOpenChange(false)} className="h-12 px-6 text-xs font-bold uppercase text-muted-foreground">Cancelar</button>
          )}
          
          <div className="flex gap-3 ml-auto">
            {step < 4 ? (
              <button 
                onClick={() => {
                  if (step === 1 && (!form.customer_name || !form.customer_whatsapp || !form.bike_name)) { toast.error("Preencha os campos obrigatórios!"); return; }
                  if (step === 2 && !form.problem.trim()) { toast.error("Descreva o diagnóstico!"); return; }
                  setStep(step + 1);
                }}
                className="h-12 px-10 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2"
              >
                Continuar <ChevronRight size={16} />
              </button>
            ) : (
              <button 
                onClick={handleSave}
                disabled={create.isPending}
                className="h-12 px-12 rounded-2xl bg-zinc-500 text-white font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 disabled:opacity-50"
              >
                {create.isPending ? <Loader2 className="animate-spin" size={18} /> : "Finalizar e Abrir O.S."}
              </button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
