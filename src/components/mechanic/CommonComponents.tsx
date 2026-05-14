import React from "react";
import { NumericFormat } from "react-number-format";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function InputGroup({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">{label}</label>
      {children}
    </div>
  );
}

export function PremiumInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Input
      {...props}
      className={`h-11 bg-background border-border/60 rounded-xl text-xs font-semibold focus:ring-primary/20 focus:border-primary/40 transition-all ${className}`}
    />
  );
}

export function PremiumTextarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Textarea
      {...props}
      className={`bg-background border-border/60 rounded-xl text-xs font-semibold focus:ring-primary/20 focus:border-primary/40 transition-all resize-none ${className}`}
    />
  );
}

export function CurrencyInput({ value, onChange, className = "" }: { value: number; onChange: (val: number) => void; className?: string }) {
  return (
    <NumericFormat
      value={value}
      onValueChange={(values) => onChange(Number(values.value))}
      thousandSeparator="."
      decimalSeparator=","
      prefix="R$ "
      decimalScale={2}
      fixedDecimalScale
      className={`flex h-11 w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-xs font-bold ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all ${className}`}
    />
  );
}
