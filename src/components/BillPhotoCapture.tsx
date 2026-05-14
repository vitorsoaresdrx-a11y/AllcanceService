import { useRef, useState } from "react";
import { X, Camera, Sparkles, Loader2, Copy, CheckCircle, AlertCircle, ChevronDown, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/format";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import type { ParsedBill } from "@/lib/barcode-parser";

interface BillDraft {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "processing" | "done" | "error";
  extracted: ParsedBill | null;
  error: string | null;
}

interface BillPhotoCaptureProps {
  onExtracted: (data: ParsedBill[]) => void;
}

export function BillPhotoCapture({ onExtracted }: BillPhotoCaptureProps) {
  const [drafts, setDrafts] = useState<BillDraft[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addPhotos = (files: FileList) => {
    const newDrafts: BillDraft[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      status: "pending" as const,
      extracted: null,
      error: null,
    }));
    setDrafts((prev) => [...prev, ...newDrafts]);
    newDrafts.forEach((draft) => extractFromPhoto(draft.id, draft.file));
  };

  const extractFromPhoto = async (id: string, file: File) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, status: "processing" as const, error: null } : d)));

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const imageDataUrl = `data:${file.type};base64,${base64}`;

      const { data, error: invokeError } = await supabase.functions.invoke("extract-bill-from-photo", {
        body: { imageDataUrl },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (!data) throw new Error("Sem resposta da IA");

      setDrafts((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                status: "done" as const,
                extracted: {
                  type: data.type || "desconhecido",
                  amount: typeof data.amount === "number" ? data.amount : null,
                  due_date: data.due_date || null,
                  bank_name: data.bank_name || null,
                  beneficiary: data.beneficiary || null,
                  barcode: data.barcode || "",
                },
              }
            : d
        )
      );

      setExpandedId((prev) => prev ?? id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao extrair";
      setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, status: "error" as const, error: msg } : d)));
    }
  };

  const updateField = (id: string, field: keyof ParsedBill, value: unknown) => {
    setDrafts((prev) =>
      prev.map((d) =>
        d.id === id && d.extracted ? { ...d, extracted: { ...d.extracted, [field]: value } } : d
      )
    );
  };

  const removeDraft = (id: string) => {
    setDrafts((prev) => {
      const removed = prev.find((d) => d.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((d) => d.id !== id);
    });
    if (expandedId === id) setExpandedId(null);
  };

  const confirmAll = () => {
    const confirmed = drafts.filter((d) => d.status === "done" && d.extracted).map((d) => d.extracted!);
    onExtracted(confirmed);
    // Libera memória das previews
    drafts.forEach((d) => URL.revokeObjectURL(d.preview));
    setDrafts([]);
    setExpandedId(null);
  };

  const allDone = drafts.length > 0 && drafts.every((d) => d.status === "done" || d.status === "error");
  const confirmedCount = drafts.filter((d) => d.status === "done").length;

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={(e) => e.target.files && addPhotos(e.target.files)}
        className="hidden"
      />

      <button
        onClick={() => inputRef.current?.click()}
        className="w-full h-11 rounded-2xl bg-card border border-dashed border-border text-muted-foreground text-sm font-bold flex items-center justify-center gap-2 hover:border-primary/50 hover:text-primary transition-all"
      >
        <Camera size={16} />
        {drafts.length === 0 ? "Tirar fotos dos boletos" : "+ Adicionar mais fotos"}
      </button>

      {drafts.length > 0 && (
        <div className="space-y-2">
          {drafts.map((draft, index) => (
            <div
              key={draft.id}
              className={`rounded-2xl border overflow-hidden transition-all ${
                expandedId === draft.id ? "border-primary/40 bg-card" : "border-border bg-card/50"
              }`}
            >
              {/* Header */}
              <button
                onClick={() => setExpandedId(expandedId === draft.id ? null : draft.id)}
                className="w-full flex items-center gap-3 p-3"
              >
                <img
                  src={draft.preview}
                  className="w-10 h-10 rounded-xl object-cover shrink-0"
                  alt={`Boleto ${index + 1}`}
                />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-bold text-foreground truncate">
                    Boleto {index + 1}
                    {draft.extracted?.beneficiary && (
                      <span className="text-muted-foreground font-normal"> · {draft.extracted.beneficiary}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {draft.extracted?.amount ? formatBRL(draft.extracted.amount) : "—"}
                    {draft.extracted?.due_date &&
                      ` · vence ${format(new Date(draft.extracted.due_date + "T12:00:00"), "dd/MM/yyyy")}`}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {draft.status === "processing" && <Loader2 size={14} className="text-primary animate-spin" />}
                  {draft.status === "done" && <CheckCircle size={14} className="text-zinc-400" />}
                  {draft.status === "error" && <AlertCircle size={14} className="text-destructive" />}
                  <ChevronDown
                    size={14}
                    className={`text-muted-foreground transition-transform ${expandedId === draft.id ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              {/* Expanded content */}
              {expandedId === draft.id && (
                <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                  {draft.status === "processing" && (
                    <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground text-sm">
                      <Loader2 size={16} className="animate-spin text-primary" />
                      Analisando com IA...
                    </div>
                  )}

                  {draft.status === "error" && (
                    <div className="space-y-2">
                      <p className="text-xs text-destructive text-center">{draft.error}</p>
                      <button
                        onClick={() => extractFromPhoto(draft.id, draft.file)}
                        className="w-full h-9 rounded-xl bg-secondary text-xs font-bold text-foreground"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  )}

                  {draft.status === "done" && draft.extracted && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <p className="text-[9px] uppercase text-muted-foreground font-bold mb-1">Beneficiário</p>
                          <input
                            value={draft.extracted.beneficiary || ""}
                            onChange={(e) => updateField(draft.id, "beneficiary", e.target.value)}
                            className="w-full h-9 px-3 rounded-xl bg-secondary border border-border text-xs text-foreground"
                          />
                        </div>
                        <div>
                          <p className="text-[9px] uppercase text-muted-foreground font-bold mb-1">Banco</p>
                          <input
                            value={draft.extracted.bank_name || ""}
                            onChange={(e) => updateField(draft.id, "bank_name", e.target.value)}
                            className="w-full h-9 px-3 rounded-xl bg-secondary border border-border text-xs text-foreground"
                          />
                        </div>
                        <div>
                          <p className="text-[9px] uppercase text-muted-foreground font-bold mb-1">Valor</p>
                          <CurrencyInput
                            value={draft.extracted.amount ?? undefined}
                            onChange={(val) => updateField(draft.id, "amount", val)}
                            placeholder="R$ 0,00"
                          />
                        </div>
                        <div>
                          <p className="text-[9px] uppercase text-muted-foreground font-bold mb-1">Vencimento</p>
                          <input
                            type="date"
                            value={draft.extracted.due_date || ""}
                            onChange={(e) => updateField(draft.id, "due_date", e.target.value)}
                            className="w-full h-9 px-3 rounded-xl bg-secondary border border-border text-xs text-foreground"
                          />
                        </div>
                      </div>

                      {draft.extracted.barcode && (
                        <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-3 py-2 min-w-0">
                          <p className="text-[10px] text-muted-foreground truncate flex-1 font-mono">
                            {draft.extracted.barcode}
                          </p>
                          <button
                            onClick={() => navigator.clipboard.writeText(draft.extracted!.barcode)}
                            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => removeDraft(draft.id)}
                        className="w-full h-8 rounded-xl text-xs text-destructive hover:bg-destructive/10 transition-all flex items-center justify-center gap-1"
                      >
                        <Trash2 size={12} /> Remover este boleto
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {allDone && confirmedCount > 0 && (
        <button
          onClick={confirmAll}
          className="w-full h-11 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-black transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle size={16} />
          Salvar {confirmedCount} boleto{confirmedCount > 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}
