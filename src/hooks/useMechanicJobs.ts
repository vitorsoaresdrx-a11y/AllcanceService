import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdditionPart {
  part_id: string | null;
  part_name: string;
  quantity: number;
  unit_price: number;
}

export interface MechanicJobAddition {
  id: string;
  job_id: string;
  problem: string;
  price: number;
  labor_cost: number;
  parts_used: AdditionPart[];
  approval: "pending" | "accepted" | "refused";
  created_at: string;
}

export interface MechanicJob {
  id: string;
  customer_name: string | null;
  customer_cpf: string | null;
  customer_whatsapp: string | null;
  customer_id: string | null;
  bike_name: string | null;
  problem: string;
  price: number;
  status: "in_approval" | "in_repair" | "in_maintenance" | "in_analysis" | "ready" | "delivered" | "cancelado";
  sem_custo: boolean;
  created_at: string;
  updated_at: string;
  additions?: MechanicJobAddition[];
  payment?: {
    tipo: 'integral' | 'parcial' | 'nenhum';
    valor_pago: number;
    valor_restante: number;
    valor_total: number;
  } | null;
  payment_history?: MechanicJobPaymentHistory[];
}

export interface MechanicJobPaymentHistory {
  id: string;
  os_id: string;
  valor: number;
  tipo: 'parcial' | 'integral' | 'desconto';
  payment_method: string | null;
  desconto_valor: number;
  desconto_motivo: string | null;
  criado_em: string;
}


export interface FinalizePayload {
  jobId: string;
  totalValue: number;
  paymentMethod: string; // 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito'
  customerName?: string | null;
  customerWhatsapp?: string | null;
  customerCpf?: string | null;
  customerId?: string | null;
  bikeName?: string | null;
  problem?: string;
}

const KEY = ["mechanic_jobs"];

export function useMechanicJobs() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data: jobs, error } = await supabase
        .from("mechanic_jobs" as any)
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;

      const { data: additions, error: addErr } = await supabase
        .from("mechanic_job_additions" as any)
        .select("*")
        .order("created_at", { ascending: true });
      if (addErr) throw addErr;

      const { data: payData, error: payErr } = await supabase
        .from("os_pagamentos" as any)
        .select("*");
      if (payErr) console.warn("os_pagamentos table might not exist yet:", payErr);

      const { data: osAdicionaisData, error: osAdErr } = await supabase
        .from("os_adicionais" as any)
        .select("*")
        .neq("status", "rascunho");

      const { data: histData, error: histErr } = await supabase
        .from("os_pagamentos_historico" as any)
        .select("*")
        .order("criado_em", { ascending: true });
      if (histErr) console.warn("os_pagamentos_historico table might not exist yet:", histErr);

      const addMap = new Map<string, MechanicJobAddition[]>();
      
      // Load V1 Additions
      (additions as unknown as MechanicJobAddition[]).forEach((a) => {
        if (!addMap.has(a.job_id)) addMap.set(a.job_id, []);
        addMap.get(a.job_id)!.push(a);
      });

      // Load V2 Additions (os_adicionais)
      (osAdicionaisData || []).forEach((a: any) => {
        if (!addMap.has(a.os_id)) addMap.set(a.os_id, []);
        
        let approval: "pending" | "accepted" | "refused" = "pending";
        if (a.status === "aprovado") approval = "accepted";
        if (a.status === "negado") approval = "refused";

        const dbTotal = a.valor_total || 0;
        const partsTotal = (a.pecas || []).reduce(
          (sum: number, p: any) => sum + (p.quantidade || p.quantity || 0) * (p.valor || p.unit_price || 0),
          0
        );
        const labor = Math.max(0, dbTotal - partsTotal);

        addMap.get(a.os_id)!.push({
          id: a.id,
          job_id: a.os_id,
          problem: a.observacoes || "",
          price: dbTotal,
          labor_cost: labor, // Calculate backward so the UI gets logic properly
          parts_used: a.pecas || [],
          approval,
          created_at: a.criado_em || new Date().toISOString(),
          is_v2: true, // Flag to identify which table to update!
        } as MechanicJobAddition & { is_v2: boolean });
      });

      const payMap = new Map<string, any>();
      (payData || []).forEach((p: any) => payMap.set(p.os_id, p));

      const histMap = new Map<string, any[]>();
      (histData || []).forEach((h: any) => {
        if (!histMap.has(h.os_id)) histMap.set(h.os_id, []);
        histMap.get(h.os_id)!.push(h);
      });

      return (jobs as unknown as MechanicJob[])
        .filter((j) => j.status !== "delivered")
        .map((j) => {
          const additions = addMap.get(j.id) || [];
          const basePayment = payMap.get(j.id);
          
          return {
            ...j,
            additions,
            payment: basePayment || {
              tipo: 'nenhum',
              valor_pago: 0,
              valor_restante: Number(j.price || 0),
              valor_total: Number(j.price || 0)
            },
            payment_history: histMap.get(j.id) || [],
          };
        });
    },
  });
}

