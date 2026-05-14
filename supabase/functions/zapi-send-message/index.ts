import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EVOLUTION_BASE = "https://evolution.allcance.com.br";
const ELEVENLABS_VOICE_ID = "xNGAXaCH8MaasNuo7Hr7";

function evoHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: Deno.env.get("EVOLUTION_API_KEY")!,
  };
}

function instanceName(tenantId: string): string {
  return `Allcance-${tenantId.replace(/-/g, "").slice(0, 12)}`;
}

async function textToSpeech(text: string): Promise<string> {
  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs error ${res.status}: ${err}`);
  }

  const audioBuffer = await res.arrayBuffer();
  return base64Encode(audioBuffer);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let { phone, message, conversationId, sendAsAudio, instanceName: customInstance, media, mediatype, fileName, mimetype } = await req.json();

    if (!phone || (!message && !media)) {
      return new Response(
        JSON.stringify({ error: "phone and (message or media) are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize phone number to digits only and add country code 55 if missing
    phone = String(phone).replace(/\D/g, "");
    if (phone.length >= 10 && phone.length <= 11 && !phone.startsWith("55")) {
      phone = "55" + phone;
    }

    // Resolve tenant
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const userId = user.id;
    const { data: member } = await adminClient
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    // Use custom instance name if provided, otherwise fall back to tenant-derived name
    const instName = customInstance || (member ? instanceName(member.tenant_id) : "Allcance-default");

    let evoRes: Response;
    let evoData: any;

    if (media) {
      // Send as media (PDF, image, etc)
      console.log(`Sending media ${mediatype} to ${phone} via instance ${instName}`);
      evoRes = await fetch(
        `${EVOLUTION_BASE}/message/sendMedia/${instName}`,
        {
          method: "POST",
          headers: evoHeaders(),
          body: JSON.stringify({
            number: phone,
            mediatype: mediatype || "document",
            media: media, // should be base64 with data prefix or URL
            mimetype: mimetype || "application/pdf",
            fileName: fileName || "recibo.pdf",
            caption: message || ""
          }),
        }
      );
      evoData = await evoRes.json();
      console.log(`Evolution sendMedia status=${evoRes.status}`, JSON.stringify(evoData));
    } else if (sendAsAudio) {
      // Convert text to speech via ElevenLabs, then send as audio
      console.log(`Converting text to speech and sending audio to ${phone} via instance ${instName}`);
      const audioBase64 = await textToSpeech(message);

      evoRes = await fetch(
        `${EVOLUTION_BASE}/message/sendMedia/${instName}`,
        {
          method: "POST",
          headers: evoHeaders(),
          body: JSON.stringify({
            number: phone,
            mediatype: "audio",
            media: `data:audio/mpeg;base64,${audioBase64}`,
            mimetype: "audio/mpeg",
            fileName: "audio.mp3",
          }),
        }
      );
      evoData = await evoRes.json();
      console.log(`Evolution sendMedia status=${evoRes.status}`, JSON.stringify(evoData));
    } else {
      // Send as text
      console.log(`Sending message to ${phone} via instance ${instName}`);
      evoRes = await fetch(
        `${EVOLUTION_BASE}/message/sendText/${instName}`,
        {
          method: "POST",
          headers: evoHeaders(),
          body: JSON.stringify({ number: phone, text: message }),
        }
      );
      evoData = await evoRes.json();
      console.log(`Evolution sendText status=${evoRes.status}`, JSON.stringify(evoData));
    }

    if (!evoRes.ok) {
      return new Response(JSON.stringify({ error: "Evolution API error", details: evoData }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure conversation exists
    let convId = conversationId;
    if (!convId) {
      const { data: existing } = await adminClient
        .from("whatsapp_conversations")
        .select("id")
        .eq("contact_phone", phone)
        .maybeSingle();

      if (existing) {
        convId = existing.id;
      } else {
        const tenantId = member?.tenant_id || null;
        const { data: newConv } = await adminClient
          .from("whatsapp_conversations")
          .insert({ contact_phone: phone, last_message: message, status: "open", tenant_id: tenantId })
          .select("id")
          .single();
        convId = newConv?.id;
      }
    }

    // Save message
    const tenantId = member?.tenant_id || null;
    await adminClient.from("whatsapp_messages").insert({
      conversation_id: convId,
      message_id: evoData?.key?.id || null,
      from_me: true,
      type: sendAsAudio ? "audio" : "text",
      content: sendAsAudio ? `🔊 ${message}` : message,
      status: "sent",
      tenant_id: tenantId,
    });

    // Update conversation
    await adminClient
      .from("whatsapp_conversations")
      .update({
        last_message: sendAsAudio ? `🔊 Áudio enviado` : message,
        last_message_at: new Date().toISOString(),
      })
      .eq("id", convId);

    return new Response(JSON.stringify({ success: true, evoData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("zapi-send-message error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
