import { useState, useMemo, useRef, useEffect } from "react";
import { User, Phone, CreditCard, Check } from "lucide-react";
import { useCustomers, type Customer } from "@/hooks/useCustomers";
import { maskPhone, maskCpfCnpj } from "@/lib/masks";

interface CustomerAutocompleteProps {
  customerName: string;
  customerWhatsapp: string;
  customerCpf: string;
  onSelect: (customer: Customer) => void;
  onChange: (field: "name" | "whatsapp" | "cpf", value: string) => void;
  inputClassName?: string;
  triggerFields?: ("name" | "whatsapp" | "cpf")[];
}

export function CustomerAutocomplete({
  customerName,
  customerWhatsapp,
  customerCpf,
  onSelect,
  onChange,
  inputClassName = "",
  triggerFields = ["name", "whatsapp", "cpf"],
}: CustomerAutocompleteProps) {
  const { data: customers = [] } = useCustomers();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const query = customerName || customerWhatsapp || customerCpf;

  const suggestions = useMemo(() => {
    if (!query || query.trim().length < 2 || selectedId) return [];
    const q = query.toLowerCase().replace(/\D/g, "");
    const qText = query.toLowerCase();

    return customers
      .filter((c) => {
        const nameMatch = c.name.toLowerCase().includes(qText);
        const whatsMatch = c.whatsapp && c.whatsapp.replace(/\D/g, "").includes(q);
        const cpfMatch = c.cpf && c.cpf.replace(/\D/g, "").includes(q);
        return nameMatch || whatsMatch || cpfMatch;
      })
      .slice(0, 5);
  }, [customers, query, selectedId]);

  useEffect(() => {
    setShowSuggestions(suggestions.length > 0);
  }, [suggestions]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (customer: Customer) => {
    setSelectedId(customer.id);
    setShowSuggestions(false);
    onSelect(customer);
  };

  const handleClear = () => {
    setSelectedId(null);
    onChange("name", "");
    onChange("whatsapp", "");
    onChange("cpf", "");
  };

  const handleChange = (field: "name" | "whatsapp" | "cpf", value: string) => {
    if (selectedId) setSelectedId(null);
    if (field === "whatsapp") {
      onChange(field, maskPhone(value));
    } else if (field === "cpf") {
      onChange(field, maskCpfCnpj(value));
    } else {
      onChange(field, value);
    }
  };

  if (selectedId) {
    const selected = customers.find((c) => c.id === selectedId);
    if (selected) {
      return (
        <div className="p-3 bg-zinc-500/10 border border-zinc-500/30 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-zinc-500/20 flex items-center justify-center shrink-0">
              <Check size={14} className="text-zinc-400" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm truncate">{selected.name}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest truncate">
                {[selected.whatsapp, selected.cpf].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-[10px] font-bold text-muted-foreground hover:text-white transition-colors uppercase tracking-widest shrink-0"
          >
            Trocar
          </button>
        </div>
      );
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {showSuggestions && (
        <div className="absolute left-0 right-0 bottom-full mb-1 z-50 bg-secondary border border-border/80 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
              Clientes encontrados
            </p>
          </div>
          {suggestions.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelect(c)}
              className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-muted/60 transition-colors text-left border-b border-border/50 last:border-b-0"
            >
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User size={12} className="text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate">{c.name}</p>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  {c.whatsapp && (
                    <span className="flex items-center gap-1">
                      <Phone size={8} /> {c.whatsapp}
                    </span>
                  )}
                  {c.cpf && (
                    <span className="flex items-center gap-1">
                      <CreditCard size={8} /> {c.cpf}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