export function useMechanicJobsRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("mechanic_jobs_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mechanic_jobs" },
        () => qc.invalidateQueries({ queryKey: KEY })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mechanic_job_additions" },
        () => qc.invalidateQueries({ queryKey: KEY })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "os_adicionais" },
        () => qc.invalidateQueries({ queryKey: KEY })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "os_pagamentos" },
        () => qc.invalidateQueries({ queryKey: KEY })
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "os_pagamentos_historico" },
        () => qc.invalidateQueries({ queryKey: KEY })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}

export function useCreateMechanicJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (job: {
      customer_name?: string;
      customer_cpf?: string;
      customer_whatsapp?: string;
      customer_id?: string | null;
      bike_name?: string;
      problem: string;
      price: number;
      status?: string;
      sem_custo?: boolean;
      payment?: {
        tipo: 'integral' | 'parcial' | 'nenhum';
        valor_pago: number;
        method: string;
      }
    }) => {
      const { payment, ...jobData } = job;
      const { data, error } = await supabase
        .from("mechanic_jobs" as any)
        .insert(jobData)
        .select()
        .single();
      if (error) throw error;
      
      let initialPaymentHistory = null;
      if (payment && payment.tipo !== 'nenhum') {
        const valor_total = job.price;
        const valor_pago = payment.tipo === 'integral' ? valor_total : payment.valor_pago;
        const valor_restante = valor_total - valor_pago;
        
        // 1. Record payment in history
        const { data: histRow } = await supabase.from("os_pagamentos_historico" as any).insert({
          os_id: (data as any).id,
          valor: valor_pago,
          tipo: payment.tipo === 'integral' ? 'integral' : 'parcial',
          payment_method: payment.method || 'pix',
          customer_id: job.customer_id || null,
          customer_name: job.customer_name || null,
          customer_whatsapp: job.customer_whatsapp || null
        }).select().single();
        initialPaymentHistory = histRow;

        // 2. Initial summary entry
        await supabase.from("os_pagamentos" as any).insert({
          os_id: (data as any).id,
          tipo: payment.tipo,
          valor_total,
          valor_pago,
          valor_restante
        });

        // 2. Create sales record for DRE/History
        await supabase.from("sales" as any).insert({
          mechanic_job_id: (data as any).id,
          total: valor_pago,
          payment_method: payment.method || 'pix',
          origin: 'oficina',
          notes: `OS Oficina (${payment.tipo === 'integral' ? 'Pagamento' : 'Pagamento Parcial'})${job.bike_name ? ` — ${job.bike_name}` : ""}`,
          status: 'completed',
          customer_id: (data as any).customer_id || job.customer_id || null,
          customer_name: (data as any).customer_name || job.customer_name || null,
          customer_whatsapp: (data as any).customer_whatsapp || job.customer_whatsapp || null,
        });
      }

      return { job: data as unknown as MechanicJob, initialPaymentHistory };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useAdvanceMechanicJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const nextStatus =
        status === "in_approval" ? "in_repair" :
        status === "in_repair" ? "in_maintenance" :
        status === "in_maintenance" ? "in_analysis" :
        status === "in_analysis" ? "ready" : null;
      if (!nextStatus) throw new Error("Already at final status");
      const { error } = await supabase.from("mechanic_jobs" as any).update({ status: nextStatus }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData(KEY);
      const nextStatus =
        status === "in_approval" ? "in_repair" :
        status === "in_repair" ? "in_maintenance" :
        status === "in_maintenance" ? "in_analysis" :
        status === "in_analysis" ? "ready" : status;
      qc.setQueryData(KEY, (old: any[]) =>
        (old || []).map(j => j.id === id ? { ...j, status: nextStatus } : j)
      );
      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) qc.setQueryData(KEY, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useFinalizeJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: FinalizePayload) => {
      const { jobId, totalValue, paymentMethod, customerName, customerWhatsapp, customerCpf, customerId, bikeName, problem } = payload;

      // 1. Mark OS as delivered
      const { error: jobErr } = await supabase
        .from("mechanic_jobs" as any)
        .update({ status: "delivered" })
        .eq("id", jobId);
      if (jobErr) throw jobErr;

      // 2. Fetch existing payments to handle partial/integral upfront correctly
      const { data: existingPay } = await supabase
        .from("os_pagamentos" as any)
        .select("*")
        .eq("os_id", jobId)
        .maybeSingle();

      const remainingAtFinalize = existingPay ? (existingPay as any).valor_restante : totalValue;
      const isAlreadyPaid = remainingAtFinalize <= 0;

      // 3. Upsert summary record in os_pagamentos
      if (existingPay) {
        await supabase.from("os_pagamentos" as any)
          .update({ tipo: 'integral', valor_total: totalValue, valor_pago: totalValue, valor_restante: 0 })
          .eq("os_id", jobId);
      } else {
        await supabase.from("os_pagamentos" as any)
          .insert({ os_id: jobId, tipo: 'integral', valor_total: totalValue, valor_pago: totalValue, valor_restante: 0 });
      }

      // 4. Record final payment in history if there was a balance
      if (remainingAtFinalize > 0) {
        await supabase.from("os_pagamentos_historico" as any).insert({
          os_id: jobId,
          valor: remainingAtFinalize,
          tipo: 'integral',
          payment_method: paymentMethod || 'pix',
          customer_id: customerId || null,
          customer_name: customerName || null,
          customer_whatsapp: customerWhatsapp || null
        });
      }

      // 3. Upsert customer if we have name + whatsapp
      let resolvedCustomerId = customerId || null;
      if (!resolvedCustomerId && (customerName || customerWhatsapp)) {
        const phone = (customerWhatsapp || "").replace(/\D/g, "");
        if (phone.length >= 10) {
          const { data: existCust } = await supabase
            .from("customers" as any)
            .select("id")
            .ilike("whatsapp", `%${phone.slice(-10)}%`)
            .maybeSingle();
          if (existCust) {
            resolvedCustomerId = (existCust as any).id;
          }
        }
        if (!resolvedCustomerId && customerName) {
          const { data: newCust } = await supabase
            .from("customers" as any)
            .insert({ name: customerName, whatsapp: customerWhatsapp || null, cpf: customerCpf || null })
            .select("id")
            .single();
          resolvedCustomerId = (newCust as any)?.id || null;
        }
      }

      // 4. Create sale record ONLY for the remaining balance (if any)
      let finalSaleId: string | null = null;
      if (!isAlreadyPaid) {
        const { data: sale, error: saleErr } = await supabase
          .from("sales" as any)
          .insert({
            customer_id: resolvedCustomerId,
            total: remainingAtFinalize,
            payment_method: paymentMethod,
            notes: `OS Oficina (Finalização)${bikeName ? ` — ${bikeName}` : ""}${problem ? `: ${problem.slice(0, 40)}` : ""}`,
            card_fee: 0,
            card_tax_percent: 0,
            responsible_name: null,
            origin: 'oficina',
            mechanic_job_id: jobId,
          })
          .select("id")
          .single();
        if (saleErr) console.warn("Could not create sale for OS:", saleErr);
        finalSaleId = (sale as any)?.id || null;
      }

      // 5. Also update customer_id on the mechanic_job itself
      if (resolvedCustomerId && !customerId) {
        await supabase.from("mechanic_jobs" as any)
          .update({ customer_id: resolvedCustomerId })
          .eq("id", jobId);
      }

      return { success: true, saleId: finalSaleId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useRetreatMechanicJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from("mechanic_jobs" as any).update({ status: "in_maintenance" }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData(KEY);
      qc.setQueryData(KEY, (old: any[]) =>
        (old || []).map(j => j.id === id ? { ...j, status: "in_maintenance" } : j)
      );
      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) qc.setQueryData(KEY, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

// Hook dedicated to restoring cancelled jobs back to the budget column
export function useRestoreCancelledJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (job: any) => {
      console.log('🏁 Iniciando restauração (sem select para evitar erro wc.phone). OS:', job);
      
      const uuid = job?.id || job;
      console.log('🔍 UUID identificador:', uuid);

      const { error } = await supabase
        .from("mechanic_jobs" as any)
        .update({ status: "in_approval" })
        .eq("id", uuid);

      if (error) {
        console.error('❌ Erro detalhado no Update:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log("✅ Update enviado com sucesso!");

      // 2. Re-enable AI for this customer if they were disabled
      if (job?.customer_whatsapp) {
        const phoneDigits = job.customer_whatsapp.replace(/\D/g, "");
        const phoneSuffix = phoneDigits.slice(-8);
        
        console.log(`🤖 Re-habilitando IA para o telefone: ${phoneDigits} (sufixo ${phoneSuffix})`);
        
        // Find conversation by phone suffix
        const { data: convs } = await supabase
          .from("whatsapp_conversations")
          .select("id")
          .or(`phone.ilike.%${phoneSuffix}%`);

        if (convs && convs.length > 0) {
          const convIds = convs.map(c => c.id);
          await supabase
            .from("whatsapp_conversations")
            .update({ ai_enabled: true, require_human: false, human_takeover: false })
            .in("id", convIds);
          console.log(`✅ IA reativada para ${convIds.length} conversa(s).`);
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (err: any) => {
      console.error("💥 Falha na mutação de restauração:", err);
    }
  });
}

export function useUpdateMechanicJobDetails() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payment, ...updates }: {
      id: string;
      customer_name?: string | null;
      customer_cpf?: string | null;
      customer_whatsapp?: string | null;
      customer_id?: string | null;
      bike_name?: string | null;
      problem?: string;
      price?: number;
      status?: string;
      sem_custo?: boolean;
      payment?: {
        tipo: 'integral' | 'parcial' | 'nenhum';
        valor_pago: number;
        method: string;
      }
    }) => {
      const { error } = await supabase
        .from("mechanic_jobs" as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;


      if (payment) {
        const { data: existing } = await supabase.from("os_pagamentos" as any).select("*").eq("os_id", id).maybeSingle();
        const valor_total = updates.price || 0;
        const valor_pago = payment.tipo === 'integral' ? valor_total : payment.valor_pago;
        const valor_restante = valor_total - valor_pago;
        
        if (existing) {
          const prevPaid = Number((existing as any).valor_pago) || 0;
          const diff = valor_pago - prevPaid;

          if (payment.tipo === 'nenhum') {
            await supabase.from("os_pagamentos" as any).delete().eq("os_id", id);
          } else {
            await supabase.from("os_pagamentos" as any).update({
              tipo: payment.tipo,
              valor_total,
              valor_pago,
              valor_restante
            }).eq("os_id", id);

            // Record a sale for the DIFFERENCE if they paid more
            if (diff > 0) {
              await supabase.from("sales" as any).insert({
                mechanic_job_id: id,
                total: diff,
                payment_method: payment.method || 'pix',
                origin: 'oficina',
                notes: `OS Oficina (Ajuste Pagamento)${updates.bike_name ? ` — ${updates.bike_name}` : ""}`,
                status: 'completed',
                customer_id: updates.customer_id || null,
                customer_name: updates.customer_name || null,
                customer_whatsapp: updates.customer_whatsapp || null,
              });
            }
          }
        } else if (payment.tipo !== 'nenhum') {
          await supabase.from("os_pagamentos" as any).insert({
            os_id: id,
            tipo: payment.tipo,
            valor_total,
            valor_pago,
            valor_restante
          });

          // Record sale for the initial payment
          await supabase.from("sales" as any).insert({
            mechanic_job_id: id,
            total: valor_pago,
            payment_method: payment.method || 'pix',
            origin: 'oficina',
            notes: `OS Oficina (${payment.tipo === 'integral' ? 'Pagamento' : 'Pagamento Parcial'})${updates.bike_name ? ` — ${updates.bike_name}` : ""}`,
            status: 'completed',
            customer_id: updates.customer_id || null,
            customer_name: updates.customer_name || null,
            customer_whatsapp: updates.customer_whatsapp || null,
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
  });
}

export function useRegisterPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      os_id: string;
      valor: number;
      tipo: 'parcial' | 'integral' | 'desconto';
      payment_method: string | null;
      desconto_valor?: number;
      desconto_motivo?: string | null;
      customer_id?: string | null;
      customer_name?: string | null;
      customer_whatsapp?: string | null;
      bike_name?: string | null;
    }) => {
      // 1. Add to history
      const { data: histRow, error: histErr } = await supabase
        .from("os_pagamentos_historico" as any)
        .insert({
          os_id: payload.os_id,
          valor: payload.valor,
          tipo: payload.tipo,
          payment_method: payload.payment_method,
          desconto_valor: payload.desconto_valor || 0,
          desconto_motivo: payload.desconto_motivo || null,
          customer_id: payload.customer_id,
          customer_name: payload.customer_name,
          customer_whatsapp: payload.customer_whatsapp
        }).select().single();
      if (histErr) throw histErr;

      // 2. Update summary os_pagamentos
      const { data: existing } = await supabase.from("os_pagamentos" as any).select("*").eq("os_id", payload.os_id).maybeSingle();
      
      // We need to know the current total price of the OS to calculate balance properly
      const { data: job } = await supabase.from("mechanic_jobs" as any).select("price").eq("id", payload.os_id).single();
      // Also get all approved additions
      const { data: addsV1 } = await supabase.from("mechanic_job_additions" as any).select("price").eq("job_id", payload.os_id).eq("approval", "accepted");
      const { data: addsV2 } = await supabase.from("os_adicionais" as any).select("valor_total").eq("os_id", payload.os_id).eq("status", "aprovado");
      
      const osBase = (job as any)?.price || 0;
      const addsTotal = [...((addsV1 || []) as any[]), ...((addsV2 || []) as any[])].reduce((s, a) => s + (a.price || a.valor_total || 0), 0);
      const valor_total = osBase + addsTotal;

      // Now sum all payments
      const { data: allHist } = await supabase.from("os_pagamentos_historico" as any).select("valor, desconto_valor").eq("os_id", payload.os_id);
      const valor_pago = ((allHist || []) as any[]).reduce((s, h) => s + (Number(h.valor) || 0), 0);
      const valor_desconto = ((allHist || []) as any[]).reduce((s, h) => s + (Number(h.desconto_valor) || 0), 0);
      const valor_restante = valor_total - valor_pago - valor_desconto;
      const isPaid = valor_restante <= 0;

      if (existing) {
        await supabase.from("os_pagamentos" as any).update({
          tipo: isPaid ? 'integral' : 'parcial',
          valor_total,
          valor_pago: valor_pago + valor_desconto, // Sum discount in 'paid' for UI purposes or keep separate?
          valor_restante
        }).eq("os_id", payload.os_id);
      } else {
        await supabase.from("os_pagamentos" as any).insert({
          os_id: payload.os_id,
          tipo: isPaid ? 'integral' : 'parcial',
          valor_total,
          valor_pago: valor_pago + valor_desconto,
          valor_restante
        });
      }

      // 3. Create sale record if it was a real payment (not just a discount)
      if (payload.valor > 0) {
        await supabase.from("sales" as any).insert({
          mechanic_job_id: payload.os_id,
          total: payload.valor,
          payment_method: payload.payment_method || 'pix',
          origin: 'oficina',
          notes: `Recibo OS (${payload.tipo === 'parcial' ? 'Parcial' : 'Integral'})${payload.bike_name ? ` — ${payload.bike_name}` : ""}`,
          status: 'completed',
          customer_id: payload.customer_id || null,
          customer_name: payload.customer_name || null,
          customer_whatsapp: payload.customer_whatsapp || null,
        });
      }

      // 4. Update job updated_at
      await supabase.from("mechanic_jobs" as any).update({ updated_at: new Date().toISOString() }).eq("id", payload.os_id);

      return histRow;
    },
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData(KEY);

      qc.setQueryData(KEY, (old: any[]) => {
        if (!old) return [];
        return old.map(j => {
          if (j.id === payload.os_id) {
            const newHistoryItem = {
              id: `temp-${Date.now()}`,
              os_id: payload.os_id,
              valor: payload.valor,
              tipo: payload.tipo,
              payment_method: payload.payment_method,
              desconto_valor: payload.desconto_valor || 0,
              desconto_motivo: payload.desconto_motivo || null,
              criado_em: new Date().toISOString()
            };
            return {
              ...j,
              payment_history: [...(j.payment_history || []), newHistoryItem]
            };
          }
          return j;
        });
      });

      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) qc.setQueryData(KEY, context.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
  });
}


export function useDeleteMechanicJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mechanic_jobs" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData(KEY);
      qc.setQueryData(KEY, (old: any[]) => (old || []).filter(j => j.id !== id));
      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) qc.setQueryData(KEY, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useCancelAndArchiveMechanicJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (job: MechanicJob) => {
      // 1. Insere no histórico com tag cancelada, sem mecânico, sem valor
      await supabase.from("bike_service_history" as any).insert({
        frame_number: job.id, // usa o id como frame_number se não houver quadro
        bike_name: job.bike_name || "Bike",
        customer_name: job.customer_name || null,
        customer_cpf: job.customer_cpf || null,
        customer_phone: job.customer_whatsapp || null,
        problem: job.problem,
        mechanic_id: null,
        mechanic_name: null,
        service_order_id: job.id,
        status: "cancelado",
        sem_custo: true, // não contabiliza no DRE
        completed_at: new Date().toISOString(),
      });

      // 2. Cancela qualquer venda vinculada (para não entrar no DRE)
      await supabase.from("sales" as any)
        .update({ status: "cancelled" })
        .eq("mechanic_job_id", job.id);

      // 3. Insere alerta de cancelamento (como solicitado pelo usuário para abrir alerta full-screen)
      await supabase.from("os_alertas" as any).insert({
        os_id: job.id,
        numero_cliente: job.customer_whatsapp,
        visto: false,
        tipo: 'erro',
        contexto: '🚨 Cancelamento Total: O atendimento foi cancelado manualmente no sistema.'
      });

      // 4. Deleta o job do kanban
      await supabase.from("mechanic_jobs" as any).delete().eq("id", job.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["bike_service_history"] });
    },
  });
}

