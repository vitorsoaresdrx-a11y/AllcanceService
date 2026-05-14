import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, Wrench, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useMyPermissions, usePermissions, NAV_MODULE_MAP, type AppModule } from "@/hooks/usePermissions";

const tabs = [
  { label: "Início", path: "/", icon: LayoutDashboard },
  { label: "PDV", path: "/pdv", icon: ShoppingCart },
  { label: "WhatsApp", path: "/whatsapp", icon: MessageCircle },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const { data: permsData } = useMyPermissions();
  const { isMecanica, isOficina } = usePermissions();
  const isAnyMechanic = isMecanica || isOficina;

  const isOwner = permsData?.isOwner ?? true;
  const permissions = permsData?.permissions ?? [];

  const canAccessTab = (path: string): boolean => {
    if (isOwner) return true;
    
    // Se for mecânico, só deve ver a Mecânica
    if (isAnyMechanic) {
      return path === "/mecanica";
    }

    const moduleKey = NAV_MODULE_MAP[path] as AppModule | undefined;
    if (!moduleKey) return true;
    const perm = permissions.find((p) => p.module === moduleKey);
    return perm?.can_access ?? false;
  };

  const visibleTabs = tabs.filter((tab) => canAccessTab(tab.path));

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  useEffect(() => {
    const el = contentRef.current;
    const root = document.documentElement;
    const apply = () => {
      const h = el?.offsetHeight ?? 0;
      root.style.setProperty("--bottom-nav-height", `${h}px`);
    };
    apply();
    if (!el) return;
    const ro = new ResizeObserver(() => apply());
    ro.observe(el);
    window.addEventListener("resize", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
      root.style.setProperty("--bottom-nav-height", "0px");
    };
  }, []);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card border-t border-border/50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div ref={contentRef} className="flex items-center justify-around px-2 h-16">
        {visibleTabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center gap-1 flex-1 h-full relative"
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <tab.icon
                  size={20}
                  strokeWidth={active ? 2.5 : 1.5}
                  className={active ? "text-primary" : "text-muted-foreground"}
                />
              </motion.div>
              <span
                className={`text-[9px] font-bold uppercase tracking-widest ${
                  active ? "text-primary" : "text-muted-foreground/70"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
