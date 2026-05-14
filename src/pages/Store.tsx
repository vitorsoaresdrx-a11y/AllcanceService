import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { getOptimizedImageUrl } from "@/lib/image";
import { StoreChat } from "@/components/shop/StoreChat";
import { Search, Bike, Package, ArrowRight, Loader2, Filter, ShoppingBag, Sparkles, Bot } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { CheckoutModal } from "@/components/shop/CheckoutModal";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PublicProduct {
  id: string;
  sku: string;
  name: string;
  price_ecommerce: number | null;
  sale_price?: number | null;
  pix_price?: number | null;
  category: string | null;
  images: string[] | null;
  description: string | null;
  created_at?: string;
  _type: 'part' | 'bike';
}

// ─── Componentes ─────────────────────────────────────────────────────────────

function ProductCard({ p, index }: { p: PublicProduct; index: number }) {
  const { addItem } = useCart();
  const price = p.price_ecommerce || p.pix_price || p.sale_price || 0;
  const mainImage = p.images?.[0];
  const discount = p.price_ecommerce && p.pix_price && p.pix_price < p.price_ecommerce
    ? Math.round(((p.price_ecommerce - p.pix_price) / p.price_ecommerce) * 100)
    : 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(p, price);
    toast.success(`${p.name} adicionado ao carrinho!`, {
      description: "Confira seu carrinho para finalizar.",
      duration: 3000,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.5, ease: "easeOut" }}
      className="w-full"
    >
      <Link
        to={`/produto/${p.sku}`}
        className="group flex flex-row sm:flex-col bg-[#080808] rounded-[24px] sm:rounded-[40px] border border-white/5 hover:border-[#A1A1AA]/30 transition-all duration-500 hover:shadow-[0_40px_80px_rgba(0,0,0,0.95)] hover:-translate-y-2 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A1A1AA] relative items-center sm:items-stretch"
        aria-label={`Ver produto: ${p.name}, Preço atual: ${formatBRL(price)}`}
      >
        {/* Imagem Container - MAIOR ÁREA */}
        <div className="w-[110px] h-[110px] sm:w-full sm:h-[320px] bg-white/[0.01] relative flex items-center justify-center p-3 sm:p-12 shrink-0 overflow-hidden border-r sm:border-r-0 sm:border-b border-white/5 group-hover:bg-white/[0.03] transition-colors duration-500">
          {mainImage ? (
            <img
              src={getOptimizedImageUrl(mainImage, 800, 85) || mainImage}
              alt={`Imagem do produto ${p.name}`}
              loading="lazy"
              className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
            />
          ) : (
            <div className="text-white/5 group-hover:text-white/10 transition-colors">
              {p._type === 'bike' ? <Bike size={80} strokeWidth={0.5} /> : <Package size={80} strokeWidth={0.5} />}
            </div>
          )}

          {/* Badges Funcionais */}
          <div className="absolute top-2 left-2 sm:top-6 sm:left-6 flex flex-col gap-1.5 sm:gap-2 z-10">
            {discount > 0 && (
              <span className="bg-[#A1A1AA] text-black px-2.5 sm:px-4 py-1 rounded-full text-[9px] sm:text-[11px] font-black tracking-widest uppercase shadow-[0_4px_20px_rgba(161,161,170,0.3)] anim-pulse">
                -{discount}% OFF
              </span>
            )}
            {p._type === 'bike' && (
              <span className="bg-[#27272A] text-white px-2.5 sm:px-4 py-1 rounded-full text-[9px] sm:text-[11px] font-black tracking-widest uppercase shadow-xl backdrop-blur-md">
                Bicicleta
              </span>
            )}
          </div>
        </div>

        {/* Informações */}
        <div className="p-4 sm:p-8 flex-1 flex flex-col gap-1 sm:gap-2 justify-center sm:justify-start min-w-0 bg-gradient-to-b from-transparent to-black/20">
          <div className="space-y-1 sm:space-y-2 mb-2 sm:mb-4">
            <span className="inline-block text-[9px] sm:text-[10px] font-black text-[#A1A1AA] bg-[#A1A1AA]/10 border border-[#A1A1AA]/20 px-2 py-0.5 rounded sm:rounded-md tracking-[0.15em] uppercase truncate max-w-[140px]">
              {p.category || 'Geral'}
            </span>
            <h3 className="text-[14px] sm:text-[19px] font-bold text-white/90 leading-tight line-clamp-2 group-hover:text-white transition-colors duration-300">
              {p.name}
            </h3>
          </div>

          <div className="mt-auto flex items-end justify-between">
            <div className="flex flex-col gap-0.5">
              {discount > 0 && (
                <span className="text-[10px] sm:text-xs text-white/20 line-through font-medium">
                  De {formatBRL(p.price_ecommerce || 0)}
                </span>
              )}
              <div className="flex flex-col">
                <span className="text-lg sm:text-2xl font-black text-[#A1A1AA] tracking-tighter leading-none mb-1">
                  {formatBRL(price)}
                </span>
                <span className="text-[10px] sm:text-xs text-white/40 font-light italic">
                  em até 12x de {formatBRL(price / 12)}
                </span>
              </div>
            </div>

            {/* Quick Add Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={handleQuickAdd}
              className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-white/[0.03] border border-white/10 group-hover:bg-[#A1A1AA] group-hover:text-black group-hover:border-transparent flex items-center justify-center transition-all duration-300 shadow-xl active:shadow-inner"
              title="Adicionar ao Carrinho"
              aria-label={`Adicionar ${p.name} ao carrinho`}
            >
              <ShoppingBag size={20} className="sm:size-6" />
            </motion.button>
          </div>
        </div>

        {/* Interactive Highlight */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#A1A1AA] opacity-0 blur-[60px] group-hover:opacity-10 transition-opacity duration-700 pointer-events-none" />
      </Link>
    </motion.div>
  );
}

