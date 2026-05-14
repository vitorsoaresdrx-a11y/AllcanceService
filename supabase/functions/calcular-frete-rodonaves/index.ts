import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { gerarCotacao } from "./rodonaves.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const input = await req.json();
    
    // Obter variáveis de ambiente padrão se não enviadas
    const originZip = input.originZip || Deno.env.get("ORIGEM_ZIP") || "18070671";
    const customerTaxId = input.customerTaxId || Deno.env.get("ORIGEM_TAX_ID");

    if (!originZip || !customerTaxId) {
       throw new Error("CEP de origem e CNPJ do remetente (ORIGEM_TAX_ID) são obrigatórios.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const result = await gerarCotacao({
      ...input,
      originZip,
      customerTaxId
    }, supabaseAdmin);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Erro na Edge Function Rodonaves:", err);
    return new Response(
      JSON.stringify({ 
        sucesso: false, 
        error: err.message || "Erro desconhecido na integração Rodonaves." 
      }), 
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
