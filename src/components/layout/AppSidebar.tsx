import { useEffect } from "react";
import {
  LayoutDashboard,
  Wrench,
  Bike,
  Package,
  ShoppingCart,
  ClipboardList,
  CreditCard,
  Users,
  Settings,
  BarChart3,
  Wallet,
  LogOut,
  Landmark,
  Receipt,
  MessageCircle,
  Shield,
  HardHat,
  History,
  FileText,
  Bell,
  ScanFace,
  Clock,
  FileBarChart,
  TrendingUp,
  Target,
  ShoppingBag,
  Terminal,
  Truck,
  Calendar,
} from "lucide-react";
import { useInternalCalls } from "@/hooks/useInternalCalls";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCashRegister } from "@/hooks/useCashRegister";
import { useTotalUnread } from "@/hooks/useWhatsApp";
import { useMyPermissions, usePermissions, type AppModule, NAV_MODULE_MAP } from "@/hooks/usePermissions";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navGroups = [
  {
    label: "Geral",
    items: [
      { title: "Ações Rápidas", url: "/", icon: LayoutDashboard },
      { title: "Dashboard", url: "/dre", icon: BarChart3 },
      { title: "Metas", url: "/metas", icon: Target },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { title: "Produtos", url: "/produtos", icon: Wrench },
      { title: "Estoque", url: "/estoque", icon: Package },
      { title: "Preços", url: "/precos", icon: TrendingUp },
    ],
  },
  {
    label: "Vendas",
    items: [
      { title: "PDV", url: "/pdv", icon: ShoppingCart },
      { title: "Promoções", url: "/promocoes", icon: Receipt },
      { title: "Caixa", url: "/caixa", icon: Landmark },
      { title: "Histórico", url: "/historico", icon: ClipboardList },
    ],
  },
  {
    label: "Clientes",
    items: [
      { title: "Clientes", url: "/clientes", icon: Users },
      { title: "WhatsApp", url: "/whatsapp", icon: MessageCircle },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { title: "Gastos", url: "/gastos", icon: Wallet },
      { title: "Contas", url: "/contas", icon: Receipt },
    ],
  },
  {
    label: "Ponto",
    items: [
      { title: "Bater Ponto", url: "/ponto/registro", icon: Clock },
      { title: "Relatório", url: "/ponto/relatorio", icon: FileBarChart },
      { title: "Cadastro Facial", url: "/ponto/cadastro", icon: ScanFace },
    ],
  },
  {
    label: "Sistema",
    items: [
      { title: "Chamadas", url: "/chamadas", icon: Bell },
      { title: "Agenda Interna", url: "/agenda", icon: Calendar },
      { title: "Permissões", url: "/permissoes", icon: Shield },
      { title: "Configurações", url: "/configuracoes", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const location = useLocation();
  const { data: currentRegister } = useCurrentCashRegister();
  const isCashOpen = currentRegister?.status === "open";
  const { data: totalUnread = 0 } = useTotalUnread();
  const { data: permsData } = useMyPermissions();
  const { isMecanica, isOficina } = usePermissions();
  const { data: pendingCalls = [] } = useInternalCalls();

  const isAnyMechanic = isMecanica || isOficina;

  const isOwner = permsData?.isOwner ?? true;
  const permissions = permsData?.permissions ?? [];

  // Close mobile sidebar on route change
  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [location.pathname]);

  const canAccessModule = (url: string): boolean => {
    if (isOwner) return true;
    
    // Filtro restritivo para mecânicos
    if (isAnyMechanic) {
      // Lista branca do que o mecânico PODE ver
      const mechanicAllowed = [
        "/mecanica",
        "/mecanicos",
        "/mecanicos/historico",
        "/ponto/registro",
      ];
      
      // Se não estiver na lista permitida, bloqueia
      if (!mechanicAllowed.some(allowed => url === allowed || url.startsWith(allowed + "/"))) {
        return false;
      }
    }

    const moduleKey = NAV_MODULE_MAP[url] as AppModule | undefined;
    if (!moduleKey) return true;
    if (url === "/permissoes") return false;
    const perm = permissions.find((p) => p.module === moduleKey);
    return perm?.can_access ?? false;
  };

  const isActive = (url: string) => {
    if (url === "/") return location.pathname === "/";
    return location.pathname.startsWith(url);
  };

  const handleNavClick = (path: string) => {
    if (isMobile) setOpenMobile(false);
    navigate(path);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <img
            src="/allcance-logo.png"
            alt="Allcance"
            className="h-7 w-auto shrink-0 object-contain"
          />
          {!collapsed && (
            <span className="font-semibold text-sm tracking-tight text-sidebar-foreground">
              Allcance
            </span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="py-2">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => canAccessModule(item.url));
          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={group.label} className="py-1.5 px-2">
              {!collapsed && (
                <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-muted-foreground/60 px-2 mb-0.5">
                  {group.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => {
                    const active = isActive(item.url);
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={item.title}
                          className={
                            active
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              : "text-sidebar-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                          }
                        >
                          <button
                            onClick={() => handleNavClick(item.url)}
                            className="flex items-center gap-2.5 w-full"
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            {!collapsed && (
                              <span className="flex items-center gap-2 truncate">
                                {item.title}
                                {item.title === "Caixa" && isCashOpen && (
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-500" />
                                  </span>
                                )}
                                {item.title === "WhatsApp" && totalUnread > 0 && (
                                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                                    {totalUnread}
                                  </span>
                                )}
                                {item.title === "Chamadas" && pendingCalls.length > 0 && (
                                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                                    {pendingCalls.length}
                                  </span>
                                )}
                              </span>
                            )}
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}

        {/* Logout */}
        <SidebarGroup className="mt-auto py-2 px-2 border-t border-sidebar-border">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Sair"
                  className="text-sidebar-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => supabase.auth.signOut()}
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>Sair</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
