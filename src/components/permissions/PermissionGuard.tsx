import { useCanAccess, type AppModule } from "@/hooks/usePermissions";
import { ShieldX } from "lucide-react";

interface PermissionGuardProps {
  module: AppModule;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

function DefaultFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-muted-foreground">
      <ShieldX size={48} strokeWidth={1.5} />
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold text-foreground/80">Acesso Restrito</h2>
        <p className="text-sm">Você não tem permissão para acessar esta área.</p>
        <p className="text-xs text-muted-foreground/70">Entre em contato com o administrador.</p>
      </div>
    </div>
  );
}

export function PermissionGuard({ module, children, fallback }: PermissionGuardProps) {
  const { canAccess, loading } = useCanAccess(module);

  if (loading) return null;

  if (!canAccess) return <>{fallback || <DefaultFallback />}</>;

  return <>{children}</>;
}
