import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PRESETS_EMBALAGEM, type PresetKey } from "./embalagem-presets.ts";

// Cache de token em memória (isolado por instância warm)
let cachedToken: string | null = null;
let tokenExpiresAt: number | null = null;

const RODONAVES_API = "https://quotation-apigateway.rte.com.br";
const DNE_API = "https://dne-api.rte.com.br";

async function authenticate() {
  const now = Date.now();
  
  // Renovar 5 minutos antes de expirar
  if (cachedToken && tokenExpiresAt && now < tokenExpiresAt - (5 * 60 * 1000)) {
    console.log("Utilizando token Rodonaves cacheado");
    return cachedToken;
  }

  console.log("Autenticando na Rodonaves...");
  const USER = Deno.env.get("RODONAVES_USER");
  const PASS = Deno.env.get("RODONAVES_PASS");

  if (!USER || !PASS) {
    throw new Error("Credenciais RODONAVES_USER ou RODONAVES_PASS não configuradas.");
  }

  const params = new URLSearchParams();
  params.append("grant_type", "password");
  params.append("username", USER);
  params.append("password", PASS);
  params.append("companyId", "1");
  // params.append("auth_type", "DEV"); // Removido para evitar erro 400 em produção

  const response = await fetch(`${RODONAVES_API}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Erro na autenticação Rodonaves:", errorBody);
    throw new Error("Falha na autenticação com Rodonaves.");
  }

  const data = await response.json();
  cachedToken = data.access_token;
  // expires_in geralmente vem em segundos
  tokenExpiresAt = Date.now() + (data.expires_in * 1000);
  
  return cachedToken;
}

async function getCityId(zipCode: string, supabase: any) {
  const cleanZip = zipCode.replace(/\D/g, "");
  
  // 1. Consultar banco local primeiro
  const { data: localData, error: dbError } = await supabase
    .from("cep_rodonaves")
    .select("city_id, city_name, state_uf")
    .eq("zipcode", cleanZip)
    .single();

  if (localData?.city_id) {
    console.log(`CityId encontrado localmente para CEP ${cleanZip}: ${localData.city_id}`);
    return { 
      id: localData.city_id, 
      name: localData.city_name, 
      uf: localData.state_uf 
    };
  }

  // 2. Fallback para API DNE
  console.log(`CEP ${cleanZip} não encontrado localmente. Consultando DNE API...`);
  const dneResponse = await fetch(`${DNE_API}/api/cities/byzipcode?zipCode=${cleanZip}`);
  
  if (!dneResponse.ok) {
    throw new Error(`CEP ${cleanZip} não localizado na Rodonaves. Verifique se eles atendem essa região.`);
  }

  const cityDataArray = await dneResponse.json();
  const cityData = Array.isArray(cityDataArray) ? cityDataArray[0] : cityDataArray;
  const cityId = cityData?.Id || cityData?.CityId || cityData?.cityId;
  const cityName = cityData?.Description || cityData?.Name || "";
  const stateUf = cityData?.StateDescription || cityData?.State || "";

  if (!cityData || !cityId) {
    throw new Error(`CEP ${cleanZip} não localizado na Rodonaves. Verifique se eles atendem essa região.`);
  }

  console.log(`CityId obtido via API para CEP ${cleanZip}: ${cityId}`);
  
  // Salvar no banco local para futuras consultas
  await supabase.from("cep_rodonaves").insert({ 
    zipcode: cleanZip, 
    city_id: cityId,
    city_name: cityName,
    state_uf: stateUf
  }).maybeSingle();

  return { id: cityId, name: cityName, uf: stateUf };
}

export async function gerarCotacao(input: {
  originZip: string;
  destinationZip: string;
  customerTaxId: string;
  invoiceValue: number;
  preset: PresetKey;
  quantidade: number;
}, supabase: any) {
  const token = await authenticate();
  
  const preset = PRESETS_EMBALAGEM[input.preset];
  if (!preset) {
    throw new Error(`Preset inválido: ${input.preset}`);
  }

  const originCity = await getCityId(input.originZip, supabase);
  const destinationCity = await getCityId(input.destinationZip, supabase);

  const totalWeight = preset.pesoPorUnidade * input.quantidade;
  const cleanTaxId = input.customerTaxId.replace(/\D/g, "");
  const qty = Math.max(1, Number(input.quantidade || 1));

  const payload = {
    OriginZipCode: input.originZip.replace(/\D/g, ""),
    OriginCityId: Number(originCity.id),
    DestinationZipCode: input.destinationZip.replace(/\D/g, ""),
    DestinationCityId: Number(destinationCity.id),
    TotalPackages: qty,
    TotalWeight: totalWeight,
    EconomicActivityId: 1, 
    CustomerTaxIdRegistration: cleanTaxId,
    ReceiverCpfcnp: cleanTaxId, 
    ContactName: "Allcance",
    ContactPhoneNumber: "15996128054",
    EletronicInvoiceValue: input.invoiceValue,
    Packs: [
      {
        AmountPackages: qty,
        Weight: preset.pesoPorUnidade,
        Length: preset.comprimento,
        Width: preset.largura,
        Height: preset.altura
      }
    ]
  };

  console.log("Payload Final Enviado para Rodonaves:", JSON.stringify(payload, null, 2));

  console.log("Enviando cotação para Rodonaves...");
  const response = await fetch(`${RODONAVES_API}/api/v1/gera-cotacao`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  if (!response.ok) {
    console.error("Erro na cotação Rodonaves:", JSON.stringify(result, null, 2));
    const detail = Array.isArray(result.Errors) ? result.Errors.join(", ") : (result.Message || "Erro desconhecido");
    throw new Error(`Rodonaves recusou: ${detail}`);
  }

  return {
    valorFrete: result.Value || result.TotalValue || 0,
    prazoEntrega: result.DeliveryTime || 0,
    cidade: destinationCity.name,
    uf: destinationCity.uf,
    sucesso: true
  };
}
