import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useCurrentUserName(): string {
  const { session } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session!.user.id)
        .single();
      return data;
    },
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Salão users have their name in localStorage
  const salaoName = typeof window !== "undefined" ? localStorage.getItem("salao_user_name") : null;
  if (salaoName) return salaoName;

  return profile?.full_name || session?.user?.email || "Desconhecido";
}
