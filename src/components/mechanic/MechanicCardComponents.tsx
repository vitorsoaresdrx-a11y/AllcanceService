import { useState } from "react";
import { 
  X, 
  Camera, 
  ImageIcon, 
  Loader2, 
  Trash2 
} from "lucide-react";
import { formatBRL } from "@/lib/format";
import { useParts } from "@/hooks/useParts";
import { 
  useOSPhotos, 
  useUploadPhoto, 
  useDeletePhoto, 
  OSPhoto 
} from "@/hooks/useOSPhotos";

interface AdditionPart {
  part_id: string;
  part_name: string;
  quantity: number;
  unit_price: number;
}

interface AddRepairPartSelectorProps {
  selectedParts: AdditionPart[];
  onChange: (parts: AdditionPart[]) => void;
  PremiumInput: any; // Passado como prop ou importado se se tornar comum
}

export function AddRepairPartSelector({ selectedParts, onChange, PremiumInput }: AddRepairPartSelectorProps) {
  const { data: parts = [] } = useParts();
  const [search, setSearch] = useState("");

  const filtered = search.length >= 2 
    ? (parts as any[]).filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
    : [];

  const addPart = (p: any) => {
    if (selectedParts.some(sp => sp.part_id === p.id)) return;
    onChange([...selectedParts, { part_id: p.id, part_name: p.name, quantity: 1, unit_price: p.sale_price || 0 }]);
    setSearch("");
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <PremiumInput placeholder="Buscar peça por nome ou SKU..." value={search} onChange={(e: any) => setSearch(e.target.value)} />
        {filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-[100] bg-background border border-border rounded-xl mt-2 shadow-xl max-h-48 overflow-y-auto">
            {filtered.map(p => (
              <button key={p.id} onClick={() => addPart(p)} className="w-full px-4 py-2.5 text-left text-xs font-bold hover:bg-muted border-b border-border/40 last:border-0 truncate">
                {p.name} — <span className="text-primary">{formatBRL(p.sale_price || 0)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {selectedParts.length > 0 && (
        <div className="space-y-2">
          {selectedParts.map((p, i) => (
            <div key={i} className="flex items-center gap-2 bg-muted/20 p-2 rounded-xl border border-border/40">
              <span className="text-[10px] font-bold flex-1 truncate">{p.part_name}</span>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={p.quantity} 
                  onChange={(e) => {
                    const next = [...selectedParts];
                    next[i].quantity = Number(e.target.value);
                    onChange(next);
                  }}
                  className="w-10 h-7 bg-background border border-border rounded-lg text-center text-[10px] font-bold"
                />
                <button 
                  onClick={() => onChange(selectedParts.filter((_, idx) => idx !== i))}
                  className="w-7 h-7 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function OSPhotosSection({ osId }: { osId: string }) {
  const { data: photos = [], isLoading } = useOSPhotos(osId);
  const upload = useUploadPhoto();
  const remove = useDeletePhoto();
  const [activeTab, setActiveTab] = useState<OSPhoto["tipo"]>("chegada");

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>, tipo: OSPhoto["tipo"]) => {
    const file = e.target.files?.[0];
    if (file) {
      upload.mutate({ osId, file, tipo }, {
        onSuccess: () => {
          e.target.value = "";
        }
      });
    }
  };

  const filteredPhotos = photos.filter(p => p.tipo === activeTab);

  const tabs: { key: OSPhoto["tipo"], label: string }[] = [
    { key: "chegada", label: "Chegada" },
    { key: "problema", label: "Problema" },
    { key: "finalizacao", label: "Fim" }
  ];

  return (
    <div className="space-y-4 border-t border-border/40 pt-6">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Documentação Fotográfica</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`h-10 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.key ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 pb-2">
        <label className={`flex flex-col items-center justify-center gap-2 h-24 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${upload.isPending ? "bg-primary/5 border-primary/40 animate-pulse pointer-events-none" : "border-border/40 hover:border-primary/40 hover:bg-primary/5"}`}>
          {upload.isPending ? <Loader2 size={24} className="text-primary animate-spin" /> : <Camera size={20} className="text-muted-foreground" />}
          <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">{upload.isPending ? "Enviando..." : "Tirar Foto"}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => onFileChange(e, activeTab)} disabled={upload.isPending} />
        </label>
        <label className={`flex flex-col items-center justify-center gap-2 h-24 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${upload.isPending ? "bg-primary/5 border-primary/40 animate-pulse pointer-events-none" : "border-border/40 hover:border-primary/40 hover:bg-primary/5"}`}>
          {upload.isPending ? <Loader2 size={24} className="text-primary animate-spin" /> : <ImageIcon size={20} className="text-muted-foreground" />}
          <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">{upload.isPending ? "Subindo..." : "Galeria"}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => onFileChange(e, activeTab)} disabled={upload.isPending} />
        </label>
      </div>

      {isLoading ? (
        <div className="h-20 rounded-2xl bg-muted/20 animate-pulse" />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {filteredPhotos.map((p) => (
            <div key={p.id} className="relative group aspect-square rounded-xl overflow-hidden bg-muted border border-border">
              <img src={p.url} alt="OS" className="w-full h-full object-cover" />
              <button 
                onClick={() => remove.mutate(p)}
                className="absolute top-1 right-1 w-6 h-6 rounded-lg bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          {filteredPhotos.length === 0 && (
            <div className="col-span-3 py-6 text-center border border-dashed border-border/20 rounded-2xl opacity-30">
              <p className="text-[8px] font-bold uppercase tracking-widest">Nenhuma foto em "{tabs.find(t => t.key === activeTab)?.label}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
