import { useState, useEffect } from "react";
import { Truck, Search, ShieldCheck, MapPin, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { toast } from "sonner";
import { useCart } from "@/hooks/useCart";

interface ShippingSimulatorProps {
  invoiceValue?: number;
  productType?: "bike" | "part";
  className?: string;
}

export function ShippingSimulator({ invoiceValue, productType = "bike", className = "" }: ShippingSimulatorProps) {
  const { setShipping, items } = useCart();
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<any>(null);

  const cartTotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const finalInvoiceValue = invoiceValue || cartTotal || 500;

  const steps = [
    { icon: <Search size={18} />, text: "Verificando Regional" },
    { icon: <MapPin size={18} />, text: "Localizando CEP" },
    { icon: <ShieldCheck size={18} />, text: "Calculando Seguro" },
    { icon: <Sparkles size={18} />, text: "Finalizando Cotação" }
  ];

  useEffect(() => {
    let interval: any;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep(prev => (prev < steps.length - 1 ? prev + 1 : prev));
      }, 800);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleCalculate = async () => {
    const targetCep = cep.replace(/\D/g, "");

    if (targetCep.length !== 8) {
      toast.error("CEP inválido", {
        description: "Digite os 8 números do seu CEP."
      });
      return;
    }

    setLoading(true);
    setResult(null);
    setShipping(null);

    try {
      const { data, error } = await supabase.functions.invoke("calcular-frete-rodonaves", {
        body: {
          destinationZip: targetCep,
          invoiceValue: finalInvoiceValue,
          preset: productType === "bike" ? "bike_completa" : "quadro",
          quantidade: 1,
        }
      });

      if (error) throw error;
      if (!data.sucesso) throw new Error(data.error || "Região não atendida");

      // Small delay to let user see "Finalizando..."
      await new Promise(r => setTimeout(r, 600));

      const res = {
        cidade: data.cidade,
        uf: data.uf,
        prazo: data.prazoEntrega + 2,
        valor: data.valorFrete + 30,
      };
      
      setResult(res);
      setShipping({ 
        descricao: `Rodonaves (${data.cidade})`, 
        valor: res.valor 
      });

    } catch (e: any) {
      console.error(e);
      toast.error("Falha no cálculo", {
        description: e.message || "Tente novamente em instantes."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative overflow-hidden bg-[#A1A1AA]/[0.02] border-2 border-[#A1A1AA]/10 p-6 sm:p-8 rounded-[32px] flex flex-col gap-6 transition-all duration-500 hover:border-[#A1A1AA]/30 hover:bg-[#A1A1AA]/[0.04] group shadow-2xl ${className}`}>
      
      {/* Background Decorative Element */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#A1A1AA] opacity-[0.03] blur-[60px] pointer-events-none group-hover:opacity-[0.08] transition-opacity duration-700" />
      
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#A1A1AA] text-black flex items-center justify-center shadow-[0_10px_20px_rgba(255,255,255,0.1)] relative overflow-hidden">
          <Truck className="animate-pulse" size={24} strokeWidth={2.5} />
          <motion.div 
            animate={{ x: [-20, 50] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="absolute bottom-1 left-0 w-4 h-0.5 bg-black/20"
          />
        </div>
        <div className="flex flex-col">
          <h3 className="font-black text-white text-base tracking-tight leading-none mb-1">Cálculo de Entrega</h3>
          <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest opacity-60 italic">Via Rodonaves Express</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 relative z-10">
        <div className="relative group/field">
          <input 
            type="text"
            placeholder="Digite seu CEP (00000-000)"
            value={cep}
            onChange={e => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 8);
              setCep(val.length > 5 ? `${val.slice(0, 5)}-${val.slice(5)}` : val);
              if (result) setResult(null);
            }}
            className="w-full bg-black border-2 border-white/5 rounded-2xl h-14 px-5 text-base font-bold text-white outline-none focus:border-[#A1A1AA] focus:ring-4 focus:ring-[#A1A1AA]/10 transition-all placeholder:text-white/20"
          />
        </div>

        <button 
          onClick={handleCalculate}
          disabled={loading || !cep}
          className="w-full h-14 bg-[#A1A1AA] text-black hover:bg-white transition-all duration-300 rounded-2xl text-[13px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-[0.97] disabled:opacity-20 shadow-[0_15px_35px_rgba(255,255,255,0.1)] hover:shadow-[0_20px_45px_rgba(161,161,170,0.3)] relative overflow-hidden"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 size={18} className="animate-spin" />
              <span>Calculando...</span>
            </div>
          ) : (
            "Calcular Frete"
          )}
        </button>
      </div>

      {/* MODAL DE LOADING ANIMADO */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm bg-[#111] border-2 border-[#A1A1AA]/20 rounded-[40px] p-8 flex flex-col items-center text-center shadow-[0_0_100px_rgba(161,161,170,0.1)]"
            >
              {/* Truck Animation Box */}
              <div className="w-24 h-24 bg-[#A1A1AA] rounded-3xl flex items-center justify-center mb-8 relative shadow-[0_20px_40px_rgba(255,255,255,0.1)]">
                <motion.div
                  animate={{ 
                    x: [-2, 2, -2],
                    y: [-1, 1, -1]
                  }}
                  transition={{ repeat: Infinity, duration: 0.2 }}
                >
                  <Truck size={48} strokeWidth={2.5} className="text-black" />
                </motion.div>
                {/* Wheels/Wind lines */}
                <div className="absolute -left-4 top-1/2 -translate-y-1/2 space-y-2">
                   <motion.div animate={{ x: [0, -20, 0], opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="h-0.5 w-6 bg-[#A1A1AA]" />
                   <motion.div animate={{ x: [0, -30, 0], opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.1 }} className="h-0.5 w-8 bg-[#A1A1AA]" />
                </div>
              </div>

              <div className="space-y-6 w-full">
                <div className="space-y-2">
                  <h4 className="text-xl font-black text-white tracking-tight">Estamos Cuidando de Tudo</h4>
                  <p className="text-sm text-white/40 font-medium">Sincronizando com a Rodonaves...</p>
                </div>

                {/* Steps List */}
                <div className="space-y-3 pt-4 flex flex-col items-start w-full px-2">
                   {steps.map((step, idx) => (
                     <motion.div 
                      key={idx}
                      initial={{ opacity: 0.2 }}
                      animate={{ 
                        opacity: loadingStep >= idx ? 1 : 0.2,
                        x: loadingStep === idx ? 5 : 0,
                        color: loadingStep === idx ? "#A1A1AA" : "#ffffff44"
                      }}
                      className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest whitespace-nowrap truncate"
                     >
                       <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${loadingStep === idx ? "border-[#A1A1AA] bg-[#A1A1AA]/10" : "border-white/5 bg-white/5"}`}>
                         {loadingStep > idx ? <ShieldCheck size={16} /> : step.icon}
                       </div>
                       {step.text}
                     </motion.div>
                   ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {result && !loading && (
          <motion.div 
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="overflow-hidden"
          >
            <div className="pt-6 mt-2 border-t border-[#A1A1AA]/10 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                   <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Custo da Entrega</span>
                   <span className="text-3xl font-black text-[#A1A1AA] tracking-tighter drop-shadow-lg">{formatBRL(result.valor)}</span>
                </div>
                <div className="text-right flex flex-col items-end">
                   <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1 text-zinc-500">Expresso</span>
                   <div className="flex items-center gap-2">
                     <span className="text-lg font-black text-white">{result.prazo} dias</span>
                     <span className="text-[10px] font-bold text-white/40 uppercase">úteis</span>
                   </div>
                </div>
              </div>
              
              <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5 flex items-center justify-center gap-3">
                <MapPin size={14} className="text-[#A1A1AA]" />
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                   Destino: <span className="text-white">{result.cidade} — {result.uf}</span>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
