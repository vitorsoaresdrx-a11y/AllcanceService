import { useCanAccess, type AppModule } from "@/hooks/usePermissions";
import { EyeOff } from "lucide-react";

interface SensitiveFieldProps {
  module: AppModule;
  children: React.ReactNode;
  placeholder?: string;
}

/**
 * Wraps sensitive data. If the current user has `hide_sensitive` for this module,
 * the content is replaced with a masked placeholder.
 */
export function SensitiveField({ module, children, placeholder = "••••••" }: SensitiveFieldProps) {
  const { hideSensitive, loading } = useCanAccess(module);

  if (loading) return <>{children}</>;

  if (hideSensitive) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground" title="Informação restrita">
        <EyeOff size={12} />
        <span className="select-none">{placeholder}</span>
      </span>
    );
  }

  return <>{children}</>;
}
