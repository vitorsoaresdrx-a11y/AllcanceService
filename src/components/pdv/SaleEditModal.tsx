import { useEffect, useState, useMemo } from "react";
import { X, Plus, Minus, Trash2, Search, CreditCard, DollarSign, Zap, Banknote, Tag, Scissors } from "lucide-react";
import { useUpdateSale } from "@/hooks/useSales";
import { useParts } from "@/hooks/useParts";
import { useBikeModels } from "@/hooks/useBikes";
import { useCustomers } from "@/hooks/useCustomers";
import { useCardTaxes } from "@/hooks/useSettings";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { formatBRL } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

interface EditItem {
  key: string;
  description: string;
  quantity: number;
  unit_price: number;
  part_id: string | null;
  bike_model_id: string | null;
}

interface SaleEditModalProps {
  sale: any;
  open: boolean;
  onClose: () => void;
}

const paymentMethods = [
  { value: "pix", label: "PIX", icon: Zap },
  { value: "dinheiro", label: "Dinheiro", icon: DollarSign },
  { value: "cartão de crédito", label: "Crédito", icon: CreditCard },
  { value: "cartão de débito", label: "Débito", icon: CreditCard },
];

export function SaleEditModal({ sale, open, onClose }: SaleEditModalProps) {
  const { toast } = useToast();
  const updateSale = useUpdateSale();
  const { data: parts = [] } = useParts();
  const { data: bikes = [] } = useBikeModels();
  const { data: customers = [] } = useCustomers();
  const { data: cardTaxes } = useCardTaxes();

  const [items, setItems] = useState<EditItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("fixed");
  const [discountInput, setDiscountInput] = useState(0);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [showCatalog, setShowCatalog] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  // Carrega dados da venda ao abrir
  useEffect(() => {
    if (!open || !sale) return;
    setItems(
      (sale.sale_items || []).map((item: any) => ({
        key: item.id,
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        part_id: item.part_id || null,
        bike_model_id: item.bike_model_id || null,
      }))
    );
    setPaymentMethod(sale.payment_method || "pix");
    setCustomerId(sale.customer_id || null);
    setDiscount(Number(sale.discount_amount) || 0);
    setDiscountInput(Number(sale.discount_amount) || 0);
    setDiscountType("fixed");
    setCatalogSearch("");
    setCustomerSearch("");
  }, [open, sale]);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0),
    [items]
  );

  const total = Math.max(0, subtotal - discount);

  const isCard = paymentMethod === "cartão de crédito" || paymentMethod === "cartão de débito";
  const cardTaxPercent = isCard
    ? paymentMethod === "cartão de crédito"
      ? cardTaxes?.credit_tax || 0
      : cardTaxes?.debit_tax || 0
    : 0;
  const cardFee = total * (cardTaxPercent / 100);

  const catalogItems = useMemo(() => {
    const q = catalogSearch.toLowerCase();
    const allItems = [
      ...parts.map((p) => ({
        id: p.id,
        name: p.name,
        price: Number((p as any).price_store) || Number((p as any).sale_price) || 0,
        type: "part" as const,
        stock: p.stock_qty,
      })),
      ...bikes.map((b) => ({
        id: b.id,
        name: b.name,
        price: Number((b as any).price_store) || Number((b as any).sale_price) || 0,
        type: "bike" as const,
        stock: (b as any).stock_qty || 0,
      })),
    ];
    if (!q) return allItems.slice(0, 30);
    return allItems.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 30);
  }, [parts, bikes, catalogSearch]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const q = customerSearch.toLowerCase();
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.whatsapp && c.whatsapp.includes(q))
      )
      .slice(0, 6);
  }, [customers, customerSearch]);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const addItem = (catalogItem: { id: string; name: string; price: number; type: "part" | "bike" }) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) =>
          (catalogItem.type === "part" && i.part_id === catalogItem.id) ||
          (catalogItem.type === "bike" && i.bike_model_id === catalogItem.id)
      );
      if (existing) {
        return prev.map((i) =>
          i.key === existing.key ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          key: crypto.randomUUID(),
          description: catalogItem.name,
          quantity: 1,
          unit_price: catalogItem.price,
          part_id: catalogItem.type === "part" ? catalogItem.id : null,
          bike_model_id: catalogItem.type === "bike" ? catalogItem.id : null,
        },
      ];
    });
  };

  const updateQty = (key: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => (i.key === key ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const applyDiscount = () => {
    if (discountType === "percentage") {
      setDiscount(subtotal * (discountInput / 100));
    } else {
      setDiscount(discountInput);
    }
  };

  const handleSave = async () => {
    if (items.length === 0) {
      toast({ title: "Adicione pelo menos um item", variant: "destructive" });
      return;
    }
    try {
      await updateSale.mutateAsync({
        saleId: sale.id,
        customer_id: customerId,
        total,
        payment_method: paymentMethod,
        discount_amount: discount,
        discount_type: discount > 0 ? "manual" : null,
        card_fee: cardFee,
        card_tax_percent: cardTaxPercent,
        items: items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
          part_id: i.part_id,
          bike_model_id: i.bike_model_id,
        })),
      });
      toast({ title: "Venda atualizada com sucesso" });
      onClose();
    } catch {
      toast({ title: "Erro ao atualizar venda", variant: "destructive" });
    }
  };

  if (!open || !sale) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-lg rounded-[32px] border border-border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-black text-white">Editar Venda</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              #{sale.id.slice(-6).toUpperCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── Itens ── */}
          <section className="space-y-3">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Itens</p>

            {items.map((item) => (
              <div key={item.key} className="flex items-center gap-3 p-3 bg-background border border-border rounded-2xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{item.description}</p>
                  <p className="text-xs text-muted-foreground">{formatBRL(item.unit_price)}/un</p>
                </div>
                <div className="flex items-center gap-1 bg-card rounded-xl p-0.5 border border-border shrink-0">
                  <button
                    onClick={() => updateQty(item.key, -1)}
                    className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center text-sm font-black text-white">{item.quantity}</span>
                  <button
                    onClick={() => updateQty(item.key, 1)}
                    className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <p className="text-sm font-black text-white shrink-0 w-20 text-right">
                  {formatBRL(item.quantity * item.unit_price)}
                </p>
                <button
                  onClick={() => removeItem(item.key)}
                  className="text-muted-foreground/50 hover:text-zinc-400 transition-colors shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {/* Adicionar item */}
            {!showCatalog ? (
              <button
                onClick={() => setShowCatalog(true)}
                className="w-full h-10 rounded-2xl border border-dashed border-border text-muted-foreground text-xs font-bold flex items-center justify-center gap-2 hover:border-primary/50 hover:text-primary transition-all"
              >
                <Plus size={14} /> Adicionar item
              </button>
            ) : (
              <div className="space-y-2 p-3 bg-background border border-border rounded-2xl">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                    <input
                      autoFocus
                      placeholder="Buscar produto..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="w-full h-9 bg-card border border-border rounded-xl pl-8 pr-3 text-sm text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/70"
                    />
                  </div>
                  <button
                    onClick={() => { setShowCatalog(false); setCatalogSearch(""); }}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-white transition-colors shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {catalogItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Nenhum produto encontrado</p>
                  ) : (
                    catalogItems.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => addItem(cat)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-card transition-colors text-left"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{cat.name}</p>
                          <p className="text-[10px] text-muted-foreground">{cat.type === "bike" ? "Bike" : "Peça"} · estoque: {cat.stock}</p>
                        </div>
                        <p className="text-xs font-black text-primary shrink-0 ml-2">{formatBRL(cat.price)}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ── Forma de pagamento ── */}
          <section className="space-y-3">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Forma de Pagamento</p>
            <div className="grid grid-cols-4 gap-2">
              {paymentMethods.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setPaymentMethod(value)}
                  className={`h-14 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${
                    paymentMethod === value
                      ? "bg-primary/10 border-primary text-white"
                      : "bg-background border-border text-muted-foreground hover:border-border/80"
                  }`}
                >
                  <Icon size={14} />
                  <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ── Desconto ── */}
          <section className="space-y-3">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Desconto</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDiscountType("fixed")}
                className={`flex-1 h-9 rounded-xl text-xs font-bold border transition-all ${discountType === "fixed" ? "bg-primary border-primary text-white" : "bg-background border-border text-muted-foreground"}`}
              >
                R$ Valor fixo
              </button>
              <button
                onClick={() => setDiscountType("percentage")}
                className={`flex-1 h-9 rounded-xl text-xs font-bold border transition-all ${discountType === "percentage" ? "bg-primary border-primary text-white" : "bg-background border-border text-muted-foreground"}`}
              >
                % Percentual
              </button>
            </div>
            {discountType === "fixed" ? (
              <CurrencyInput
                value={discountInput}
                onChange={setDiscountInput}
                className="h-11 rounded-xl"
              />
            ) : (
              <div>
                <input
                  type="number" min="0" max="100"
                  placeholder="Ex: 10"
                  value={discountInput || ""}
                  onChange={(e) => setDiscountInput(Number(e.target.value))}
                  className="w-full h-11 bg-background border border-border rounded-xl px-4 text-center text-lg font-black text-foreground outline-none focus:border-primary"
                />
                <p className="text-[10px] text-muted-foreground text-center mt-1">
                  = {formatBRL(subtotal * (discountInput / 100))} de desconto
                </p>
              </div>
            )}
            <button
              onClick={applyDiscount}
              className="w-full h-9 rounded-xl bg-muted border border-border text-xs font-bold text-foreground hover:bg-muted/80 transition-colors flex items-center justify-center gap-1.5"
            >
              <Scissors size={13} /> Aplicar desconto
            </button>
            {discount > 0 && (
              <div className="flex items-center justify-between px-3 py-2 bg-zinc-500/10 border border-zinc-500/20 rounded-xl">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Tag size={11} /> Desconto aplicado
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-zinc-400">-{formatBRL(discount)}</span>
                  <button
                    onClick={() => { setDiscount(0); setDiscountInput(0); }}
                    className="text-muted-foreground/70 hover:text-zinc-400 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ── Cliente ── */}
          <section className="space-y-3">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Cliente</p>
            {selectedCustomer ? (
              <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/30 rounded-2xl">
                <div>
                  <p className="text-sm font-bold text-white">{selectedCustomer.name}</p>
                  <p className="text-[10px] text-muted-foreground">{selectedCustomer.whatsapp || ""}</p>
                </div>
                <button
                  onClick={() => { setCustomerId(null); setCustomerSearch(""); }}
                  className="text-xs font-bold text-muted-foreground hover:text-white transition-colors"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                  <input
                    placeholder="Buscar cliente..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full h-10 bg-background border border-border rounded-xl pl-8 pr-3 text-sm text-foreground outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/70"
                  />
                </div>
                {filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setCustomerId(c.id); setCustomerSearch(""); }}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-background border border-border rounded-xl hover:border-primary/50 transition-colors text-left"
                  >
                    <p className="text-sm font-bold text-white">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.whatsapp || ""}</p>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* ── Resumo ── */}
          <section className="p-4 bg-background border border-border rounded-2xl space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatBRL(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Desconto</span>
                <span className="text-zinc-400">-{formatBRL(discount)}</span>
              </div>
            )}
            {isCard && cardTaxPercent > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Taxa cartão ({cardTaxPercent}%)</span>
                <span className="text-zinc-400">-{formatBRL(cardFee)}</span>
              </div>
            )}
            <div className="h-px bg-border" />
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-white">Total</span>
              <span className="text-xl font-black text-white">{formatBRL(total)}</span>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-2xl bg-muted text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={updateSale.isPending || items.length === 0}
            className="flex-[2] h-11 rounded-2xl bg-primary text-sm font-black text-white hover:bg-primary/80 transition-all active:scale-95 disabled:opacity-50"
          >
            {updateSale.isPending ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}
