/**
 * PREMIUM MERCADO PAGO CHECKOUT FORM
 * This component handles card tokenization via MP SDK v2 and completes the payment process.
 * It features a polished UI/UX, real-time validations, and localized error handling.
 */

import { useState, useEffect } from "react";
// @ts-ignore
import { loadMercadoPago } from "@mercadopago/sdk-js";
import { 
  CreditCard, 
  ShieldCheck, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Lock,
  LockKeyhole,
  User,
  Mail,
  Phone
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";

interface CheckoutFormProps {
  items: any[];
  shipping: { descricao: string, valor: number };
  customer: {
    nome: string;
    email: string;
    cpf: string;
    telefone: string;
  };
  onSuccess: (paymentId: string) => void;
  onCancel: () => void;
}

// Localized Error Map
const ERROR_MAP: Record<string, string> = {
  "cc_rejected_insufficient_amount": "Saldo insuficiente no cartão.",
  "cc_rejected_bad_filled_security_code": "Código de segurança inválido.",
  "cc_rejected_bad_filled_date": "Data de validade incorreta.",
  "cc_rejected_bad_filled_other": "Verifique os dados do cartão.",
  "cc_rejected_call_for_authorize": "Pagamento não autorizado pela operadora.",
  "cc_rejected_card_disabled": "Este cartão está desativado.",
  "cc_rejected_high_risk": "Pagamento recusado por segurança.",
  "cc_rejected_invalid_installments": "Quantidade de parcelas inválida.",
  "internal_error": "Erro interno no processamento. Tente novamente."
};

export function CheckoutForm({ items, shipping, customer, onSuccess, onCancel }: CheckoutFormProps) {
  const [loading, setLoading] = useState(false);

  const total = items.reduce((acc, i) => acc + (i.price * i.quantity), 0) + (shipping?.valor || 0);

  const handlePayment = async () => {
    setLoading(true);
    try {
      // Direct call to bypass SDK 401 quirks
      const functionUrl = "https://cxyfwikrjtovvyvcyacl.supabase.co/functions/v1/mercadopago-checkout";
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': (supabase as any).supabaseKey, // Use the project anon key
        },
        body: JSON.stringify({
          itens: items.map(i => ({ 
            nome: i.name, 
            quantidade: i.quantity, 
            preco_unitario: i.price 
          })),
          frete: shipping,
          cliente: customer
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Erro ${response.status}: ${errText || "Falha na comunicação."}`);
      }

      const data = await response.json();

      if (data.init_point) {
        // Redirect to MP Checkout Pro
        window.location.href = data.init_point;
      } else {
        throw new Error("Não foi possível gerar o link de pagamento.");
      }
    } catch (err: any) {
      console.error("Payment Error:", err);
      toast.error("Erro no Checkout", { 
        description: err.message || "Falha na conexão com a Supabase. Verifique sua rede." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 py-4">
      <header className="space-y-6 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-[#A1A1AA] text-black flex items-center justify-center shadow-[0_0_30px_rgba(161,161,170,0.4)] mb-2">
          <ShieldCheck size={32} strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Pedido Quase Pronto</h2>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mt-2">Escolha sua forma de pagamento no próximo passo</p>
        </div>
      </header>

      <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-8 space-y-6">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] block">Total do Pedido</span>
            <span className="text-4xl font-black text-[#A1A1AA] tracking-tighter italic leading-none">{formatBRL(total)}</span>
          </div>
          <div className="text-right space-y-1">
             <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] block">Itens</span>
             <span className="text-lg font-bold text-white/60">{items.length} unidades</span>
          </div>
        </div>

        <div className="h-px bg-white/5 w-full" />

        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5">
              <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block mb-1">Entrega</span>
              <span className="text-[10px] font-bold text-white/70 block truncate">{shipping.descricao}</span>
           </div>
           <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 text-right">
              <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block mb-1">Cliente</span>
              <span className="text-[10px] font-bold text-white/70 block truncate">{customer.nome.split(' ')[0]}</span>
           </div>
        </div>
      </div>

      <div className="space-y-4">
        <button 
          onClick={handlePayment}
          disabled={loading}
          className="w-full h-20 bg-[#A1A1AA] text-black rounded-3xl font-black uppercase text-[15px] tracking-[0.2em] shadow-[0_20px_50px_rgba(161,161,170,0.3)] hover:bg-white hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-30 group"
        >
          {loading ? (
            <div className="flex items-center gap-3">
              <Loader2 className="animate-spin" size={24} />
              <span className="animate-pulse">GERANDO PAGAMENTO...</span>
            </div>
          ) : (
            <>PAGAR AGORA <div className="p-1.5 bg-black/10 rounded-xl group-hover:bg-black/5 transition-colors"><ArrowRight size={22} strokeWidth={3} /></div></>
          )}
        </button>

        <button 
          onClick={onCancel}
          disabled={loading}
          className="w-full text-[10px] font-black text-white/10 uppercase tracking-[0.6em] hover:text-white transition-colors py-4"
        >
          Revisar Pedido
        </button>
      </div>

      <footer className="flex flex-col items-center gap-6 pt-4">
        <div className="flex items-center gap-6 grayscale opacity-30">
          <img src="https://upload.wikimedia.org/wikipedia/commons/1/1b/Mercado_Pago_logo.svg" className="h-5" alt="Mercado Pago" />
          <div className="w-px h-4 bg-white/20" />
          <div className="flex items-center gap-2">
            <Lock size={12} className="text-[#A1A1AA]" />
            <span className="text-[9px] font-black text-white uppercase tracking-widest">Ambiente 100% Blindado</span>
          </div>
        </div>
        
        <p className="max-w-[200px] text-center text-[8px] font-medium text-white/10 leading-relaxed uppercase tracking-tighter">
          Seus dados estão protegidos por criptografia de ponta a ponta e processados oficialmente pelo Mercado Pago.
        </p>
      </footer>
    </div>
  );
}
