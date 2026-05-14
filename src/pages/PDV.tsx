import { useEffect, useMemo, useRef, useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { maskPhone, maskCpfCnpj } from "@/lib/masks";
import { addToQueue, getQueueCount } from "@/lib/offline-queue";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  X,
  ClipboardPlus,
  Package,
  Bike as BikeIcon,
  CreditCard,
  DollarSign,
  Zap,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Layers,
  UserPlus,
  ChevronRight,
  Banknote,
  WifiOff,
  Loader2,
  Tag,
  Scissors,
} from "lucide-react";
import { useBikeModels } from "@/hooks/useBikes";
import { useParts } from "@/hooks/useParts";
import { useCustomers, useCreateCustomer } from "@/hooks/useCustomers";
import { useCreateSale } from "@/hooks/useSales";
import { useCardTaxes } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";
import { SaleReceipt, type ReceiptData } from "@/components/pdv/SaleReceipt";
import { useCurrentCashRegister, useLinkSaleToCashRegister } from "@/hooks/useCashRegister";
import { useActivePromotions, type Promotion } from "@/hooks/usePromotions";
import { useMyPermissions } from "@/hooks/usePermissions";
import { CurrencyInput } from "@/components/ui/CurrencyInput";


// ─── Helpers ─────────────────────────────────────────────────────────────────

import { formatBRL } from "@/lib/format";
import { getOptimizedImageUrl } from "@/lib/image";

type CepInfo = {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
};

const CEP_CACHE = new Map<string, CepInfo | null>();

function normalizeCep(raw: string) {
  return raw.replace(/\D/g, "").slice(0, 8);
}

function formatCep(raw: string) {
  const d = normalizeCep(raw);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

// ─── Design System ────────────────────────────────────────────────────────────

const Btn = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
}) => {
  const v = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/80 shadow-primary/30",
    secondary: "bg-secondary text-foreground hover:bg-secondary/80 border border-border",
    ghost: "hover:bg-muted/50 text-muted-foreground hover:text-white",
    outline: "border border-border bg-transparent text-foreground/80 hover:bg-muted",
    destructive: "bg-zinc-500/10 text-zinc-500 hover:bg-zinc-500/20",
  };
  const s = {
    sm: "h-9 px-4 text-xs font-bold",
    md: "h-12 px-6 text-sm font-bold",
    lg: "h-14 px-8 rounded-2xl text-base font-black uppercase tracking-widest",
    icon: "h-10 w-10 flex items-center justify-center rounded-xl",
  };
  return (
    <button
      className={`inline-flex items-center justify-center rounded-2xl transition-all active:scale-95 disabled:opacity-50 ${v[variant]} ${s[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const InputEl = ({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={`w-full bg-card border border-border rounded-2xl px-4 text-foreground outline-none focus:border-primary transition-all placeholder:text-muted-foreground/70 ${className}`}
    {...props}
  />
);

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "active" | "outline" }) {
  const styles =
    variant === "active"
      ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
      : variant === "outline"
      ? "bg-muted/60 text-muted-foreground border-border/80"
      : "bg-muted text-muted-foreground border-border/80";
  return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${styles}`}>{children}</span>;
}

