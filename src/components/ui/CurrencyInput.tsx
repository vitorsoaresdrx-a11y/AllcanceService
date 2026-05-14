import * as React from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

function formatDisplay(val: number): string {
  if (val === 0) return "";
  return val.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseInput(raw: string): number {
  // Remove everything except digits
  const digits = raw.replace(/\D/g, "");
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = "0,00",
  className,
  disabled,
  autoFocus,
}: CurrencyInputProps) {
  const [display, setDisplay] = React.useState(() => formatDisplay(value));

  // Sync external value changes
  React.useEffect(() => {
    setDisplay(formatDisplay(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseInput(raw);
    setDisplay(formatDisplay(num));
    onChange(num);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 text-xs font-bold pointer-events-none">
        R$
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={cn(
          "w-full h-14 bg-[#161618] border border-zinc-800 rounded-2xl pl-12 pr-5 text-sm font-semibold text-zinc-100 outline-none focus:border-[#A1A1AA] focus:shadow-[0_0_0_2px_rgba(161,161,170,0.2)] transition-all placeholder:text-zinc-600",
          className
        )}
      />
    </div>
  );
}
