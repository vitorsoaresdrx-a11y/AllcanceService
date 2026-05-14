import { useState } from "react";
import { useStoreSales, type StoreSale } from "@/hooks/useStoreSales";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  Ban,
  RefreshCcw,
  DollarSign,
  User,
  ShoppingBag,
  MoreVertical,
  Calendar,
  AlertCircle,
  ChevronRight,
  Loader2,
  Search,
  Filter,
  History as HistoryIcon,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusColors: Record<string, string> = {
  approved: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
  authorized: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
  pending: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
  in_process: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
  rejected: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
  cancelled: "text-slate-400 bg-slate-400/10 border-slate-400/20",
  refunded: "text-zinc-400 bg-zinc-400/10 border-zinc-400/20",
};

const statusIcons: Record<string, any> = {
  approved: CheckCircle2,
  authorized: CheckCircle2,
  pending: Clock,
  in_process: Loader2,
  rejected: XCircle,
  cancelled: Ban,
  refunded: RefreshCcw,
};

export default function Pagamentos() {
  const { data: sales = [], isLoading } = useStoreSales();
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSales = sales.filter((s) => {
    const matchesStatus = filter === "all" || s.status === filter;
    const matchesSearch =
      s.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.external_reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.payment_id && s.payment_id.toString().includes(searchTerm));
    return matchesStatus && matchesSearch;
  });

  const totalApproved = sales
    .filter((s) => s.status === "approved")
    .reduce((curr, s) => curr + (s.total_amount || 0), 0);

  const totalPending = sales
    .filter((s) => s.status === "pending" || s.status === "in_process")
    .reduce((curr, s) => curr + (s.total_amount || 0), 0);

  const renderSaleCard = (sale: StoreSale) => {
    const StatusIcon = statusIcons[sale.status] || AlertCircle;
    const colorClass = statusColors[sale.status] || "text-slate-400 bg-slate-400/10 border-slate-400/20";

    return (
      <div
        key={sale.id}
        className="group relative bg-card border border-border hover:border-primary/20 rounded-3xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${colorClass} border`}>
              <StatusIcon className={`w-7 h-7 ${sale.status === 'in_process' ? 'animate-spin' : ''}`} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-base font-black text-white uppercase tracking-tight">
                  {sale.customer_name || "Cliente sem nome"}
                </p>
                <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border shrink-0 ${colorClass}`}>
                  {sale.status_label || "No Status"}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground/60 font-bold uppercase tracking-widest">
                <span className="flex items-center gap-1.5">
                  <Calendar size={12} /> 
                  {sale.created_at ? format(new Date(sale.created_at), "dd MMM, HH:mm", { locale: ptBR }) : "Sem data"}
                </span>
                {sale.payment_id && <span className="flex items-center gap-1.5"><ShoppingBag size={12} /> ID: {sale.payment_id}</span>}
                <span className="flex items-center gap-1.5 text-primary/60"><CreditCard size={12} /> {sale.payment_method?.toUpperCase() || "PENDENTE"} {sale.installments ? `(${sale.installments}x)` : ""}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-10 border-t md:border-t-0 border-border/50 pt-4 md:pt-0">
            <div className="text-right space-y-1">
              <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Valor Total</p>
              <p className={`text-xl font-black italic ${sale.status === 'approved' ? 'text-zinc-400' : 'text-white'}`}>
                R$ {(sale.total_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white hover:bg-primary/10 hover:border-primary/20 transition-all">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-full bg-background text-foreground pb-24">
      <div className="w-full max-w-[1400px] mx-auto p-4 sm:p-6 md:p-8 lg:p-12 space-y-10 items-start">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3 group">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/40 group-hover:scale-110 transition-transform">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-black tracking-[0.3em] text-primary uppercase">Módulos</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter italic uppercase text-white">
              Pagamentos <span className="text-primary">Loja</span>
            </h1>
            <p className="text-muted-foreground font-medium text-base">Controle de transações e recebíveis do Mercado Pago</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-card/50 border border-zinc-500/10 p-5 rounded-3xl min-w-[200px]">
              <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest mb-1">Aprovado Hoje</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-black text-zinc-400 italic">R$ {totalApproved.toLocaleString('pt-BR')}</p>
                <div className="w-6 h-6 rounded-full bg-zinc-400/10 flex items-center justify-center text-zinc-400">
                  <DollarSign size={14} />
                </div>
              </div>
            </div>
            <div className="bg-card/50 border border-zinc-500/10 p-5 rounded-3xl min-w-[200px]">
              <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest mb-1">Pendente</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-black text-zinc-400 italic">R$ {totalPending.toLocaleString('pt-BR')}</p>
                <div className="w-6 h-6 rounded-full bg-zinc-400/10 flex items-center justify-center text-zinc-400">
                  <Clock size={14} />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Filters and Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card/30 p-4 rounded-[32px] border border-border/50">
          <div className="flex items-center overflow-x-auto gap-2 p-1 scrollbar-hide">
            {[
              { id: "all", label: "Todos", icon: HistoryIcon },
              { id: "approved", label: "Aprovados", icon: CheckCircle2 },
              { id: "pending", label: "Pendentes", icon: Clock },
              { id: "rejected", label: "Recusados", icon: XCircle },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  filter === t.id
                    ? "bg-primary text-white shadow-xl shadow-primary/20"
                    : "text-muted-foreground hover:bg-white/5"
                }`}
              >
                <t.icon size={14} />
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative group min-w-[300px]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="CLIENTE OU REFERÊNCIA..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 bg-white/5 border border-white/5 rounded-2xl pl-12 pr-6 text-[11px] font-bold text-white placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary/30 focus:bg-primary/5 transition-all uppercase tracking-widest"
            />
          </div>
        </div>

        {/* Transactions List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4 opacity-50">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-xs font-black uppercase tracking-[0.3em] text-primary">Sincronizando com Mercado Pago...</p>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="text-center py-40 bg-card/20 rounded-[40px] border-2 border-dashed border-border/50 space-y-4">
            <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto text-muted-foreground/30">
              <ShoppingBag size={40} />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-black text-white/50 uppercase italic">Nenhuma transação encontrada</p>
              <p className="text-xs text-muted-foreground/50 font-medium">Os pagamentos aparecerão aqui em tempo real.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredSales.map(renderSaleCard)}
          </div>
        )}
      </div>
    </div>
  );
}
