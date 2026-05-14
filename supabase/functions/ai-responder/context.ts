import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseAdmin = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

/** Build the full product catalog context */
export async function buildBusinessContext(): Promise<string> {
  const supabase = supabaseAdmin();

  const [partsRes, bikesRes, bikePartsRes, promoRes] = await Promise.all([
    supabase
      .from("parts")
      .select("id, name, category, sale_price, pix_price, stock_qty, material, color, rim_size, frame_size, gears, images")
      .gt("stock_qty", 0)
      .order("name"),
    supabase
      .from("bike_models")
      .select("id, name, category, sale_price, pix_price, stock_qty, brand, color, rim_size, frame_size, weight_kg, description, images")
      .gt("stock_qty", 0)
      .order("name"),
    supabase
      .from("bike_model_parts")
      .select("bike_model_id, quantity, part_name_override, notes, part_id"),
    supabase
      .from("promotions")
      .select("name, description, discount_type, discount_value, applies_to, category, product_id, bike_model_id, starts_at, ends_at")
      .eq("active", true)
      .gte("ends_at", new Date().toISOString()),
  ]);

  const parts = partsRes.data || [];
  const bikes = bikesRes.data || [];
  const bikeParts = bikePartsRes.data || [];
  const promotions = promoRes.data || [];

  // Build parts lookup for bike components
  const { data: allParts } = await supabase.from("parts").select("id, name");
  const partsById: Record<string, string> = {};
  for (const p of allParts || []) {
    partsById[p.id] = p.name;
  }

  let ctx = "=== CATÁLOGO DE PEÇAS ===\n";
  for (const p of parts) {
    const price = p.pix_price && p.pix_price > 0 ? `Pix: R$${p.pix_price}` : "";
    const salePrice = p.sale_price && p.sale_price > 0 ? `Preço: R$${p.sale_price}` : "";
    const specs = [p.category, p.material, p.color, p.rim_size, p.gears].filter(Boolean).join(", ");
    ctx += `- ${p.name} (ID: ${p.id}) | ${specs} | ${salePrice} ${price} | Estoque: ${p.stock_qty}\n`;
  }

  ctx += "\n=== CATÁLOGO DE BIKES ===\n";
  for (const b of bikes) {
    const price = b.pix_price && b.pix_price > 0 ? `Pix: R$${b.pix_price}` : "";
    const salePrice = b.sale_price && b.sale_price > 0 ? `Preço: R$${b.sale_price}` : "";
    const specs = [b.brand, b.category, b.color, b.rim_size, b.frame_size, b.weight_kg ? `${b.weight_kg}kg` : null].filter(Boolean).join(", ");
    ctx += `- ${b.name} (ID: ${b.id}) | ${specs} | ${salePrice} ${price} | Estoque: ${b.stock_qty}\n`;
    if (b.description) ctx += `  Descrição: ${b.description}\n`;

    const components = bikeParts.filter((bp) => bp.bike_model_id === b.id);
    if (components.length > 0) {
      ctx += "  Componentes: ";
      ctx += components
        .map((c) => {
          const name = c.part_name_override || partsById[c.part_id || ""] || "Peça";
          return `${name}${c.quantity > 1 ? ` x${c.quantity}` : ""}`;
        })
        .join(", ");
      ctx += "\n";
    }
  }

  // Active promotions
  if (promotions.length > 0) {
    ctx += "\n=== PROMOÇÕES ATIVAS ===\n";
    for (const promo of promotions) {
      const discount =
        promo.discount_type === "percentage"
          ? `${promo.discount_value}% de desconto`
          : `R$${promo.discount_value} de desconto`;
      const endsAt = new Date(promo.ends_at).toLocaleDateString("pt-BR");
      ctx += `- ${promo.name}: ${discount} | Válida até ${endsAt}`;
      if (promo.description) ctx += ` | ${promo.description}`;
      ctx += "\n";
    }
  }

  return ctx;
}

