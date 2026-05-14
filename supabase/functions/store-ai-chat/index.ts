import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Build the full product catalog context */
async function buildBusinessContext(supabase: any): Promise<string> {
  const [partsRes, bikesRes] = await Promise.all([
    supabase
      .from("parts")
      .select("id, name, sku, category, sale_price, pix_price, material, color, rim_size, gears, description")
      .eq("visible_on_storefront", true)
      .order("name"),
    supabase
      .from("bike_models")
      .select("id, name, sku, category, sale_price, pix_price, brand, color, rim_size, frame_size, weight_kg, description")
      .eq("visible_on_storefront", true)
      .order("name"),
  ]);

  const parts = partsRes.data || [];
  const bikes = bikesRes.data || [];

  let ctx = "=== CATÁLOGO DE PRODUTOS (LOJA) ===\n";
  for (const p of parts) {
    const price = p.pix_price && p.pix_price > 0 ? `R$${p.pix_price}` : p.sale_price ? `R$${p.sale_price}` : "Sob consulta";
    ctx += `- ${p.name} (SKU: ${p.sku}) | ${p.category} | Preço: ${price} | Specs: ${[p.material, p.color, p.rim_size].filter(Boolean).join(", ")}\n`;
    if (p.description) ctx += `  Desc: ${p.description.slice(0, 50)}...\n`;
  }

  ctx += "\n=== CATÁLOGO DE BIKES ===\n";
  for (const b of bikes) {
    const price = b.pix_price && b.pix_price > 0 ? `R$${b.pix_price}` : b.sale_price ? `R$${b.sale_price}` : "Sob consulta";
    ctx += `- ${b.name} (SKU: ${b.sku}) | ${b.brand} | ${b.category} | Preço: ${price} | Specs: ${[b.color, b.rim_size, b.frame_size].filter(Boolean).join(", ")}\n`;
    if (b.description) ctx += `  Desc: ${b.description.slice(0, 100)}...\n`;
  }

  return ctx;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, history = [], isSearch = false } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const businessContext = await buildBusinessContext(supabase);

    let systemPrompt = `Você é um atendente da Allcance. Responda de forma direta e natural, como um humano faria.

REGRAS:
- Responda apenas o que foi perguntado.
- Não sugira produtos sem o cliente demonstrar interesse explícito.
- Sem apresentações longas ou listas de opções não solicitadas.
- Tom casual, sem exageros de entusiasmo.
- Seja breve.
- O resultado esperado para a abertura (ou se a pessoa só der um oi) é apenas: "Olá! Como posso ajudar?"`;

    if (isSearch) {
      systemPrompt = `Você é um buscador inteligente da Allcance. 
Analise o catálogo abaixo e retorne APENAS um array JSON contendo os SKUs dos produtos que melhor correspondem à busca do usuário.
Retorne o JSON no formato: {"skus": ["SKU1", "SKU2"]}.
Sempre retorne APENAS o JSON, sem texto antes ou depois.`;
    }

    const groqMessages = [
      { role: "system", content: `${systemPrompt}\n\nCONTEXTO DO CATÁLOGO:\n${businessContext}` },
      ...(isSearch ? [] : history),
      { role: "user", content: isSearch ? `Busca do usuário: ${message}` : message }
    ];

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: isSearch ? "llama-3.1-8b-instant" : "llama-3.3-70b-versatile",
          messages: groqMessages,
          max_tokens: isSearch ? 200 : 1024,
          temperature: isSearch ? 0.1 : 0.7,
          response_format: isSearch ? { type: "json_object" } : undefined
        }),
      }
    );

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      return new Response(JSON.stringify({ error: errText }), { status: 500, headers: corsHeaders });
    }

    const groqData = await groqResponse.json();
    let responseText = groqData.choices?.[0]?.message?.content;

    if (isSearch) {
      try {
        const parsed = JSON.parse(responseText.replace(/```json|```/g, "").trim());
        const skus = Array.isArray(parsed) ? parsed : (parsed.skus || []);
        return new Response(JSON.stringify({ skus }), {
           headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(JSON.stringify({ skus: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ response: responseText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
