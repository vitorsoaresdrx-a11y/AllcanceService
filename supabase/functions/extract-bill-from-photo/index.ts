const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ParsedBill = {
  type: "boleto" | "concessionaria" | "cartao" | "desconhecido";
  amount: number | null;
  due_date: string | null;
  bank_name: string | null;
  beneficiary: string | null;
  barcode: string;
};

function parseModelJson(text: string): ParsedBill {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const start = cleaned.search(/[\[{]/);
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) {
      throw new Error("Resposta inválida do modelo");
    }
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  }

  const typeValue = String(parsed?.type ?? "desconhecido").toLowerCase();
  const normalizedType: ParsedBill["type"] =
    typeValue === "boleto" || typeValue === "concessionaria" || typeValue === "cartao"
      ? typeValue
      : "desconhecido";

  const rawAmount = parsed?.amount;
  const amount = typeof rawAmount === "number"
    ? rawAmount
    : typeof rawAmount === "string"
      ? Number(rawAmount.replace(/[^\d,.-]/g, "").replace(",", "."))
      : null;

  return {
    type: normalizedType,
    amount: Number.isFinite(amount as number) ? Number(amount) : null,
    due_date: parsed?.due_date ?? null,
    bank_name: parsed?.bank_name ?? null,
    beneficiary: parsed?.beneficiary ?? null,
    barcode: parsed?.barcode ? String(parsed.barcode) : "",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY não configurada no backend" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageDataUrl } = await req.json();
    if (!imageDataUrl || typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) {
      return new Response(JSON.stringify({ error: "Imagem inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        temperature: 0,
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: imageDataUrl,
                },
              },
              {
                type: "text",
                text: "Analise este boleto/conta e extraia os dados. Responda APENAS JSON puro com os campos: type (boleto|concessionaria|cartao), amount (number|null), due_date (YYYY-MM-DD|null), bank_name (string|null), beneficiary (string|null), barcode (string). Sem markdown e sem texto extra.",
              },
            ],
          },
        ],
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error("Groq extraction error:", groqResponse.status, errText);
      const status = [400, 401, 403, 404, 410, 429].includes(groqResponse.status) ? groqResponse.status : 500;
      return new Response(JSON.stringify({ error: `Erro Groq (${groqResponse.status})`, details: errText }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groqData = await groqResponse.json();
    const messageContent = groqData?.choices?.[0]?.message?.content?.trim();

    if (!messageContent) {
      return new Response(JSON.stringify({ error: "IA não retornou conteúdo" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = parseModelJson(messageContent);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("extract-bill-from-photo error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
