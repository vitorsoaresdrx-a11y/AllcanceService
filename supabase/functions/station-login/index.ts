import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { station, password } = await req.json();

    if (!station || !password) {
      return new Response(
        JSON.stringify({ error: "Estação e senha são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get station_passwords from settings
    const { data: setting } = await adminClient
      .from("settings")
      .select("value, tenant_id")
      .eq("key", "station_passwords")
      .limit(1)
      .single();

    if (!setting) {
      return new Response(
        JSON.stringify({ error: "Senhas das estações não configuradas. O administrador deve configurar em Configurações." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const passwords = setting.value as Record<string, string>;
    const stationPassword = passwords[station];

    if (!stationPassword) {
      return new Response(
        JSON.stringify({ error: `Estação "${station}" não configurada.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password
    if (password !== stationPassword) {
      return new Response(
        JSON.stringify({ error: "Senha incorreta" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deterministic email for this station+tenant
    const tenantId = setting.tenant_id;
    const email = `station-${station}-${tenantId}@station.internal`;

    // Try to sign in first
    const anonClient = createClient(supabaseUrl, anonKey);
    let authResult = await anonClient.auth.signInWithPassword({
      email,
      password: stationPassword,
    });

    // If user doesn't exist, auto-provision
    if (authResult.error) {
      // Try creating the user
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: stationPassword,
        email_confirm: true,
      });

      if (createError) {
        // User might exist with old password — update it
        const { data: existingUsers } = await adminClient.auth.admin.listUsers();
        const existing = existingUsers?.users?.find((u: any) => u.email === email);

        if (existing) {
          await adminClient.auth.admin.updateUser(existing.id, { password: stationPassword });
        } else {
          console.error("Failed to create station user:", createError);
          return new Response(
            JSON.stringify({ error: "Erro ao provisionar conta da estação" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else if (newUser?.user) {
        // Delete auto-created tenant (from trigger) and link to correct tenant
        const userId = newUser.user.id;

        // Remove auto-created tenant & membership
        const { data: autoMember } = await adminClient
          .from("tenant_members")
          .select("id, tenant_id")
          .eq("user_id", userId)
          .single();

        if (autoMember) {
          const autoTenantId = autoMember.tenant_id;
          await adminClient.from("tenant_members").delete().eq("id", autoMember.id);
          await adminClient.from("tenants").delete().eq("id", autoTenantId);
        }

        // Link to correct tenant as member
        await adminClient.from("tenant_members").insert({
          tenant_id: tenantId,
          user_id: userId,
          role: station === "admin" ? "owner" : "member",
          email,
        });
      }

      // Try sign in again
      authResult = await anonClient.auth.signInWithPassword({
        email,
        password: stationPassword,
      });

      if (authResult.error) {
        console.error("Sign in failed after provision:", authResult.error);
        return new Response(
          JSON.stringify({ error: "Erro ao autenticar estação" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const result: Record<string, unknown> = { session: authResult.data.session };

    // For salao, also return the operator names
    if (station === "salao") {
      const { data: namesData } = await adminClient
        .from("settings")
        .select("value")
        .eq("key", "salao_names")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      result.salao_names = (namesData?.value as string[]) || [];
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("station-login error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
