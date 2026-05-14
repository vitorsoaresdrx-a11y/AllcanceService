import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LowStockAlerts } from "@/components/LowStockAlerts";
import {
  ShoppingCart,
  Wrench,
  FileText,
  Plus,
  Clock,
  UserPlus,
  Package,
  TrendingUp,
  Monitor,
  Activity,
  ChevronRight,
} from "lucide-react";

const primaryActions = [
  {
    label: "Registrar Venda",
    description: "Lançamento imediato de produtos e bikes no PDV.",
    icon: ShoppingCart,
    to: "/pdv",
    color: "primary" as const,
  },
  {
    label: "Novo Orçamento",
    description: "Crie uma proposta detalhada para o cliente revisar.",
    icon: FileText,
    to: "/orcamentos",
    color: "indigo" as const,
  },
  {
    label: "Manutenção",
    description: "Abertura de ordem de serviço e check-up técnico.",
    icon: Wrench,
    to: "/mecanica",
    color: "amber" as const,
  },
];

const secondaryActions = [
  { icon: <UserPlus size={18} />, label: "Cadastrar Cliente", to: "/clientes" },
  { icon: <Package size={18} />, label: "Checar Estoque", to: "/estoque" },
  { icon: <TrendingUp size={18} />, label: "Ver Vendas Hoje", to: "/historico" },
  { icon: <Monitor size={18} />, label: "Site Público", to: "/site" },
];

type ColorTheme = "primary" | "amber" | "indigo";

const themes: Record<ColorTheme, string> = {
  primary: "border-primary/20 hover:border-primary/50",
  amber:   "border-zinc-500/20 hover:border-zinc-500/50",
  indigo:  "border-zinc-500/20 hover:border-zinc-500/50",
};

const iconColors: Record<ColorTheme, string> = {
  primary: "text-primary bg-primary/10",
  amber:   "text-zinc-500 bg-zinc-500/10",
  indigo:  "text-zinc-400 bg-zinc-400/10",
};

const hoverBg: Record<ColorTheme, string> = {
  primary: "hover:bg-primary/5",
  amber:   "hover:bg-zinc-500/5",
  indigo:  "hover:bg-zinc-500/5",
};

const actionTextColor: Record<ColorTheme, string> = {
  primary: "text-primary",
  amber:   "text-zinc-500",
  indigo:  "text-zinc-400",
};

const QuickActionCard = ({
  label,
  description,
  icon: Icon,
  onClick,
  color = "primary",
}: {
  label: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
  color?: ColorTheme;
}) => (
  <button
    onClick={onClick}
    className={`group relative flex flex-col items-start gap-4 md:gap-6 p-5 md:p-8 rounded-2xl md:rounded-[40px] bg-card border transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)] hover:-translate-y-2 text-left overflow-hidden ${themes[color]} ${hoverBg[color]}`}
  >
    <div className="absolute -right-6 -bottom-6 opacity-[0.03] text-muted-foreground/70 transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-12 hidden md:block">
      <Icon size={180} />
    </div>

    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 ${iconColors[color]}`}>
      <Icon size={24} className="stroke-[2.5] md:hidden" />
      <Icon size={28} className="stroke-[2.5] hidden md:block" />
    </div>

    <div className="space-y-1 md:space-y-2 relative z-10">
      <h3 className="text-lg md:text-2xl font-black text-foreground tracking-tighter uppercase italic">{label}</h3>
      <p className="text-xs md:text-sm text-muted-foreground font-medium leading-relaxed max-w-[200px]">{description}</p>
    </div>

    <div className={`mt-2 md:mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 ${actionTextColor[color]}`}>
      Iniciar Agora <ChevronRight size={12} />
    </div>
  </button>
);

const SecondaryAction = ({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl md:rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
  >
    <div className="w-10 h-10 rounded-lg md:rounded-xl bg-background flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors shrink-0">
      {icon}
    </div>
    <span className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors">
      {label}
    </span>
  </button>
);

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-full bg-background text-foreground selection:bg-primary/30 pb-24 lg:pb-0">

      {/* Topbar */}
      <div className="px-4 lg:px-8 py-4 lg:py-6 border-b border-border/50 flex items-center justify-between bg-background/50 backdrop-blur-xl">
        <div className="flex items-center gap-3 md:gap-4">
          <img
            src="/allcance-logo.png"
            alt="Allcance"
            className="h-8 md:h-10 w-auto object-contain shrink-0"
          />
          <div>
            <p className="text-[9px] md:text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest leading-none mb-1">
              Terminal de Balcão
            </p>
            <h2 className="text-xs md:text-sm font-bold text-foreground uppercase italic">Allcance Hub</h2>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest leading-none mb-1">
              Status do Sistema
            </p>
            <div className="flex items-center gap-2 justify-end">
              <div className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse" />
              <span className="text-xs font-bold text-zinc-500 uppercase italic">Online</span>
            </div>
          </div>
          <div className="h-10 w-px bg-muted hidden sm:block" />
          <div className="flex items-center gap-2 md:gap-4">
            <Clock size={18} className="text-muted-foreground" />
            <span className="text-lg md:text-2xl font-black text-foreground tracking-tighter tabular-nums">
              {time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto w-full p-4 lg:p-8 space-y-6 lg:space-y-8">

        {/* Welcome */}
        <div className="space-y-2">
          <h1 className="text-2xl lg:text-4xl font-black text-foreground tracking-tighter leading-none italic uppercase">
            O que vamos <span className="text-primary">resolver</span> hoje?
          </h1>
          <p className="text-muted-foreground text-sm md:text-lg font-medium">
            Selecione uma ação rápida para iniciar o atendimento.
          </p>
        </div>

        {/* Primary Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
          {primaryActions.map((action) => (
            <QuickActionCard
              key={action.label}
              label={action.label}
              description={action.description}
              icon={action.icon}
              onClick={() => navigate(action.to)}
              color={action.color}
            />
          ))}
        </div>

        {/* Low Stock Alerts */}
        <LowStockAlerts />

        {/* Secondary Actions */}
        <div className="pt-6 lg:pt-8 border-t border-border/50">
          <div className="flex items-center gap-2 mb-6 md:mb-8">
            <Plus size={16} className="text-primary" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
              Outros Procedimentos
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {secondaryActions.map((action) => (
              <SecondaryAction
                key={action.label}
                icon={action.icon}
                label={action.label}
                onClick={() => navigate(action.to)}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