// ─── Componente Principal ────────────────────────────────────────────────────

export default function Store() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Tudo");
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiSkus, setAiSkus] = useState<string[]>([]);

  const [isChatOpen, setIsChatOpen] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["store-products"],
    queryFn: async () => {
      const { data: parts } = await supabase
        .from("parts_public" as any)
        .select("*")
        .eq("visible_on_storefront", true) as { data: any[] | null };

      const partsFormatted = (parts || []).map(p => ({ ...p, _type: 'part' as const }));

      const { data: bikes } = await supabase
        .from("bike_models_public" as any)
        .select("*")
        .eq("visible_on_storefront", true) as { data: any[] | null };

      const bikesFormatted = (bikes || []).map(b => ({ ...b, _type: 'bike' as const }));

      return [...bikesFormatted, ...partsFormatted].sort((a, b) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      ) as PublicProduct[];
    }
  });

  const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];
  const categoriesList = ["Tudo", "Bikes", ...uniqueCategories.filter(c => c !== "Bikes")];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === "Tudo" ||
      (activeCategory === "Bikes" && p._type === "bike") ||
      p.category === activeCategory;
    return matchesSearch && matchCat;
  });

  const handleAiSearch = async () => {
    if (!search || search.length < 3) return;
    setIsAiSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("store-ai-chat", {
        body: { message: search, isSearch: true }
      });
      if (error) throw error;
      setAiSkus(data.skus || []);
      if (data.skus?.length > 0) setActiveCategory("Tudo");
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiSearching(false);
    }
  };

  const aiProducts = products.filter(p => aiSkus.includes(p.sku));
  const displayProducts = aiSkus.length > 0 ? aiProducts : filteredProducts;

  return (
    <div className="min-h-screen bg-[#000000] text-white font-['Plus_Jakarta_Sans'] selection:bg-[#A1A1AA] selection:text-black flex flex-col pb-10 relative">

      {/* NOISE OVERLAY - Bolder Texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[100] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat" />

      {/* ── HEADER CLEAN ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-2xl border-b border-white/5 px-4 sm:px-6 md:px-12 h-[72px] md:h-24 flex items-center justify-between gap-4 md:gap-8">
        <Link 
          to="/store" 
          className="flex items-center gap-3 sm:gap-4 shrink-0 rounded-2xl p-2 -ml-2 hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A1A1AA]" 
          onClick={() => { if(window.location.pathname === '/store') window.location.reload() }}
          aria-label="Allcance Home"
        >
          <img
            src="/allcance-logo.png"
            alt="Allcance"
            className="h-9 sm:h-11 w-auto object-contain"
          />
        </Link>

        {/* Search Desktop */}
        <div className="flex-1 max-w-xl hidden md:block">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#A1A1AA] transition-colors" size={18} aria-hidden="true" />
            <input 
              type="text"
              placeholder="Pesquisar componentes, quadros..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (aiSkus.length > 0) setAiSkus([]);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAiSearch()}
              className="w-full h-14 bg-white/[0.03] border border-white/10 rounded-2xl text-white text-[15px] pl-14 pr-6 focus:outline-none focus:border-[#A1A1AA]/40 focus:bg-white/[0.07] transition-all placeholder:text-white/20 shadow-inner font-medium"
              aria-label="Campo de pesquisa"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button 
            onClick={() => setIsChatOpen(true)}
            className="flex h-11 sm:h-12 px-4 sm:px-6 rounded-2xl bg-[#A1A1AA]/10 border border-[#A1A1AA]/20 text-[#A1A1AA] hover:bg-[#A1A1AA] hover:text-black transition-all items-center justify-center gap-2 sm:gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A1A1AA]"
            aria-label="Abrir Chat com IA"
          >
            <Bot size={18} strokeWidth={2.5} />
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest hidden xs:inline">Allcance AI</span>
          </button>
          
          <Link 
            to="/minha-garagem" 
            className="flex h-11 sm:h-12 px-4 sm:px-6 rounded-2xl bg-white/[0.05] border border-white/10 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all items-center justify-center gap-2 sm:gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A1A1AA]"
          >
            <span className="hidden sm:inline">Minha Garagem</span>
            <span className="sm:hidden">Garagem</span>
            <ArrowRight size={14} className="hidden xs:inline" />
          </Link>
        </div>
      </header>

      {/* Search Mobile */}
      <div className="md:hidden px-4 py-4 border-b border-white/5 bg-black">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} aria-hidden="true" />
          <input
            type="text"
            placeholder="Pesquisar componentes, bikes..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (aiSkus.length > 0) setAiSkus([]);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleAiSearch()}
            className="w-full h-12 bg-white/[0.03] border border-white/10 rounded-xl text-white text-[15px] pl-11 pr-4 focus:outline-none focus:border-[#A1A1AA]/30 transition-all"
            aria-label="Campo de pesquisa mobile"
          />
        </div>
      </div>

      <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 md:px-12 py-8 md:py-10 space-y-8 md:space-y-10">

        {/* Filtros e Categorias */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div
            className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0 scrollbar-hide"
            role="tablist"
            aria-label="Filtro de Categorias"
          >
            {categoriesList.map(cat => (
              <button
                key={cat}
                role="tab"
                aria-selected={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
                className={`h-11 px-5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white border ${activeCategory === cat
                    ? "bg-white text-black border-white shadow-sm"
                    : "bg-transparent text-white/70 border-white/20 hover:border-white/50 hover:text-white"
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 shrink-0 border-t md:border-t-0 border-white/10 pt-4 md:pt-0">
            <div className="text-sm font-medium text-white/50" aria-live="polite">
              {displayProducts.length} resultados
            </div>
            {aiSkus.length > 0 && (
              <button
                onClick={() => setAiSkus([])}
                className="h-11 px-4 text-sm text-[#27272A] hover:text-[#0022AA] bg-[#27272A]/10 rounded-lg hover:bg-[#27272A]/20 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#27272A]"
              >
                Limpar Busca IA
              </button>
            )}
          </div>
        </section>

        {/* Grade de Produtos */}
        <section>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6" aria-busy="true">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-[4/3] rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
              ))}
            </div>
          ) : displayProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
              {displayProducts.map((p, idx) => (
                <ProductCard key={`${p._type}-${p.id}`} p={p} index={idx} />
              ))}
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 mb-2">
                <Package size={24} aria-hidden="true" />
              </div>
              <h2 className="text-xl font-semibold tracking-tight">Nenhum produto encontrado</h2>
              <p className="text-[15px] text-white/50 max-w-sm">
                Ajuste os filtros de categoria ou tente um termo diferente na pesquisa.
              </p>
            </div>
          )}
        </section>

      </main>

      <footer className="w-full max-w-[1280px] mx-auto px-6 md:px-12 py-10 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-white/40 text-sm mt-auto">
        <div className="flex items-center gap-3 text-white/60">
          <img src="/allcance-logo.png" alt="Allcance" className="h-5 w-auto object-contain opacity-60" />
          <span className="font-semibold tracking-wide">Allcance © 2026. Todos os direitos reservados.</span>
        </div>
      </footer>

      <StoreChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      <CartDrawer />
      <CheckoutModal />
    </div>
  );
}
