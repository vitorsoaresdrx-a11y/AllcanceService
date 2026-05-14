import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationBarProps {
  page: number;
  totalPages: number;
  totalItems: number;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export function PaginationBar({ page, totalPages, totalItems, onPrev, onNext, hasPrev, hasNext }: PaginationBarProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-1 py-3">
      <span className="text-[10px] text-muted-foreground/70 uppercase tracking-widest">
        {totalItems} itens · Página {page}/{totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-white hover:border-border/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-white hover:border-border/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
