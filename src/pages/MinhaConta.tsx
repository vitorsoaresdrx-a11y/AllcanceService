import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  User, 
  Bike, 
  Package, 
  Wrench, 
  MessageCircle, 
  Search,
  ArrowLeft,
  Loader2,
  Lock,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  History,
  Phone,
  LayoutGrid
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatBRL } from "@/lib/format";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function MinhaConta() {
  const [method, setMethod] = useState<"phone" | "cpf">("phone");
  const [identifier, setIdentifier] = useState("");
  const [searchDone, setSearchDone] = useState(false);

  // Search logic
  const { data: customerData, isLoading, refetch } = useQuery({
    queryKey: ["customer_history", identifier],
    enabled: false,
    queryFn: async () => {
      const cleanId = identifier.replace(/\D/g, "");
      if (cleanId.length < 8) throw new Error("Identificador muito curto.");

      const queryIdentifier = method === "phone" 
        ? `whatsapp.ilike.%${cleanId.slice(-8)}%` 
        : `cpf.eq.${cleanId}`;
      
      const { data: customer, error: custError } = await supabase
        .from("customers")
        .select("*")
        .or(queryIdentifier)
        .maybeSingle();

      if (custError) throw custError;
      if (!customer) return null;

      const { data: orders } = await supabase
        .from("service_orders")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });

      const { data: sales } = await supabase
        .from("sales")
        .select("*, sale_items(*)")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });

      return { customer, orders, sales };
    }
  });

  const handleSearch = () => {
    if (identifier.length < 8) {
      toast.error("Entrada inválida", { description: "Por favor, digite seu CPF ou WhatsApp completo." });
      return;
    }
    refetch().then(({ data }) => {
      if (!data) {
        toast.error("Não encontrado", { description: "Nenhum cadastro vinculado a este dado foi localizado." });
      } else {
        setSearchDone(true);
      }
    });
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Masking
  useEffect(() => {
    if (method === "phone") {
      let val = identifier.replace(/\D/g, "");
      if (val.length > 11) val = val.slice(0, 11);
      if (val.length > 10) {
        setIdentifier(`(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`);
      } else if (val.length > 5) {
        setIdentifier(`(${val.slice(0, 2)}) ${val.slice(2, 6)}-${val.slice(6)}`);
      } else if (val.length > 2) {
        setIdentifier(`(${val.slice(0, 2)}) ${val.slice(2)}`);
      } else if (val.length > 0) {
        setIdentifier(`(${val}`);
      }
    } else {
      let val = identifier.replace(/\D/g, "");
      if (val.length > 11) val = val.slice(0, 11);
      if (val.length > 9) {
        setIdentifier(`${val.slice(0, 3)}.${val.slice(3, 6)}.${val.slice(6, 9)}-${val.slice(9)}`);
      } else if (val.length > 6) {
        setIdentifier(`${val.slice(0, 3)}.${val.slice(3, 6)}.${val.slice(6)}`);
      } else if (val.length > 3) {
        setIdentifier(`${val.slice(0, 3)}.${val.slice(3)}`);
      }
    }
  }, [method]); // Run on method change to reset or similar

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (method === "phone") {
        if (val.length > 11) val = val.slice(0, 11);
        if (val.length > 10) {
          setIdentifier(`(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`);
        } else if (val.length > 6) {
          setIdentifier(`(${val.slice(0, 2)}) ${val.slice(2, 6)}-${val.slice(6)}`);
        } else if (val.length > 2) {
          setIdentifier(`(${val.slice(0, 2)}) ${val.slice(2)}`);
        } else {
          setIdentifier(val);
        }
    } else {
        if (val.length > 11) val = val.slice(0, 11);
        if (val.length > 9) {
          setIdentifier(`${val.slice(0, 3)}.${val.slice(3, 6)}.${val.slice(6, 9)}-${val.slice(9)}`);
        } else if (val.length > 6) {
          setIdentifier(`${val.slice(0, 3)}.${val.slice(3, 6)}.${val.slice(6)}`);
        } else if (val.length > 3) {
          setIdentifier(`${val.slice(0, 3)}.${val.slice(3)}`);
        } else {
          setIdentifier(val);
        }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-['Plus_Jakarta_Sans'] selection:bg-[#A1A1AA] selection:text-black">
      
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-[100] h-20 bg-black/80 backdrop-blur-2xl border-b border-white/5 px-6">
        <div className="max-w-5xl mx-auto h-full flex items-center justify-between">
          <Link to="/loja" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-black italic uppercase tracking-tighter">Minha Garagem</h1>
            <span className="text-[10px] font-black text-[#A1A1AA] uppercase tracking-[0.2em] opacity-60">Allcance Hub</span>
          </div>
          <Link to="/minha-conta" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white">
            <User size={18} />
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-28 pb-32">
        <AnimatePresence mode="wait">
          {!searchDone ? (
            <motion.div 
              key="auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto py-12 flex flex-col items-center text-center gap-10"
            >
              <div className="w-24 h-24 bg-[#A1A1AA] rounded-[32px] flex items-center justify-center text-black shadow-[0_20px_40px_rgba(255,255,255,0.1)]">
                <Lock size={44} strokeWidth={2.5} className="animate-pulse" />
              </div>

              <div className="space-y-3">
                <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-none">Bem-vindo à Garagem</h2>
                <p className="text-white/40 text-[13px] font-medium max-w-xs mx-auto leading-relaxed">Acesse seu histórico completo de manutenções, peças e garantias com total segurança.</p>
              </div>

              <div className="w-full space-y-6">
                {/* Method Switcher */}
                <div className="grid grid-cols-2 p-1.5 bg-white/[0.03] border border-white/5 rounded-2xl h-14">
                  <button 
                    onClick={() => { setMethod("phone"); setIdentifier(""); }}
                    className={`flex items-center justify-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${method === "phone" ? "bg-white text-black shadow-lg" : "text-white/30 hover:text-white"}`}
                  >
                    <Phone size={14} /> WhatsApp
                  </button>
                  <button 
                    onClick={() => { setMethod("cpf"); setIdentifier(""); }}
                    className={`flex items-center justify-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${method === "cpf" ? "bg-white text-black shadow-lg" : "text-white/30 hover:text-white"}`}
                  >
                    <ShieldCheck size={14} /> CPF
                  </button>
                </div>

                <div className="relative group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[#A1A1AA]/40 group-focus-within:text-[#A1A1AA] transition-colors pointer-events-none">
                    {method === "phone" ? <Phone size={20} /> : <User size={20} />}
                  </div>
                  <input 
                    type="text"
                    placeholder={method === "phone" ? "(15) 00000-0000" : "000.000.000-00"}
                    value={identifier}
                    onChange={handleInputChange}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="w-full h-16 bg-white/[0.03] border-2 border-white/5 rounded-2xl pl-16 pr-6 text-lg font-black text-white focus:outline-none focus:border-[#A1A1AA] focus:bg-white/[0.05] transition-all placeholder:text-white/10"
                  />
                </div>

                <button 
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="w-full h-16 bg-[#A1A1AA] text-black rounded-2xl font-black uppercase text-[13px] tracking-[0.2em] shadow-[0_20px_40px_rgba(161,161,170,0.15)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-30"
                >
                  {isLoading ? <Loader2 size={24} className="animate-spin" /> : <>AUTENTICAR <ChevronRight size={20} strokeWidth={3} /></>}
                </button>
              </div>

              <div className="pt-6">
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.4em]">Allcance Data Security</p>
              </div>
            </motion.div>
          ) : !customerData ? (
             <motion.div 
               key="error"
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="max-w-md mx-auto py-20 text-center space-y-8"
             >
               <div className="w-20 h-20 bg-zinc-500/10 rounded-full flex items-center justify-center mx-auto text-zinc-500">
                  <Lock size={40} />
               </div>
               <div className="space-y-4">
                 <h2 className="text-2xl font-black uppercase italic tracking-tight">Registro não localizado</h2>
                 <p className="text-white/40 text-sm font-medium leading-relaxed">Não encontramos dados vinculados a este {method === "phone" ? "WhatsApp" : "CPF"}. Verifique o número digitado ou fale com um consultor.</p>
               </div>
               <button 
                 onClick={() => setSearchDone(false)}
                 className="h-14 px-8 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all active:scale-95"
               >
                 Tentar outro acesso
               </button>
             </motion.div>
          ) : (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-12 animate-in fade-in duration-700"
            >
              {/* Profile Card */}
              <div className="bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 rounded-[40px] p-8 md:p-12 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-80 h-80 bg-[#A1A1AA]/5 rounded-full -mr-40 -mt-40 blur-[80px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#27272A]/5 rounded-full -ml-32 -mb-32 blur-[80px] pointer-events-none" />
                
                <div className="relative flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-10">
                  <div className="w-24 h-24 rounded-[32px] bg-[#A1A1AA] text-black flex items-center justify-center shadow-[0_20px_40px_rgba(255,255,255,0.1)]">
                     <User size={44} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 text-center md:text-left space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-[#A1A1AA] uppercase tracking-[0.3em]">Proprietário Logado</span>
                      <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter leading-none">{customerData.customer.name.split(' ')[0]}</h2>
                    </div>
                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
                       <div className="px-5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
                          <History size={14} className="text-[#A1A1AA]" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Desde {formatDate(customerData.customer.created_at)}</span>
                       </div>
                       <div className="px-5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
                          <CheckCircle2 size={14} className="text-[#27272A]" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#27272A]">Verificado</span>
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Hub */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {[
                   { label: "Manutenções", val: customerData.orders?.length || 0, icon: <Wrench size={20} />, color: "text-[#A1A1AA]" },
                   { label: "Compras", val: customerData.sales?.length || 0, icon: <Package size={20} />, color: "text-[#27272A]" },
                   { label: "Bikes", val: new Set(customerData.orders?.map((o: any) => o.bike_name)).size || 0, icon: <Bike size={20} />, color: "text-white" },
                   { label: "Garantias", val: "Ativas", icon: <ShieldCheck size={20} />, color: "text-zinc-400" }
                 ].map((stat, i) => (
                   <div key={i} className="bg-white/[0.02] border border-white/5 p-6 rounded-[28px] space-y-1 hover:bg-white/[0.04] transition-all">
                      <div className={`p-2 w-10 h-10 rounded-xl mb-4 bg-white/5 flex items-center justify-center ${stat.color}`}>{stat.icon}</div>
                      <p className="text-2xl font-black">{stat.val}</p>
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{stat.label}</p>
                   </div>
                 ))}
              </div>

              {/* Garagem Section */}
              <section className="space-y-8">
                 <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-[#A1A1AA]/10 text-[#A1A1AA] flex items-center justify-center">
                      <Bike size={20} />
                   </div>
                   <h3 className="text-xl font-black italic uppercase tracking-tighter">Minha Garagem Particular</h3>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {customerData.orders?.map((order: any) => (
                      <motion.div 
                        whileHover={{ y: -5 }}
                        key={order.id} 
                        className="bg-white/[0.02] border border-white/5 rounded-[32px] p-6 lg:p-8 relative overflow-hidden group shadow-2xl"
                      >
                        <div className="absolute top-0 right-0 p-6 flex flex-col items-end gap-2">
                           <div className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                             order.status === 'completed' 
                             ? 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400 shadow-[0_0_20px_rgba(161,161,170,0.1)]' 
                             : 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400 shadow-[0_0_20px_rgba(161,161,170,0.1)] animate-pulse'
                           }`}>
                             {order.status === 'completed' ? 'Finalizado' : 'Mecânica'}
                           </div>
                        </div>

                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/20">
                            <Wrench size={24} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest leading-none mb-1">Cód: #{order.id.slice(-4)}</p>
                            <h4 className="text-lg font-black text-white uppercase tracking-tighter">{order.bike_name || "Mountain Bike"}</h4>
                          </div>
                        </div>

                        <div className="space-y-4">
                           <div className="flex justify-between items-center py-4 border-y border-white/5">
                              <span className="text-[10px] font-bold text-white/20 uppercase">Data do Serviço</span>
                              <span className="text-sm font-black text-white">{formatDate(order.created_at)}</span>
                           </div>
                           <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-white/20 uppercase">Investimento</span>
                              <span className="text-lg font-black text-[#A1A1AA]">{formatBRL(order.price)}</span>
                           </div>
                        </div>

                        <button className="w-full mt-6 h-12 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-white hover:text-black transition-all">
                           Ver Relatório Completo
                        </button>
                      </motion.div>
                    ))}
                    
                    {(!customerData.orders || customerData.orders.length === 0) && (
                      <div className="col-span-full py-16 bg-white/[0.01] border-2 border-dashed border-white/5 rounded-[40px] text-center flex flex-col items-center gap-4">
                         <div className="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center text-white/10"><Bike size={32} /></div>
                         <p className="text-xs font-black uppercase tracking-[0.3em] text-white/20">Sua garagem está vazia.</p>
                      </div>
                    )}
                 </div>
              </section>

              {/* Shopping Hub */}
              <section className="space-y-8">
                 <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-[#27272A]/10 text-[#27272A] flex items-center justify-center">
                      <Package size={20} />
                   </div>
                   <h3 className="text-xl font-black italic uppercase tracking-tighter">Histórico de Compras</h3>
                 </div>

                 <div className="grid grid-cols-1 gap-4">
                    {customerData.sales?.map((sale: any) => (
                      <div key={sale.id} className="bg-white/[0.03] border border-white/10 rounded-[32px] p-6 flex flex-col gap-6 group hover:border-[#A1A1AA]/30 transition-all shadow-xl">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-[#A1A1AA]/10 text-[#A1A1AA] flex items-center justify-center">
                                 <Package size={22} />
                              </div>
                              <div>
                                 <span className="text-[10px] font-black text-white/20 uppercase tracking-widest leading-none mb-1">Cód: #{sale.id?.slice(-4)}</span>
                                 <h4 className="text-sm font-black text-white uppercase tracking-tight">{formatDate(sale.created_at)}</h4>
                              </div>
                           </div>
                           <div className="flex items-center gap-3">
                              <div className="px-3 py-1.5 rounded-lg bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 text-[9px] font-black uppercase tracking-widest">
                                 Status: Concluído
                              </div>
                              <span className="text-xl font-black text-[#A1A1AA]">{formatBRL(sale.total)}</span>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {sale.sale_items?.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-2xl">
                               <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 text-[10px] font-black">
                                 {item.quantity}x
                               </div>
                               <span className="text-[11px] font-bold text-white/70 line-clamp-1">{item.description}</span>
                            </div>
                          ))}
                        </div>

                        <button className="w-full h-12 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2">
                          VER COMPROVANTE <History size={14} />
                        </button>
                      </div>
                    ))}
                 </div>
              </section>

              {/* Action Footer */}
              <footer className="pt-20 flex flex-col items-center gap-10">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                <div className="text-center space-y-4 px-6">
                   <p className="text-xs text-white/30 font-medium font-bold uppercase tracking-widest">Dúvidas sobre seu histórico?</p>
                   <a 
                    href="https://wa.me/5515996128054" 
                    target="_blank" 
                    className="inline-flex items-center gap-4 bg-[#A1A1AA] text-black px-10 py-5 rounded-[24px] font-black uppercase text-xs tracking-[0.2em] shadow-[0_20px_40px_rgba(161,161,170,0.15)] hover:scale-105 transition-all"
                   >
                    <MessageCircle size={20} strokeWidth={3} /> SUPORTE TÉCNICO
                   </a>
                </div>
                <button 
                  onClick={() => setSearchDone(false)} 
                  className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] hover:text-[#A1A1AA] transition-colors"
                >
                  Sair da Garagem
                </button>
              </footer>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
