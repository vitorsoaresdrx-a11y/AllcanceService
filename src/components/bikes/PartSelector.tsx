import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Part } from "@/hooks/useParts";

interface PartSelectorProps {
  parts: Part[];
  selectedPartId: string | null;
  customName?: string | null;
  onSelectPart: (partId: string) => void;
  onCustomName?: (name: string) => void;
  allowCustom?: boolean;
}

export function PartSelector({
  parts,
  selectedPartId,
  customName,
  onSelectPart,
  onCustomName,
  allowCustom = true,
}: PartSelectorProps) {
  const [open, setOpen] = useState(false);
  const [useCustom, setUseCustom] = useState(allowCustom && !!customName && !selectedPartId);

  const selectedPart = parts.find((p) => p.id === selectedPartId);
  const displayLabel = selectedPart
    ? `${selectedPart.name}${selectedPart.category ? ` (${selectedPart.category})` : ""}`
    : customName || "";

  if (allowCustom && useCustom) {
    return (
      <div className="flex gap-2 w-full min-w-0">
        <Input
          value={customName || ""}
          onChange={(e) => onCustomName?.(e.target.value)}
          placeholder="Nome personalizado da peça"
          className="bg-background border-border h-8 text-xs flex-1 min-w-0"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs shrink-0"
          onClick={() => setUseCustom(false)}
        >
          Catálogo
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2 w-full min-w-0">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="flex-1 min-w-0 justify-between h-8 text-xs font-normal bg-background border-border"
          >
            <span className="truncate">{displayLabel || "Selecionar peça do catálogo..."}</span>
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[92vw] max-w-lg p-0 border-border bg-popover overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2 border-b border-border">
            <DialogTitle className="text-sm font-black text-foreground">Selecionar peça</DialogTitle>
          </DialogHeader>
          <Command className="bg-popover">
            <CommandInput placeholder="Buscar peça..." className="text-sm" />
            <CommandList className="max-h-[60vh] overflow-y-auto">
              <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
                Nenhuma peça encontrada
              </CommandEmpty>
              <CommandGroup>
                {parts.map((part) => (
                  <CommandItem
                    key={part.id}
                    value={`${part.name} ${part.category || ""}`}
                    onSelect={() => {
                      onSelectPart(part.id);
                      setOpen(false);
                    }}
                    className="text-sm"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedPartId === part.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{part.name}</span>
                    {part.category && (
                      <span className="ml-1 text-muted-foreground truncate">({part.category})</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      {allowCustom && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs shrink-0"
          onClick={() => {
            setUseCustom(true);
            onCustomName?.("");
          }}
        >
          Manual
        </Button>
      )}
    </div>
  );
}

