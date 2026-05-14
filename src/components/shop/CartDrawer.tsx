import { useCart } from "@/hooks/useCart";
import { Drawer } from "vaul";
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  ChevronRight,
  TrendingUp,
  Package,
  PlusCircle,
  Trash2,
  CheckCircle2,
  Bike
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { getOptimizedImageUrl } from "@/lib/image";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

export function CartDrawer() {
  const { items, removeItem, updateQuantity, addItem, isCartOpen, setCartOpen, setCheckoutOpen } = useCart();
  const [addedItems, setAddedItems] = useState<string[]>([]);

  // Upsell Logic
  const { data: suggestions } = useQuery({
    queryKey: ["cart_upsell", items.map(i => i.id).join(',')],
    enabled: items.length > 0,
    queryFn: async () => {
      const suggestCats = ["Acessórios", "Ferramentas", "Vestuário"];
      const { data } = await supabase
        .from("parts" as any)
        .select("*")
        .eq("visible_on_storefront", true)
        .in("category", suggestCats)
        .limit(8);
      const cartIds = items.map(i => i.id);
      return (data || []).filter((s: any) => !cartIds.includes(s.id));
    }
  });

  const total = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const totalItems = items.reduce((acc, i) => acc + i.quantity, 0);

  const handleAddSuggestion = (s: any) => {
    const price = s.pix_price || s.sale_price || s.price_ecommerce || 0;
    addItem(s, price);
    setAddedItems(prev => [...prev, s.id]);
    toast.success(`${s.name} adicionado!`);
    setTimeout(() => setAddedItems(prev => prev.filter(id => id !== s.id)), 2000);
  };

  if (items.length === 0) return null;

  return (
    <Drawer.Root open={isCartOpen} onOpenChange={setCartOpen} direction="bottom">
      <Drawer.Trigger asChild>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-6 inset-x-0 z-[60] flex justify-center px-4 pointer-events-none"
        >
          <button 
            className="w-full max-w-[360px] h-16 bg-[#A1A1AA] rounded-[24px] shadow-[0_25px_50px_rgba(161,161,170,0.3)] flex items-center justify-center gap-6 text-black active:scale-[0.98] transition-all group pointer-events-auto"
          >
            <div className="flex items-center gap-2 relative z-10 shrink-0">
              <div className="relative">
                <ShoppingBag size={22} />
                <motion.span 
                  key={totalItems}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute -top-1.5 -right-2 h-[18px] min-w-[18px] px-1 bg-black text-[#A1A1AA] rounded-full flex items-center justify-center text-[10px] font-black"
                >
                  {totalItems}
                </motion.span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.15em] opacity-80">Meu Carrinho</span>
            </div>
            <div className="flex items-center gap-1.5 relative z-10 shrink-0">
              <span className="text-[15px] font-black tracking-tighter">{formatBRL(total)}</span>
              <ChevronRight size={18} className="opacity-40" />
            </div>
          </button>
        </motion.div>
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100]" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 max-h-[92vh] flex flex-col bg-[#080808] rounded-t-[32px] border-t border-white/10 shadow-[0_-20px_80px_rgba(0,0,0,0.5)] z-[101] font-['Plus_Jakarta_Sans'] text-white focus:outline-none overflow-hidden" aria-describedby="cart-description">
          <Drawer.Title className="sr-only">Seu Carrinho</Drawer.Title>
          <p id="cart-description" className="sr-only">Visualize e gerencie os itens do seu carrinho de compras.</p>
          
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-white/20 my-4" />

          <div className="px-6 md:px-8 pb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
              <div className="p-2 bg-[#A1A1AA]/10 rounded-xl">
                <ShoppingBag size={22} className="text-[#A1A1AA]" />
              </div>
              Carrinho
            </h2>
            <Drawer.Close className="h-11 w-11 rounded-full bg-white/5 flex items-center justify-center text-white/70 border border-white/5">
              <X size={22} />
            </Drawer.Close>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-8 space-y-10">
            <div className="space-y-4">
              <AnimatePresence mode="popLayout" initial={false}>
                {items.map((item, index) => (
                  <motion.div
                    layout
                    key={item.id}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    className="group relative bg-[#111111] border border-white/5 rounded-3xl p-4 flex gap-4 items-center"
                  >
                    <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl overflow-hidden bg-black shrink-0 border border-white/5 p-2 flex items-center justify-center">
                      {item.image ? (
                        <img src={getOptimizedImageUrl(item.image, 200) || item.image} alt={item.name} className="w-full h-full object-contain" />
                      ) : (
                        <div className="text-white/10"><Bike size={32} /></div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between self-stretch py-1">
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-white/90 leading-tight line-clamp-1">{item.name}</h3>
                        <p className="text-[#A1A1AA] font-black text-lg mt-0.5">{formatBRL(item.price)}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5 bg-black rounded-xl p-1 border border-white/5 shadow-inner">
                          <button onClick={() => updateQuantity(item.id, -1)} className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-white"><Minus size={14} /></button>
                          <span className="text-sm font-black text-white w-7 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-white"><Plus size={14} /></button>
                        </div>
                        <button onClick={() => removeItem(item.id)} className="h-9 w-9 flex items-center justify-center text-white/30 hover:text-zinc-500"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* UPSELL SECTION */}
            {suggestions && suggestions.length > 0 && (
              <div className="space-y-6 pt-2">
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} className="text-[#A1A1AA]" />
                  <span className="text-sm font-black tracking-tight text-white uppercase opacity-40">Complete seu setup</span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6 md:-mx-8 md:px-8">
                  {suggestions.map((s: any, idx) => (
                    <div key={s.id} className="min-w-[160px] bg-[#111111] border border-white/5 rounded-3xl p-3 flex flex-col gap-3 group shrink-0 relative overflow-hidden">
                      <div className="h-32 rounded-2xl overflow-hidden bg-black p-4 relative flex items-center justify-center transition-transform group-hover:scale-[1.02]">
                        {s.images?.[0] ? <img src={getOptimizedImageUrl(s.images[0], 200) || s.images[0]} className="w-full h-full object-contain" alt={s.name} /> : <div className="text-white/10"><Package size={28} /></div>}
                        <button onClick={() => handleAddSuggestion(s)} className={`absolute bottom-2 right-2 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${addedItems.includes(s.id) ? "bg-zinc-500 text-white" : "bg-[#A1A1AA] text-black"}`}>
                          {addedItems.includes(s.id) ? <CheckCircle2 size={20} /> : <PlusCircle size={20} />}
                        </button>
                      </div>
                      <div className="px-1 space-y-1">
                        <p className="text-[13px] font-bold text-white/80 line-clamp-2 leading-tight min-h-[2rem]">{s.name}</p>
                        <p className="text-[15px] font-black text-[#A1A1AA]">{formatBRL(s.pix_price || s.sale_price || s.price_ecommerce || 0)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-8 pb-10 bg-[#0C0C0C] border-t border-white/10 space-y-6 relative">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-[#A1A1AA]/50 to-transparent" />
             <div className="space-y-3">
               <div className="flex items-center justify-between text-white/40">
                 <span className="text-sm font-bold uppercase tracking-widest leading-none">Subtotal do Carrinho</span>
                 <span className="text-sm font-bold">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</span>
               </div>
               <div className="flex items-center justify-between text-white border-t border-white/5 pt-4">
                 <span className="text-lg font-black uppercase tracking-tighter italic">Total</span>
                 <div className="text-right">
                   <motion.span key={total} initial={{ scale: 1.1, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-4xl font-black tracking-tighter text-[#A1A1AA]">
                     {formatBRL(total)}
                   </motion.span>
                 </div>
               </div>
             </div>
             <div className="flex flex-col gap-4">
                <button 
                  onClick={() => {
                    setCartOpen(false); // Close cart first
                    setTimeout(() => {
                      setCheckoutOpen(true); // Open checkout after a small delay to prevent aria-hidden/focus loop
                    }, 150);
                  }} 
                  className="w-full h-16 bg-[#A1A1AA] hover:bg-white text-black rounded-2xl font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all"
                >
                  Finalizar Compra <ChevronRight size={18} />
                </button>
                <p className="text-[10px] text-center text-white/20 font-black uppercase tracking-[0.4em]">Frete calculado na próxima etapa</p>
             </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
