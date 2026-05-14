import { useState, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Search, ChevronDown, Printer, User, ShoppingBag, Download, Ban, Pencil, Wrench, Trash2 } from "lucide-react";
import { useSales, useCancelSale, useDeleteSale } from "@/hooks/useSales";
import { SaleReceipt, type ReceiptData } from "@/components/pdv/SaleReceipt";
import { SaleEditModal } from "@/components/pdv/SaleEditModal";
import { formatBRL } from "@/lib/format";
import { exportSalesCSV } from "@/lib/export-csv";
import { EmptyState } from "@/components/EmptyState";
import { PaginationBar } from "@/components/PaginationBar";
import { usePagination } from "@/hooks/usePagination";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function formatDateTime(d: string) {
  const date = new Date(d);
  return {
    date: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    time: date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

const paymentLabel: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  "cartão de crédito": "Crédito",
  "cartão de débito": "Débito",
  transferência: "Transferência",
};

function getPaymentStyle(method: string) {
  switch (method) {
    case "pix":
      return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    case "dinheiro":
      return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    default:
      return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
  }
}

function buildReceiptFromSale(sale: any): ReceiptData {
  const customer = sale.customers;
  const items = (sale.sale_items || []).map((item: any) => ({
    name: item.description,
    quantity: item.quantity,
    unit_price: Number(item.unit_price),
  }));
  return {
    orderNumber: sale.id.slice(-4).toUpperCase(),
    timestamp: new Date(sale.created_at),
    customerName: customer?.name || undefined,
    customerWhatsapp: customer?.whatsapp || undefined,
    items,
    subtotal: Number(sale.total),
    discount: 0,
    total: Number(sale.total),
    paymentMethod: sale.payment_method || "pix",
  };
}

interface CustomerGroup {
  customerId: string | null;
  customerName: string;
  customerWhatsapp: string | null;
  customerCpf: string | null;
  sales: any[];
  totalSpent: number;
  lastPurchase: string;
}

// ─── Sale Row ─────────────────────────────────────────────────────────────────

function SaleRow({
  sale,
  isExpanded,
  onToggle,
  onReceipt,
  onCancel,
  onEdit,
  onDelete,
}: {
  sale: any;
  isExpanded: boolean;
  onToggle: () => void;
  onReceipt: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const items = sale.sale_items || [];
  const { date, time } = formatDateTime(sale.created_at);
  const method = sale.payment_method || "pix";
  const cardFee = Number(sale.card_fee) || 0;
  const cardTax = Number(sale.card_tax_percent) || 0;
  const isCancelled = sale.status === "cancelled";

  return (
    <div className="px-4">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 py-3"
      >
        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <ShoppingBag size={13} className="text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs text-muted-foreground">
            {date} · {time}
          </p>
          <span
            className={`inline-block mt-1 text-[9px] font-black px-2 py-0.5 rounded-full border ${getPaymentStyle(method)}`}
          >
            {paymentLabel[method] || method}
          </span>
          {sale.origin === 'oficina' && (
            <span className="inline-flex items-center gap-1 ml-1 mt-1 text-[9px] font-black px-2 py-0.5 rounded-full border bg-zinc-500/10 text-zinc-400 border-zinc-500/20">
              <Wrench size={8} /> Manutenção
            </span>
          )}
          {isCancelled && (
            <Badge variant="destructive" className="ml-1 mt-1 text-[9px] px-2 py-0.5">
              Cancelada
            </Badge>
          )}
        </div>
        <p className={`text-sm font-black shrink-0 ${isCancelled ? "line-through text-muted-foreground" : "text-white"}`}>
          {formatBRL(Number(sale.total))}
        </p>
        <ChevronDown
          size={12}
          className={`text-muted-foreground/70 ml-1 transition-transform ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      {isExpanded && (
        <div className="pb-3 space-y-2">
          {items.map((item: any) => (
            <div key={item.id} className="flex justify-between text-xs px-2">
              <span className="text-muted-foreground">
                {item.quantity}x {item.description}
              </span>
              <span className="font-bold text-foreground/80">
                {formatBRL(item.quantity * Number(item.unit_price))}
              </span>
            </div>
          ))}

          <div className="flex justify-between text-xs px-2 pt-2 border-t border-border mt-2">
            <span className="font-black text-white uppercase text-[10px]">Total</span>
            <span className="font-black text-white">{formatBRL(Number(sale.total))}</span>
          </div>

          {cardFee > 0 && (
            <div className="px-2 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Taxa cartão ({cardTax}%)</span>
                <span className="text-zinc-400">-{formatBRL(cardFee)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Líquido</span>
                <span className="text-zinc-400">{formatBRL(Number(sale.total) - cardFee)}</span>
              </div>
            </div>
          )}

          {sale.notes && (
            <p className="text-xs text-muted-foreground italic px-2">Obs: {sale.notes}</p>
          )}

          <div className="flex items-center gap-3 px-2 mt-1">
            <button
              onClick={(e) => { e.stopPropagation(); onReceipt(); }}
              className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground hover:text-white transition-colors"
            >
              <Printer size={12} /> Reimprimir
            </button>
            {!isCancelled && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:text-primary/80 transition-colors"
                >
                  <Pencil size={12} /> Editar
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onCancel(); }}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 hover:text-zinc-400 transition-colors"
                >
                  <Ban size={12} /> Cancelar
                </button>
              </>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 hover:text-zinc-400 transition-colors ml-auto"
            >
              <Trash2 size={12} /> Excluir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Historico() {
  const { data: salesData = [], isLoading } = useSales();
  const sales = (salesData as any) || [];
  const [search, setSearch] = useState("");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [cancelSaleId, setCancelSaleId] = useState<string | null>(null);
  const [deleteSaleId, setDeleteSaleId] = useState<string | null>(null);
  const [editingSale, setEditingSale] = useState<any | null>(null);
  const cancelSale = useCancelSale();
  const deleteSale = useDeleteSale();

  const customerGroups = useMemo(() => {
    const groups = new Map<string, CustomerGroup>();

    for (const sale of sales) {
      const customer = sale.customers;
      const key = customer?.id || `anon-${sale.id}`;

      if (groups.has(key)) {
        const group = groups.get(key)!;
        group.sales.push(sale);
        group.totalSpent += sale.status !== "cancelled" ? Number(sale.total) : 0;
        if (sale.created_at > group.lastPurchase) {
          group.lastPurchase = sale.created_at;
        }
      } else {
        groups.set(key, {
          customerId: customer?.id || null,
          customerName: customer?.name || "Cliente não informado",
          customerWhatsapp: customer?.whatsapp || null,
          customerCpf: customer?.cpf || null,
          sales: [sale],
          totalSpent: sale.status !== "cancelled" ? Number(sale.total) : 0,
          lastPurchase: sale.created_at,
        });
      }
    }

    return Array.from(groups.values()).sort(
      (a, b) => new Date(b.lastPurchase).getTime() - new Date(a.lastPurchase).getTime()
    );
  }, [sales]);

  const debouncedSearch = useDebounce(search, 300);

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return customerGroups;
    const q = debouncedSearch.toLowerCase();
    return customerGroups.filter(
      (g) =>
        g.customerName.toLowerCase().includes(q) ||
        (g.customerWhatsapp && g.customerWhatsapp.includes(q)) ||
        (g.customerCpf && g.customerCpf.includes(q))
    );
  }, [customerGroups, debouncedSearch]);

  const pagination = usePagination(filtered, 20);

  const toggleCustomer = (key: string) => {
    setExpandedCustomer(expandedCustomer === key ? null : key);
    setExpandedSale(null);
  };

  const totalSalesCount = filtered.reduce((sum, g) => sum + g.sales.length, 0);

  return (
    <div className="min-h-full bg-background text-foreground font-sans selection:bg-primary/30 pb-24 lg:pb-0">
      <div className="max-w-3xl mx-auto w-full p-4 lg:p-8 space-y-4">
        {/* Header */}
        <header className="flex items-center justify-between">
          <h1 className="text-lg md:text-2xl font-extrabold tracking-tight">
            Histórico de Vendas
          </h1>
          {sales.length > 0 && (
            <button
              onClick={() => exportSalesCSV(sales)}
              className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground hover:text-white transition-colors uppercase tracking-wider border border-border rounded-xl px-3 py-2 hover:border-border/70"
            >
              <Download size={14} /> Exportar
            </button>
          )}
        </header>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, WhatsApp ou CPF..."
            className="w-full bg-card border border-border rounded-2xl h-10 pl-10 pr-4 text-sm text-foreground/90 outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/70"
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState type={search ? "search" : "sales"} />
        ) : (
          <div className="space-y-3">
            {pagination.items.map((group) => {
              const key = group.customerId || `anon-${group.sales[0].id}`;
              const isExpanded = expandedCustomer === key;
              const n = group.sales.length;

              return (
                <div
                  key={key}
                  className="rounded-2xl bg-card border border-border overflow-hidden"
                >
                  {/* Customer header */}
                  <button
                    type="button"
                    onClick={() => toggleCustomer(key)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-muted border border-border/80 flex items-center justify-center shrink-0">
                      <User size={18} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-black text-white truncate">
                        {group.customerName}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {n} compra{n > 1 ? "s" : ""} · Última{" "}
                        {formatDateShort(group.lastPurchase)}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-sm font-black text-white">
                        {formatBRL(group.totalSpent)}
                      </p>
                      <ChevronDown
                        size={14}
                        className={`text-muted-foreground mt-1 mx-auto transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-border">
                      {/* Customer info */}
                      {(group.customerWhatsapp || group.customerCpf) && (
                        <div className="px-4 py-3 flex gap-4 bg-muted/30">
                          {group.customerWhatsapp && (
                            <div>
                              <p className="text-[9px] uppercase text-muted-foreground/70 font-bold tracking-wider">
                                WhatsApp
                              </p>
                              <p className="text-xs font-bold text-foreground/80">
                                {group.customerWhatsapp}
                              </p>
                            </div>
                          )}
                          {group.customerCpf && (
                            <div>
                              <p className="text-[9px] uppercase text-muted-foreground/70 font-bold tracking-wider">
                                CPF
                              </p>
                              <p className="text-xs font-bold text-foreground/80">
                                {group.customerCpf}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sales list */}
                      <div className="divide-y divide-border/50">
                        {group.sales
                          .sort(
                            (a: any, b: any) =>
                              new Date(b.created_at).getTime() -
                              new Date(a.created_at).getTime()
                          )
                          .map((sale: any) => (
                            <SaleRow
                              key={sale.id}
                              sale={sale}
                              isExpanded={expandedSale === sale.id}
                              onToggle={() =>
                                setExpandedSale(expandedSale === sale.id ? null : sale.id)
                              }
                              onReceipt={() => setReceiptData(buildReceiptFromSale(sale))}
                              onCancel={() => setCancelSaleId(sale.id)}
                              onEdit={() => setEditingSale(sale)}
                              onDelete={() => setDeleteSaleId(sale.id)}
                            />
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && filtered.length > 0 && (
          <>
            <PaginationBar {...pagination} onPrev={pagination.prev} onNext={pagination.next} />
            <div className="flex justify-between items-center px-1 text-[10px] text-muted-foreground/70 uppercase tracking-widest">
              <span>{filtered.length} clientes</span>
              <span>{totalSalesCount} vendas</span>
            </div>
          </>
        )}

        {/* Receipt modal */}
        {receiptData && (
          <SaleReceipt
            open={!!receiptData}
            onClose={() => setReceiptData(null)}
            data={receiptData}
          />
        )}

        {/* Edit modal */}
        <SaleEditModal
          sale={editingSale}
          open={!!editingSale}
          onClose={() => setEditingSale(null)}
        />

        {/* Cancel sale dialog */}
        <ConfirmDeleteDialog
          open={!!cancelSaleId}
          onOpenChange={(open) => !open && setCancelSaleId(null)}
          onConfirm={() => {
            if (cancelSaleId) {
              cancelSale.mutate(cancelSaleId, {
                onSuccess: () => {
                  toast.success("Venda cancelada com sucesso");
                  setCancelSaleId(null);
                },
                onError: () => toast.error("Erro ao cancelar venda"),
              });
            }
          }}
          title="Cancelar venda"
          description="Tem certeza que deseja marcar esta venda como cancelada? Ela continuará na lista mas não será somada nos totais."
        />

        <ConfirmDeleteDialog
          open={!!deleteSaleId}
          onOpenChange={(open) => !open && setDeleteSaleId(null)}
          onConfirm={() => {
            if (deleteSaleId) {
              deleteSale.mutate(deleteSaleId, {
                onSuccess: () => {
                  toast.success("Venda excluída permanentemente");
                  setDeleteSaleId(null);
                },
                onError: () => toast.error("Erro ao excluir venda"),
              });
            }
          }}
          title="Excluir venda"
          description="Esta ação removerá permanentemente o registro da venda e todos os seus itens. Esta ação NÃO pode ser desfeita."
        />
      </div>
    </div>
  );
}
