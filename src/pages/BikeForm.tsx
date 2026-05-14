import { useEffect, useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Plus,
  Trash2,
  DollarSign,
  TrendingUp,
  Camera,
  Save,
  Wrench,
  Activity,
  Image as ImageIcon,
  Tag,
  Maximize2,
  CreditCard,
  Layers,
  ChevronRight,
  Eye,
  Box,
  Store,
  Globe,
} from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import { Switch } from "@/components/ui/switch";
import {
  useBikeModel,
  useBikeModelParts,
  useCreateBikeModel,
  useUpdateBikeModel,
  useSaveBikeModelParts,
} from "@/hooks/useBikes";
import { useParts } from "@/hooks/useParts";
import { useToast } from "@/hooks/use-toast";
import { PartSelector } from "@/components/bikes/PartSelector";

// ─── Schema ───────────────────────────────────────────────────────────────────
const bikeSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  sku: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  frame_size: z.string().optional(),
  rim_size: z.string().optional(),
  color: z.string().optional(),
  weight_kg: z.number().min(0).optional(),
  description: z.string().optional(),
  visible_on_storefront: z.boolean().default(false),
  stock_qty: z.number().int().min(0).default(0),
  alert_stock: z.number().int().min(0).default(0),
  cost_mode: z.enum(["fixed", "manual"]).default("fixed"),
  cost_price: z.number().min(0).default(0),
  price_store: z.number().min(0).default(0),
  price_ecommerce: z.number().min(0).default(0),
  installments_enabled_store: z.boolean().default(false),
  installment_count_store: z.number().int().min(1).default(1),
  installment_value_store: z.number().min(0).default(0),
  installments_enabled_ecommerce: z.boolean().default(false),
  installment_count_ecommerce: z.number().int().min(1).default(1),
  installment_value_ecommerce: z.number().min(0).default(0),
});

type BikeFormValues = z.infer<typeof bikeSchema>;