/** Lookup customer info by phone number */
export async function getCustomerContext(phone: string): Promise<string> {
  const supabase = supabaseAdmin();
  const cleanPhone = phone.replace(/\D/g, "");

  // Try to find customer by whatsapp
  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, cpf, whatsapp, notes")
    .or(`whatsapp.ilike.%${cleanPhone.slice(-8)}%`)
    .limit(1)
    .maybeSingle();

  if (!customer) return "";

  let ctx = `\n=== DADOS DO CLIENTE ===\nNome: ${customer.name}`;
  if (customer.cpf) ctx += ` | CPF: ${customer.cpf}`;
  if (customer.notes) ctx += `\nObs: ${customer.notes}`;

  // Recent purchases
  const { data: sales } = await supabase
    .from("sales")
    .select("id, total, payment_method, created_at, sale_items:sale_items(description, quantity, unit_price)")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (sales && sales.length > 0) {
    ctx += `\nÚltimas compras (${sales.length}):`;
    for (const s of sales) {
      const date = new Date(s.created_at).toLocaleDateString("pt-BR");
      const items = (s.sale_items as any[])?.map((i: any) => `${i.description} x${i.quantity}`).join(", ") || "";
      ctx += `\n  ${date} - R$${s.total} (${s.payment_method || "N/A"}) | ${items}`;
    }
  }

  return ctx;
}
/** Lookup any active OS and pending additions context for a phone number */
export async function getActiveOSContext(phone: string): Promise<string> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const digits = phone.replace(/\D/g, "");
  const suffix = digits.slice(-10);

  const { data: jobs } = await supabase
    .from("mechanic_jobs")
    .select("id, bike_name, problem, status, customer_name, customer_whatsapp")
    .neq("status", "delivered")
    .neq("status", "cancelado");

  const matched = (jobs || []).filter((j: any) => {
    const d = (j.customer_whatsapp || "").replace(/\D/g, "");
    return d.endsWith(suffix) || suffix.endsWith(d.slice(-8));
  });

  if (!matched.length) return "";

  const statusLabel: Record<string, string> = {
    in_approval: "aguardando aprovação de orçamento",
    in_repair: "na fila da mecânica",
    in_maintenance: "em manutenção",
    in_analysis: "em análise final",
    ready: "pronta para retirada",
  };

  // Busca adicionais pendentes
  const osIds = matched.map((j: any) => j.id);
  const { data: adicionais } = await supabase
    .from("os_adicionais")
    .select("id, os_id, status, valor_total, problem")
    .in("os_id", osIds)
    .in("status", ["enviado", "pendente", "aguardando_cancelamento"]);

  let ctx = "--- DADOS DA OS ATIVA ---\n";
  for (const job of matched) {
    ctx += `ID_OS: ${job.id}\nBIKE: ${job.bike_name || "não informada"}\nSTATUS_OFICINA: ${statusLabel[job.status] || job.status}\nSERVIÇO_SOLICITADO: ${job.problem}\n`;
    const add = (adicionais || []).filter((a: any) => a.os_id === job.id);
    if (add.length) {
      ctx += `\nESTE CLIENTE TEM ORÇAMENTOS EXTRAS PENDENTES (Aguardando Aprovação):\n`;
      for (const a of add) {
        ctx += `  - ID_ADICIONAL: ${a.id} | VALOR: R$ ${Number(a.valor_total).toFixed(2)} | ITEM: ${a.problem || ""} | STATUS: ${a.status}\n`;
      }
      ctx += `\nINSTRUÇÃO: Se o cliente disser SIM, OK, PODE FAZER, use a ferramenta 'atualizar_aprovacao_adicional' usando os IDs acima.`;
    }
  }
  return ctx;
}

/** Lookup service orders by phone */
export async function getServiceOrdersByPhone(phone: string): Promise<string> {
  const supabase = supabaseAdmin();
  const cleanPhone = phone.replace(/\D/g, "");

  const { data: orders } = await supabase
    .from("mechanic_jobs")
    .select("id, bike_name, problem, status, price, created_at")
    .or(`customer_whatsapp.ilike.%${cleanPhone.slice(-8)}%`)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!orders || orders.length === 0) {
    return JSON.stringify({ found: false, message: "Nenhuma ordem de serviço encontrada para este telefone." });
  }

  const result = orders.map((o) => ({
    id: o.id.slice(0, 8),
    bike: o.bike_name || "N/A",
    problema: o.problem,
    status: o.status === "in_repair" ? "Em reparo" : o.status === "completed" ? "Concluído" : o.status === "waiting_parts" ? "Aguardando peças" : o.status,
    mecanico: o.mechanic_name || "Não atribuído",
    valor: o.price ? `R$${o.price}` : "A definir",
    data: new Date(o.created_at!).toLocaleDateString("pt-BR"),
    concluido: o.completed_at ? new Date(o.completed_at).toLocaleDateString("pt-BR") : null,
  }));

  return JSON.stringify({ found: true, orders: result });
}

/** Cancel a service order by phone */
export async function cancelServiceOrder(phone: string, motivo: string): Promise<string> {
  const supabase = supabaseAdmin();
  const cleanPhone = phone.replace(/\D/g, "");
  
  // 1. Find active OS
  const { data: jobs } = await supabase
    .from("mechanic_jobs")
    .select("id, bike_name")
    .neq("status", "delivered")
    .neq("status", "cancelado")
    .or(`customer_whatsapp.ilike.%${cleanPhone.slice(-8)}%`)
    .limit(1);

  if (!jobs || jobs.length === 0) {
    return JSON.stringify({ success: false, message: "Nenhuma ordem de serviço ativa encontrada para cancelar." });
  }

  const job = jobs[0];

  // 2. Update status to 'cancelado'
  const { error: updateErr } = await supabase
    .from("mechanic_jobs")
    .update({ status: "cancelado" })
    .eq("id", job.id);

  if (updateErr) {
    return JSON.stringify({ success: false, message: `Erro ao cancelar: ${updateErr.message}` });
  }

  // 3. Create alert
  await supabase.from("os_alertas").insert({
    os_id: job.id,
    numero_cliente: phone,
    visto: false,
    tipo: "erro",
    contexto: `🚨 Cancelamento Total: O cliente cancelou o serviço da bike "${job.bike_name}" pelo WhatsApp. Motivo: ${motivo}`
  });

  return JSON.stringify({ 
    success: true, 
    message: `Ordem de serviço da bike "${job.bike_name}" cancelada com sucesso.`,
    bike: job.bike_name
  });
}
