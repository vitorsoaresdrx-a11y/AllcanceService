import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StoreSale {
  id: string;
  external_reference: string;
  payment_id: string | null;
  status: string;
  status_detail: string | null;
  customer_name: string;
  customer_email: string;
  customer_cpf: string | null;
  customer_phone: string | null;
  items: any[];
  total_amount: number; // Keep as total_amount for components but map from transaction_amount
  transaction_amount: number;
  shipping_amount: number;
  payment_method: string | null;
  installments: number | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  status_label?: string;
}

const statusMap: Record<string, string> = {
  'accredited': 'Aprovado',
  'pending_contingency': 'Pendente (Contingência)',
  'pending_review_manual': 'Em Revisão Manual',
  'cc_rejected_bad_filled_card_number': 'Número de cartão inválido',
  'cc_rejected_bad_filled_date': 'Data de validade inválida',
  'cc_rejected_bad_filled_other': 'Dados do cartão incorretos',
  'cc_rejected_bad_filled_security_code': 'CVV incorreto',
  'cc_rejected_blacklist': 'Cartão bloqueado',
  'cc_rejected_call_for_authorize': 'Autorize com o banco',
  'cc_rejected_card_disabled': 'Cartão desativado',
  'cc_rejected_card_error': 'Erro no cartão',
  'cc_rejected_duplicated_payment': 'Pagamento duplicado',
  'cc_rejected_high_risk': 'Recusado por segurança',
  'cc_rejected_insufficient_amount': 'Saldo insuficiente',
  'cc_rejected_invalid_installments': 'Parcelas inválidas',
  'cc_rejected_max_attempts': 'Limite de tentativas excedido',
  'cc_rejected_other_reason': 'Recusado pelo banco',
  'pending': 'Pendente',
  'approved': 'Aprovado',
  'authorized': 'Autorizado',
  'in_process': 'Em Processamento',
  'in_mediation': 'Em Mediação',
  'rejected': 'Recusado',
  'cancelled': 'Cancelado',
  'refunded': 'Reembolsado',
  'charged_back': 'Chargeback',
};

const KEY = ["store_sales"];

export function useStoreSales() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("store_sales_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "store_sales" },
        () => qc.invalidateQueries({ queryKey: KEY })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_sales")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(sale => ({
        ...sale,
        total_amount: sale.transaction_amount || 0,
        status_label: statusMap[sale.status_detail || ''] || statusMap[sale.status] || (sale.status === 'approved' ? 'Aprovado' : 'Pendente')
      })) as StoreSale[];
    },
  });
}
