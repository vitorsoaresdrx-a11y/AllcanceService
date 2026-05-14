import { useState, useMemo, useEffect, useCallback, useRef, Fragment } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { maskPhone, maskCpfCnpj } from "@/lib/masks";
import { useCustomers, useCreateCustomer, useUpdateCustomer, type Customer } from "@/hooks/useCustomers";
import imageCompression from "browser-image-compression";
import { CustomerAutocomplete } from "@/components/CustomerAutocomplete";
import {
  useMechanicJobs,
  useMechanicJobsRealtime,
  useCreateMechanicJob,
  useAdvanceMechanicJob,
  useDeleteMechanicJob,
  useCreateAddition,
  useUpdateAdditionApproval,
  useRetreatMechanicJob,
  useUpdateMechanicJobDetails,
  useUpdateAddition,
  useDeleteAddition,
  useFinalizeJob,
  useRegisterPayment,
  useCancelAndArchiveMechanicJob,
  useRestoreCancelledJob,
  type MechanicJob,
  type MechanicJobAddition,
  type AdditionPart,
  type MechanicJobPaymentHistory,
} from "@/hooks/useMechanicJobs";
import { useOSPhotos, useUploadPhoto, useDeletePhoto, type OSPhoto } from "@/hooks/useOSPhotos";
import { useSendMessage } from "@/hooks/useWhatsApp";
import {
  Wrench,
  CheckCircle2,
  Plus,
  Layers,
  FileCheck,
  ArrowLeft,
  Settings,
  Activity
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useParts } from "@/hooks/useParts";
import { useServiceOrdersRealtime, useCreateServiceOrder, type ServiceOrder } from "@/hooks/useServiceOrders";
import { playNotifySound, playAcceptSound } from "@/lib/sounds";
import { formatBRL } from "@/lib/format";
import { useMechanicUIState } from "@/hooks/useMechanicUIState";
import { useMechanicRealtimeEvents } from "@/hooks/useMechanicRealtimeEvents";

import { ReceiptModal } from "@/components/mechanic/modals/ReceiptModal";
import { NotificationModal } from "@/components/mechanic/modals/NotificationModal";
import { KanbanColumn } from "@/components/mechanic/KanbanColumn";
import { MechanicCard } from "@/components/mechanic/MechanicCard";
import { AddJobModal } from "@/components/mechanic/modals/AddJobModal";
import { EditJobModal } from "@/components/mechanic/modals/EditJobModal";
import { OSControlModal } from "@/components/mechanic/modals/OSControlModal";
import { AddRepairModal } from "@/components/mechanic/modals/AddRepairModal";
import { FinalizeJobModal } from "@/components/mechanic/modals/FinalizeJobModal";
import { RegisterPaymentModal } from "@/components/mechanic/modals/RegisterPaymentModal";
import { MoveConfirmModal } from "@/components/mechanic/modals/MoveConfirmModal";
import { InputGroup, PremiumInput, PremiumTextarea, CurrencyInput } from "@/components/mechanic/CommonComponents";
import { getTotalPrice, getAdditionTotal } from "@/utils/mechanicUtils";

const columns = [
  {
    key: "in_approval" as const,
    label: "Em Aprovação",
    icon: FileCheck,
    color: "text-muted-foreground",
    bg: "bg-muted/5",
    border: "border-muted",
  },
  {
    key: "in_repair" as const,
    label: "Na Mecânica",
    icon: Wrench,
    color: "text-foreground/60",
    bg: "bg-foreground/5",
    border: "border-foreground/10",
  },
  {
    key: "in_maintenance" as const,
    label: "Em Manutenção",
    icon: Settings,
    color: "text-foreground/70",
    bg: "bg-foreground/10",
    border: "border-foreground/20",
  },
  {
    key: "in_analysis" as const,
    label: "Em Análise",
    icon: Activity,
    color: "text-foreground/80",
    bg: "bg-foreground/15",
    border: "border-foreground/30",
  },
  {
    key: "ready" as const,
    label: "Pronto",
    icon: CheckCircle2,
    color: "text-primary",
    bg: "bg-primary/5",
    border: "border-primary/20",
  },
];