interface TemplatePart {
  key: string;
  part_id: string | null;
  part_name_override: string | null;
  quantity: number;
  notes: string | null;
  unit_cost: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
import { formatBRL } from "@/lib/format";

// ─── Sub-components (UI only) ─────────────────────────────────────────────────
const SectionHeader = ({
  title,
  icon: Icon,
  subtitle,
}: {
  title: string;
  icon: React.ElementType;
  subtitle?: string;
}) => (
  <div className="flex flex-col gap-1 mb-8">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
        <Icon size={20} />
      </div>
      <h3 className="text-xl font-black text-foreground tracking-tight italic uppercase">{title}</h3>
    </div>
    {subtitle && <p className="text-xs text-muted-foreground ml-13 font-medium">{subtitle}</p>}
  </div>
);

const StatBox = ({
  title,
  value,
  icon,
  color = "text-white",
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
}) => (
  <div className="p-6 bg-card border border-border rounded-[32px] shadow-lg flex flex-col gap-2 hover:border-border/80 transition-all">
    <div className="flex items-center gap-2 text-muted-foreground">
      {icon}
      <span className="text-[10px] font-black uppercase tracking-widest">{title}</span>
    </div>
    <span className={`text-2xl font-black tracking-tighter ${color}`}>{value}</span>
  </div>
);

const SmallInput = ({
  label,
  placeholder,
  ...props
}: { label: string; placeholder?: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="space-y-1.5 group">
    <label className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest ml-1 group-focus-within:text-primary transition-colors">
      {label}
    </label>
    <input
      className="w-full h-12 bg-secondary border border-border rounded-xl px-5 text-sm font-bold text-white outline-none focus:border-primary transition-all"
      placeholder={placeholder}
      {...props}
    />
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BikeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = !!id && id !== "nova";

  const { data: bike } = useBikeModel(isEditing ? id : undefined);
  const { data: existingParts } = useBikeModelParts(isEditing ? id : undefined);
  const { data: allParts = [] } = useParts();

  const createBike = useCreateBikeModel();
  const updateBike = useUpdateBikeModel();
  const saveParts = useSaveBikeModelParts();

  const [templateParts, setTemplateParts] = useState<TemplatePart[]>([]);
  const [partsChanged, setPartsChanged] = useState(false);
  const [bikeImages, setBikeImages] = useState<string[]>([]);
  const [imagesChanged, setImagesChanged] = useState(false);

  const form = useForm<BikeFormValues>({
    resolver: zodResolver(bikeSchema),
    defaultValues: {
      name: "",
      sku: "",
      category: "",
      brand: "",
      frame_size: "",
      rim_size: "",
      color: "",
      weight_kg: undefined,
      description: "",
      visible_on_storefront: false,
      stock_qty: 0,
      alert_stock: 0,
      cost_mode: "fixed",
      cost_price: 0,
      price_store: 0,
      price_ecommerce: 0,
      installments_enabled_store: false,
      installment_count_store: 1,
      installment_value_store: 0,
      installments_enabled_ecommerce: false,
      installment_count_ecommerce: 1,
      installment_value_ecommerce: 0,
    },
  });

  const setDirtyValue = <K extends keyof BikeFormValues>(key: K, value: BikeFormValues[K]) =>
    form.setValue(key as any, value as any, { shouldDirty: true, shouldTouch: true });

  const { isDirty } = form.formState;
  const hasUnsavedChanges = isDirty || partsChanged || imagesChanged;
  const costMode = form.watch("cost_mode");
  const costPrice = form.watch("cost_price");
  const priceStore = form.watch("price_store");
  const priceEcommerce = form.watch("price_ecommerce");
  const installmentsEnabledStore = form.watch("installments_enabled_store");
  const installmentCountStore = form.watch("installment_count_store");
  const installmentValueStore = form.watch("installment_value_store");
  const installmentsEnabledEcommerce = form.watch("installments_enabled_ecommerce");
  const installmentCountEcommerce = form.watch("installment_count_ecommerce");
  const installmentValueEcommerce = form.watch("installment_value_ecommerce");

  const manualCost = useMemo(
    () => templateParts.reduce((sum, p) => sum + p.unit_cost * p.quantity, 0),
    [templateParts]
  );

  const effectiveCost = costMode === "fixed" ? costPrice : manualCost;
  const profitValue = priceStore - effectiveCost;
  const profitPercent = effectiveCost > 0 ? (profitValue / effectiveCost) * 100 : 0;

  // Load existing data
  useEffect(() => {
    if (bike) {
      form.reset({
        name: bike.name,
        sku: bike.sku || "",
        category: bike.category || "",
        brand: (bike as any).brand || "",
        frame_size: (bike as any).frame_size || "",
        rim_size: (bike as any).rim_size || "",
        color: (bike as any).color || "",
        weight_kg: Number((bike as any).weight_kg) || undefined,
        description: bike.description || "",
        visible_on_storefront: bike.visible_on_storefront,
        stock_qty: Number((bike as any).stock_qty) || 0,
        alert_stock: Number((bike as any).alert_stock) || 0,
        cost_mode: (bike as any).cost_mode || "fixed",
        cost_price: Number((bike as any).cost_price) || 0,
        price_store: Number((bike as any).price_store) || Number((bike as any).sale_price) || 0,
        price_ecommerce: Number((bike as any).price_ecommerce) || 0,
        installments_enabled_store: !!(bike as any).installments_enabled_store,
        installment_count_store: Number((bike as any).installment_count_store) || Number((bike as any).installment_count) || 1,
        installment_value_store: Number((bike as any).installment_value_store) || Number((bike as any).installment_price) || 0,
        installments_enabled_ecommerce: !!(bike as any).installments_enabled_ecommerce,
        installment_count_ecommerce: Number((bike as any).installment_count_ecommerce) || 1,
        installment_value_ecommerce: Number((bike as any).installment_value_ecommerce) || 0,
      });
      setBikeImages((bike as any).images || []);
    }
  }, [bike]);

  // Auto-calculate installments when price or count changes
  useEffect(() => {
    if (installmentsEnabledStore && priceStore > 0 && installmentCountStore > 0) {
      const rounded = Math.round((priceStore / installmentCountStore) * 100) / 100;
      if (rounded !== installmentValueStore) {
        form.setValue("installment_value_store", rounded);
      }
    }
  }, [priceStore, installmentCountStore, installmentsEnabledStore]);

  useEffect(() => {
    if (installmentsEnabledEcommerce && priceEcommerce > 0 && installmentCountEcommerce > 0) {
      const rounded = Math.round((priceEcommerce / installmentCountEcommerce) * 100) / 100;
      if (rounded !== installmentValueEcommerce) {
        form.setValue("installment_value_ecommerce", rounded);
      }
    }
  }, [priceEcommerce, installmentCountEcommerce, installmentsEnabledEcommerce]);
+
  useEffect(() => {
    if (existingParts) {
      setTemplateParts(
        existingParts.map((p) => ({
          key: p.id,
          part_id: p.part_id,
          part_name_override: p.part_name_override,
          quantity: p.quantity,
          notes: p.notes,
          unit_cost: Number((p as any).unit_cost) || 0,
        }))
      );
    }
  }, [existingParts]);

  const addRow = () => {
    setTemplateParts((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        part_id: null,
        part_name_override: null,
        quantity: 1,
        notes: null,
        unit_cost: 0,
      },
    ]);
    setPartsChanged(true);
  };

  const removeRow = (key: string) => {
    setTemplateParts((prev) => prev.filter((p) => p.key !== key));
    setPartsChanged(true);
  };

  const updateRow = (key: string, updates: Partial<TemplatePart>) => {
    setTemplateParts((prev) =>
      prev.map((p) => (p.key === key ? { ...p, ...updates } : p))
    );
    setPartsChanged(true);
  };

  const handleSelectPart = (key: string, partId: string) => {
    const catalogPart = allParts.find((p) => p.id === partId);
    updateRow(key, {
      part_id: partId,
      part_name_override: null,
      unit_cost: Number((catalogPart as any)?.unit_cost) || 0,
    });
  };

  const onSubmit = async (values: BikeFormValues) => {
    try {
      const payload: any = {
        name: values.name,
        category: values.category || null,
        brand: values.brand || null,
        frame_size: values.frame_size || null,
        rim_size: values.rim_size || null,
        color: values.color || null,
        weight_kg: values.weight_kg || null,
        description: values.description || null,
        visible_on_storefront: values.visible_on_storefront,
        stock_qty: values.stock_qty,
        alert_stock: values.alert_stock,
        cost_mode: values.cost_mode,
        cost_price: values.cost_mode === "fixed" ? values.cost_price : manualCost,
        sale_price: values.price_store,
        pix_price: values.price_store,
        price_store: values.price_store || null,
        price_ecommerce: values.price_ecommerce || null,
        installments_enabled_store: values.installments_enabled_store,
        installment_count_store: values.installments_enabled_store ? values.installment_count_store : null,
        installment_value_store: values.installments_enabled_store ? values.installment_value_store : null,
        installments_enabled_ecommerce: values.installments_enabled_ecommerce,
        installment_count_ecommerce: values.installments_enabled_ecommerce ? values.installment_count_ecommerce : null,
        installment_value_ecommerce: values.installments_enabled_ecommerce ? values.installment_value_ecommerce : null,
        installment_price: values.installments_enabled_store ? values.installment_value_store : (values.installments_enabled_ecommerce ? values.installment_value_ecommerce : 0),
        installment_count: values.installments_enabled_store ? values.installment_count_store : (values.installments_enabled_ecommerce ? values.installment_count_ecommerce : 1),
        images: bikeImages,
      };
      if (isEditing && values.sku) payload.sku = values.sku;

      let bikeId: string;
      if (isEditing) {
        await updateBike.mutateAsync({ id, ...payload });
        bikeId = id;
      } else {
        const created = await createBike.mutateAsync(payload);
        bikeId = created.id;
      }

      if (values.cost_mode === "manual") {
        await saveParts.mutateAsync({
          bikeModelId: bikeId,
          parts: templateParts.map((p) => ({
            part_id: p.part_id,
            part_name_override: p.part_name_override,
            quantity: p.quantity,
            notes: p.notes,
            sort_order: 0,
            unit_cost: p.unit_cost,
          })),
        });
      }

      toast({ title: isEditing ? "Bike atualizada" : "Bike criada com sucesso" });
      navigate("/bikes");
    } catch {
      toast({ title: "Erro ao salvar bike", variant: "destructive" });
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-background text-foreground pb-24 lg:pb-0">
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="max-w-7xl mx-auto w-full p-4 lg:p-8 space-y-8 lg:space-y-10">

          {/* ── Topbar ────────────────────────────────────────────────────── */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-6 rounded-[32px] border border-border shadow-2xl">
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => navigate("/bikes")}
                className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center text-muted-foreground hover:text-white transition-all border border-border"
              >
                <ArrowLeft size={20} />
              </button>
            <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                  Oficina & Vitrine
                </span>
                <h1 className="text-2xl font-black text-white tracking-tight uppercase italic leading-none">
                  {isEditing ? "Editar Bike" : "Nova Bike"}
                </h1>
              </div>
            </div>
            
          </header>

          {/* ── Galeria ───────────────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-[40px] p-6 lg:p-10 shadow-2xl space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 mb-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <ImageIcon size={20} />
                </div>
                <h3 className="text-xl font-black text-foreground tracking-tight italic uppercase">Fotos</h3>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase mt-3">
                {bikeImages.length} / 5 Imagens
              </span>
            </div>
            <ImageUpload images={bikeImages} onChange={(imgs) => { setBikeImages(imgs); setImagesChanged(true); }} folder="bikes" maxImages={5} />
          </div>

          {/* ── Identidade + Financeiro (side by side) ─────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Identidade */}
            <div className="bg-card border border-border rounded-[40px] p-6 lg:p-10 shadow-2xl">
              <SectionHeader
                title="Modelo"
                icon={Tag}
                subtitle="Configure como o produto será exibido para o cliente final."
              />

              <div className="space-y-6">
                <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 group-focus-within:text-primary transition-colors">
                    Nome Comercial *
                  </label>
                  <input
                    {...form.register("name")}
                    className="w-full h-16 bg-secondary border border-border rounded-2xl px-6 text-xl font-bold text-white outline-none focus:border-primary transition-all"
                    placeholder="Ex: Trail X Pro"
                  />
                  {form.formState.errors.name && (
                    <p className="text-xs text-zinc-400 ml-1">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 group-focus-within:text-primary transition-colors">
                    Categoria
                  </label>
                  <div className="relative">
                    <select
                      value={form.watch("category") || ""}
                      onChange={(e) => setDirtyValue("category", e.target.value)}
                      className="w-full h-16 bg-secondary border border-border rounded-2xl px-6 outline-none focus:border-primary appearance-none text-sm font-bold text-foreground/80 cursor-pointer"
                    >
                      <option value="">Selecione...</option>
                      {["MTB", "Speed / Road", "Gravel", "Urban / Cidade", "BMX", "Elétrica", "Infantil", "Dobrável", "Cargo", "Touring", "Freeride"].map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/70 rotate-90 pointer-events-none" size={16} />
                  </div>
                </div>

                {isEditing && (
                  <SmallInput
                    label="SKU — editável após criação"
                    placeholder="Gerado automaticamente"
                    {...form.register("sku")}
                  />
                )}

                <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 group-focus-within:text-primary transition-colors">
                    Descrição da Oferta
                  </label>
                  <textarea
                    {...form.register("description")}
                    className="w-full h-40 bg-secondary border border-border rounded-[28px] p-6 text-sm text-muted-foreground outline-none focus:border-primary transition-all resize-none leading-relaxed"
                    placeholder="Conte sobre a performance, estado de conservação e upgrades..."
                  />
                </div>
              </div>
            </div>

            {/* Financeiro */}
            <div className="bg-card border border-border rounded-[40px] p-6 lg:p-10 shadow-2xl space-y-6">
              <SectionHeader title="Financeiro" icon={DollarSign} />

              {/* Loja Física */}
              <div className="p-5 bg-background border border-border rounded-[28px] space-y-4">
                <p className="text-xs font-black text-white flex items-center gap-1.5">
                  <Store size={13} className="text-muted-foreground" /> Loja Física
                </p>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Preço à vista</p>
                  <CurrencyInput
                    value={priceStore || 0}
                    onChange={(val) => setDirtyValue("price_store", val)}
                    className="text-xl font-black h-14 rounded-2xl"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">Oferecer parcelamento</p>
                  <Switch
                    checked={installmentsEnabledStore}
                    onCheckedChange={(val) => setDirtyValue("installments_enabled_store", val)}
                  />
                </div>
                {installmentsEnabledStore && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest">Nº Parcelas</label>
                      <input
                        type="number" min={2} max={48}
                        value={installmentCountStore}
                        onChange={(e) => setDirtyValue("installment_count_store", parseInt(e.target.value) || 1)}
                        className="w-full h-11 bg-secondary border border-border rounded-xl px-4 text-sm font-bold text-white outline-none focus:border-primary transition-all text-center"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest">Valor Parcela</label>
                      <CurrencyInput
                        value={installmentValueStore || 0}
                        onChange={(val) => setDirtyValue("installment_value_store", val)}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    {installmentCountStore > 0 && installmentValueStore > 0 && (
                      <p className="col-span-2 text-[10px] text-muted-foreground text-center">
                        {installmentCountStore}x de {formatBRL(installmentValueStore)} = {formatBRL(installmentCountStore * installmentValueStore)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* E-commerce */}
              <div className="p-5 bg-background border border-border rounded-[28px] space-y-4">
                <p className="text-xs font-black text-white flex items-center gap-1.5">
                  <Globe size={13} className="text-primary" /> E-commerce
                </p>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Preço à vista</p>
                  <CurrencyInput
                    value={priceEcommerce || 0}
                    onChange={(val) => setDirtyValue("price_ecommerce", val)}
                    className="text-xl font-black h-14 rounded-2xl"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">Oferecer parcelamento</p>
                  <Switch
                    checked={installmentsEnabledEcommerce}
                    onCheckedChange={(val) => setDirtyValue("installments_enabled_ecommerce", val)}
                  />
                </div>
                {installmentsEnabledEcommerce && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest">Nº Parcelas</label>
                      <input
                        type="number" min={2} max={48}
                        value={installmentCountEcommerce}
                        onChange={(e) => setDirtyValue("installment_count_ecommerce", parseInt(e.target.value) || 1)}
                        className="w-full h-11 bg-secondary border border-border rounded-xl px-4 text-sm font-bold text-white outline-none focus:border-primary transition-all text-center"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest">Valor Parcela</label>
                      <CurrencyInput
                        value={installmentValueEcommerce || 0}
                        onChange={(val) => setDirtyValue("installment_value_ecommerce", val)}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    {installmentCountEcommerce > 0 && installmentValueEcommerce > 0 && (
                      <p className="col-span-2 text-[10px] text-muted-foreground text-center">
                        {installmentCountEcommerce}x de {formatBRL(installmentValueEcommerce)} = {formatBRL(installmentCountEcommerce * installmentValueEcommerce)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <p className="text-[9px] text-muted-foreground/70 font-bold uppercase tracking-widest">
                Deixe em branco para não exibir naquele canal
              </p>

              {/* Logística */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Box size={16} />
                  </div>
                  <h4 className="text-sm font-black text-white tracking-tight italic uppercase">
                    Logística
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest">
                      Estoque Atual
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.watch("stock_qty")}
                      onChange={(e) =>
                        setDirtyValue("stock_qty", parseInt(e.target.value) || 0)
                      }
                      className="w-full h-12 bg-secondary border border-border rounded-xl px-5 text-sm font-bold text-white outline-none focus:border-primary transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest">
                      Alerta Mín.
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.watch("alert_stock")}
                      onChange={(e) =>
                        setDirtyValue("alert_stock", parseInt(e.target.value) || 0)
                      }
                      className="w-full h-12 bg-secondary border border-border rounded-xl px-5 text-sm font-bold text-white outline-none focus:border-primary transition-all"
                      placeholder="Ex: 2"
                    />
                  </div>
                </div>

                {/* Visibilidade toggle */}
                <div className="flex items-center justify-between p-5 bg-background border border-border rounded-[28px] hover:border-primary/50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-500/10 flex items-center justify-center text-zinc-500">
                      <Eye size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Exibir na Loja</p>
                      <p className="text-[8px] text-muted-foreground/70 font-bold uppercase tracking-widest">
                        Vitrine Online
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={form.watch("visible_on_storefront")}
                    onCheckedChange={(val) =>
                      setDirtyValue("visible_on_storefront", val)
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Ficha Técnica (full width) ──────────────────────────────────── */}
          <div className="bg-card border border-border rounded-[40px] p-6 lg:p-10 shadow-2xl space-y-8">
            <SectionHeader title="Ficha Técnica" icon={Maximize2} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <SmallInput
                label="Marca de Origem"
                placeholder="Ex: Caloi, Trek, Specialized"
                {...form.register("brand")}
              />
              <SmallInput
                label="Tamanho Quadro"
                placeholder="Ex: M, 17"
                {...form.register("frame_size")}
              />
              <SmallInput
                label="Aro"
                placeholder="Ex: 29, 700c"
                {...form.register("rim_size")}
              />
              <SmallInput
                label="Cor do Modelo"
                placeholder="Ex: Preto, Vermelho"
                {...form.register("color")}
              />
              <div className="space-y-1.5 group">
                <label className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest ml-1 group-focus-within:text-primary transition-colors">
                  Peso (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  value={form.watch("weight_kg") ?? ""}
                  onChange={(e) =>
                    setDirtyValue("weight_kg", parseFloat(e.target.value) || undefined)
                  }
                  className="w-full h-12 bg-secondary border border-border rounded-xl px-5 text-sm font-bold text-white outline-none focus:border-primary transition-all"
                  placeholder="Ex: 12.5"
                />
              </div>
            </div>
          </div>

          {/* ── Build & Componentes (full width) ──────────────────────────── */}
          <div className="bg-card border border-border rounded-[40px] p-6 lg:p-10 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-zinc-500/10 flex items-center justify-center shrink-0">
                <Wrench size={15} className="text-zinc-400" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-tight text-foreground">Precificação</p>
                <p className="text-[10px] text-muted-foreground">Defina como o custo da bike será calculado</p>
              </div>
            </div>

            {/* Cost mode toggle */}
            <div className="flex bg-background border border-border rounded-2xl p-1 mb-4">
              <button
                type="button"
                onClick={() => setDirtyValue("cost_mode", "fixed")}
                className={`flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  costMode === "fixed"
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <DollarSign size={13} /> Manual
              </button>
              <button
                type="button"
                onClick={() => setDirtyValue("cost_mode", "manual")}
                className={`flex-1 h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  costMode === "manual"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <Layers size={13} /> Por Peça
              </button>
            </div>

            {/* Fixed cost */}
            {costMode === "fixed" && (
              <div className="space-y-6">
                <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 group-focus-within:text-primary transition-colors">
                    Preço de Custo (R$)
                  </label>
                  <CurrencyInput
                    value={costPrice || 0}
                    onChange={(val) => setDirtyValue("cost_price", val)}
                    className="h-16 text-xl rounded-2xl"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/40">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-background border border-border rounded-2xl">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-white">Parcelado na Loja</p>
                        <p className="text-[9px] text-muted-foreground uppercase font-black">Exibir 10x de R$...</p>
                      </div>
                      <Switch 
                        checked={installmentsEnabledStore} 
                        onCheckedChange={(val) => setDirtyValue("installments_enabled_store", val)} 
                      />
                    </div>
                    {installmentsEnabledStore && (
                      <div className="grid grid-cols-2 gap-3 animate-in fade-in zoom-in-95 duration-200">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Parcelas</label>
                          <select 
                            value={installmentCountStore}
                            onChange={(e) => setDirtyValue("installment_count_store", parseInt(e.target.value))}
                            className="w-full h-11 bg-secondary border border-border rounded-xl px-4 text-xs font-bold text-white outline-none focus:border-primary"
                          >
                            {[...Array(12)].map((_, i) => (
                              <option key={i+1} value={i+1}>{i+1}x</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Valor Parcela</label>
                          <CurrencyInput 
                            value={installmentValueStore} 
                            onChange={(val) => setDirtyValue("installment_value_store", val)}
                            className="h-11 rounded-xl text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-background border border-border rounded-2xl">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-white">Parcelado Ecommerce</p>
                        <p className="text-[9px] text-muted-foreground uppercase font-black">Site de Vendas</p>
                      </div>
                      <Switch 
                        checked={installmentsEnabledEcommerce} 
                        onCheckedChange={(val) => setDirtyValue("installments_enabled_ecommerce", val)} 
                      />
                    </div>
                    {installmentsEnabledEcommerce && (
                      <div className="grid grid-cols-2 gap-3 animate-in fade-in zoom-in-95 duration-200">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Parcelas</label>
                          <select 
                            value={installmentCountEcommerce}
                            onChange={(e) => setDirtyValue("installment_count_ecommerce", parseInt(e.target.value))}
                            className="w-full h-11 bg-secondary border border-border rounded-xl px-4 text-xs font-bold text-white outline-none focus:border-primary"
                          >
                            {[...Array(12)].map((_, i) => (
                              <option key={i+1} value={i+1}>{i+1}x</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Valor Parcela</label>
                          <CurrencyInput 
                            value={installmentValueEcommerce} 
                            onChange={(val) => setDirtyValue("installment_value_ecommerce", val)}
                            className="h-11 rounded-xl text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Manual parts */}
            {costMode === "manual" && (
              <div className="w-full overflow-hidden space-y-2">
                {templateParts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Nenhuma peça adicionada
                  </p>
                ) : (
                  templateParts.map((tp) => (
                    <div
                      key={tp.key}
                      className="rounded-2xl bg-background border border-border p-3 overflow-hidden"
                    >
                      {/* Row 1: icon + selector + remove */}
                      <div className="flex items-center gap-2 mb-3 w-full">
                        <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                          <Layers size={14} className="text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <PartSelector
                            parts={allParts}
                            selectedPartId={tp.part_id}
                            customName={tp.part_name_override}
                            allowCustom={false}
                            onSelectPart={(partId) => handleSelectPart(tp.key, partId)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRow(tp.key)}
                          className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Row 2: qty + cost */}
                      <div className="flex gap-2 mb-2">
                        <div className="w-20 shrink-0 space-y-1">
                          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Qtd</p>
                          <input
                            type="number"
                            min={1}
                            value={tp.quantity}
                            onChange={(e) =>
                              updateRow(tp.key, {
                                quantity: parseInt(e.target.value) || 1,
                              })
                            }
                            className="w-full h-9 bg-secondary border border-border rounded-xl text-center text-sm font-bold text-foreground outline-none focus:border-primary transition-all"
                          />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Custo unitário</p>
                          <CurrencyInput
                            value={tp.unit_cost || 0}
                            onChange={(v) =>
                              updateRow(tp.key, { unit_cost: v })
                            }
                            className="h-9 rounded-xl text-sm"
                          />
                        </div>
                      </div>

                      {/* Row 3: subtotal */}
                      <div className="flex items-center justify-between bg-secondary/40 rounded-xl px-3 py-2">
                        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Subtotal</p>
                        <p className="text-sm font-black text-primary whitespace-nowrap">
                          {formatBRL(tp.unit_cost * tp.quantity)}
                        </p>
                      </div>
                    </div>
                  ))
                )}

                {/* Total */}
                {templateParts.length > 0 && (
                  <div className="flex items-center justify-between bg-background border border-border rounded-2xl px-4 py-3">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">Total das peças</p>
                    <p className="text-base font-black text-foreground whitespace-nowrap ml-3">
                      {formatBRL(manualCost)}
                    </p>
                  </div>
                )}

                {/* Add row */}
                <button
                  type="button"
                  onClick={addRow}
                  className="w-full h-10 rounded-2xl border border-dashed border-border text-muted-foreground text-xs font-bold flex items-center justify-center gap-2 hover:border-primary/50 hover:text-primary transition-all"
                >
                  <Plus size={14} /> Vincular novo componente
                </button>
              </div>
            )}
          </div>

          {/* ── Stats ─────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatBox
              title="Custo Montagem"
              value={formatBRL(effectiveCost)}
              icon={<Wrench size={14} />}
            />
            <StatBox
              title="Preço Loja"
              value={formatBRL(priceStore)}
              icon={<DollarSign size={14} />}
              color="text-primary"
            />
            <StatBox
              title="Margem Bruta"
              value={formatBRL(profitValue)}
              icon={<TrendingUp size={14} />}
              color={profitValue >= 0 ? "text-zinc-400" : "text-zinc-400"}
            />
            <StatBox
              title="Rentabilidade"
              value={profitPercent.toFixed(1) + "%"}
              icon={<Activity size={14} />}
              color={profitPercent >= 0 ? "text-zinc-400" : "text-zinc-400"}
            />
          </div>

        </div>

        <AnimatePresence>
          {hasUnsavedChanges && (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed left-4 right-4 z-50 bg-card border border-border rounded-2xl p-3 flex items-center gap-3 shadow-2xl lg:left-auto lg:right-8 lg:max-w-md"
              style={{
                bottom:
                  "calc(env(safe-area-inset-bottom, 0px) + var(--bottom-nav-height, 0px) + 12px)",
              }}
            >
              <p className="flex-1 text-xs text-muted-foreground font-medium">
                {isEditing ? "Alterações não salvas" : "Preencha e salve"}
              </p>
              <button
                type="button"
                onClick={() => { form.reset(); setPartsChanged(false); setImagesChanged(false); navigate("/bikes"); }}
                className="h-9 px-3 rounded-xl bg-secondary text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                Descartar
              </button>
              <button
                type="submit"
                className="h-9 px-4 rounded-xl bg-primary text-xs font-black text-white hover:bg-primary/80 transition-all active:scale-95"
              >
                <Save size={14} className="inline mr-1.5" />
                {isEditing ? "Salvar" : "Criar"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}
