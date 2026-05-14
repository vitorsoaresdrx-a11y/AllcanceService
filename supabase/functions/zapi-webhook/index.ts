import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EVOLUTION_BASE = "https://evolution.allcance.com.br";

function evoHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: Deno.env.get("EVOLUTION_API_KEY")!,
  };
}

function instanceName(tenantId: string): string {
  return `Allcance-${tenantId.replace(/-/g, "").slice(0, 12)}`;
}

/** Download audio from Evolution API and transcribe via Groq Whisper */
async function transcribeAudio(instName: string, messageId: string, remoteJid: string): Promise<string> {
  const mediaRes = await fetch(
    `${EVOLUTION_BASE}/chat/getBase64FromMediaMessage/${instName}`,
    {
      method: "POST",
      headers: evoHeaders(),
      body: JSON.stringify({
        message: { key: { id: messageId, remoteJid } },
        convertToMp4: false,
      }),
    }
  );

  if (!mediaRes.ok) {
    const errText = await mediaRes.text();
    console.error("Evolution getBase64 error:", mediaRes.status, errText);
    throw new Error(`Failed to download media: ${mediaRes.status}`);
  }

  const mediaData = await mediaRes.json();
  const base64Audio = mediaData.base64 || mediaData.mediaBase64 || mediaData.data;

  if (!base64Audio) {
    console.error("No base64 audio in response:", JSON.stringify(mediaData).slice(0, 200));
    throw new Error("No audio data returned from Evolution");
  }

  const binaryStr = atob(base64Audio.replace(/^data:audio\/[^;]+;base64,/, ""));
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const formData = new FormData();
  formData.append("file", new Blob([bytes], { type: "audio/ogg" }), "audio.ogg");
  formData.append("model", "whisper-large-v3");
  formData.append("language", "pt");

  const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;
  const whisperRes = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: formData,
    }
  );

  if (!whisperRes.ok) {
    const errText = await whisperRes.text();
    console.error("Groq Whisper error:", whisperRes.status, errText);
    throw new Error(`Whisper transcription failed: ${whisperRes.status}`);
  }

  const whisperData = await whisperRes.json();
  const transcript = whisperData.text?.trim();
  console.log("Transcription result:", transcript);

  if (!transcript) {
    throw new Error("Empty transcription");
  }

  return transcript;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    const rawEvent = String(body.event || "").trim();
    const normalizedEvent = rawEvent.toUpperCase().replace(/[.\s-]/g, "_");

    if (normalizedEvent === "CONNECTION_UPDATE") {
      console.log("Connection update:", body.data?.state);
      return new Response(JSON.stringify({ ok: true, event: normalizedEvent.toLowerCase() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (normalizedEvent !== "MESSAGES_UPSERT") {
      return new Response(JSON.stringify({ ok: true, ignored: rawEvent || "unknown_event" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const msgData = body.data;
    if (!msgData) {
      return new Response(JSON.stringify({ ok: true, ignored: "no_data" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = msgData.key || {};
    const isFromMe = key.fromMe === true;
    const remoteJid = key.remoteJid || "";

    if (remoteJid.includes("status@broadcast") || remoteJid.includes("@g.us")) {
      return new Response(JSON.stringify({ ok: true, ignored: "broadcast_or_group" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phone = remoteJid.replace("@s.whatsapp.net", "").replace("@c.us", "").replace(/\D/g, "");
    const messageId = key.id || "";

    const messageObj = msgData.message || {};
    let content = "";
    let type = "text";
    let mediaUrl: string | null = null;

    if (messageObj.conversation) {
      content = messageObj.conversation;
    } else if (messageObj.extendedTextMessage?.text) {
      content = messageObj.extendedTextMessage.text;
    } else if (messageObj.imageMessage) {
      type = "image";
      content = messageObj.imageMessage.caption || "[image]";
      mediaUrl = messageObj.imageMessage.url || null;
    } else if (messageObj.audioMessage) {
      type = "audio";
      content = "[audio]";
      mediaUrl = messageObj.audioMessage.url || null;
    } else if (messageObj.documentMessage) {
      type = "document";
      content = messageObj.documentMessage.fileName || "[document]";
      mediaUrl = messageObj.documentMessage.url || null;
    } else if (messageObj.videoMessage) {
      type = "document";
      content = messageObj.videoMessage.caption || "[video]";
      mediaUrl = messageObj.videoMessage.url || null;
    }

    if (!phone || (!content && !mediaUrl)) {
      return new Response(JSON.stringify({ ok: true, ignored: "empty_payload" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: tenantRow } = await supabase
      .from("tenants")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    const tenantId = tenantRow?.id ?? null;

    let convId: string | null = null;
    const pushName = msgData.pushName || null;
    const contactName = pushName;

    if (isFromMe) {
      const { data: byPhone } = await supabase
        .from("whatsapp_conversations")
        .select("id")
        .eq("contact_phone", phone)
        .maybeSingle();

      if (!byPhone) {
        return new Response(JSON.stringify({ ok: true, ignored: "from_me_no_conv" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      convId = byPhone.id;

      await supabase
        .from("whatsapp_conversations")
        .update({
          last_message: content || `[${type}]`,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", convId);

      await supabase.from("whatsapp_messages").insert({
        conversation_id: convId,
        message_id: messageId,
        from_me: true,
        type,
        content: content || `[${type}]`,
        media_url: mediaUrl,
        status: "sent",
        tenant_id: tenantId,
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Incoming message ---
    const { data: existing } = await supabase
      .from("whatsapp_conversations")
      .select("id, unread_count")
      .eq("contact_phone", phone)
      .maybeSingle();

    if (existing) {
      convId = existing.id;

      const updates: Record<string, unknown> = {
        last_message: content || `[${type}]`,
        last_message_at: new Date().toISOString(),
        unread_count: (existing.unread_count || 0) + 1,
      };
      if (contactName) updates.contact_name = contactName;

      await supabase
        .from("whatsapp_conversations")
        .update(updates)
        .eq("id", convId);
    } else {
      const insertData: Record<string, unknown> = {
        contact_phone: phone,
        contact_name: contactName,
        last_message: content || `[${type}]`,
        last_message_at: new Date().toISOString(),
        unread_count: 1,
        status: "open",
        tenant_id: tenantId,
      };

      const { data: newConv } = await supabase
        .from("whatsapp_conversations")
        .insert(insertData)
        .select("id")
        .single();

      convId = newConv!.id;
    }

    // Save incoming message
    await supabase.from("whatsapp_messages").insert({
      conversation_id: convId,
      message_id: messageId,
      from_me: false,
      type,
      content: content || `[${type}]`,
      media_url: mediaUrl,
      status: "delivered",
      tenant_id: tenantId,
    });

    // --- Robô de Frete (Via API Rodonaves) ---
    const AUTHORIZED_PHONES = ["5515996128054", "5515998175561", "5515988351790"];
    const cepMatch = content.match(/\b\d{5}-?\d{3}\b/);

    const isAuthorized = AUTHORIZED_PHONES.some(p => {
      const pClean = p.replace(/\D/g, "").replace(/^55/, "");
      const phoneClean = phone.replace(/\D/g, "").replace(/^55/, "");
      
      const pCanonical = pClean.length === 11 ? pClean.slice(0, 2) + pClean.slice(3) : pClean;
      const phoneCanonical = phoneClean.length === 11 ? phoneClean.slice(0, 2) + phoneClean.slice(3) : phoneClean;
      
      return pCanonical === phoneCanonical;
    });

    let invoiceValue = 5000; 
    if (cepMatch) {
      const lines = content.trim().split(/\r?\n/);
      const cleanLine = (l: string) => l.replace(/\D/g, "");
      const cepLineIdx = lines.findIndex(l => cleanLine(l).length === 8 && /\b\d{5}-?\d{3}\b/.test(l));
      if (cepLineIdx !== -1 && lines[cepLineIdx + 1]) {
        const nextLineVal = parseFloat(lines[cepLineIdx + 1].replace(/[^\d.,]/g, "").replace(",", "."));
        if (!isNaN(nextLineVal) && nextLineVal > 0) invoiceValue = nextLineVal;
      }
    }

    if (cepMatch && isAuthorized && !isFromMe) {
      const cleanCep = cepMatch[0].replace(/\D/g, "");
      console.log(`Freight robot triggered for ${phone} (CEP: ${cleanCep})`);

      try {
        const freteRes = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/calcular-frete-rodonaves`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              destinationZip: cleanCep,
              invoiceValue: invoiceValue,
              preset: "bike_completa",
              quantidade: 1,
            }),
          }
        );

        const freteData = await freteRes.json();
        const instName = tenantId ? instanceName(tenantId) : "Allcance-default";
        
        if (freteData.sucesso) {
          const valorNum = Number(freteData.valorFrete) + 30;
          const prazo = Number(freteData.prazoEntrega || 0) + 2;
          const cidade = freteData.cidade ? `${freteData.cidade}${freteData.uf ? ` - ${freteData.uf}` : ""}` : `CEP ${cleanCep}`;

          const responseText = 
            `🚚 *COTAÇÃO DE FRETE Allcance*\n\n` +
            `📍 *Destino:* ${cidade}\n` +
            `📅 *Prazo:* ${prazo} dias úteis\n` +
            `💰 *Valor:* R$ ${valorNum.toFixed(2)}`;
          
          await fetch(`${EVOLUTION_BASE}/message/sendText/${instName}`, {
            method: "POST",
            headers: evoHeaders(),
            body: JSON.stringify({ number: phone, text: responseText }),
          });
        } else {
          await fetch(`${EVOLUTION_BASE}/message/sendText/${instName}`, {
            method: "POST",
            headers: evoHeaders(),
            body: JSON.stringify({ number: phone, text: `❌ Erro no cálculo: ${freteData.error || "CEP inválido ou indisponível"}` }),
          });
        }

        return new Response(JSON.stringify({ ok: true, source: "freight_robot_api" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        console.error("Robot Exception:", err);
        return new Response(JSON.stringify({ ok: false, error: "robot_failed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Handle audio: transcribe and respond with audio
    if (type === "audio" && !isFromMe) {
      const instName = tenantId ? instanceName(tenantId) : "Allcance-default";

      try {
        const transcript = await transcribeAudio(instName, messageId, remoteJid);

        await supabase
          .from("whatsapp_messages")
          .update({ content: `🎤 ${transcript}` })
          .eq("conversation_id", convId)
          .eq("message_id", messageId);

        await supabase
          .from("whatsapp_conversations")
          .update({ last_message: `🎤 ${transcript}` })
          .eq("id", convId);

        supabase.functions.invoke("ai-responder", {
          body: {
            conversationId: convId,
            phone,
            message: transcript,
            respondWithAudio: true,
          },
        }).catch((err: unknown) => console.error("AI responder invoke error:", err));
      } catch (err) {
        console.error("Audio transcription failed:", err);
        supabase.functions.invoke("ai-responder", {
          body: {
            conversationId: convId,
            phone,
            message: "[O cliente enviou um áudio que não pôde ser transcrito. Peça para ele repetir por texto.]",
            respondWithAudio: false,
          },
        }).catch((err2: unknown) => console.error("AI responder fallback error:", err2));
      }
    }
    // Handle text: respond with text
    else if (type === "text" && content) {
      supabase.functions.invoke("ai-responder", {
        body: { conversationId: convId, phone, message: content, respondWithAudio: false },
      }).catch((err: unknown) => console.error("AI responder invoke error:", err));
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
