import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Jogar() {
  const { session } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handler = async (e: MessageEvent) => {
      if (e.data?.type === "PATINHO_LUCKY_NUMBER") {
        const { number, score } = e.data;

        if (!session?.user?.id) {
          toast.error("Faça login para salvar seus números da sorte!");
          return;
        }

        const { error } = await supabase.from("lucky_numbers" as any).insert({
          user_id: session.user.id,
          number,
          score: Math.floor(score),
        });

        if (error) {
          console.error("Erro ao salvar número da sorte:", error);
        }
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [session]);

  return (
    <iframe
      ref={iframeRef}
      src="/patinho-allcance.html"
      className="fixed inset-0 w-full h-full border-0 block z-50"
      style={{ height: "100dvh" }}
      allow="fullscreen"
    />
  );
}
