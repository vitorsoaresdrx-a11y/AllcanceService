import { Suspense, useEffect } from "react";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { Outlet, useLocation } from "react-router-dom";
import { CallsOverlay } from "@/components/CallsOverlay";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { GlobalSearch } from "@/components/GlobalSearch";
import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const routeLabels: Record<string, string> = {
  "/": "Ações Rápidas",
  "/produtos": "Produtos",
  "/bikes": "Bikes",
  "/bikes/nova": "Nova Bike",
  "/estoque": "Estoque",
  "/pdv": "PDV",
  "/historico": "Histórico",
  "/dre": "DRE",
  "/gastos": "Gastos",
  "/mecanica": "Mecânica",
  "/clientes": "Clientes",
  "/configuracoes": "Configurações",
  "/chamadas": "Chamadas",
  "/developer": "Developer",
  "/simulador-frete": "Simulador Oficial (API)",
  "/simulador-frete-tabela": "Simulador Tabela",
};

export function AppLayout() {
  const location = useLocation();
  useRealtimeSync();
  const pathSegments = location.pathname.split("/").filter(Boolean);

  useEffect(() => {
    document.body.style.overflow = "unset";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const crumbs: { label: string; path: string }[] = [];
  let currentPath = "";
  for (const seg of pathSegments) {
    currentPath += `/${seg}`;
    const label = routeLabels[currentPath] || seg;
    crumbs.push({ label, path: currentPath });
  }

  const isMecanica = location.pathname === "/mecanica";

  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen bg-background text-foreground">
        {!isMecanica && <AppSidebar />}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Top bar with safe area */}
          {!isMecanica && (
            <header className="flex flex-col border-b border-border shrink-0 sticky top-0 z-20 bg-background" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
              <div className="h-12 flex items-center gap-3 px-4">
                <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
                <div className="h-4 w-px bg-border hidden lg:block" />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-muted-foreground text-xs">
                        Allcance
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                    {crumbs.map((crumb, i) => (
                      <span key={crumb.path} className="contents">
                        <BreadcrumbSeparator className="text-muted-foreground/50" />
                        <BreadcrumbItem>
                          <BreadcrumbPage
                            className={
                              i === crumbs.length - 1
                                ? "text-foreground text-xs font-medium"
                                : "text-muted-foreground text-xs"
                            }
                          >
                            {crumb.label}
                          </BreadcrumbPage>
                        </BreadcrumbItem>
                      </span>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>
          )}

          {/* Main content */}
          <main
            className={cn(
              "flex-1 min-w-0 min-h-screen overflow-y-auto overflow-x-hidden bg-background",
              !isMecanica ? "px-4 pt-4 pb-32 lg:px-6 lg:pt-6 lg:pb-8" : "p-0"
            )}
          >
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </main>
        </div>

        {/* Bottom nav for mobile */}
        {!isMecanica && <BottomNav />}
        <GlobalSearch />
        <CallsOverlay />
      </div>
    </SidebarProvider>
  );
}
