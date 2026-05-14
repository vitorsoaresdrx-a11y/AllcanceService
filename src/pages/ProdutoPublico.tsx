import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePublicPartAttributes } from "@/hooks/usePartAttributes";
import { getOptimizedImageUrl } from "@/lib/image";
import {
  Bike,
  Package,
  ShieldCheck,
  Truck,
  ArrowRight,
  CreditCard,
  ShoppingBag,
  ChevronLeft,
  CheckCircle2,
  Info,
  Plus,
  Bot,
  HelpCircle
} from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { CartDrawer } from "@/hooks/useCart"; // Note: verify path if needed, usually from components
import { StoreChat } from "@/components/shop/StoreChat";
import { CheckoutModal } from "@/components/shop/CheckoutModal";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { motion, AnimatePresence } from "framer-motion";

import { formatBRL } from "@/lib/format";
import { useState, useEffect } from "react";
import { ShippingSimulator } from "@/components/shop/ShippingSimulator";
import { toast } from "sonner";

// Re-importing CartDrawer safely
import { CartDrawer as CartDrawerUI } from "@/components/shop/CartDrawer";

// ─── Design System ────────────────────────────────────────────────────────────

const Btn = ({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline";
}) => {
  const v = {
    primary: "bg-[#A1A1AA] text-primary-foreground hover:scale-[1.02] shadow-[0_20px_40px_rgba(161,161,170,0.15)] active:scale-[0.98]",
    secondary: "bg-[#27272A] text-white hover:bg-[#0022AA]",
    outline: "bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20",
  };
  return (
    <button
      className={`inline-flex items-center justify-center px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 ${v[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// ─── Header ──────────────────────────────────────────────────────────

function Header() {
  return (
    <header className="sticky top-0 z-[60] bg-black/90 backdrop-blur-2xl border-b border-white/5 px-4 md:px-12 h-20 md:h-24 flex items-center justify-between">
      <Link to="/store" className="flex items-center gap-3 shrink-0 group">
        <img
          src="/allcance-logo.png"
          alt="Allcance"
          className="h-9 md:h-11 w-auto object-contain group-hover:opacity-80 transition-opacity"
        />
      </Link>
      <div className="flex gap-4">
        <Link to="/store" className="flex h-11 px-6 bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all items-center gap-2">
          <ChevronLeft size={14} /> Voltar à Loja
        </Link>
      </div>
    </header>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
       <div className="absolute inset-0 pointer-events-none opacity-[0.05] z-[100] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
       <div className="relative flex flex-col items-center gap-8 px-6 text-center">
          <motion.div 
            animate={{ scale: [1, 1.05, 1], opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="text-[32px] md:text-[50px] font-black tracking-tighter italic text-white/20 select-none uppercase"
          >
            SINCRONIZANDO...
          </motion.div>
          <div className="w-40 h-[1.5px] bg-white/5 relative overflow-hidden">
             <motion.div 
                animate={{ x: [-200, 200] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 w-16 bg-[#A1A1AA]"
             />
          </div>
       </div>
    </div>
  );
}

// ─── PriceSection ───────────────────────────────────────────────────

function PriceSection({ product }: { product: any }) {
  const ecommercePrice = Number(product.price_ecommerce) || Number(product.pix_price) || 0;
  
  if (!ecommercePrice) return null;

  return (
    <div className="flex flex-col gap-4">
       {/* DIVIDER YELLOW */}
       <div className="w-12 h-1 bg-[#A1A1AA] rounded-full" />
       
       <div className="space-y-0.5">
          <p className="text-[11px] font-bold tracking-[0.05em] text-white">LABORATÓRIO DE PERFORMANCE</p>
          <p className="text-[11px] font-bold tracking-[0.05em] text-white/40">VALOR EXCLUSIVO</p>
       </div>

       <div className="flex items-baseline gap-4 flex-wrap">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-[54px] md:text-[84px] font-[1000] italic leading-none text-[#A1A1AA] tracking-tighter select-none"
          >
            {formatBRL(ecommercePrice)}
          </motion.div>
          <span className="text-[11px] font-bold text-white/40 mb-2 uppercase italic">À vista no pix</span>
       </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ProdutoPublico() {
  const { sku } = useParams<{ sku: string }>();
  const [isChatOpen, setIsChatOpen] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ["public-product", sku],
    enabled: !!sku,
    queryFn: async () => {
      const { data: part } = await supabase
        .from("parts_public" as any)
        .select("*")
        .eq("sku", sku!)
        .maybeSingle() as { data: any };
      if (part) return { ...part, _type: "part" as const };

      const { data: bike } = await supabase
        .from("bike_models_public" as any)
        .select("*")
        .eq("sku", sku!)
        .maybeSingle() as { data: any };
      if (bike) return { ...bike, _type: "bike" as const };

      return null;
    },
  });

  const { data: attrs = [] } = usePublicPartAttributes(product?._type === "part" ? product.id : "");

  if (isLoading) return <LoadingState />;

  if (!product || !product.visible_on_storefront) {
    return (
      <div className="min-h-screen bg-[#000000] text-white font-['Plus_Jakarta_Sans'] flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-[32px] bg-white/[0.03] border border-white/5 flex items-center justify-center text-white/10">
            <Package size={40} />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tight">Produto Esgotado</h2>
          <Link to="/store">
            <Btn variant="primary">Voltar ao Catálogo</Btn>
          </Link>
        </div>
      </div>
    );
  }

  const images: string[] = (product as any).images || [];
  const ecommercePrice = Number(product.price_ecommerce) || Number(product.pix_price) || 0;

  const specs: { label: string; value: string }[] = [];
  if (product._type === "bike") {
    const b = product as any;
    if (b.brand) specs.push({ label: "Marca", value: b.brand });
    if (b.frame_size) specs.push({ label: "Quadro", value: b.frame_size });
    if (b.rim_size) specs.push({ label: "Aro", value: b.rim_size });
    if (b.color) specs.push({ label: "Cor", value: b.color });
    if (b.weight_kg) specs.push({ label: "Peso", value: `${b.weight_kg} kg` });
  } else {
    const p = product as any;
    if (p.material) specs.push({ label: "Material", value: p.material });
    if (p.weight_capacity_kg) specs.push({ label: "Capacidade", value: `${p.weight_capacity_kg} kg` });
    if (p.gears) specs.push({ label: "Marchas", value: p.gears });
    if (p.hub_style) specs.push({ label: "Cubo", value: p.hub_style });
    if (p.color) specs.push({ label: "Cor", value: p.color });
    if (p.rim_size) specs.push({ label: "Aro", value: p.rim_size });
    if (p.frame_size) specs.push({ label: "Quadro", value: p.frame_size });
  }

  return (
    <div className="min-h-screen bg-[#000000] text-white font-['Plus_Jakarta_Sans'] selection:bg-[#A1A1AA] selection:text-black flex flex-col overflow-x-hidden relative pb-28">
      
      {/* NOISE OVERLAY */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[100] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />
      
      <Header />

      <main className="flex-1 w-full max-w-[1720px] mx-auto px-4 md:px-12 py-6 md:py-10">
        
        {/* TITULO NO TOPO */}
        <div className="mb-8 pl-1">
           <motion.h1 
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             className="text-[36px] md:text-[80px] font-black tracking-[-0.05em] uppercase italic leading-none"
           >
             {product.name}
           </motion.h1>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-20 items-start">
          
          {/* LADO ESQUERDO: GALERIA E BENEFICIOS */}
          <div className="w-full lg:col-span-8 space-y-8">
            
            <section className="relative group">
              {images.length > 0 ? (
                <Carousel className="w-full">
                  <CarouselContent>
                    {images.map((img, i) => (
                      <CarouselItem key={i}>
                        <div className="aspect-[4/3] md:aspect-[16/10] bg-[#0A0A0A] rounded-[24px] lg:rounded-[60px] flex items-center justify-center p-4 md:p-12 overflow-hidden relative border border-white/5 shadow-2xl">
                          <img
                            src={getOptimizedImageUrl(img, 1600, 95) || img}
                            alt={product.name}
                            className="w-full h-full object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]"
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  
                  {images.length > 1 && (
                    <>
                       <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                          <CarouselPrevious className="static translate-y-0 h-11 w-11 md:h-14 md:w-14 rounded-lg bg-[#A1A1AA] text-black border-none hover:bg-white transition-all shadow-xl" />
                       </div>
                       <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
                          <CarouselNext className="static translate-y-0 h-11 w-11 md:h-14 md:w-14 rounded-lg bg-[#A1A1AA] text-black border-none hover:bg-white transition-all shadow-xl" />
                       </div>
                    </>
                  )}
                </Carousel>
              ) : (
                <div className="aspect-video bg-[#0A0A0A] rounded-[40px] border border-white/5 flex items-center justify-center text-white/5">
                  <Package size={150} strokeWidth={0.5} />
                </div>
              )}
            </section>

            {/* BENEFÍCIOS 2x2 */}
            <section className="grid grid-cols-2 gap-3 md:gap-6 px-1">
               {[
                 { icon: Truck, label: "ENTREGA", desc: "TODO BRASIL" },
                 { icon: ShieldCheck, label: "GARANTIA LAB", desc: "90 DIAS" },
                 { icon: Info, label: "SUPORTE", desc: "ESPECIALISTA" },
                 { icon: CreditCard, label: "PAGAMENTO", desc: "SEGURO" }
               ].map((item, idx) => (
                 <div key={idx} className="p-5 md:p-8 bg-[#0A0A0A] border border-white/[0.03] rounded-[16px] md:rounded-[24px] flex items-center gap-4 group hover:border-[#A1A1AA]/20 transition-all">
                   <item.icon className="text-[#A1A1AA] shrink-0" size={28} strokeWidth={2.5} />
                   <div className="flex flex-col leading-tight">
                     <span className="text-[10px] md:text-[12px] font-bold text-white/50">{item.label}</span>
                     <span className="text-[12px] md:text-[16px] font-black text-[#A1A1AA] italic">{item.desc}</span>
                   </div>
                 </div>
               ))}
            </section>
          </div>

          {/* LADO DIREITO: PREÇO E CTAs */}
          <aside className="w-full lg:col-span-4 flex flex-col gap-10 lg:sticky lg:top-32 px-1">
            
            <PriceSection product={product} />

            {/* BOTÕES */}
            <div className="flex flex-col gap-3">
               <button 
                 onClick={() => {
                   useCart.getState().addItem(product, ecommercePrice);
                   toast.success("Adicionado!");
                 }}
                 className="h-16 md:h-20 bg-[#A1A1AA] text-black hover:bg-white rounded-[16px] font-black text-[14px] md:text-[16px] uppercase tracking-wider transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-[#A1A1AA]/5"
               >
                 EU QUERO ESTA BIKE <ArrowRight size={20} strokeWidth={3.5} />
               </button>
               
               <button 
                 onClick={() => setIsChatOpen(true)}
                 className="h-16 border-2 border-[#A1A1AA] bg-transparent text-white hover:bg-[#A1A1AA]/5 rounded-[16px] font-black text-[14px] md:text-[16px] uppercase tracking-wider transition-all flex items-center justify-center gap-3 group"
               >
                 DÚVIDA TÉCNICA <HelpCircle size={20} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
               </button>
            </div>

            {/* SIMULADOR FRETE */}
            <div className="pt-6 border-t border-white/5">
                <ShippingSimulator 
                  productType={product._type}
                  invoiceValue={ecommercePrice} 
                  className="bg-transparent border-none p-0"
                />
            </div>
          </aside>
        </div>

        {/* DNA TÉCNICO */}
        <div className="mt-20 space-y-8 pt-8 border-t border-white/5">
           <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-white/20 italic">ESPECIFICAÇÕES TÉCNICAS</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-4">
              {[...specs, ...attrs].slice(0, 10).map((s: any, idx) => (
                <div key={idx} className="flex items-end justify-between border-b border-white/5 pb-3 group/row transition-colors hover:border-[#A1A1AA]/20">
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 group-hover/row:text-[#A1A1AA]/50 transition-colors">{s.label || s.name}</span>
                   <span className="text-lg font-black text-white italic tracking-tighter">{s.value}</span>
                </div>
              ))}
           </div>
        </div>
      </main>

      {/* BOTTOM NAV SIMULATOR (AS PER IMAGE) */}
      <footer className="fixed bottom-0 inset-x-0 h-20 bg-black/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-around px-6 z-50 lg:hidden">
         <div className="flex flex-col items-center gap-1 text-white/40">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            <span className="text-[10px] font-black">Início</span>
         </div>
         <div className="flex flex-col items-center gap-1 text-[#A1A1AA] relative">
            <Bike className="w-6 h-6" />
            <span className="text-[10px] font-black">Loja</span>
            <div className="absolute -top-4 w-12 h-1 bg-[#A1A1AA] rounded-full shadow-[0_0_10px_#A1A1AA]" />
         </div>
         <div className="flex flex-col items-center gap-1 text-white/40">
            <ShoppingBag className="w-6 h-6" />
            <span className="text-[10px] font-black">Carrinho</span>
         </div>
         <div className="flex flex-col items-center gap-1 text-white/40">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            <span className="text-[10px] font-black">Perfil</span>
         </div>
      </footer>

      <StoreChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      <CartDrawerUI />
      <CheckoutModal />
    </div>
  );
}
