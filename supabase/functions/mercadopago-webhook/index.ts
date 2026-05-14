/**
 * MERCADO PAGO WEBHOOK HANDLER
 * This function processes notifications from Mercado Pago:
 * 1. Validates the incoming notification
 * 2. Fetches full payment details from MP API
 * 3. Updates the 'store_sales' table with final status and approval details
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import MercadoPagoConfig, { Payment } from "https://esm.sh/mercadopago@2.0.11";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const okResponse = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  const webhookSecret = Deno.env.get("MP_WEBHOOK_SECRET");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const mpConfig = new MercadoPagoConfig({ 
    accessToken: Deno.env.get("MP_ACCESS_TOKEN")!,
  });
  const paymentClient = new Payment(mpConfig);

  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    console.log("MP Webhook Payload:", JSON.stringify(body));

    // 🛡️ VALIDAÇÃO DE ASSINATURA (Opcional, mas altamente recomendada)
    const signature = req.headers.get("x-signature");
    if (webhookSecret && signature) {
      try {
        const xSignatureElements = signature.split(",");
        let ts = "";
        let v1 = "";
        
        xSignatureElements.forEach(el => {
          const [key, val] = el.split("=");
          if (key === "ts") ts = val;
          if (key === "v1") v1 = val;
        });

        const resourceId = body.data?.id || body.resource?.split('/').pop();
        const manifest = `id:${resourceId};ts:${ts};`;
        
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          "raw", encoder.encode(webhookSecret),
          { name: "HMAC", hash: "SHA-256" },
          false, ["verify"]
        );

        const isValid = await crypto.subtle.verify(
          "HMAC", key,
          hexToUint8Array(v1),
          encoder.encode(manifest)
        );

        if (!isValid) {
          console.error("❌ ASSINATURA INVÁLIDA detectada no Webhook!");
          return okResponse; // Retorna 200 para evitar retries, mas silencia o log
        }
        console.log("✅ Assinatura verificada com sucesso.");
      } catch (sigErr) {
        console.warn("Aviso: Falha ao validar assinatura (verifique a MP_WEBHOOK_SECRET):", sigErr.message);
      }
    }

    // Processar apenas notificações de pagamento
    const resourceId = body.data?.id || body.resource?.split('/').pop();
    const isPayment = body.type === "payment" || (body.action && body.action.startsWith("payment."));

    if (isPayment && resourceId) {
      console.log(`[PAYMENT_ID: ${resourceId}] Buscando detalhes no MP...`);
      
      const mpResponse = await paymentClient.get({ id: resourceId });
      const mpPayment = mpResponse;

      if (!mpPayment.external_reference) {
        console.warn(`[PAYMENT_ID: ${resourceId}] Notificação sem external_reference. Ignorando.`);
        return okResponse;
      }

      console.log(`[EXTERNAL_REF: ${mpPayment.external_reference}] Status: ${mpPayment.status} (${mpPayment.status_detail})`);

      const payer = mpPayment.payer || {};
      const customer_name = `${payer.first_name || ""} ${payer.last_name || ""}`.trim();
      const customer_email = payer.email;
      const customer_cpf = payer.identification?.number;

      const { error: updateError } = await supabase
        .from("store_sales")
        .update({
          status: mpPayment.status,
          status_detail: mpPayment.status_detail,
          payment_id: mpPayment.id,
          payment_method: mpPayment.payment_method_id,
          installments: mpPayment.installments,
          transaction_amount: mpPayment.transaction_amount,
          customer_name: customer_name || undefined,
          customer_email: customer_email || undefined,
          customer_cpf: customer_cpf || undefined,
          approved_at: mpPayment.status === 'approved' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq("external_reference", mpPayment.external_reference);

      if (updateError) {
        console.error(`[EXTERNAL_REF: ${mpPayment.external_reference}] Erro ao atualizar banco:`, updateError);
      } else {
        console.log(`[EXTERNAL_REF: ${mpPayment.external_reference}] Venda atualizada com sucesso no Supabase.`);
      }
    }

    return okResponse;

  } catch (err) {
    console.error("ERRO FATAL WEBHOOK:", err.message);
    return okResponse;
  }
});

// Utility to convert hex string to Uint8Array for crypto.verify
function hexToUint8Array(hex: string) {
  if (hex.length % 2 !== 0) return new Uint8Array();
  const array = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    array[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return array;
}


