/**
 * VENDAS ONLINE DASHBOARD
 * This page lists all approved (and rejected) sales from the Mercado Pago integration.
 * It provides a clear overview of revenue, items, and customer data.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  ShoppingBag, 
  User, 
  Calendar, 
  Package, 
  CreditCard,
  History,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatBRL } from "@/lib/format";
import { motion } from "framer-motion";

export default function VendasOnline() {
  const { data: sales, isLoading } = useQuery({
    queryKey: ["vendas-checkout"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("mercadopago-checkout", {
        method: "GET"
      });
      if (error) throw error;
      return data;
    }
  });

  const formatDate = (date: string) => new Date(date).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <div className="px-3 py-1 rounded-lg bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-2"><CheckCircle2 size={12} /> Aprovado</div>;
      case "rejected":
        return <div className="px-3 py-1 rounded-lg bg-zinc-500/10 border border-zinc-500/20 text-zinc-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-2"><XCircle size={12} /> Recusado</div>;
      case "cancelled":
        return <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/40 text-[9px] font-black uppercase tracking-widest flex items-center gap-2"><History size={12} /> Cancelado</div>;
      default:
        return <div className="px-3 py-1 rounded-lg bg-zinc-500/10 border border-zinc-500/20 text-zinc-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-2"><Clock size={12} /> Pendente</div>;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-['Plus_Jakarta_Sans']">
      <header className="fixed top-0 inset-x-0 z-50 h-20 bg-black/80 backdrop-blur-2xl border-b border-white/5 px-6">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/vendas" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-xl font-black italic uppercase tracking-tighter">Vendas Store Checkout</h1>
              <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">Painel de Transações Mercado Pago</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
             <div className="text-right">
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest block">Total Aprovado</span>
                <span className="text-xl font-black text-[#A1A1AA]">
                  {formatBRL(sales?.filter((s: any) => s.status === 'approved').reduce((acc: number, s: any) => acc + Number(s.total_amount), 0) || 0)}
                </span>
             </div>
             <div className="w-px h-8 bg-white/5" />
             <div className="w-12 h-12 rounded-2xl bg-[#A1A1AA]/10 text-[#A1A1AA] flex items-center justify-center">
                <ShoppingBag size={24} />
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-32 pb-20">
        {isLoading ? (
          <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
             <div className="w-16 h-16 border-4 border-[#A1A1AA]/20 border-t-[#A1A1AA] rounded-full animate-spin" />
             <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Carregando Transações...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sales?.length === 0 ? (
               <div className="py-32 text-center space-y-4 bg-white/[0.02] border-2 border-dashed border-white/5 rounded-[40px]">
                  <ShoppingBag size={48} className="mx-auto text-white/5" />
                  <p className="text-xs font-bold text-white/20 uppercase tracking-widest">Nenhuma venda encontrada no sistema.</p>
               </div>
            ) : (
               <div className="grid grid-cols-1 gap-4">
                  {sales?.map((sale: any) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={sale.id} 
                      className="bg-white/[0.03] border border-white/5 rounded-[32px] p-6 group hover:border-[#A1A1AA]/30 transition-all flex flex-col lg:flex-row lg:items-center gap-8"
                    >
                      <div className="flex items-center gap-6 min-w-[280px]">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${sale.status === 'approved' ? 'bg-zinc-500/10 text-zinc-400' : 'bg-zinc-500/10 text-zinc-500'}`}>
                           {sale.status === 'approved' ? <ShoppingBag size={24} /> : <AlertCircle size={24} />}
                        </div>
                        <div>
                           <h3 className="text-base font-black text-white uppercase tracking-tight">{sale.customer_name || "Cliente Local"}</h3>
                           <div className="flex items-center gap-3 mt-1 text-white/30">
                              <span className="text-[10px] font-black uppercase tracking-widest">{sale.customer_email}</span>
                           </div>
                        </div>
                      </div>

                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6">
                         <div className="space-y-1">
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Data</span>
                            <div className="flex items-center gap-2 text-xs font-bold">
                               <Calendar size={14} className="text-[#A1A1AA]" />
                               {formatDate(sale.created_at)}
                            </div>
                         </div>
                         <div className="space-y-1">
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Pagamento ID</span>
                            <div className="flex items-center gap-2 text-xs font-bold font-mono">
                               <CreditCard size={14} className="text-zinc-500" />
                               #{sale.payment_id}
                            </div>
                         </div>
                         <div className="space-y-1">
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Valor Total</span>
                            <div className="text-lg font-black text-white">
                                {formatBRL(sale.total_amount)}
                            </div>
                         </div>
                         <div className="flex items-center justify-end md:justify-start lg:justify-end">
                            {getStatusBadge(sale.status)}
                         </div>
                      </div>

                      <div className="lg:pl-8 lg:border-l lg:border-white/5 space-y-3">
                         <div className="flex items-center gap-2">
                             <Package size={14} className="text-white/20" />
                             <span className="text-[10px] font-extrabold text-white/40 uppercase tracking-widest">
                               {sale.items?.length || 0} Itens Comprados
                             </span>
                         </div>
                         <div className="flex flex-wrap gap-2">
                            {sale.items?.slice(0, 2).map((item: any, idx: number) => (
                               <div key={idx} className="px-3 py-1.5 bg-white/5 rounded-lg text-[9px] font-bold text-white/60">
                                 {item.quantidade}x {item.nome}
                               </div>
                            ))}
                            {sale.items?.length > 2 && (
                               <div className="px-3 py-1.5 bg-white/5 rounded-lg text-[9px] font-bold text-white/30">
                                 +{sale.items.length - 2}
                               </div>
                            )}
                         </div>
                      </div>
                    </motion.div>
                  ))}
               </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
