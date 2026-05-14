import { useState, useRef, useEffect, useMemo } from "react";
import { Hash, Bike } from "lucide-react";
import { useBikeServiceHistory } from "@/hooks/useBikeServiceHistory";

interface FrameNumberInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function FrameNumberInput({ value, onChange }: FrameNumberInputProps) {
  const { data: history = [] } = useBikeServiceHistory();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    if (!value || value.length < 2) return [];
    const q = value.toLowerCase();
    return history
      .filter((h) => h.frame_number.toLowerCase().includes(q))
      .slice(0, 5);
  }, [value, history]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (frameNumber: string) => {
    onChange(frameNumber);
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
      <input
        className="w-full h-10 bg-background border border-border rounded-xl pl-9 pr-4 text-sm text-foreground outline-none focus:border-primary transition-all placeholder:text-muted-foreground/70"
        placeholder="Número do quadro"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => value.length >= 2 && setOpen(true)}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-secondary border border-border/80 rounded-xl overflow-hidden shadow-2xl">
          {suggestions.map((s) => (
            <button
              key={s.frame_number}
              type="button"
              onClick={() => handleSelect(s.frame_number)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors"
            >
              <Bike size={14} className="text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{s.frame_number}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {s.bike_name} · {s.records.length} serviço{s.records.length > 1 ? "s" : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
