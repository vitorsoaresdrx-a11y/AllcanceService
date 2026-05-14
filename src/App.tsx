import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PermissionGuard } from "@/components/permissions/PermissionGuard";
import { PageTransition } from "@/components/PageTransition";
import PageSkeleton from "@/components/PageSkeleton";
import Login from "@/pages/Login";
import { Loader2 } from "lucide-react";
import { useSyncOfflineQueue } from "@/hooks/useSyncOfflineQueue";
import { GlobalAlerts } from "@/components/GlobalAlerts";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { CheckoutModal } from "@/components/shop/CheckoutModal";

function lazyRetry(factory: () => Promise<{ default: React.ComponentType<any> }>) {
  return lazy(() =>
    factory().catch(() => {
      window.location.reload();
      return factory();
    })
  );
}

const Dashboard = lazyRetry(() => import("@/pages/Dashboard"));
const Pecas = lazyRetry(() => import("@/pages/Pecas"));
const Bikes = lazyRetry(() => import("@/pages/Bikes"));
const BikeForm = lazyRetry(() => import("@/pages/BikeForm"));
const PDV = lazyRetry(() => import("@/pages/PDV"));
const Historico = lazyRetry(() => import("@/pages/Historico"));
const Clientes = lazyRetry(() => import("@/pages/Clientes"));
const Configuracoes = lazyRetry(() => import("@/pages/Configuracoes"));
const Estoque = lazyRetry(() => import("@/pages/Estoque"));
const DRE = lazyRetry(() => import("@/pages/DRE"));
const Gastos = lazyRetry(() => import("@/pages/Gastos"));
const Mecanica = lazyRetry(() => import("@/pages/Mecanica"));
const Mecanicos = lazyRetry(() => import("@/pages/Mecanicos"));
const MecanicosHistorico = lazyRetry(() => import("@/pages/MecanicosHistorico"));
const CashRegister = lazyRetry(() => import("@/pages/CashRegister"));
const WhatsAppPage = lazyRetry(() => import("@/pages/WhatsApp"));
const Permissoes = lazyRetry(() => import("@/pages/Permissoes"));
const Placeholder = lazyRetry(() => import("@/pages/Placeholder"));
const NotFound = lazyRetry(() => import("@/pages/NotFound"));
const Orcamentos = lazyRetry(() => import("@/pages/Orcamentos"));
const ProdutoPublico = lazyRetry(() => import("@/pages/ProdutoPublico"));
const Store = lazyRetry(() => import("@/pages/Store"));
const MinhaConta = lazyRetry(() => import("@/pages/MinhaConta"));
const ClienteDetalhe = lazyRetry(() => import("@/pages/ClienteDetalhe"));
const Jogar = lazyRetry(() => import("@/pages/Jogar"));
const Chamadas = lazyRetry(() => import("@/pages/Chamadas"));
const Contas = lazyRetry(() => import("@/pages/Contas"));
const Precos = lazyRetry(() => import("@/pages/Precos"));
const Promocoes = lazyRetry(() => import("@/pages/Promocoes"));
const PontoCadastro = lazyRetry(() => import("@/pages/PontoCadastro"));
const PontoRegistro = lazyRetry(() => import("@/pages/PontoRegistro"));
const PontoRelatorio = lazyRetry(() => import("@/pages/PontoRelatorio"));
const Metas = lazyRetry(() => import("@/pages/Metas"));
const DeveloperTasks = lazyRetry(() => import("@/pages/DeveloperTasks"));
const Pagamentos = lazyRetry(() => import("@/pages/Pagamentos"));
const SimuladorFreteInterno = lazyRetry(() => import("@/pages/SimuladorFreteInterno"));
const Agenda = lazyRetry(() => import("@/pages/Agenda"));
const SimuladorFreteTabela = lazyRetry(() => import("@/pages/SimuladorFreteTabela"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

function GuardedRoute({ module, children }: { module: string; children: React.ReactNode }) {
  return (
    <PermissionGuard module={module as any}>
      {children}
    </PermissionGuard>
  );
}

function OfflineSync() {
  useSyncOfflineQueue();
  return null;
}

function AuthGate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return <Login />;

  return (
    <>
      <OfflineSync />
      <GlobalAlerts />
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<GuardedRoute module="dashboard"><PageTransition><Dashboard /></PageTransition></GuardedRoute>} />
          <Route path="/produtos" element={<GuardedRoute module="produtos"><PageTransition><Pecas /></PageTransition></GuardedRoute>} />
          <Route path="/bikes" element={<GuardedRoute module="bikes"><PageTransition><Bikes /></PageTransition></GuardedRoute>} />
          <Route path="/bikes/nova" element={<GuardedRoute module="bikes"><PageTransition><BikeForm /></PageTransition></GuardedRoute>} />
          <Route path="/bikes/:id" element={<GuardedRoute module="bikes"><PageTransition><BikeForm /></PageTransition></GuardedRoute>} />
          <Route path="/estoque" element={<GuardedRoute module="estoque"><PageTransition><Estoque /></PageTransition></GuardedRoute>} />
          <Route path="/precos" element={<GuardedRoute module="estoque"><PageTransition><Precos /></PageTransition></GuardedRoute>} />
          <Route path="/pdv" element={<GuardedRoute module="pdv"><PageTransition><PDV /></PageTransition></GuardedRoute>} />
          <Route path="/promocoes" element={<GuardedRoute module="pdv"><PageTransition><Promocoes /></PageTransition></GuardedRoute>} />
          <Route path="/caixa" element={<GuardedRoute module="caixa"><PageTransition><CashRegister /></PageTransition></GuardedRoute>} />
          <Route path="/historico" element={<GuardedRoute module="historico"><PageTransition><Historico /></PageTransition></GuardedRoute>} />
          <Route path="/pagamentos" element={<GuardedRoute module="pagamentos"><PageTransition><Pagamentos /></PageTransition></GuardedRoute>} />
          <Route path="/dre" element={<GuardedRoute module="dre"><PageTransition><DRE /></PageTransition></GuardedRoute>} />
          <Route path="/metas" element={<GuardedRoute module="metas"><PageTransition><Metas /></PageTransition></GuardedRoute>} />
          <Route path="/developer" element={<GuardedRoute module="dashboard"><PageTransition><DeveloperTasks /></PageTransition></GuardedRoute>} />
          <Route path="/gastos" element={<GuardedRoute module="gastos"><PageTransition><Gastos /></PageTransition></GuardedRoute>} />
          <Route path="/contas" element={<GuardedRoute module="contas"><PageTransition><Contas /></PageTransition></GuardedRoute>} />
          <Route path="/mecanica" element={<GuardedRoute module="mecanica"><PageTransition><Mecanica /></PageTransition></GuardedRoute>} />
          <Route path="/mecanicos" element={<GuardedRoute module="mecanicos"><PageTransition><Mecanicos /></PageTransition></GuardedRoute>} />
          <Route path="/mecanicos/historico" element={<GuardedRoute module="mecanicos_historico"><PageTransition><MecanicosHistorico /></PageTransition></GuardedRoute>} />
          <Route path="/orcamentos" element={<GuardedRoute module="orcamentos"><PageTransition><Orcamentos /></PageTransition></GuardedRoute>} />
          <Route path="/clientes" element={<GuardedRoute module="clientes"><PageTransition><Clientes /></PageTransition></GuardedRoute>} />
          <Route path="/clientes/:id" element={<GuardedRoute module="clientes"><PageTransition><ClienteDetalhe /></PageTransition></GuardedRoute>} />
          <Route path="/chamadas" element={<GuardedRoute module="chamadas"><PageTransition><Chamadas /></PageTransition></GuardedRoute>} />
          <Route path="/permissoes" element={<GuardedRoute module="permissoes"><PageTransition><Permissoes /></PageTransition></GuardedRoute>} />
          <Route path="/configuracoes" element={<GuardedRoute module="configuracoes"><PageTransition><Configuracoes /></PageTransition></GuardedRoute>} />
          <Route path="/ponto/registro" element={<GuardedRoute module="ponto"><PageTransition><PontoRegistro /></PageTransition></GuardedRoute>} />
          <Route path="/ponto/relatorio" element={<GuardedRoute module="ponto"><PageTransition><PontoRelatorio /></PageTransition></GuardedRoute>} />
          <Route path="/ponto/cadastro" element={<GuardedRoute module="ponto"><PageTransition><PontoCadastro /></PageTransition></GuardedRoute>} />
          <Route path="/simulador-frete" element={<GuardedRoute module="dashboard"><PageTransition><SimuladorFreteInterno /></PageTransition></GuardedRoute>} />
          <Route path="/simulador-frete-tabela" element={<GuardedRoute module="dashboard"><PageTransition><SimuladorFreteTabela /></PageTransition></GuardedRoute>} />
          <Route path="/agenda" element={<GuardedRoute module="agenda"><PageTransition><Agenda /></PageTransition></GuardedRoute>} />
        </Route>
        <Route path="/whatsapp" element={
          <Suspense fallback={<PageSkeleton />}>
            <WhatsAppPage />
          </Suspense>
        } />
        <Route path="*" element={<Suspense fallback={<PageSkeleton />}><NotFound /></Suspense>} />
      </Routes>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/loja" element={
              <Suspense fallback={<PageSkeleton />}>
                <Store />
              </Suspense>
            } />
            <Route path="/produto/:sku" element={
              <Suspense fallback={<PageSkeleton />}>
                <ProdutoPublico />
              </Suspense>
            } />
            <Route path="/minha-garagem" element={
              <Suspense fallback={<PageSkeleton />}>
                <MinhaConta />
              </Suspense>
            } />
            <Route path="/minha-conta" element={
              <Suspense fallback={<PageSkeleton />}>
                <MinhaConta />
              </Suspense>
            } />
            <Route path="/*" element={<AuthGate />} />
            <Route path="/jogar" element={<Jogar />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
