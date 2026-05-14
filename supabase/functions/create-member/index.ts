import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the calling user is an owner
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callingUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !callingUser) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client for admin operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if calling user is owner
    const { data: callerMember } = await adminClient
      .from("tenant_members")
      .select("tenant_id, role")
      .eq("user_id", callingUser.id)
      .single();

    if (!callerMember || callerMember.role !== "owner") {
      return new Response(JSON.stringify({ error: "Apenas proprietários podem criar membros" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: "Email e senha são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: "Senha deve ter no mínimo 6 caracteres" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the auth user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      if (createError.message?.includes("already been registered")) {
        return new Response(JSON.stringify({ error: "Este email já está cadastrado" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw createError;
    }

    // The trigger handle_new_user_tenant auto-creates a tenant for the new user.
    // We need to remove that and add them to the owner's tenant instead.
    // Wait a moment for triggers to execute
    await new Promise((r) => setTimeout(r, 500));

    // Remove auto-created tenant membership and tenant
    const { data: autoMember } = await adminClient
      .from("tenant_members")
      .select("id, tenant_id")
      .eq("user_id", newUser.user.id)
      .single();

    if (autoMember) {
      await adminClient.from("tenant_members").delete().eq("id", autoMember.id);
      await adminClient.from("tenants").delete().eq("id", autoMember.tenant_id);
    }

    // Add to the owner's tenant
    const { error: insertError } = await adminClient.from("tenant_members").insert({
      tenant_id: callerMember.tenant_id,
      user_id: newUser.user.id,
      role: "member",
      email,
    });

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ success: true, userId: newUser.user.id, email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-member error:", err);
    return new Response(
      JSON.stringify({ error: (err instanceof Error ? err.message : String(err)) || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
