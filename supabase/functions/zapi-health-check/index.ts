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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all tenants
    const { data: tenants, error: tenantErr } = await adminClient
      .from("tenants")
      .select("id");

    if (tenantErr || !tenants) {
      console.error("Failed to fetch tenants:", tenantErr);
      return new Response(JSON.stringify({ error: "Failed to fetch tenants" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ tenant: string; instance: string; state: string; action: string }> = [];

    for (const tenant of tenants) {
      const instName = instanceName(tenant.id);

      try {
        // Check connection state
        const statusRes = await fetch(
          `${EVOLUTION_BASE}/instance/connectionState/${instName}`,
          { headers: evoHeaders() }
        );

        if (!statusRes.ok) {
          console.log(`Instance ${instName} not found (${statusRes.status}), skipping`);
          results.push({ tenant: tenant.id, instance: instName, state: "not_found", action: "skip" });
          continue;
        }

        const statusData = await statusRes.json();
        const state = statusData?.instance?.state || statusData?.state || "unknown";

        console.log(`Instance ${instName}: state=${state}`);

        if (state === "open") {
          results.push({ tenant: tenant.id, instance: instName, state, action: "none" });
          continue;
        }

        // Try to reconnect by calling connect endpoint
        console.log(`Attempting reconnect for ${instName}...`);
        const connectRes = await fetch(
          `${EVOLUTION_BASE}/instance/connect/${instName}`,
          { method: "GET", headers: evoHeaders() }
        );

        const connectStatus = connectRes.status;
        console.log(`Reconnect ${instName}: status=${connectStatus}`);

        // Re-set webhook after reconnect attempt
        const webhookUrl = `${Deno.env.get("SUPABASE_URL")!}/functions/v1/zapi-webhook`;
        await fetch(`${EVOLUTION_BASE}/webhook/set/${instName}`, {
          method: "POST",
          headers: evoHeaders(),
          body: JSON.stringify({
            webhook: {
              url: webhookUrl,
              webhook_by_events: true,
              webhook_base64: false,
              enabled: true,
              events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
            },
          }),
        });

        results.push({
          tenant: tenant.id,
          instance: instName,
          state,
          action: connectStatus === 200 ? "reconnected" : "reconnect_attempted",
        });
      } catch (err) {
        console.error(`Error checking ${instName}:`, err);
        results.push({ tenant: tenant.id, instance: instName, state: "error", action: String(err) });
      }
    }

    console.log("Health check results:", JSON.stringify(results));

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("zapi-health-check error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