// ─── Sub-Components ────────────────────
export default function Mecanica() {
  const navigate = useNavigate();

  // 1. Data & Actions Hooks
  useMechanicJobsRealtime();
  const { data: jobs = [], isLoading } = useMechanicJobs();
  const { data: customers = [] } = useCustomers();
  
  const create = useCreateMechanicJob();
  const advance = useAdvanceMechanicJob();
  const retreat = useRetreatMechanicJob();
  const updateDetails = useUpdateMechanicJobDetails();
  const createAddition = useCreateAddition();
  const deleteAddition = useDeleteAddition();
  const updateAddition = useUpdateAddition();
  const finalize = useFinalizeJob();
  const createServiceOrder = useCreateServiceOrder();
  const sendMessage = useSendMessage();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const registerPaymentMutation = useRegisterPayment();

  // 2. UI State Hook
  const ui = useMechanicUIState(jobs, customers);

  // 3. Realtime & Notification Events Hook
  useMechanicRealtimeEvents({
    jobs,
    updateDetails,
    setNotifData: ui.setNotifData,
    setNotifOpen: ui.setNotifOpen
  });

  const {
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
    notifData,
    receiptOpen, setReceiptOpen,
    receiptData, setReceiptData,
    sendingAddition, setSendingAddition,
  } = ui;

  const handleRegisterPayment = (job: MechanicJob) => {
    setEditJob(job);
    const total = getTotalPrice(job);
    const paid = (job.payment_history || []).reduce((s, h) => s + (Number(h.valor) || 0) + (Number(h.desconto_valor) || 0), 0);
    const remaining = Math.max(0, total - paid);
    
    setPayForm({
      valor: remaining,
      tipo: remaining > 0 ? 'parcial' : 'integral',
      method: 'pix',
      desconto_valor: 0,
      desconto_motivo: ''
    });
    setRegisterPayOpen(true);
  };

  const submitPayment = () => {
    if (!editJob) return;

    // Enforce discount rule: only allowed if it clears the total
    const total = getTotalPrice(editJob);
    const alreadyCleared = (Array.isArray(editJob.payment_history) ? editJob.payment_history : []).reduce((s, h) => s + (Number(h.valor) || 0) + (Number(h.desconto_valor) || 0), 0);
    const newAmount = payForm.tipo === 'desconto' ? payForm.desconto_valor : payForm.valor;

    if (payForm.tipo === 'desconto' && (alreadyCleared + newAmount < total - 0.01)) { // 0.01 for float safety
      toast.error("Desconto manual só é permitido no pagamento que quita a OS");
      return;
    }

    registerPaymentMutation.mutate({
      os_id: editJob.id,
      valor: payForm.tipo === 'desconto' ? 0 : payForm.valor,
      tipo: payForm.tipo,
      payment_method: payForm.tipo === 'desconto' ? null : payForm.method,
      desconto_valor: payForm.tipo === 'desconto' ? payForm.desconto_valor : 0,
      desconto_motivo: payForm.tipo === 'desconto' ? payForm.desconto_motivo : null,
      customer_id: editJob.customer_id,
      customer_name: editJob.customer_name,
      customer_whatsapp: editJob.customer_whatsapp,
      bike_name: editJob.bike_name
    }, {
      onSuccess: (historyRecord) => {
        toast.success("Pagamento registrado!");
        setRegisterPayOpen(false);
        if (historyRecord) {
          setReceiptData({ job: editJob, history: historyRecord as unknown as MechanicJobPaymentHistory, autoSend: true });
          setReceiptOpen(true);
        }
      }
    });
  };

  const handleShowReceipt = (job: MechanicJob, history: MechanicJobPaymentHistory) => {
    setReceiptData({ job, history });
    setReceiptOpen(true);
  };

  // Kanban grouping

  const grouped = useMemo(() => {
    const map: Record<string, MechanicJob[]> = { in_approval: [], in_repair: [], in_maintenance: [], in_analysis: [], ready: [] };
    jobs.forEach((j) => { 
      // Mostra cards cancelados na coluna de Aprovação com o overlay vermelho
      const key = j.status === 'cancelado' ? 'in_approval' : (j.status as string);
      if (map[key]) map[key].push(j); 
    });
    return map;
  }, [jobs]);

  const uploadPhoto = useUploadPhoto();

  const handleSave = async () => {
    if (!form.problem.trim()) { toast.error("Descreva o problema"); return; }
    
    // Validate required fields for Step 1
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
      if (resolvedCustomerId) {
        await updateCustomer.mutateAsync({
          id: resolvedCustomerId,
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
        });
      } else {
        const created = await createCustomer.mutateAsync({
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
        });
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
      price: form.sem_custo ? 0 : (Number(form.price) || 0),
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
        const partsTotal = form.parts.reduce((s, p) => s + (Number(p.quantity || 0) * Number(p.unit_price || 0)), 0);
        const isApproval = form.initialStatus === "in_approval" || !form.initialStatus;

        if (isApproval) {
          // FLUXO DE ORÇAMENTO (TRATA COMO ADICIONAL PENDENTE)
          const totalToApprove = partsTotal + Number(form.labor_cost || 0);

          // 1. Cria o registro de adicional com status pendente para disparar o sistema de aprovação
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

          // 2. Zera o valor base da O.S. para que o total reflita apenas o que for aprovado
          await updateDetails.mutateAsync({ id: newJob.id, price: 0 } as any);

          // 3. (Silenced per requirement) Dispara formatador IA e envia mensagem inicial de orçamento
          /*
          await supabase.functions.invoke("formatar-adicional", {
            body: {
              osId: newJob.id,
              pecas: form.parts,
              observacoes: form.problem,
              maoDeObra: Number(form.labor_cost || 0) + Number(form.other_cost || 0)
            }
          });
          */

          // 4. (Silenced per requirement) Upload de Foto e Envio de Mídia via WhatsApp
          if (form.arrivalPhoto) {
            try {
              await uploadPhoto.mutateAsync({ 
                osId: newJob.id, 
                file: form.arrivalPhoto, 
                tipo: "problema" 
              });
              
              /*
              const phone = form.customer_whatsapp?.replace(/\D/g, "");
              if (phone) {
                const formattedPhone = (phone.length >= 10 && phone.length <= 11 && !phone.startsWith("55")) ? `55${phone}` : phone;
                await sendMessage.mutateAsync({
                  phone: formattedPhone,
                  media: photoUrl,
                  mediatype: 'image'
                });
              }
              */
            } catch (err) {
              console.error("Erro ao processar foto inicial:", err);
            }
          }
        } else {
          // FLUXO DE REPARO DIRETO
          if (form.parts && form.parts.length > 0) {
            try {
              await createAddition.mutateAsync({
                job_id: newJob.id,
                problem: "Peças iniciais da O.S.",
                price: partsTotal,
                labor_cost: 0,
                parts_used: form.parts,
              } as any);
              await updateDetails.mutateAsync({ id: newJob.id, price: Number(form.price) - partsTotal } as any);
            } catch (err) {
               console.error("Erro ao salvar peças da composição:", err);
            }
          }

          if (form.arrivalPhoto) {
            try {
              await uploadPhoto.mutateAsync({ 
                osId: newJob.id, 
                file: form.arrivalPhoto, 
                tipo: "chegada" 
              });
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
          setReceiptData({ job: newJob, history: initialPaymentHistory, autoSend: true });
          setReceiptOpen(true);
        }

        toast.success("Manutenção criada!");
        setForm({ 
          customer_name: "", bike_name: "", customer_cpf: "", customer_whatsapp: "", customer_id: null, 
          problem: "", price: 0, initialStatus: "in_approval", paymentType: "nenhum", 
          paymentAmount: 0, paymentMethod: "pix", status: "in_approval", sem_custo: false,
          cep: "", address: "", number: "", complement: "", bairro: "", city: "", state: "",
          arrivalPhoto: null, arrivalPhotoPreview: "",
          parts: [], labor_cost: 0, other_cost: 0
        } as any);
        setOpen(false);
        setStep(1);
      },
      onError: (err: any) => {
        console.error("Erro ao criar OS:", err);
        toast.error("Erro ao criar: " + (err.message || "Valor inválido enviado"));
      },
    });
  };

  const handleSearchCEP = async (cep: string) => {
    const rawCep = cep.replace(/\D/g, "");
    if (rawCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setForm(prev => ({
            ...prev,
            address: data.logradouro,
            bairro: data.bairro,
            city: data.localidade,
            state: data.uf
          }));
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      }
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const options = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 800,
        useWebWorker: true,
        initialQuality: 0.7
      };
      try {
        const compressedFile = await imageCompression(file, options);
        const preview = URL.createObjectURL(compressedFile);
        setForm(prev => ({ ...prev, arrivalPhoto: compressedFile as File, arrivalPhotoPreview: preview }));
      } catch (err) {
        console.error("Erro ao comprimir imagem:", err);
        toast.error("Erro ao processar imagem");
      }
    }
  };

  const handleAddRepair = (job: MechanicJob) => { setAddJob(job); setAddForm({ problem: "", mechanic_notes: "", labor_cost: 0, parts: [] }); setAddOpen(true); };
  const handleEditJob = (job: MechanicJob) => {
    setEditJob(job);
    setEditForm({ 
      customer_name: job.customer_name || "", 
      bike_name: job.bike_name || "", 
      customer_cpf: job.customer_cpf || "", 
      customer_whatsapp: job.customer_whatsapp || "", 
      customer_id: job.customer_id || null, 
      problem: job.problem || "", 
      price: Number(job.price || 0), 
      sem_custo: job.sem_custo || false,
      paymentType: job.payment?.tipo || "nenhum", 
      paymentAmount: job.payment?.valor_pago || 0, 
      paymentMethod: "pix",
      status: job.status
    });
    setEditOpen(true);
  };

  const handleSaveEdit = (confirmedMove = false) => {
    if (!editJob || !editForm.problem.trim()) { toast.error("Descreva o problema"); return; }
    
    const phoneDigits = editForm.customer_whatsapp.replace(/\D/g, "");
    if (editForm.customer_whatsapp && phoneDigits.length < 10) {
      toast.error("WhatsApp inválido — digite o número completo com DDD");
      return;
    }

    // Check if status changed and not yet confirmed
    if (editForm.status !== editJob.status && !confirmedMove) {
      setPendingMoveStatus(editForm.status);
      setMoveConfirmOpen(true);
      return;
    }

    const doSave = async () => {
      // 1. Update Mechanic Job
      await updateDetails.mutateAsync({ 
        id: editJob.id, 
        customer_name: editForm.customer_name || null, 
        customer_cpf: editForm.customer_cpf?.replace(/\D/g, '') || null, 
        customer_whatsapp: editForm.customer_whatsapp?.replace(/\D/g, '') || null, 
        customer_id: editForm.customer_id || null, 
        bike_name: editForm.bike_name || null, 
        problem: editForm.problem || "", 
        price: editForm.sem_custo ? 0 : Number(editForm.price || 0), 
        status: editForm.status,
        sem_custo: editForm.sem_custo,
        payment: { 
          tipo: editForm.paymentType, 
          valor_pago: editForm.paymentType === 'integral' ? Number(editForm.price || 0) : Number(editForm.paymentAmount || 0), 
          method: editForm.paymentMethod || "pix"
        } 
      });

      // 2. If moved manually, notify client via WhatsApp and update conversation
      if (confirmedMove && editForm.customer_whatsapp) {
        const phone = editForm.customer_whatsapp.replace(/\D/g, "");
        const formattedPhone = (phone.length >= 10 && phone.length <= 11 && !phone.startsWith("55")) ? `55${phone}` : phone;

        const statusMessages: Record<string, string> = {
          in_repair: `Olá, ${editForm.customer_name || "cliente"}! Sua bicicleta ${editForm.bike_name ? `(${editForm.bike_name}) ` : ""}já está na fila da oficina. Te avisaremos quando o serviço começar! 🚲`,
          in_maintenance: `Boas notícias, ${editForm.customer_name || "cliente"}! A manutenção da sua bicicleta ${editForm.bike_name ? `(${editForm.bike_name}) ` : ""}foi iniciada agora pelos nossos mecânicos! 🛠️`,
          in_analysis: `Olá, ${editForm.customer_name || "cliente"}! O serviço principal já foi concluído e sua bicicleta ${editForm.bike_name ? `(${editForm.bike_name}) ` : ""}está em TESTES finais de segurança agora. ✨`,
          ready: `GRANDE DIA! Sua bicicleta ${editForm.bike_name ? `(${editForm.bike_name}) ` : ""}está prontinha para retirada aqui na Allcance! 🚲✨ Ficamos te esperando!`,
        };

        const message = statusMessages[editForm.status];
        if (message) {
          sendMessage.mutate({ phone: formattedPhone, message });
        }

        const phoneSuffix = phone.length > 10 ? phone.slice(-10) : phone;
        const { data: convs } = await supabase
          .from('whatsapp_conversations')
          .select('id')
          .ilike('wa_id', `%${phoneSuffix}%`);

        if (convs && convs.length > 0) {
          await supabase
            .from('whatsapp_conversations')
            .update({ 
              ai_enabled: false, 
              human_takeover: true,
              ai_notifications_enabled: true
            } as any)
            .eq('id', convs[0].id);
        }

        // Se moveu para "Na Mecânica" ou "Em Manutenção", sincroniza com os mecânicos
        if (editForm.status === "in_repair" || editForm.status === "in_maintenance") {
          createServiceOrder.mutate({ 
            id: editJob.id, 
            customer_name: editForm.customer_name || undefined, 
            customer_cpf: editForm.customer_cpf?.replace(/\D/g, "") || undefined, 
            customer_whatsapp: editForm.customer_whatsapp || undefined, 
            customer_id: editForm.customer_id || undefined, 
            bike_name: editForm.bike_name || undefined, 
            problem: editForm.problem, 
            sem_custo: editForm.sem_custo,
            mechanic_status: editForm.status === "in_repair" ? "pending" : "accepted"
          });
        }
      }

      toast.success("Serviço atualizado!");
      setEditOpen(false);
      setEditJob(null);
      setMoveConfirmOpen(false);
      setPendingMoveStatus(null);
    };

    doSave().catch(() => toast.error("Erro ao atualizar"));
  };

  const handleAdvanceJob = (job: MechanicJob) => {
    const phone = job.customer_whatsapp?.replace(/\D/g, "");
    const formattedPhone = phone ? ((phone.length >= 10 && phone.length <= 11 && !phone.startsWith("55")) ? `55${phone}` : phone) : null;

    advance.mutate({ id: job.id, status: job.status }, {
      onSuccess: async () => {
        toast.success("Card avançado!");
        
        // Quando avança para "Na Mecânica" ou "Em Manutenção", sincroniza com os mecânicos
        if (job.status === "in_approval" || job.status === "in_repair") {
          const nextStatus = job.status === "in_approval" ? "in_repair" : "in_maintenance";
          createServiceOrder.mutate({ 
            id: job.id, 
            customer_name: job.customer_name || undefined, 
            customer_cpf: job.customer_cpf || undefined, 
            customer_whatsapp: job.customer_whatsapp || undefined, 
            customer_id: job.customer_id || undefined, 
            bike_name: job.bike_name || undefined, 
            problem: job.problem, 
            sem_custo: job.sem_custo,
            mechanic_status: nextStatus === "in_repair" ? "pending" : "accepted"
          });
        }

        // WhatsApp notifications
        if (formattedPhone) {
          const nextStatus = 
            job.status === "in_approval" ? "in_repair" :
            job.status === "in_repair" ? "in_maintenance" :
            job.status === "in_maintenance" ? "in_analysis" :
            job.status === "in_analysis" ? "ready" : null;

          if (nextStatus) {
            const statusMessages: Record<string, string> = {
              in_repair: `Olá, ${job.customer_name || "cliente"}! Sua bicicleta ${job.bike_name ? `(${job.bike_name}) ` : ""}já está na fila da oficina. Te avisaremos quando o serviço começar! 🚲`,
              in_maintenance: `Boas notícias, ${job.customer_name || "cliente"}! A manutenção da sua bicicleta ${job.bike_name ? `(${job.bike_name}) ` : ""}foi iniciada agora pelos nossos mecânicos! 🛠️`,
              in_analysis: `Olá, ${job.customer_name || "cliente"}! O serviço principal já foi concluído e sua bicicleta ${job.bike_name ? `(${job.bike_name}) ` : ""}está em TESTES finais de segurança agora. ✨`,
              ready: `GRANDE DIA! Sua bicicleta ${job.bike_name ? `(${job.bike_name}) ` : ""}está prontinha para retirada aqui na Allcance! 🚲✨ Ficamos te esperando!`,
            };

            const message = statusMessages[nextStatus];
            if (message) {
              sendMessage.mutate({ phone: formattedPhone, message });
            }
          }
        }
      },
      onError: () => toast.error("Erro ao mover card"),
    });
  };

  const handleRetreatJob = (job: MechanicJob) => { 
    retreat.mutate({ id: job.id }, { 
      onSuccess: () => {
        toast.success("Retornado com sucesso!");
      }, 
      onError: () => toast.error("Erro ao retroceder") 
    }); 
  };

  // Opens the finalize+payment modal instead of directly advancing
  const handleOpenFinalize = (job: MechanicJob) => {
    setFinalizeJob(job);
    setFinalizePaymentMethod("pix");
    setFinalizeOpen(true);
  };

  const handleConfirmFinalize = () => {
    if (!finalizeJob) return;
    const totalValue = getTotalPrice(finalizeJob);
    finalize.mutate({
      jobId: finalizeJob.id,
      totalValue,
      paymentMethod: finalizePaymentMethod,
      customerName: finalizeJob.customer_name,
      customerWhatsapp: finalizeJob.customer_whatsapp,
      customerCpf: finalizeJob.customer_cpf,
      customerId: finalizeJob.customer_id,
      bikeName: finalizeJob.bike_name,
      problem: finalizeJob.problem,
    }, {
      onSuccess: async () => {
        toast.success(`✅ OS finalizada e registrada no DRE!`);
        
        if (finalizeJob?.customer_whatsapp) {
          const phone = finalizeJob.customer_whatsapp.replace(/\D/g, "");
          const formattedPhone = (phone.length >= 10 && phone.length <= 11 && !phone.startsWith("55")) ? `55${phone}` : phone;
          sendMessage.mutate({
            phone: formattedPhone,
            message: `Obrigado pela preferência, ${finalizeJob.customer_name || "cliente"}! 🚲✨ Sua bike ${finalizeJob.bike_name ? `(${finalizeJob.bike_name}) ` : ""}foi finalizada. Foi um prazer atender você na Allcance! Volte sempre! 😊`
          });

          // Reativa IA para a próxima conversa
          if (finalizeJob?.customer_whatsapp) {
            const phone = finalizeJob.customer_whatsapp.replace(/\D/g, '').slice(-10);
            await supabase
              .from('whatsapp_conversations')
              .update({ 
                ai_enabled: true, 
                human_takeover: false,
                ai_notifications_enabled: true 
              } as any)
              .ilike('contact_phone', `%${phone}%`);
          }
        }

        setFinalizeOpen(false);
        setFinalizeJob(null);
      },
      onError: () => toast.error("Erro ao finalizar OS"),
    });
  };

  const { data: jobPhotos = [] } = useOSPhotos(addJob?.id);

  const handleSaveAddition = async () => {
    if (!addJob || !addForm.problem.trim()) { toast.error("Descreva o reparo"); return; }
    setSendingAddition(true);
    let savedRowId = null;

    try {
      // 1. Save Addition
      const partsTotal = addForm.parts.reduce((s, p) => s + p.quantity * p.unit_price, 0);
      const totalCost = addForm.labor_cost + partsTotal;

      const { data: adData, error: adErr } = await supabase.from("os_adicionais" as any).insert({
        os_id: addJob.id,
        problem: addForm.problem,
        mechanic_notes: addForm.mechanic_notes,
        price: totalCost,
        valor_total: totalCost, // For consistency between old and new columns
        labor_cost: addForm.labor_cost,
        parts_used: addForm.parts,
        status: "pendente" // Initial status as per requirements for approval flow
      }).select().single();
      
      if (adErr) throw new Error("Falha ao criar o registro adicional.");
      savedRowId = (adData as any).id;

      // 2. Fetch formatted message (Silenced for in_approval jobs per requirement)
      if (addJob.status !== 'in_approval') {
        const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("formatar-adicional", {
          body: {
            osId: addJob.id,
            pecas: addForm.parts,
            observacoes: addForm.problem,
            maoDeObra: addForm.labor_cost
          }
        });
        
        console.log("Edge Function Response:", { edgeData, edgeErr });
        if (edgeErr || edgeData?.error) throw new Error(edgeErr?.message || edgeData?.error || "Insucesso na Edge Function");

        // 3. Send media if there are "problema" photos
        const problemPhotos = jobPhotos.filter(p => p.tipo === "problema");
        const phone = addJob.customer_whatsapp?.replace(/\D/g, "");
        const formattedPhone = phone ? ((phone.length >= 10 && phone.length <= 11 && !phone.startsWith("55")) ? `55${phone}` : phone) : null;

        if (formattedPhone) {
          for (const photo of problemPhotos) {
            await sendMessage.mutateAsync({
              phone: formattedPhone,
              media: photo.url,
              mediatype: 'image'
            });
          }
        }
        toast.success("Enviado para o cliente com sucesso!");
      } else {
        toast.success("Reparo extra adicionado (notificação silenciada)");
      }
      setAddOpen(false);
      setAddJob(null);
    } catch (err: any) {
      if (savedRowId) {
        await supabase.from("os_adicionais" as any).delete().eq("id", savedRowId);
      }
      toast.error("Erro no envio: " + err.message);
    } finally {
      setSendingAddition(false);
    }
  };

  const pendingApprovals = jobs.filter((j) => j.additions?.some((a) => a.approval === "pending")).length;
  const avgTicket = jobs.length > 0 ? jobs.reduce((sum, j) => sum + getTotalPrice(j), 0) / jobs.length : 0;

  const allMobileTabs = columns;

  return (
    <div className="min-h-full bg-background text-foreground selection:bg-primary/30 pb-24 lg:pb-0">
      <div className="w-full min-w-0 p-4 md:p-6 space-y-6 md:space-y-10 overflow-x-hidden">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate("/")}
              className="h-10 px-3 flex items-center justify-center gap-2 rounded-xl bg-secondary border border-border hover:bg-muted transition-all active:scale-95 group"
              title="Voltar para Ações Rápidas"
            >
              <ArrowLeft size={18} className="text-muted-foreground group-hover:text-foreground" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-foreground hidden sm:block">Voltar</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                Oficina
              </h1>
              <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest leading-none mt-1">Gerenciamento de Manutenções</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">Ticket Médio</p>
              <p className="text-lg font-bold">{formatBRL(avgTicket)}</p>
            </div>
            <button onClick={() => setOpen(true)} className="h-10 px-4 bg-primary text-primary-foreground rounded-md text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm active:scale-95">
              <Plus size={18} /> Nova O.S
            </button>
          </div>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-96 rounded-3xl bg-muted/20 animate-pulse border border-border/20" />)}
          </div>
        ) : (
          <>
            <div className="flex overflow-x-auto gap-2 pb-2 md:hidden scrollbar-hide -mx-4 px-4">
              {allMobileTabs.map((tab) => (
                <button key={tab.key} onClick={() => setMobileTab(tab.key as any)} className={`flex items-center gap-2 px-4 py-2 rounded-md border text-xs font-bold transition-all whitespace-nowrap ${mobileTab === tab.key ? `${tab.bg} ${tab.color} ${tab.border} shadow-sm` : "bg-card text-muted-foreground border-border"}`}>
                  <tab.icon size={14} /> {tab.label}
                  <span className="opacity-40 ml-1">{grouped[tab.key]?.length || 0}</span>
                </button>
              ))}
            </div>

            <div className="md:hidden">
              <div className="space-y-4">
                {(grouped[mobileTab]?.length || 0) > 0 ? (
                  grouped[mobileTab]?.map((job) => (
                    <MechanicCard key={job.id} job={job} isLast={mobileTab === "ready"} columnKey={mobileTab} onAddRepair={handleAddRepair} onEdit={handleEditJob} onRetreat={handleRetreatJob} onAdvance={mobileTab !== "ready" ? handleAdvanceJob : undefined} onFinalize={mobileTab === "ready" ? handleOpenFinalize : undefined} onOpenControl={(j) => { setSelectedControlJob(j); setControlOpen(true); }} />
                  ))
                ) : (
                  <div className="py-20 text-center space-y-3 opacity-20">
                    <Layers className="mx-auto" size={40} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Coluna Vazia</p>
                  </div>
                )}
              </div>
            </div>

            <div className="hidden md:grid grid-cols-2 lg:grid-cols-5 gap-4">
              {columns.map((col) => (
                <KanbanColumn 
                  key={col.key} 
                  col={col} 
                  jobs={grouped[col.key]} 
                  onAddRepair={handleAddRepair} 
                  onEdit={handleEditJob} 
                  onRetreat={handleRetreatJob} 
                  onAdvance={handleAdvanceJob} 
                  onFinalize={handleOpenFinalize} 
                  onOpenControl={(j) => { setSelectedControlJob(j); setControlOpen(true); }} 
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Modal de Finalização com Pagamento ───────────────────────────────── */}
      <FinalizeJobModal 
        open={finalizeOpen}
        onOpenChange={setFinalizeOpen}
        job={finalizeJob}
        paymentMethod={finalizePaymentMethod}
        onPaymentMethodChange={setFinalizePaymentMethod}
        onConfirm={handleConfirmFinalize}
        isPending={finalize.isPending}
      />

      <OSControlModal
        open={controlOpen}
        onOpenChange={setControlOpen}
        job={selectedControlJob}
        onEdit={(j) => { 
          setEditJob(j); 
          setEditForm({ ...j, paymentType: 'nenhum', paymentAmount: 0, paymentMethod: 'pix' } as any); 
          setEditOpen(true); 
        }}
        onAdvance={(j) => advance.mutate(j)}
      />

      <AddJobModal 
        open={open} 
        onOpenChange={setOpen} 
        onSuccess={(data) => {
          if (data.history) {
            setReceiptData({ job: data.job, history: data.history[0], autoSend: true });
            setReceiptOpen(true);
          }
        }}
      />

      <AddRepairModal
        open={addOpen}
        onOpenChange={setAddOpen}
        job={addJob}
        form={addForm}
        setForm={setAddForm}
        onSave={handleSaveAddition}
        isSaving={sendingAddition || createAddition.isPending}
      />

      <EditJobModal 
        open={editOpen} 
        onOpenChange={setEditOpen} 
        editJob={editJob} 
        editForm={editForm} 
        setEditForm={setEditForm} 
        onSave={handleSaveEdit} 
        isSaving={updateDetails.isPending}
        onRegisterPayment={handleRegisterPayment}
        onShowReceipt={handleShowReceipt}
      />

      <MoveConfirmModal 
        open={moveConfirmOpen}
        onOpenChange={setMoveConfirmOpen}
        onConfirm={() => handleSaveEdit(true)}
        onCancel={() => {
          setMoveConfirmOpen(false);
          setPendingMoveStatus(null);
        }}
      />


  {/* ── Modal de Registro de Pagamento ─────────────────────────────────── */}
      <RegisterPaymentModal 
        open={registerPayOpen}
        onOpenChange={setRegisterPayOpen}
        form={payForm}
        setForm={setPayForm}
        onConfirm={submitPayment}
        isPending={registerPaymentMutation.isPending}
      />

      <ReceiptModal 
        open={receiptOpen} 
        onOpenChange={setReceiptOpen} 
        data={receiptData}
        onSendMessage={(payload) => {
          sendMessage.mutate(payload, { onSuccess: () => toast.success("Recibo enviado!") });
        }}
      />

      <NotificationModal 
        open={notifOpen} 
        onOpenChange={setNotifOpen} 
        data={notifData} 
      />
    </div>
  );
}
