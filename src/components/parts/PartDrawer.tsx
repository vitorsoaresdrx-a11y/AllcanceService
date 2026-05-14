import { formatBRL } from "@/lib/format";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Image as ImageIcon, Store, Globe } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCreatePart, useUpdatePart, type Part } from "@/hooks/useParts";
import { usePartAttributes, useSavePartAttributes } from "@/hooks/usePartAttributes";
import { CategoryCombobox } from "@/components/parts/CategoryCombobox";
import { ImageUpload } from "@/components/ui/image-upload";

// ─── Schema ──────────────────────────────────────────────────────────────────

const partSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  sku: z.string().optional(),
  category: z.string().optional(),
  stock_qty: z.coerce.number().int().min(0).default(0),
  alert_stock: z.coerce.number().int().min(0).default(0),
  unit_cost: z.coerce.number().min(0).default(0),
  price_store: z.coerce.number().min(0).default(0),
  price_ecommerce: z.coerce.number().min(0).default(0),
  visible_on_storefront: z.boolean().default(false),
  description: z.string().max(500).optional(),
});

type PartFormValues = z.infer<typeof partSchema>;

interface LocalAttribute {
  name: string;
  value: string;
}

interface PartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  part: Part | null;
}

// ─── Section header ──────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PartDrawer({ open, onOpenChange, part }: PartDrawerProps) {
  const createPart = useCreatePart();
  const updatePart = useUpdatePart();
  const saveAttributes = useSavePartAttributes();
  const isEditing = !!part;

  const [partImages, setPartImages] = useState<string[]>([]);
  const [attributes, setAttributes] = useState<LocalAttribute[]>([]);
  const [imagesChanged, setImagesChanged] = useState(false);
  const [attributesChanged, setAttributesChanged] = useState(false);

  // Load existing attributes
  const { data: existingAttrs } = usePartAttributes(part?.id);

  const form = useForm<PartFormValues>({
    resolver: zodResolver(partSchema),
    defaultValues: {
      name: "",
      sku: "",
      category: "",
      stock_qty: 0,
      alert_stock: 0,
      unit_cost: 0,
      price_store: 0,
      price_ecommerce: 0,
      visible_on_storefront: false,
      description: "",
    },
  });

  const setDirtyValue = <K extends keyof PartFormValues>(key: K, value: PartFormValues[K]) =>
    form.setValue(key, value, { shouldDirty: true, shouldTouch: true });

  const unitCost = form.watch("unit_cost");
  const priceStore = form.watch("price_store");
  const priceEcommerce = form.watch("price_ecommerce");
  const profit = priceStore - unitCost;
  const descriptionValue = form.watch("description") || "";
  const hasUnsavedChanges = form.formState.isDirty || imagesChanged || attributesChanged;

  const titleText = useMemo(
    () => (isEditing ? "Alterações não salvas" : "Preencha e salve"),
    [isEditing],
  );

  const initialValuesRef = useRef<PartFormValues | null>(null);
  const initialImagesRef = useRef<string[]>([]);
  const initialAttributesRef = useRef<LocalAttribute[]>([]);

  useEffect(() => {
    if (open) {
      if (part) {
        const initialValues: PartFormValues = {
          name: part.name,
          sku: part.sku || "",
          category: part.category || "",
          stock_qty: part.stock_qty,
          alert_stock: Number((part as any).alert_stock) || 0,
          unit_cost: Number((part as any).unit_cost) || 0,
          price_store: Number((part as any).price_store) || Number((part as any).sale_price) || 0,
          price_ecommerce: Number((part as any).price_ecommerce) || 0,
          visible_on_storefront: !!(part as any).visible_on_storefront,
          description: (part as any).description || "",
        };
        initialValuesRef.current = initialValues;
        initialImagesRef.current = ((part as any).images || []) as string[];
        initialAttributesRef.current = [];

        form.reset(initialValues);
        setPartImages(initialImagesRef.current);
        setImagesChanged(false);
        setAttributesChanged(false);
      } else {
        form.reset();
        setPartImages([]);
        setAttributes([]);
        initialValuesRef.current = {
          name: "",
          sku: "",
          category: "",
          stock_qty: 0,
          alert_stock: 0,
          unit_cost: 0,
          price_store: 0,
          price_ecommerce: 0,
          visible_on_storefront: false,
          description: "",
        };
        initialImagesRef.current = [];
        initialAttributesRef.current = [];
        setImagesChanged(false);
        setAttributesChanged(false);
      }
    }
  }, [open, part]);

  // Sync existing attributes when loaded
  useEffect(() => {
    if (existingAttrs && open && isEditing) {
      const mapped = existingAttrs.map((a) => ({ name: a.name, value: a.value }));
      setAttributes(mapped);
      initialAttributesRef.current = mapped;
      setAttributesChanged(false);
    }
  }, [existingAttrs, open, isEditing]);

  const discardChanges = () => {
    if (initialValuesRef.current) {
      form.reset(initialValuesRef.current);
    } else {
      form.reset();
    }
    setPartImages(initialImagesRef.current);
    setAttributes(initialAttributesRef.current);
    setImagesChanged(false);
    setAttributesChanged(false);
  };

  const addAttribute = () => {
    setAttributes((prev) => [...prev, { name: "", value: "" }]);
    setAttributesChanged(true);
  };
  const removeAttribute = (i: number) => {
    setAttributes((prev) => prev.filter((_, idx) => idx !== i));
    setAttributesChanged(true);
  };
  const updateAttribute = (i: number, field: "name" | "value", val: string) =>
    setAttributes((prev) => {
      const next = prev.map((a, idx) => (idx === i ? { ...a, [field]: val } : a));
      return next;
    });

  const handleUpdateAttribute = (i: number, field: "name" | "value", val: string) => {
    updateAttribute(i, field, val);
    setAttributesChanged(true);
  };

  const onSubmit = async (values: PartFormValues) => {
    const payload: any = {
      name: values.name,
      category: values.category || null,
      stock_qty: values.stock_qty,
      alert_stock: values.alert_stock,
      unit_cost: values.unit_cost,
      price_store: values.price_store || null,
      price_ecommerce: values.price_ecommerce || null,
      sale_price: values.price_store,
      pix_price: values.price_store,
      installment_price: null,
      installment_count: null,
      description: values.description || null,
      notes: values.description || null,
      weight_capacity_kg: null,
      material: null,
      gears: null,
      hub_style: null,
      color: null,
      rim_size: null,
      frame_size: null,
      visible_on_storefront: values.visible_on_storefront,
      images: partImages,
    };
    if (isEditing && values.sku) {
      payload.sku = values.sku;
    }

    const validAttrs = attributes
      .filter((a) => a.name.trim() && a.value.trim())
      .map((a, i) => ({ name: a.name.trim(), value: a.value.trim(), sort_order: i }));

    if (isEditing) {
      updatePart.mutate(
        { id: part.id, ...payload },
        {
          onSuccess: () => {
            saveAttributes.mutate({ partId: part.id, attributes: validAttrs });
            onOpenChange(false);
          },
        }
      );
    } else {
      createPart.mutate(payload, {
        onSuccess: (created: any) => {
          if (created?.id && validAttrs.length > 0) {
            saveAttributes.mutate({ partId: created.id, attributes: validAttrs });
          }
          onOpenChange(false);
        },
      });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal */}
      <div className="relative z-10 w-full h-full md:h-auto md:max-h-[90vh] md:max-w-lg md:rounded-3xl bg-background border-t md:border border-border flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Fixed header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-base md:text-lg font-black text-white">
            {isEditing ? "Editar Produto" : "Novo Produto"}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-background text-muted-foreground hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <form
          id="part-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-6"
        >
          {/* ── Section 1: Informações Básicas ────────────────────────── */}
          <section className="space-y-4">
            <SectionLabel>Informações Básicas</SectionLabel>

            {/* Photos */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <ImageIcon size={12} /> Fotos
              </label>
              <ImageUpload
                images={partImages}
                onChange={(imgs) => {
                  setPartImages(imgs);
                  setImagesChanged(true);
                }}
                folder="parts"
                maxImages={2}
              />
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Nome do Produto *
              </label>
              <input
                {...form.register("name")}
                className="w-full h-11 px-4 text-sm rounded-xl bg-background border border-border text-white placeholder:text-muted-foreground/70 outline-none focus:border-primary transition-colors"
                placeholder="Ex: Freio a disco, Banco, Pedivela..."
                maxLength={100}
              />
              {form.formState.errors.name && (
                <p className="text-[10px] text-zinc-400">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Categoria
              </label>
              <CategoryCombobox
                value={form.watch("category") || ""}
                onChange={(val) => setDirtyValue("category", val)}
              />
            </div>

            {/* SKU */}
            {isEditing && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  SKU
                </label>
                <input
                  {...form.register("sku")}
                  className="w-full h-11 px-4 text-sm rounded-xl bg-background border border-border text-white font-mono placeholder:text-muted-foreground/70 outline-none focus:border-primary transition-colors"
                  placeholder="Gerado automaticamente"
                />
                <p className="text-[10px] text-muted-foreground/70">Código interno — editável</p>
              </div>
            )}
          </section>

          {/* ── Section 2: Estoque & Preços ───────────────────────────── */}
          <section className="space-y-4">
            <SectionLabel>Estoque & Preços</SectionLabel>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Estoque atual
                </label>
                <input
                  type="number"
                  min={0}
                  {...form.register("stock_qty", { valueAsNumber: true })}
                  className="w-full h-11 px-4 text-sm rounded-xl bg-background border border-border text-white placeholder:text-muted-foreground/70 outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Alerta de estoque
                </label>
                <input
                  type="number"
                  min={0}
                  {...form.register("alert_stock", { valueAsNumber: true })}
                  className="w-full h-11 px-4 text-sm rounded-xl bg-background border border-border text-white placeholder:text-muted-foreground/70 outline-none focus:border-primary transition-colors"
                  placeholder="Ex: 3"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Preço de custo
              </label>
              <CurrencyInput
                value={unitCost || 0}
                onChange={(val) => setDirtyValue("unit_cost", val)}
                className="h-11 text-sm rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                  <Store size={12} /> Preço Loja Física
                </label>
                <CurrencyInput
                  value={priceStore || 0}
                  onChange={(val) => setDirtyValue("price_store", val)}
                  className="h-11 text-sm rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                  <Globe size={12} /> Preço E-commerce
                </label>
                <CurrencyInput
                  value={priceEcommerce || 0}
                  onChange={(val) => setDirtyValue("price_ecommerce", val)}
                  className="h-11 text-sm rounded-xl"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/70 mt-1">
              Deixe em branco para não exibir o preço naquele canal.
            </p>

            {/* Profit preview */}
            {(unitCost > 0 || priceStore > 0) && (
              <div className="p-3 rounded-xl border border-border bg-background/50 flex justify-between items-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Lucro por unidade
                </span>
                <span className={`text-sm font-black ${profit >= 0 ? "text-zinc-400" : "text-zinc-400"}`}>
                  {formatBRL(profit)}
                </span>
              </div>
            )}
          </section>

          {/* ── Section 3: Descrição ──────────────────────────────────── */}
          <section className="space-y-3">
            <SectionLabel>Descrição do Produto</SectionLabel>
            <textarea
              {...form.register("description")}
              placeholder="Descreva o produto para o cliente — materiais, uso indicado, diferenciais..."
              className="w-full min-h-[100px] p-4 text-sm rounded-xl bg-background border border-border text-white placeholder:text-muted-foreground/70 outline-none focus:border-primary transition-colors resize-none"
              maxLength={500}
            />
            <div className="flex justify-between">
              <p className="text-[10px] text-muted-foreground/70">Aparece na página pública do produto</p>
              <p className={`text-[10px] ${descriptionValue.length > 450 ? "text-zinc-400" : "text-muted-foreground/70"}`}>
                {descriptionValue.length}/500
              </p>
            </div>
          </section>

          {/* ── Section: Visibilidade ─────────────────────────────────── */}
          <section className="space-y-3">
            <SectionLabel>Visibilidade</SectionLabel>
            <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-background/50 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-foreground">Exibir no site público</p>
                <p className="text-[10px] text-muted-foreground/70">O produto ficará visível na vitrine online</p>
              </div>
              <input
                type="checkbox"
                checked={form.watch("visible_on_storefront")}
                onChange={(e) => setDirtyValue("visible_on_storefront", e.target.checked)}
                className="w-5 h-5 rounded accent-primary"
              />
            </label>
          </section>

          {/* ── Section 4: Características ────────────────────────────── */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionLabel>Características</SectionLabel>
              <button
                type="button"
                onClick={addAttribute}
                className="h-7 px-3 text-[10px] font-bold rounded-lg bg-muted border border-border/80 text-foreground/80 flex items-center gap-1 hover:bg-muted/80 transition-colors"
              >
                <Plus size={12} /> Adicionar
              </button>
            </div>

            {attributes.map((attr, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  placeholder="Ex: Material"
                  value={attr.name}
                  onChange={(e) => handleUpdateAttribute(i, "name", e.target.value)}
                  className="flex-1 h-9 px-3 text-sm rounded-xl bg-background border border-border text-white placeholder:text-muted-foreground/70 outline-none focus:border-primary transition-colors"
                />
                <input
                  placeholder="Ex: Borracha"
                  value={attr.value}
                  onChange={(e) => handleUpdateAttribute(i, "value", e.target.value)}
                  className="flex-1 h-9 px-3 text-sm rounded-xl bg-background border border-border text-white placeholder:text-muted-foreground/70 outline-none focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => removeAttribute(i)}
                  className="w-8 h-8 flex items-center justify-center text-muted-foreground/70 hover:text-zinc-400 transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ))}

            {attributes.length === 0 && (
              <p className="text-[11px] text-muted-foreground/70 text-center py-3">
                Nenhuma característica adicionada
              </p>
            )}
          </section>
        </form>

      </div>

      <AnimatePresence>
        {hasUnsavedChanges && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed left-4 right-4 z-[70] bg-card border border-border rounded-2xl p-3 flex items-center gap-3 shadow-2xl md:left-auto md:right-6 md:max-w-md"
            style={{
              bottom:
                "calc(env(safe-area-inset-bottom, 0px) + var(--bottom-nav-height, 0px) + 12px)",
            }}
          >
            <p className="flex-1 text-xs text-muted-foreground font-medium">{titleText}</p>
            <button
              type="button"
              onClick={discardChanges}
              className="h-9 px-3 rounded-xl bg-secondary text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              Descartar
            </button>
            <button
              type="submit"
              form="part-form"
              disabled={createPart.isPending || updatePart.isPending}
              className="h-9 px-4 rounded-xl bg-primary text-xs font-black text-white hover:bg-primary/80 transition-all active:scale-95 disabled:opacity-50"
            >
              {isEditing ? "Salvar" : "Criar"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
