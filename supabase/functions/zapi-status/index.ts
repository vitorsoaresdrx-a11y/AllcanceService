import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EVOLUTION_BASE = "https://evolution.allcance.com.br";

function evoHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: Deno.env.get("EVOLUTION_API_KEY")!,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check — just verify they have a bearer token (any valid Supabase user)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client to verify the JWT (handles station users too)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list-instances";

    console.log(`Evolution action=${action}`);

    // ── List all instances with their connection state ───────────────────
    if (action === "list-instances") {
      const res = await fetch(`${EVOLUTION_BASE}/instance/fetchInstances`, {
        method: "GET",
        headers: evoHeaders(),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`fetchInstances failed (${res.status}): ${errText}`);
        return new Response(JSON.stringify({ instances: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rawInstances = await res.json();
      console.log(`Fetched ${Array.isArray(rawInstances) ? rawInstances.length : 0} instances`);

      // Normalize: Evolution returns array of instance objects
      const instances = (Array.isArray(rawInstances) ? rawInstances : []).map((inst: any) => {
        const name = inst.instance?.instanceName || inst.instanceName || inst.name || "unknown";
        const state = inst.instance?.state || inst.state || "close";
        return {
          instanceName: name,
          state, // "open" | "close" | "connecting"
          connected: state === "open",
        };
      });

      return new Response(JSON.stringify({ instances }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Get status of a specific instance ────────────────────────────────
    if (action === "status") {
      const instanceName = url.searchParams.get("instance");
      if (!instanceName) {
        return new Response(JSON.stringify({ error: "instance parameter required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const statusRes = await fetch(
        `${EVOLUTION_BASE}/instance/connectionState/${instanceName}`,
        { headers: evoHeaders() }
      );

      if (!statusRes.ok) {
        return new Response(
          JSON.stringify({ connected: false, state: "close" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const statusData = await statusRes.json();
      const state = statusData?.instance?.state || statusData?.state || "close";
      const connected = state === "open";

      return new Response(
        JSON.stringify({ connected, state, instanceName }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("evolution-status error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
