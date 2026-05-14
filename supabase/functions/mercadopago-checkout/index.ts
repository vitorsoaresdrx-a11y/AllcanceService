import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const accessToken = Deno.env.get("MP_ACCESS_TOKEN");

  try {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("store_sales")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const statusMap: Record<string, string> = {
        accredited: "Aprovado",
        pending_contingency: "Processando",
        pending_review_manual: "Em revisão",
        cc_rejected_insufficient_amount: "Saldo insuficiente",
        cc_rejected_bad_filled_security_code: "CVV incorreto",
        cc_rejected_bad_filled_date: "Data de validade incorreta",
        cc_rejected_call_for_authorize: "Ligue para autorizar",
      };

      const mappedData = (data || []).map(sale => ({
        ...sale,
        status_label: statusMap[sale.status_detail] || (sale.status === 'approved' ? 'Aprovado' : 'Pendente')
      }));

      return new Response(JSON.stringify(mappedData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { itens, frete, cliente } = body;

      if (!itens || !frete || !accessToken) {
        throw new Error("Dados obrigatórios ausentes (itens ou frete).");
      }

      // 1. Gerar external_reference único antes de qualquer chamada ao MP
      const externalRef = `order_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

      const totalItems = itens.reduce((acc: number, item: any) => acc + (Number(item.preco_unitario || item.unit_price) * Number(item.quantidade || item.quantity || 1)), 0);
      const transactionAmount = totalItems + Number(frete.valor || 0);

      // Salvar rascunho no Supabase ANTES de chamar o MP
      const { error: insertError } = await supabase
        .from("store_sales")
        .insert({
          external_reference: externalRef,
          status: "pending",
          customer_name: cliente?.nome || "Cliente",
          customer_email: cliente?.email || "contato@allcance.com.br",
          customer_phone: cliente?.telefone || null,
          customer_cpf: cliente?.cpf || null,
          items: itens,
          shipping_amount: Number(frete.valor || 0),
          shipping_label: frete.descricao || "Entrega",
          transaction_amount: transactionAmount,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error("DEBUG INSERT DRAFT ERROR:", insertError);
        throw new Error(`Erro ao salvar rascunho: ${insertError.message}`);
      }

      const payer: any = {
        email: cliente?.email || "contato@allcance.com.br",
      };

      if (cliente?.nome) payer.name = cliente.nome;

      const phoneDigits = cliente?.telefone?.replace(/\D/g, "");
      if (phoneDigits && phoneDigits.length >= 10) {
        payer.phone = {
          area_code: phoneDigits.slice(0, 2),
          number: phoneDigits.slice(2, 11)
        };
      }

      const cpfDigits = cliente?.cpf?.replace(/\D/g, "");
      if (cpfDigits && cpfDigits.length >= 11) {
        payer.identification = {
          type: "CPF",
          number: cpfDigits
        };
      }

      const payload = {
        items: [
          ...itens.map((i: any) => ({
            title: i.nome || i.title || "Produto",
            unit_price: Number(Number(i.preco_unitario || i.unit_price).toFixed(2)),
            quantity: Number(i.quantidade || i.quantity || 1),
            currency_id: "BRL",
          })),
          {
            title: `Frete: ${frete.descricao || "Entrega"}`,
            unit_price: Number(Number(frete.valor || 0).toFixed(2)),
            quantity: 1,
            currency_id: "BRL",
          }
        ],
        payer,
        back_urls: {
          success: "https://allcance.vercel.app/loja?status=success",
          failure: "https://allcance.vercel.app/loja?status=failure",
          pending: "https://allcance.vercel.app/loja?status=pending",
        },
        auto_return: "approved",
        notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`,
        external_reference: externalRef,
        metadata: {
          shipping_description: frete.descricao
        }
      };

      console.log(`[EXTERNAL_REF: ${externalRef}] Iniciando chamada MP...`);

      const mpResponse = await fetch("https://api.mercadopago.com/v1/checkout/preferences", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const mpData = await mpResponse.json();

      if (!mpResponse.ok) {
        console.error("MP API Error:", JSON.stringify(mpData));
        const cause = mpData.cause?.map((c: any) => c.description).join(", ");
        throw new Error(cause || mpData.message || "Falha ao gerar pagamento.");
      }

      console.log(`[EXTERNAL_REF: ${externalRef}] Preferência criada: ${mpData.id}`);

      return new Response(JSON.stringify({
        init_point: mpData.init_point,
        preference_id: mpData.id,
        external_reference: externalRef
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });

  } catch (err) {
    console.error("Fatal Error:", err.message);
    return new Response(JSON.stringify({ 
      error: "Falha na geração do pagamento", 
      details: err.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

