import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Megaphone, 
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Zap,
  Tag,
  Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function PromoBanner() {
  const [current, setCurrent] = useState(0);

  const { data: promotions, isLoading } = useQuery({
    queryKey: ["active_promotions_store"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .eq("active", true)
        .gte("ends_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (!promotions || promotions.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % promotions.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [promotions]);

  if (isLoading) return (
    <div className="w-full h-24 md:h-32 bg-card/50 animate-pulse flex items-center justify-center rounded-[32px] border border-border/50">
      <Loader2 className="animate-spin text-muted-foreground/20" />
    </div>
  );

  if (!promotions || promotions.length === 0) return null;

  const currentPromo = promotions[current];

  return (
    <div className="relative group overflow-hidden bg-gradient-to-r from-primary to-[#1A33CC] rounded-[32px] md:rounded-[40px] shadow-2xl shadow-primary/20">
      {/* Decorative Elements */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
      
      <AnimatePresence mode="wait">
        <motion.div 
          key={current}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="relative p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4 md:gap-8">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center text-white shrink-0 shadow-inner">
              <Megaphone size={32} />
            </div>
            <div className="space-y-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="bg-zinc-400 text-black text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Zap size={10} fill="currentColor" /> OFERTA ATIVA
                </span>
              </div>
              <h2 className="text-xl md:text-3xl font-black text-white italic uppercase tracking-tighter leading-tight">
                {currentPromo.name}
              </h2>
              <p className="text-white/70 text-xs md:text-sm font-medium">
                {currentPromo.description || "Aproveite nossos descontos exclusivos!"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="text-center md:text-right hidden sm:block">
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Desconto de até</p>
                <p className="text-2xl font-black text-white italic">
                  {currentPromo.discount_type === 'percentage' ? `${currentPromo.discount_value}%` : `R$ ${currentPromo.discount_value}`}
                </p>
             </div>
             <button className="h-14 px-8 bg-white text-primary rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:scale-105 transition-all flex items-center gap-3 active:scale-95 group/btn">
               Aproveitar <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
             </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Dots */}
      {promotions.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
          {promotions.map((_, i) => (
            <div 
              key={i} 
              className={`h-1 rounded-full transition-all duration-500 ${current === i ? 'w-4 bg-white' : 'w-1.5 bg-white/20'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
