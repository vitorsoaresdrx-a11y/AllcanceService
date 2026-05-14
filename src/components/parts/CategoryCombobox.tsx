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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCategories } from "@/hooks/useCategories";

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

export function CategoryCombobox({ value, onChange }: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const { data: categories = [] } = useCategories();
  const options = categories.map((c) => ({ label: c.name, value: c.name }));

  const handleSelect = (selected: string) => {
    onChange(selected === value ? "" : selected);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-11 text-sm font-normal bg-background border-border"
        >
          {value || "Selecionar categoria..."}
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0 bg-popover border-border z-[200]"
        align="start"
        side="bottom"
        avoidCollisions={false}
      >
        <Command>
          <CommandInput
            placeholder="Buscar categoria..."
            value={inputValue}
            onValueChange={setInputValue}
            className="text-sm"
          />
          <CommandList>
            <CommandEmpty>
              {inputValue.trim() ? (
                <button
                  type="button"
                  className="w-full px-2 py-1.5 text-sm text-left hover:bg-accent rounded-sm"
                  onClick={() => {
                    onChange(inputValue.trim());
                    setOpen(false);
                  }}
                >
                  Usar "{inputValue}"
                </button>
              ) : (
                <p className="px-2 py-3 text-sm text-muted-foreground text-center">
                  Nenhuma categoria encontrada
                </p>
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={handleSelect}
                  className="text-sm"
                >
                  <Check
                    className={cn(
                      "mr-2 h-3.5 w-3.5",
                      value === opt.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
