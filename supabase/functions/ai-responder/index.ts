import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** 
 * AI Responder - ATENDIMENTO DESATIVADO
 * Esta função agora atua apenas como um receptor silencioso.
 * As notificações de status do Kanban são enviadas diretamente pelo painel do mecânico/vendedor.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, message } = await req.json();

    // LOG PARA MONITORAMENTO INTERNO
    console.log(`[AI-Chat-Disabled] Mensagem recebida de ${phone}: ${message}. IA não responderá.`);

    return new Response(
      JSON.stringify({ ok: true, status: "ai_chat_is_disabled", info: "Atendimento via IA desativado. Notificações de status seguem via Kanban." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Erro no receptor silencioso:", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