export function useCreateAddition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (addition: {
      job_id: string;
      problem: string;
      price: number;
      labor_cost?: number;
      parts_used?: AdditionPart[];
    }) => {
      const { data, error } = await supabase
        .from("mechanic_job_additions" as any)
        .insert({
          ...addition,
          parts_used: JSON.stringify(addition.parts_used || []),
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as MechanicJobAddition;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateAdditionApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, approval, is_v2 }: { id: string; approval: "accepted" | "refused" | "pending" | "none", is_v2?: boolean }) => {
      if (is_v2) {
        let status = "negado";
        if (approval === "accepted") status = "aprovado";
        else if (approval === "pending") status = "pendente";
        else if (approval === "none") status = "pendente";
        
        const { error } = await supabase
          .from("os_adicionais" as any)
          .update({ status })
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("mechanic_job_additions" as any)
          .update({ approval })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateAddition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, problem, price, labor_cost, parts_used, is_v2 }: {
      id: string;
      problem: string;
      price: number;
      labor_cost: number;
      parts_used: AdditionPart[];
      is_v2?: boolean;
    }) => {
      if (is_v2) {
        const { error } = await supabase
          .from("os_adicionais" as any)
          .update({
            observacoes: problem,
            valor_total: price,
            pecas: parts_used,
          })
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("mechanic_job_additions" as any)
          .update({
            problem,
            price,
            labor_cost,
            parts_used: JSON.stringify(parts_used),
          })
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteAddition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_v2 }: { id: string, is_v2?: boolean }) => {
      if (is_v2) {
        const { error } = await supabase
          .from("os_adicionais" as any)
          .delete()
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("mechanic_job_additions" as any)
          .delete()
          .eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