function PaymentCard({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-16 md:h-24 rounded-2xl md:rounded-3xl border flex flex-col items-center justify-center gap-1.5 md:gap-2 transition-all ${
        active
          ? "bg-primary/10 border-primary text-white shadow-primary/20"
          : "bg-background border-border text-muted-foreground hover:border-border/80"
      }`}
    >
      <Icon size={18} />
      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartItem {
  key: string;
  id: string;
  type: "bike" | "part";
  name: string;
  category: string | null;
  quantity: number;
  unit_price: number;
}

type Step = "idle" | "catalog" | "cart" | "customer";

// ─── PDV ──────────────────────────────────────────────────────────────────────

export default function PDV() {
  const { toast } = useToast();
  const online = useOnlineStatus();
  const pendingCount = getQueueCount();
  const { data: bikes = [] } = useBikeModels();
  const { data: parts = [] } = useParts();
  const { data: activePromotions = [] } = useActivePromotions();
  const { data: permsData } = useMyPermissions();
  const isAdmin = permsData?.isOwner ?? false;
  
  const { data: customers = [] } = useCustomers();
  const { data: cardTaxes } = useCardTaxes();
  const createCustomer = useCreateCustomer();
  const createSale = useCreateSale();
  const { data: currentCashRegister } = useCurrentCashRegister();
  const linkSaleToCash = useLinkSaleToCashRegister();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [step, setStep] = useState<Step>("idle");

  // Catalog
  const [catalogTab, setCatalogTab] = useState<"parts" | "bikes">("parts");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("todas");

  // Payment
  const [paymentMethod, setPaymentMethod] = useState("pix");

  // Customer
  const [custSearch, setCustSearch] = useState("");
  const [custName, setCustName] = useState("");
  const [custWhatsapp, setCustWhatsapp] = useState("");
  const [custCpf, setCustCpf] = useState("");
  const [custCep, setCustCep] = useState("");
  const [custStreet, setCustStreet] = useState("");
  const [custNumber, setCustNumber] = useState("");
  const [custComplement, setCustComplement] = useState("");
  const [custNeighborhood, setCustNeighborhood] = useState("");
  const [custCity, setCustCity] = useState("");
  const [custState, setCustState] = useState("");
  const [cepInfo, setCepInfo] = useState<CepInfo | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepNotFound, setCepNotFound] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const cepAbortRef = useRef<AbortController | null>(null);

  // Receipt
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Manual discount
  const [manualDiscount, setManualDiscount] = useState(0);
  const [manualDiscountType, setManualDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [manualDiscountInput, setManualDiscountInput] = useState("");
  const [manualDiscountValue, setManualDiscountValue] = useState(0);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  // ── Derived ────────────────────────────────────────────────────────────────

  const subtotal = useMemo(() => cart.reduce((sum, i) => sum + i.quantity * i.unit_price, 0), [cart]);
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  // Promotion discount calculation
  const getItemPromotion = (item: CartItem): Promotion | null => {
    return activePromotions.find((p) =>
      p.scope !== "ecommerce" &&
      (
        (p.applies_to === "product" && (p.product_id === item.id || p.bike_model_id === item.id)) ||
        (p.applies_to === "category" && p.category === item.category) ||
        (p.applies_to === "both" && (p.product_id === item.id || p.bike_model_id === item.id || p.category === item.category))
      )
    ) || null;
  };

  const promotionDiscount = useMemo(() => {
    return cart.reduce((sum, item) => {
      const promo = getItemPromotion(item);
      if (!promo) return sum;
      const itemTotal = item.quantity * item.unit_price;
      if (promo.discount_type === "percentage") return sum + itemTotal * (promo.discount_value / 100);
      return sum + promo.discount_value * item.quantity;
    }, 0);
  }, [cart, activePromotions]);

  const totalDiscount = promotionDiscount + manualDiscount;
  const total = subtotal - totalDiscount;

  const isCardPayment = paymentMethod === "cartão de crédito" || paymentMethod === "cartão de débito";
  const cardTaxPercent = isCardPayment
    ? paymentMethod === "cartão de crédito"
      ? cardTaxes?.credit_tax || 0
      : cardTaxes?.debit_tax || 0
    : 0;
  const cardFee = total * (cardTaxPercent / 100);

  const applyManualDiscount = () => {
    if (manualDiscountType === "percentage") {
      const pct = Number(manualDiscountInput);
      if (pct > 0 && pct <= 100) {
        setManualDiscount(subtotal * (pct / 100));
      }
    } else {
      setManualDiscount(manualDiscountValue);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set<string>();
    parts.forEach((p) => p.category && cats.add(p.category));
    return Array.from(cats).sort();
  }, [parts]);

  const catalogItems = useMemo(() => {
    const q = catalogSearch.toLowerCase();
    const source = catalogTab === "parts" ? parts : bikes;
    return (source as any[]).filter((item) => {
      const matchSearch = !q || item.name.toLowerCase().includes(q) || (item.category || "").toLowerCase().includes(q);
      const matchCat = catalogCategory === "todas" || item.category === catalogCategory;
      return matchSearch && matchCat;
    });
  }, [parts, bikes, catalogSearch, catalogCategory, catalogTab]);

  const filteredCustomers = useMemo(() => {
    if (!custSearch.trim()) return [];
    const q = custSearch.toLowerCase();
    const qDigits = custSearch.replace(/\D/g, "");
    return customers
      .filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.whatsapp && c.whatsapp.includes(q)) ||
        (c.cpf && c.cpf.replace(/\D/g, "").includes(qDigits))
      )
      .slice(0, 6);
  }, [customers, custSearch]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // CEP lookup (ViaCEP) — super rápido (cache + abort)
  useEffect(() => {
    const digits = normalizeCep(custCep);
    setCepNotFound(false);

    if (digits.length < 8) {
      setCepInfo(null);
      setCepLoading(false);
      cepAbortRef.current?.abort();
      return;
    }

    if (!online) {
      // offline: don't try to fetch; keep UI clean
      setCepInfo(null);
      setCepLoading(false);
      return;
    }

    // cache hit => instant
    if (CEP_CACHE.has(digits)) {
      const cached = CEP_CACHE.get(digits) ?? null;
      setCepInfo(cached);
      setCepLoading(false);
      setCepNotFound(!cached);
      return;
    }

    const t = window.setTimeout(async () => {
      try {
        cepAbortRef.current?.abort();
        const ac = new AbortController();
        cepAbortRef.current = ac;
        setCepLoading(true);

        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: ac.signal });
        if (!res.ok) throw new Error("Falha ao consultar CEP");
        const data: any = await res.json();

        if (data?.erro) {
          CEP_CACHE.set(digits, null);
          setCepInfo(null);
          setCepNotFound(true);
          return;
        }

        const info: CepInfo = {
          cep: data.cep || formatCep(digits),
          logradouro: data.logradouro || "",
          bairro: data.bairro || "",
          localidade: data.localidade || "",
          uf: data.uf || "",
        };
        CEP_CACHE.set(digits, info);
        setCepInfo(info);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setCepInfo(null);
      } finally {
        setCepLoading(false);
      }
    }, 120);

    return () => window.clearTimeout(t);
  }, [custCep, online]);

  // ── Cart actions ───────────────────────────────────────────────────────────

  const getStockQty = (id: string, type: "bike" | "part"): number => {
    if (type === "part") return parts.find((p) => p.id === id)?.stock_qty ?? 0;
    return bikes.find((b) => b.id === id)?.stock_qty ?? 0;
  };

  const addToCart = (id: string, type: "bike" | "part", name: string, price: number, category: string | null) => {
    const stock = getStockQty(id, type);
    const currentQty = getCartQty(id, type);
    if (currentQty >= stock) {
      toast({ title: "Estoque insuficiente", variant: "destructive" });
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.id === id && i.type === type);
      if (existing) return prev.map((i) => (i.id === id && i.type === type ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { key: crypto.randomUUID(), id, type, name, category, quantity: 1, unit_price: price }];
    });
  };

  const updateQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => (i.key === key ? { ...i, quantity: i.quantity + delta } : i)).filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (key: string) => setCart((prev) => prev.filter((i) => i.key !== key));

  const getCartQty = (id: string, type: "bike" | "part") =>
    cart.find((i) => i.id === id && i.type === type)?.quantity || 0;

  // ── Navigation ─────────────────────────────────────────────────────────────

  const openCatalog = () => {
    setCatalogSearch("");
    setCatalogCategory("todas");
    setStep("catalog");
  };

  const goToCustomer = () => {
    setCustName("");
    setCustWhatsapp("");
    setCustCpf("");
    setCustCep("");
    setCustStreet("");
    setCustNumber("");
    setCustComplement("");
    setCustNeighborhood("");
    setCustCity("");
    setCustState("");
    setCepInfo(null);
    setCepLoading(false);
    setCepNotFound(false);
    setCustSearch("");
    setSelectedCustomerId(null);
    setStep("customer");
  };

  // ── Finalize ───────────────────────────────────────────────────────────────

  const handleFinalize = async () => {
    try {
      let customerId = selectedCustomerId;

      if (!customerId && custName.trim()) {
        if (!online) {
          // Can't create customer offline, proceed without
          customerId = null;
        } else {
          const created = await createCustomer.mutateAsync({
            name: custName.trim(),
            whatsapp: custWhatsapp.trim() || null,
            cpf: custCpf.trim() || null,
            cep: custCep.trim() || null,
            address_street: custStreet.trim() || null,
            address_number: custNumber.trim() || null,
            address_complement: custComplement.trim() || null,
            address_neighborhood: custNeighborhood.trim() || null,
            address_city: custCity.trim() || null,
            address_state: custState.trim() || null,
          });
          customerId = created.id;
        }
      } else if (customerId && online) {
        try {
          await updateCustomer.mutateAsync({
            id: customerId,
            name: custName.trim() || undefined,
            whatsapp: custWhatsapp.trim() || null,
            cpf: custCpf.trim() || null,
            cep: custCep.trim() || null,
            address_street: custStreet.trim() || null,
            address_number: custNumber.trim() || null,
            address_complement: custComplement.trim() || null,
            address_neighborhood: custNeighborhood.trim() || null,
            address_city: custCity.trim() || null,
            address_state: custState.trim() || null,
          });
        } catch (e) {
          console.error("Erro ao atualizar dados do cliente", e);
        }
      }

      const saleId = crypto.randomUUID();
      const activePromoId = activePromotions.find((p) =>
        cart.some((item) => getItemPromotion(item)?.id === p.id)
      )?.id || null;

      const salePayload = {
        id: saleId,
        customer_id: customerId,
        total,
        payment_method: paymentMethod,
        notes: null,
        card_fee: cardFee,
        card_tax_percent: cardTaxPercent,
        discount_amount: totalDiscount,
        discount_type: manualDiscount > 0 ? "manual" : promotionDiscount > 0 ? "promotion" : null,
        promotion_id: activePromoId,
      };

      const itemsPayload = cart.map((item) => ({
        id: crypto.randomUUID(),
        sale_id: saleId,
        description: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        bike_model_id: item.type === "bike" ? item.id : null,
        part_id: item.type === "part" ? item.id : null,
      }));

      if (!online) {
        // Save to offline queue
        addToQueue({
          id: saleId,
          payload: { salePayload, itemsPayload },
          created_at: new Date().toISOString(),
        });

        // Show receipt even offline
        const finalCustomerName = selectedCustomer?.name || custName.trim() || undefined;
        const finalWhatsapp = selectedCustomer?.whatsapp || custWhatsapp.trim() || undefined;

        const receipt: ReceiptData = {
          orderNumber: saleId.slice(-4).toUpperCase(),
          timestamp: new Date(),
          customerName: finalCustomerName,
          customerWhatsapp: finalWhatsapp,
          items: cart.map((i) => ({ name: i.name, quantity: i.quantity, unit_price: i.unit_price })),
          subtotal,
          discount: totalDiscount,
          total,
          paymentMethod,
        };

        setReceiptData(receipt);
        setShowReceipt(true);
        setStep("idle");

        toast({
          title: "Venda salva offline",
          description: "Será sincronizada quando a internet voltar.",
        });
        return;
      }

      // Online — normal flow
      const activePromoIdOnline = activePromotions.find((p) =>
        cart.some((item) => getItemPromotion(item)?.id === p.id)
      )?.id || null;

      const sale = await createSale.mutateAsync({
        customer_id: customerId,
        total,
        payment_method: paymentMethod,
        notes: null,
        card_fee: cardFee,
        card_tax_percent: cardTaxPercent,
        discount_amount: totalDiscount,
        discount_type: manualDiscount > 0 ? "manual" : promotionDiscount > 0 ? "promotion" : null,
        promotion_id: activePromoIdOnline,
        items: cart.map((item) => ({
          description: item.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          bike_model_id: item.type === "bike" ? item.id : null,
          part_id: item.type === "part" ? item.id : null,
        })),
      });

      // Link to cash register if payment is cash and register is open
      if (paymentMethod === "dinheiro") {
        if (currentCashRegister?.status === "open") {
          await linkSaleToCash.mutateAsync({
            cashRegisterId: currentCashRegister.id,
            saleId: sale.id,
            amount: total,
          });
        } else {
          toast({ title: "Atenção: nenhum caixa aberto. A venda foi registrada mas não vinculada ao caixa.", variant: "destructive" });
        }
      }

      // Build receipt data from current PDV state
      const finalCustomerName = selectedCustomer?.name || custName.trim() || undefined;
      const finalWhatsapp = selectedCustomer?.whatsapp || custWhatsapp.trim() || undefined;

      const receipt: ReceiptData = {
        orderNumber: sale.id.slice(-4).toUpperCase(),
        timestamp: new Date(),
        customerName: finalCustomerName,
        customerWhatsapp: finalWhatsapp,
        items: cart.map((i) => ({ name: i.name, quantity: i.quantity, unit_price: i.unit_price })),
        subtotal,
        discount: totalDiscount,
        total,
        paymentMethod,
      };

      setReceiptData(receipt);
      setShowReceipt(true);
      setStep("idle");

      toast({ title: "Venda registrada com sucesso!" });
    } catch {
      toast({ title: "Erro ao registrar venda", variant: "destructive" });
    }
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setReceiptData(null);
    setCart([]);
    setPaymentMethod("pix");
    setSelectedCustomerId(null);
    setCustName("");
    setCustWhatsapp("");
    setCustCpf("");
    setCustCep("");
    setCustStreet("");
    setCustNumber("");
    setCustComplement("");
    setCustNeighborhood("");
    setCustCity("");
    setCustState("");
    setCepInfo(null);
    setCepLoading(false);
    setCepNotFound(false);
    setManualDiscount(0);
    setManualDiscountInput("");
    setManualDiscountValue(0);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-background text-foreground font-sans selection:bg-primary/30 pb-24 lg:pb-0">
      <div className="max-w-5xl mx-auto w-full p-4 lg:p-8 space-y-3 md:space-y-6 lg:space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
          <div className="space-y-1 md:space-y-2">
            <div className="flex items-center gap-2 md:gap-3 mb-1">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-zinc-800 rounded-xl md:rounded-2xl flex items-center justify-center shadow-black/20">
                <ShoppingCart size={16} className="md:hidden text-white" />
                <ShoppingCart size={20} className="hidden md:block text-white" />
              </div>
              <span className="text-[10px] md:text-sm font-black uppercase tracking-widest text-primary">
                Checkout Express
              </span>
              {!online && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 px-2 py-1 rounded-full">
                  <WifiOff size={10} /> Offline
                </span>
              )}
              {online && pendingCount > 0 && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 bg-zinc-500/10 border border-zinc-500/20 px-2 py-1 rounded-full">
                  <Loader2 size={10} className="animate-spin" /> {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <h1 className="text-lg md:text-2xl lg:text-4xl font-extrabold tracking-tight">Ponto de Venda</h1>
          </div>
          <Btn variant="primary" size="sm" className="w-full md:w-auto md:!h-14 md:!px-8 md:!text-base md:font-black md:uppercase md:tracking-widest h-10 text-sm px-4" onClick={openCatalog}>
            <Plus className="w-4 h-4 mr-1 md:w-5 md:h-5 md:mr-2 stroke-[3]" />
            Adicionar Itens
          </Btn>
        </header>

        {/* Carrinho / Empty State */}
        {cart.length === 0 ? (
          <div className="py-20 md:py-32 flex flex-col items-center text-center space-y-4 md:space-y-6 bg-card border border-dashed border-border rounded-2xl md:rounded-[40px]">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-background rounded-2xl md:rounded-[30px] flex items-center justify-center text-muted-foreground/50">
              <Package size={32} className="md:hidden" />
              <Package size={40} className="hidden md:block" />
            </div>
            <div className="space-y-2">
              <h4 className="text-base md:text-xl font-bold text-foreground/80">Carrinho Vazio</h4>
              <p className="text-xs md:text-sm text-muted-foreground max-w-xs mx-auto">Inicie uma nova venda selecionando produtos do catálogo.</p>
            </div>
            <Btn variant="outline" className="px-8 h-10 text-sm" onClick={openCatalog}>Abrir Catálogo</Btn>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between px-2 md:px-4">
              <h3 className="text-xs md:text-lg font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Layers size={14} className="md:hidden" />
                <Layers size={18} className="hidden md:block" />
                Itens Selecionados
              </h3>
              <span className="text-[10px] md:text-xs font-black text-primary bg-primary/10 px-2.5 py-0.5 md:px-3 md:py-1 rounded-full">
                {itemCount} Unidades
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 md:gap-4">
              {cart.map((item) => (
                <div
                  key={item.key}
                  className="group bg-card border border-border rounded-2xl md:rounded-[32px] p-3 md:p-6 flex items-center gap-2 md:gap-6 hover:border-border/80 transition-all"
                >
                  {/* Icon */}
                  <div className="w-9 h-9 md:w-16 md:h-16 bg-background rounded-lg md:rounded-2xl flex items-center justify-center text-muted-foreground/70 shrink-0">
                    {item.type === "bike" ? <BikeIcon size={16} className="md:hidden" /> : <Package size={16} className="md:hidden" />}
                    {item.type === "bike" ? <BikeIcon size={32} className="hidden md:block" /> : <Package size={32} className="hidden md:block" />}
                  </div>

                  {/* Name + price */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm md:text-xl font-bold text-white truncate max-w-[120px] md:max-w-none">{item.name}</h4>
                    <p className="text-xs md:text-sm text-muted-foreground font-medium">{formatBRL(item.unit_price)}/un</p>
                    <p className="text-xs font-black text-white md:hidden mt-0.5">{formatBRL(item.quantity * item.unit_price)}</p>
                  </div>

                  {/* Qty controls */}
                  {(() => {
                    const stock = getStockQty(item.id, item.type);
                    const atMax = item.quantity >= stock;
                    return (
                      <div className="flex items-center gap-1 md:gap-0 bg-background rounded-lg md:rounded-2xl p-0.5 md:p-1 border border-border shrink-0">
                        <Btn variant="ghost" size="icon" className="!h-6 !w-6 md:!h-10 md:!w-10 !rounded-lg" onClick={() => updateQty(item.key, -1)}><Minus size={12} className="md:hidden" /><Minus size={14} className="hidden md:block" /></Btn>
                        <span className="w-5 md:w-10 text-center font-black text-white text-sm">{item.quantity}</span>
                        <Btn variant="ghost" size="icon" className={`!h-6 !w-6 md:!h-10 md:!w-10 !rounded-lg ${atMax ? "opacity-30 cursor-not-allowed" : ""}`} onClick={() => { if (!atMax) updateQty(item.key, 1); }}><Plus size={12} className="md:hidden" /><Plus size={14} className="hidden md:block" /></Btn>
                      </div>
                    );
                  })()}

                  {/* Subtotal desktop */}
                  <div className="text-right min-w-[100px] hidden md:block">
                    <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">Subtotal</p>
                    <p className="text-xl font-black text-white">{formatBRL(item.quantity * item.unit_price)}</p>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(item.key)}
                    className="p-1 md:p-2 text-muted-foreground/50 hover:text-zinc-500 transition-colors shrink-0"
                  >
                    <X size={14} className="md:hidden" />
                    <X size={20} className="hidden md:block" />
                  </button>
                </div>
              ))}
            </div>

            <Btn variant="outline" className="w-full h-10 md:h-12 text-sm" onClick={openCatalog}>
              <Plus className="w-4 h-4 mr-2" /> Adicionar mais itens
            </Btn>
          </div>
        )}
      </div>

      {/* Barra flutuante — estilo iFood */}
      {cart.length > 0 && step === "idle" && (
        <div className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] md:w-[90%] max-w-4xl bg-secondary/95 backdrop-blur-2xl border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)] md:shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl md:rounded-[32px] h-16 md:h-auto px-4 md:p-4 flex items-center justify-between z-[55] animate-in slide-in-from-bottom-10 lg:bottom-8" style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}>
          <div className="flex items-center gap-3 md:gap-6 md:px-4">
            <div className="relative shrink-0 hidden md:block">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg">
                <ShoppingCart size={18} />
              </div>
              <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-white text-primary rounded-full flex items-center justify-center text-xs font-black shadow-xl">
                {itemCount}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total</p>
              <p className="text-sm md:text-2xl font-bold md:font-black text-white tracking-tighter">{formatBRL(total)}</p>
            </div>
          </div>
          <Btn variant="primary" size="sm" className="h-10 px-6 text-sm font-black md:!h-16 md:!px-12 md:!text-base" onClick={() => setStep("cart")}>
            <span className="hidden md:inline">Revisar e Pagar</span>
            <span className="md:hidden">Pagar</span>
            <ArrowRight className="ml-1 md:ml-2 w-4 h-4 md:w-5 md:h-5" />
          </Btn>
        </div>
      )}

      {/* ── MODAL 1: Catálogo ─────────────────────────────────────────────── */}
      {step === "catalog" && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="h-full flex flex-col max-w-5xl mx-auto p-3 md:p-6 space-y-3 md:space-y-6">

            <header className="flex items-center gap-3">
              <button
                onClick={() => setStep("idle")}
                className="flex items-center gap-1.5 md:gap-2 text-muted-foreground hover:text-white transition-colors group shrink-0"
              >
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span className="font-bold uppercase text-[10px] md:text-xs tracking-widest hidden md:inline">Voltar ao PDV</span>
              </button>
              <h2 className="text-lg md:text-2xl font-bold md:font-black text-white">Catálogo de Produtos</h2>
            </header>

            {/* Search + Tabs */}
            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={16} />
                <InputEl
                  autoFocus
                  placeholder="Busque por nome ou categoria..."
                  className="h-10 md:h-14 pl-11 pr-4 text-sm"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                />
              </div>
              <div className="flex p-1 bg-card rounded-xl md:rounded-2xl border border-border shrink-0 self-start">
                <button
                  onClick={() => { setCatalogTab("parts"); setCatalogCategory("todas"); }}
                  className={`px-4 md:px-8 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${catalogTab === "parts" ? "bg-secondary text-white" : "text-muted-foreground"}`}
                >
                  Peças
                </button>
                <button
                  onClick={() => { setCatalogTab("bikes"); setCatalogCategory("todas"); }}
                  className={`px-4 md:px-8 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${catalogTab === "bikes" ? "bg-secondary text-white" : "text-muted-foreground"}`}
                >
                  Bikes
                </button>
              </div>
            </div>

            {/* Category chips — só peças */}
            {catalogTab === "parts" && categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {["todas", ...categories].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCatalogCategory(cat)}
                    className={`shrink-0 px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[10px] md:text-[11px] font-bold uppercase tracking-widest transition-all border ${
                      catalogCategory === cat
                        ? "bg-primary/10 border-primary text-white"
                        : "bg-background border-border text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    {cat === "todas" ? "Todas" : cat}
                  </button>
                ))}
              </div>
            )}

            {/* Grid de itens */}
            <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-muted">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 w-full">
              {catalogItems.length === 0 ? (
                <div className="col-span-full py-20 text-center text-muted-foreground/70 text-sm">Nenhum item encontrado</div>
              ) : (
                catalogItems.map((item: any) => {
                  const isBike = catalogTab === "bikes";
                  const type = isBike ? "bike" : "part";
                  const price = Number(item.price_store) || Number(item.sale_price) || 0;
                  const qty = getCartQty(item.id, type as "bike" | "part");
                  const stock = item.stock_qty ?? 0;
                  const outOfStock = stock <= 0;
                  const atLimit = qty >= stock;

                  return (
                    <div
                      key={item.id}
                      className={`w-full min-w-0 overflow-hidden bg-card border border-border rounded-2xl md:rounded-[32px] p-3 md:p-6 flex flex-col justify-between space-y-2 md:space-y-4 transition-all ${outOfStock ? "opacity-40 grayscale pointer-events-none" : "hover:border-border/80"}`}
                    >
                      <div className="space-y-2 md:space-y-3">
                        {item.images && item.images.length > 0 ? (
                          <img
                            src={getOptimizedImageUrl(item.images[0], 200, 75) || item.images[0]}
                            alt={item.name}
                            loading="lazy"
                            className="w-full h-32 md:aspect-square rounded-xl md:rounded-2xl object-cover border border-border"
                          />
                        ) : (
                          <div className="w-full h-32 md:aspect-square bg-background rounded-xl md:rounded-2xl flex items-center justify-center text-muted border border-border">
                            {isBike ? <BikeIcon size={32} className="md:hidden" /> : <Package size={32} className="md:hidden" />}
                            {isBike ? <BikeIcon size={64} className="hidden md:block" /> : <Package size={64} className="hidden md:block" />}
                          </div>
                        )}
                        <div className="min-w-0">
                          {item.category && <Badge variant="outline">{item.category}</Badge>}
                          <h4 className="text-sm md:text-lg font-bold text-white mt-1 truncate">{item.name}</h4>
                          <p className="text-sm md:text-xl font-bold md:font-black text-primary mt-0.5 md:mt-1">{formatBRL(price)}</p>
                          <p className={`text-[10px] mt-0.5 uppercase tracking-widest ${outOfStock ? "text-zinc-500 font-bold" : "text-muted-foreground/70"}`}>
                            {outOfStock ? "Sem estoque" : `Estoque: ${stock}`}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2">
                        {outOfStock ? (
                          <div className="w-full h-8 rounded-xl bg-background text-xs font-bold text-muted-foreground/70 flex items-center justify-center cursor-not-allowed">
                            Indisponível
                          </div>
                        ) : qty > 0 ? (
                          <div className="flex items-center justify-between bg-muted rounded-xl px-3 py-2">
                            <button
                              className="w-6 h-6 flex items-center justify-center text-white"
                              onClick={() => updateQty(cart.find((i) => i.id === item.id && i.type === type)!.key, -1)}
                            >
                              <Minus size={14} />
                            </button>
                            <span className="text-sm font-bold text-white">{qty}</span>
                            <button
                              className={`w-6 h-6 flex items-center justify-center ${atLimit ? "text-muted-foreground/70 cursor-not-allowed" : "text-white"}`}
                              onClick={() => !atLimit && addToCart(item.id, type as "bike" | "part", item.name, price, item.category)}
                              disabled={atLimit}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="w-full h-8 rounded-xl bg-muted text-xs font-bold text-white hover:bg-muted/80 transition-colors"
                            onClick={() => addToCart(item.id, type as "bike" | "part", item.name, price, item.category)}
                          >
                            + Adicionar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              </div>
            </div>

            {/* Footer do catálogo */}
            <div className="p-3 md:p-6 bg-secondary border border-border rounded-2xl md:rounded-[32px] flex items-center justify-between gap-2 md:gap-3">
              <div className="flex items-center gap-2 md:gap-4 min-w-0">
                <div className="w-9 h-9 md:w-12 md:h-12 bg-primary/10 text-primary rounded-lg md:rounded-2xl flex items-center justify-center shrink-0">
                  <ShoppingCart size={16} className="md:hidden" />
                  <ShoppingCart size={18} className="hidden md:block" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pedido</p>
                  <p className="font-bold md:font-black text-white text-sm md:text-base truncate">{itemCount} itens · {formatBRL(total)}</p>
                </div>
              </div>
              <Btn variant="primary" size="sm" className="px-4 md:!px-12 h-10 md:!h-14 text-xs md:!text-base shrink-0 font-black" onClick={() => setStep("idle")}>
                <span className="hidden md:inline">Concluir Seleção</span>
                <span className="md:hidden">Concluir</span>
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Pagamento ────────────────────────────────────────────── */}
      {step === "cart" && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl animate-in fade-in duration-300 flex items-end md:items-center justify-center p-0 md:p-6">
          <div className="bg-secondary w-full max-w-2xl rounded-t-3xl md:rounded-[40px] border border-border shadow-2xl overflow-hidden">
            <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 lg:space-y-8 max-h-[90vh] overflow-y-auto">

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg md:text-xl lg:text-3xl font-black text-white">Finalizar Venda</h2>
                  <p className="text-muted-foreground text-xs md:text-sm">Escolha a forma de pagamento</p>
                </div>
                <button
                  onClick={() => setStep("idle")}
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Payment cards visuais */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                <PaymentCard active={paymentMethod === "pix"} onClick={() => setPaymentMethod("pix")} icon={Zap} label="PIX" />
                <PaymentCard active={paymentMethod === "dinheiro"} onClick={() => setPaymentMethod("dinheiro")} icon={DollarSign} label="Dinheiro" />
                <PaymentCard active={paymentMethod === "cartão de crédito"} onClick={() => setPaymentMethod("cartão de crédito")} icon={CreditCard} label="Crédito" />
                <PaymentCard active={paymentMethod === "cartão de débito"} onClick={() => setPaymentMethod("cartão de débito")} icon={CreditCard} label="Débito" />
              </div>

              {/* Resumo financeiro */}
              <div className="p-4 md:p-6 bg-background/50 border border-border rounded-2xl md:rounded-3xl space-y-3 md:space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-bold text-[10px] md:text-xs uppercase tracking-widest">Resumo Financeiro</span>
                  <Badge variant="active">Pagamento Seguro</Badge>
                </div>
                <div className="space-y-2">
                  {/* Itens do carrinho */}
                  {cart.map((item) => {
                    const promo = getItemPromotion(item);
                    return (
                      <div key={item.key} className="flex justify-between text-muted-foreground text-xs md:text-sm">
                        <span className="truncate mr-2 flex items-center gap-1.5">
                          {item.name} ×{item.quantity}
                          {promo && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                              {promo.discount_type === "percentage" ? `-${promo.discount_value}%` : `-${formatBRL(promo.discount_value)}`}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0">{formatBRL(item.quantity * item.unit_price)}</span>
                      </div>
                    );
                  })}
                  <div className="h-px bg-muted my-2" />
                  <div className="flex justify-between text-muted-foreground text-xs md:text-sm">
                    <span>Subtotal</span>
                    <span>{formatBRL(subtotal)}</span>
                  </div>
                  {promotionDiscount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-primary flex items-center gap-1"><Tag size={10} /> Promoções</span>
                      <span className="text-primary">-{formatBRL(promotionDiscount)}</span>
                    </div>
                  )}
                  {manualDiscount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400 flex items-center gap-1"><Scissors size={10} /> Desconto manual</span>
                      <span className="text-zinc-400">-{formatBRL(manualDiscount)}</span>
                    </div>
                  )}
                  {isCardPayment && cardTaxPercent > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Taxa cartão ({cardTaxPercent}%)</span>
                      <span className="text-zinc-400">-{formatBRL(cardFee)}</span>
                    </div>
                  )}
                  <div className="h-px bg-muted my-2" />
                  <div className="flex justify-between items-end text-white">
                    <span className="font-bold text-sm">Valor Total</span>
                    <span className="text-lg md:text-xl lg:text-3xl font-black tracking-tighter">{formatBRL(total)}</span>
                  </div>
                  {isCardPayment && cardTaxPercent > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Líquido (após taxa)</span>
                      <span className="text-zinc-400">{formatBRL(total - cardFee)}</span>
                    </div>
                  )}
                </div>

                {/* Manual discount button (admin only) */}
                {isAdmin && (
                  <button
                    onClick={() => setDiscountModalOpen(true)}
                    className="w-full h-10 rounded-xl border border-dashed border-border text-muted-foreground text-xs font-bold flex items-center justify-center gap-2 hover:border-primary/50 hover:text-primary transition-all"
                  >
                    <Tag size={14} />
                    {manualDiscount > 0 ? `Desconto: -${formatBRL(manualDiscount)}` : "Aplicar Desconto"}
                  </button>
                )}
              </div>

              <div className="flex gap-3 md:gap-4">
                <Btn variant="ghost" className="flex-1 h-10 md:h-16 text-sm" onClick={() => setStep("idle")}>Revisar Itens</Btn>
                <Btn variant="primary" className="flex-[2] h-10 md:h-16 text-sm" onClick={goToCustomer}>
                  Identificar Cliente <ArrowRight className="ml-1 md:ml-2 w-4 h-4" />
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: Cliente ──────────────────────────────────────────────── */}
      {step === "customer" && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl animate-in fade-in duration-300 flex items-center justify-center p-6">
          <div className="bg-secondary w-full max-w-md rounded-[40px] border border-border shadow-2xl overflow-hidden">
            <div className="p-6 lg:p-8 space-y-6 lg:space-y-8 max-h-[90vh] overflow-y-auto">

              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white">Identificação</h2>
                <button onClick={() => setStep("cart")} className="text-muted-foreground hover:text-white transition-colors">
                  <ArrowLeft />
                </button>
              </div>

              <div className="space-y-4">
                {/* Busca de cliente existente */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={18} />
                  <InputEl
                    placeholder="Buscar por nome, WhatsApp ou CPF..."
                    className="h-14 pl-12 pr-4"
                    value={custSearch}
                    onChange={(e) => {
                      setCustSearch(e.target.value);
                      setSelectedCustomerId(null);
                    }}
                  />
                </div>

                {/* Resultados da busca */}
                {custSearch && filteredCustomers.length > 0 && !selectedCustomer && (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomerId(c.id);
                          setCustSearch("");
                          setCustName(c.name);
                          setCustWhatsapp(c.whatsapp || "");
                          setCustCpf(c.cpf || "");
                          setCustCep(c.cep || "");
                          setCustStreet((c as any).address_street || "");
                          setCustNumber((c as any).address_number || "");
                          setCustComplement((c as any).address_complement || "");
                          setCustNeighborhood((c as any).address_neighborhood || "");
                          setCustCity((c as any).address_city || "");
                          setCustState((c as any).address_state || "");
                        }}
                        className={`w-full p-4 rounded-2xl border transition-all text-left flex items-center justify-between ${
                          selectedCustomerId === c.id
                            ? "bg-primary/10 border-primary text-white"
                            : "bg-background border-border text-muted-foreground hover:border-border/80"
                        }`}
                      >
                        <div>
                          <p className="font-bold text-white">{c.name}</p>
                          <p className="text-[10px] uppercase tracking-widest">
                            {[c.whatsapp, c.cpf].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        {selectedCustomerId === c.id && <CheckCircle2 className="text-primary" />}
                      </button>
                    ))}
                  </div>
                )}

                {/* Cliente selecionado */}
                {selectedCustomer && (
                  <div className="p-4 bg-primary/10 border border-primary/30 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">{selectedCustomer.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                        {[selectedCustomer.whatsapp, (selectedCustomer as any).cpf].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <button
                      onClick={() => { setSelectedCustomerId(null); setCustName(""); setCustWhatsapp(""); setCustCpf(""); }}
                      className="text-xs font-bold text-muted-foreground hover:text-white transition-colors"
                    >
                      Trocar
                    </button>
                  </div>
                )}

                {/* Divisor */}
                {!selectedCustomer && (
                  <>
                    <div className="flex items-center gap-2 text-muted-foreground/70">
                      <div className="h-px flex-1 bg-muted" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Ou novo cliente</span>
                      <div className="h-px flex-1 bg-muted" />
                    </div>

                    <div className="space-y-3">
                      <InputEl
                        placeholder="Nome *"
                        className="h-12 px-4"
                        value={custName}
                        onChange={(e) => setCustName(e.target.value)}
                        maxLength={100}
                      />
                      <InputEl
                        placeholder="WhatsApp (11) 99999-9999"
                        className="h-12 px-4"
                        value={custWhatsapp}
                        onChange={(e) => setCustWhatsapp(maskPhone(e.target.value))}
                        maxLength={15}
                      />
                      <InputEl
                        placeholder="CPF 000.000.000-00"
                        className="h-12 px-4"
                        value={custCpf}
                        onChange={(e) => setCustCpf(maskCpfCnpj(e.target.value))}
                        maxLength={18}
                      />
                      <InputEl
                        placeholder="CEP 00000-000"
                        className="h-12 px-4"
                        value={custCep}
                        onChange={(e) => setCustCep(formatCep(e.target.value))}
                        maxLength={9}
                      />
                      {(cepLoading || cepInfo || cepNotFound) && (
                        <div className="px-1 -mt-2">
                          {cepLoading && (
                            <p className="text-[10px] text-muted-foreground/70 font-bold uppercase tracking-widest">
                              Buscando endereço…
                            </p>
                          )}
                          {!cepLoading && cepInfo && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!cepInfo) return;
                                if (cepInfo.logradouro) setCustStreet(cepInfo.logradouro);
                                if (cepInfo.bairro) setCustNeighborhood(cepInfo.bairro);
                                if (cepInfo.localidade) setCustCity(cepInfo.localidade);
                                if (cepInfo.uf) setCustState(cepInfo.uf);
                              }}
                              className="text-left w-full p-3 rounded-xl border border-border bg-background/40 hover:bg-background/60 transition-colors"
                            >
                              <p className="text-[11px] text-foreground/90 font-medium">
                                {cepInfo.logradouro || "Rua não informada"}{" "}
                                <span className="text-muted-foreground/70">
                                  {[
                                    cepInfo.bairro || null,
                                    cepInfo.localidade ? `${cepInfo.localidade}/${cepInfo.uf}` : null,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                              </p>
                              <p className="text-[10px] text-muted-foreground/70 font-bold uppercase tracking-widest mt-1">
                                Toque para preencher endereço
                              </p>
                            </button>
                          )}
                          {!cepLoading && cepNotFound && (
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                              CEP não encontrado
                            </p>
                          )}
                        </div>
                      )}
                      <InputEl
                        placeholder="Endereço (Rua / Av.)"
                        className="h-12 px-4"
                        value={custStreet}
                        onChange={(e) => setCustStreet(e.target.value)}
                        maxLength={120}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <InputEl
                          placeholder="Número"
                          className="h-12 px-4"
                          value={custNumber}
                          onChange={(e) => setCustNumber(e.target.value)}
                          maxLength={20}
                        />
                        <InputEl
                          placeholder="Complemento"
                          className="h-12 px-4"
                          value={custComplement}
                          onChange={(e) => setCustComplement(e.target.value)}
                          maxLength={60}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <InputEl
                          placeholder="Bairro"
                          className="h-12 px-4"
                          value={custNeighborhood}
                          onChange={(e) => setCustNeighborhood(e.target.value)}
                          maxLength={80}
                        />
                        <InputEl
                          placeholder="Cidade"
                          className="h-12 px-4"
                          value={custCity}
                          onChange={(e) => setCustCity(e.target.value)}
                          maxLength={80}
                        />
                      </div>
                      <InputEl
                        placeholder="Estado (UF)"
                        className="h-12 px-4"
                        value={custState}
                        onChange={(e) => setCustState(e.target.value.toUpperCase())}
                        maxLength={2}
                      />
                    </div>
                  </>
                )}
              </div>

              <Btn
                variant="primary"
                size="sm"
                className="w-full h-10 md:!h-16 md:!text-base md:font-black md:uppercase md:tracking-widest text-sm font-bold"
                onClick={handleFinalize}
                disabled={(!custName.trim() && !selectedCustomerId) || createSale.isPending}
              >
                Finalizar Venda — {formatBRL(total)}
              </Btn>
            </div>
          </div>
        </div>
      )}
      {/* ── Manual Discount Modal ─────────────────────────────────────── */}
      {discountModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black">Aplicar Desconto</h3>
              <button onClick={() => setDiscountModalOpen(false)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setManualDiscountType("percentage")} className={`flex-1 h-9 rounded-xl text-xs font-bold border transition-all ${manualDiscountType === "percentage" ? "bg-primary border-primary text-primary-foreground" : "bg-background border-border text-muted-foreground"}`}>
                % Percentual
              </button>
              <button onClick={() => setManualDiscountType("fixed")} className={`flex-1 h-9 rounded-xl text-xs font-bold border transition-all ${manualDiscountType === "fixed" ? "bg-primary border-primary text-primary-foreground" : "bg-background border-border text-muted-foreground"}`}>
                R$ Valor fixo
              </button>
            </div>

            {manualDiscountType === "percentage" ? (
              <div>
                <input
                  type="number" min="1" max="100"
                  placeholder="Ex: 10"
                  value={manualDiscountInput}
                  onChange={(e) => setManualDiscountInput(e.target.value)}
                  className="w-full h-14 bg-background border border-border rounded-2xl px-4 text-center text-2xl font-black text-foreground outline-none focus:border-primary"
                />
                <p className="text-xs text-muted-foreground text-center mt-1">
                  = {formatBRL(subtotal * (Number(manualDiscountInput) / 100))} de desconto
                </p>
              </div>
            ) : (
              <CurrencyInput value={manualDiscountValue} onChange={setManualDiscountValue} />
            )}

            {manualDiscount > 0 && (
              <button onClick={() => { setManualDiscount(0); setManualDiscountInput(""); setManualDiscountValue(0); setDiscountModalOpen(false); }} className="w-full h-9 rounded-xl border border-destructive/30 text-destructive text-xs font-bold">
                Remover Desconto
              </button>
            )}

            <button onClick={applyManualDiscount} className="w-full h-11 rounded-2xl bg-primary text-primary-foreground text-sm font-black">
              Aplicar Desconto
            </button>
          </div>
        </div>
      )}

      {/* ── Receipt Modal ─────────────────────────────────────────────── */}
      {receiptData && (
        <SaleReceipt
          open={showReceipt}
          onClose={handleCloseReceipt}
          data={receiptData}
        />
      )}
    </div>
  );
}
