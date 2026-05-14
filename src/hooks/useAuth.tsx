import { useEffect, useState, createContext, useContext, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

interface AuthCtx {
  session: Session | null;
  loading: boolean;
}

const Ctx = createContext<AuthCtx>({ session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: realSession } }) => {
      if (!realSession) {
        // Mock session for direct access
        setSession({
          user: { id: "00000000-0000-0000-0000-000000000000", email: "admin@allcance.com" },
          access_token: "mock",
          refresh_token: "mock",
          expires_in: 3600,
          token_type: "bearer",
        } as any);
      } else {
        setSession(realSession);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return <Ctx.Provider value={{ session, loading }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
