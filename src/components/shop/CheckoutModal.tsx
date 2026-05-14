import { useState } from "react";
import { Drawer } from "vaul";
import { 
  User, Mail, Phone, ShieldCheck, ArrowRight, CheckCircle2, 
  ChevronLeft, X, CreditCard, Package, MapPin, Loader2, Truck, 
  MessageCircle, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/hooks/useCart";
import { formatBRL } from "@/lib/format";
import { CheckoutForm } from "./CheckoutForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function CheckoutModal() {
  const { items, shipping, setShipping, isCheckoutOpen, setCheckoutOpen } = useCart();
  const [step, setStep] = useState<"cep" | "summary" | "info" | "payment" | "success">("cep");
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [customer, setCustomer] = useState({
    nome: "", email: "", cpf: "", telefone: ""
  });

  const cartTotal = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const finalTotal = cartTotal + (shipping?.valor || 0);

  const handleCalculateShipping = async () => {
    const targetCep = cep.replace(/\D/g, "");
    if (targetCep.length !== 8) {
      toast.error("CEP inválido");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("calcular-frete-rodonaves", {
        body: { 
          destinationZip: targetCep, 
          invoiceValue: cartTotal, 
          preset: items.some(i => i.price > 1000) ? "bike_completa" : "quadro",
          quantidade: 1 
        }
      });
      if (error || !data.sucesso) throw new Error(data?.error || "Falha no cálculo");
      setShipping({ 
        descricao: `Rodonaves (${data.cidade})`, 
        valor: data.valorFrete + 30 
      });
      setStep("summary");
    } catch (e: any) {
      toast.error("Erro no frete", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = () => {
    const itemsList = items.map(i => `- ${i.quantity}x ${i.name}`).join('\n');
    const msg = `Olá! Gostaria de finalizar meu pedido:\n\n${itemsList}\n\n*Produtos: ${formatBRL(cartTotal)}*\n*Frete: ${formatBRL(shipping?.valor || 0)} (${shipping?.descricao})*\n\n*Total: ${formatBRL(finalTotal)}*`;
    window.open(`https://wa.me/5515996128054?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleClose = () => {
    setStep("cep");
    setShowCancelConfirm(false);
    setCheckoutOpen(false);
  };

  return (
    <Drawer.Root open={isCheckoutOpen} onOpenChange={setCheckoutOpen}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150]" />
        <Drawer.Content className="fixed bottom-0 inset-x-0 z-[160] max-h-[96vh] bg-[#050505] rounded-t-[40px] border-t border-white/5 flex flex-col focus:outline-none overflow-hidden" aria-describedby="checkout-desc">
          <Drawer.Title className="sr-only">Finalizar Compra</Drawer.Title>
          <p id="checkout-desc" className="sr-only">Formulário de entrega e pagamento seguro.</p>
          
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 md:p-12 scrollbar-hide">
            <div className="max-w-2xl mx-auto">
              
              <AnimatePresence mode="wait">
                {step === "cep" && (
                  <motion.div key="cep" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8 text-center">
                    <div className="w-20 h-20 bg-[#A1A1AA] rounded-3xl mx-auto flex items-center justify-center text-black shadow-lg shadow-[#A1A1AA]/20">
                      <Truck size={36} strokeWidth={2.5} />
                    </div>
                    <div className="space-y-2">
                       <h2 className="text-4xl font-black italic uppercase tracking-tighter">Calcular Entrega</h2>
                       <p className="text-white/30 text-sm font-medium">Informe seu CEP para calcularmos o frete antes de prosseguir.</p>
                    </div>
                    <div className="max-w-xs mx-auto space-y-4">
                      <div className="relative">
                         <MapPin size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" />
                         <input 
                           autoFocus
                           value={cep} 
                           onChange={e => {
                             const v = e.target.value.replace(/\D/g, "").slice(0, 8);
                             setCep(v.length > 5 ? `${v.slice(0,5)}-${v.slice(5)}` : v);
                           }} 
                           className="w-full h-16 bg-white/[0.03] border border-white/5 rounded-2xl pl-14 pr-6 text-xl font-black text-center tracking-widest text-[#A1A1AA] focus:border-[#A1A1AA] outline-none transition-all placeholder:text-white/5" 
                           placeholder="00000-000"
                         />
                      </div>
                      <button 
                        onClick={handleCalculateShipping}
                        className="w-full h-16 bg-[#A1A1AA] text-black rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-3 disabled:opacity-20"
                        disabled={loading || cep.length < 9}
                      >
                        {loading ? <Loader2 size={24} className="animate-spin" /> : "Consultar Frete"}
                      </button>
                    </div>
                  </motion.div>
                )}

                 {step === "summary" && !showCancelConfirm && (
                    <motion.div key="summary" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                       <header className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                            <Package size={20} />
                         </div>
                         <div>
                            <h2 className="text-xl font-black italic uppercase tracking-tighter">Resumo da Compra</h2>
                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">Revise os valores para prosseguir</p>
                         </div>
                       </header>
  
                       <div className="bg-white/[0.02] border border-white/5 rounded-[24px] overflow-hidden">
                          <div className="p-5 space-y-3 max-h-40 overflow-y-auto no-scrollbar border-b border-white/5">
                             {items.map(item => (
                                <div key={item.id} className="grid grid-cols-[1fr_auto] gap-4 items-start text-white/60">
                                   <span className="text-[11px] font-bold leading-tight">{item.quantity}x {item.name}</span>
                                   <span className="text-[11px] font-black text-white whitespace-nowrap">{formatBRL(item.price * item.quantity)}</span>
                                </div>
                             ))}
                          </div>
                          <div className="p-6 bg-white/[0.01] space-y-3">
                             <div className="flex items-center justify-between text-white/30 text-[10px] font-bold uppercase tracking-widest">
                                <span>Subtotal</span>
                                <span>{formatBRL(cartTotal)}</span>
                             </div>
                             <div className="flex items-start justify-between">
                                <div className="flex flex-col gap-0.5">
                                   <span className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA]">Entrega</span>
                                   <span className="text-[9px] font-bold text-white/20 uppercase max-w-[140px] leading-tight flex items-center gap-1.5">
                                      <Truck size={10} /> {shipping?.descricao}
                                   </span>
                                </div>
                                <span className="text-sm font-black text-[#A1A1AA]">{formatBRL(shipping?.valor || 0)}</span>
                             </div>
                             <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                <span className="text-lg font-black italic uppercase">Total</span>
                                <span className="text-3xl font-black text-[#A1A1AA] tracking-tighter shadow-sm">{formatBRL(finalTotal)}</span>
                             </div>
                          </div>
                       </div>
  
                       <div className="flex flex-col gap-3">
                          <button onClick={() => setStep("info")} className="h-14 bg-[#A1A1AA] text-black rounded-xl font-black uppercase text-[11px] tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2">
                             PROSSEGUIR PARA PAGAMENTO <ArrowRight size={16} />
                          </button>
                          <button onClick={handleWhatsApp} className="h-14 bg-white/5 border border-white/10 text-white rounded-xl font-black uppercase text-[11px] tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                             <MessageCircle size={16} /> SUPORTE
                          </button>
                          <button onClick={() => setShowCancelConfirm(true)} className="mt-2 text-[9px] font-black uppercase tracking-[0.4em] text-white/10 hover:text-zinc-500 transition-colors">
                            CANCELAR COMPRA
                          </button>
                       </div>
                    </motion.div>
                  )}
 
                 {step === "info" && (
                    <motion.div key="info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-8">
                       <header className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                             <User size={20} />
                          </div>
                          <div>
                             <h2 className="text-xl font-black italic uppercase tracking-tighter">Dados de Entrega</h2>
                             <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">Precisamos para identificar seu envio</p>
                          </div>
                       </header>

                       <div className="space-y-4">
                          <div className="space-y-1.5">
                             <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">Nome Completo</label>
                             <input 
                               value={customer.nome}
                               onChange={e => setCustomer({...customer, nome: e.target.value})}
                               className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-white font-bold outline-none focus:border-[#A1A1AA] transition-all"
                               placeholder="Como quer ser chamado?"
                             />
                          </div>
                          <div className="space-y-1.5">
                             <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">E-mail</label>
                             <input 
                               value={customer.email}
                               onChange={e => setCustomer({...customer, email: e.target.value})}
                               className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-white font-bold outline-none focus:border-[#A1A1AA] transition-all"
                               placeholder="Seu melhor e-mail"
                               type="email"
                             />
                          </div>
                          <div className="grid grid-cols-[1fr_1.1fr] gap-3">
                            <div className="space-y-1.5">
                               <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1 text-nowrap">WhatsApp</label>
                               <input 
                                 value={customer.telefone}
                                 onChange={e => setCustomer({...customer, telefone: e.target.value})}
                                 className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-white font-bold outline-none focus:border-[#A1A1AA] transition-all"
                                 placeholder="(00) 00000-0000"
                               />
                            </div>
                            <div className="space-y-1.5">
                               <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-1">CPF</label>
                               <input 
                                 value={customer.cpf}
                                 onChange={e => setCustomer({...customer, cpf: e.target.value})}
                                 className="w-full h-14 bg-white/5 border border-white/10 rounded-xl px-4 text-white font-bold outline-none focus:border-[#A1A1AA] transition-all"
                                 placeholder="Para nota fiscal"
                               />
                            </div>
                          </div>
                       </div>

                       <div className="flex flex-col gap-3 pt-4 border-t border-white/5 mt-6">
                          <button 
                            disabled={!customer.nome || !customer.email || !customer.cpf}
                            onClick={() => setStep("payment")} 
                            className="h-16 bg-[#A1A1AA] text-black rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-20"
                          >
                             PAGAR AGORA <ArrowRight size={18} strokeWidth={3} />
                          </button>
                          <button onClick={() => setStep("summary")} className="mt-2 text-[9px] font-black uppercase tracking-[0.4em] text-white/10 hover:text-white transition-colors">
                             Voltar ao Resumo
                          </button>
                       </div>
                    </motion.div>
                 )}
 
                 {step === "payment" && (
                    <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                       <CheckoutForm items={items} shipping={shipping!} customer={customer} onSuccess={() => setStep("success")} onCancel={() => setStep("summary")} />
                    </motion.div>
                 )}

                {step === "success" && (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-20 text-center space-y-8">
                    <div className="w-24 h-24 bg-zinc-500 rounded-[32px] mx-auto flex items-center justify-center text-black">
                       <CheckCircle2 size={48} strokeWidth={2.5} />
                    </div>
                    <div className="space-y-4">
                       <h2 className="text-4xl font-black italic uppercase tracking-tighter">Pedido Aprovado!</h2>
                       <p className="text-white/40 text-base font-medium max-w-sm mx-auto leading-relaxed">
                         Obrigado. Enviamos um e-mail de confirmação para {customer.email}.
                       </p>
                    </div>
                    <button onClick={handleClose} className="h-16 px-12 bg-white text-black rounded-2xl font-black uppercase text-xs tracking-widest">Sair</button>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
