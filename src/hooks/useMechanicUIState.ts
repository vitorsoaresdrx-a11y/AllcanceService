import { useState, useMemo, useEffect } from "react";
import { MechanicJob, AdditionPart } from "@/hooks/useMechanicJobs";
import { Customer } from "@/hooks/useCustomers";
import { maskPhone, maskCpfCnpj } from "@/lib/masks";

export function useMechanicUIState(jobs: MechanicJob[], customers: Customer[]) {
  // New Job Modal State
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [suggestionField, setSuggestionField] = useState<string | null>(null);

  const [form, setForm] = useState({
    customer_name: "",
    bike_name: "",
    customer_cpf: "",
    customer_whatsapp: "",
    customer_id: null as string | null,
    problem: "",
    price: 0,
    initialStatus: "in_approval" as MechanicJob["status"],
    paymentType: "nenhum" as "integral" | "parcial" | "nenhum",
    paymentAmount: 0,
    paymentMethod: "pix",
    status: "in_approval" as MechanicJob["status"],
    sem_custo: false,
    cep: "",
    address: "",
    number: "",
    complement: "",
    bairro: "",
    city: "",
    state: "",
    arrivalPhoto: null as File | null,
    arrivalPhotoPreview: "" as string,
    parts: [] as AdditionPart[],
    labor_cost: 0,
    other_cost: 0,
  });

  const compositionTotal = useMemo(() => {
    const partsTotal = form.parts.reduce((s, p) => s + (p.quantity * p.unit_price), 0);
    return partsTotal + Number(form.labor_cost || 0) + Number(form.other_cost || 0);
  }, [form.parts, form.labor_cost, form.other_cost]);

  useEffect(() => {
    if (step === 2 && form.price !== compositionTotal) {
      setForm(f => ({ ...f, price: compositionTotal }));
    }
  }, [compositionTotal, step, form.price]);

  const filteredCustomers = useMemo(() => {
    const query = suggestionField === 'name' ? form.customer_name : 
                  suggestionField === 'whatsapp' ? form.customer_whatsapp : 
                  suggestionField === 'cpf' ? form.customer_cpf : "";
    
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    const qNum = query.replace(/\D/g, "");

    return customers.filter(c => {
      if (suggestionField === 'name') return c.name.toLowerCase().includes(q);
      if (suggestionField === 'whatsapp') return c.whatsapp?.replace(/\D/g, "").includes(qNum);
      if (suggestionField === 'cpf') return c.cpf?.replace(/\D/g, "").includes(qNum);
      return false;
    }).slice(0, 5);
  }, [customers, form, suggestionField]);

  const selectSuggestedCustomer = (c: Customer) => {
    setForm(prev => ({
      ...prev,
      customer_name: c.name,
      customer_whatsapp: maskPhone(c.whatsapp || ""),
      customer_cpf: maskCpfCnpj(c.cpf || ""),
      customer_id: c.id,
      address: (c as any).address_street || "",
      number: (c as any).address_number || "",
      complement: (c as any).address_complement || "",
      bairro: (c as any).address_neighborhood || "",
      city: (c as any).address_city || "",
      state: (c as any).address_state || "",
    }));
    setSuggestionField(null);
  };

  // Edit Job State
  const [editOpen, setEditOpen] = useState(false);
  const [editJob, setEditJob] = useState<MechanicJob | null>(null);
  const [editForm, setEditForm] = useState({
    customer_name: "",
    bike_name: "",
    customer_cpf: "",
    customer_whatsapp: "",
    customer_id: null as string | null,
    problem: "",
    price: 0,
    paymentType: "nenhum" as "integral" | "parcial" | "nenhum",
    paymentAmount: 0,
    paymentMethod: "pix",
    status: "in_approval" as MechanicJob["status"],
    sem_custo: false,
  });

  // Control / Mechanics State
  const [controlOpen, setControlOpen] = useState(false);
  const [selectedControlJob, setSelectedControlJob] = useState<MechanicJob | null>(null);
  const [mechanicCardOpen, setMechanicCardOpen] = useState(false);

  // Addition State
  const [addOpen, setAddOpen] = useState(false);
  const [addJob, setAddJob] = useState<MechanicJob | null>(null);
  const [addForm, setAddForm] = useState({ 
    problem: "", 
    mechanic_notes: "", 
    labor_cost: 0, 
    parts: [] as AdditionPart[] 
  });

  // Finalize State
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalizeJob, setFinalizeJob] = useState<MechanicJob | null>(null);
  const [finalizePaymentMethod, setFinalizePaymentMethod] = useState("pix");

  // Payment State
  const [registerPayOpen, setRegisterPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({
    valor: 0,
    tipo: 'parcial' as 'parcial' | 'integral' | 'desconto',
    method: 'pix',
    desconto_valor: 0,
    desconto_motivo: '',
  });

  // Kanban State
  const [moveConfirmOpen, setMoveConfirmOpen] = useState(false);
  const [pendingMoveStatus, setPendingMoveStatus] = useState<MechanicJob["status"] | null>(null);
  const [mobileTab, setMobileTab] = useState<MechanicJob["status"]>("in_approval");

  // Notifications / Receipt
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifData, setNotifData] = useState<any>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const [sendingAddition, setSendingAddition] = useState(false);

  return {
    open, setOpen,
    step, setStep,
    suggestionField, setSuggestionField,
    form, setForm,
    compositionTotal,
    filteredCustomers,
    selectSuggestedCustomer,
    editOpen, setEditOpen,
    editJob, setEditJob,
    editForm, setEditForm,
    controlOpen, setControlOpen,
    selectedControlJob, setSelectedControlJob,
    mechanicCardOpen, setMechanicCardOpen,
    addOpen, setAddOpen,
    addJob, setAddJob,
    addForm, setAddForm,
    finalizeOpen, setFinalizeOpen,
    finalizeJob, setFinalizeJob,
    finalizePaymentMethod, setFinalizePaymentMethod,
    registerPayOpen, setRegisterPayOpen,
    payForm, setPayForm,
    moveConfirmOpen, setMoveConfirmOpen,
    pendingMoveStatus, setPendingMoveStatus,
    mobileTab, setMobileTab,
    notifOpen, setNotifOpen,
    notifData, setNotifData,
    receiptOpen, setReceiptOpen,
    receiptData, setReceiptData,
    sendingAddition, setSendingAddition,
  };
}
