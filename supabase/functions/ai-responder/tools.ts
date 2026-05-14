export const toolDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "calcular_frete",
      description:
        "Calcula o frete via transportadora Rodonaves para envio de bikes ou quadros a partir de Sorocaba-SP. Use somente após ter o CEP e o tipo de carga confirmados pelo cliente.",
      parameters: {
        type: "object",
        properties: {
          cep_destino: {
            type: "string",
            description: "CEP de destino no formato 00000-000 ou 00000000",
          },
          tipo_carga: {
            type: "string",
            enum: ["bike_completa", "quadro"],
            description: "Tipo de carga: bike_completa (15.5kg) ou quadro (6kg)",
          },
          valor_nf: {
            type: "number",
            description: "Valor declarado da mercadoria em reais (R$)",
          },
        },
        required: ["cep_destino", "tipo_carga", "valor_nf"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "consultar_ordem_servico",
      description:
        "Consulta ordens de serviço (mecânica) do cliente pelo telefone. Use quando o cliente perguntar sobre o status da bike dele na oficina.",
      parameters: {
        type: "object",
        properties: {
          telefone: {
            type: "string",
            description: "Telefone do cliente (o mesmo do WhatsApp da conversa)",
          },
        },
        required: ["telefone"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "cancelar_ordem",
      description:
        "Cancela integralmente uma ordem de serviço (O.S.). Use SOMENTE se o cliente escrever as palavras 'cancelar', 'abortar' ou 'desistir' de todo o serviço. NÃO use se o cliente disser 'sim' para um orçamento — nesse caso deve-se aprovar o adicional.",
      parameters: {
        type: "object",
        properties: {
          motivo: {
            type: "string",
            description: "O motivo explícito do cancelamento dado pelo cliente.",
          },
        },
        required: ["motivo"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "atualizar_aprovacao_adicional",
      description: "FERRAMENTA PRINCIPAL PARA ORÇAMENTOS EXTRAS. Use quando o cliente concordar ('sim', 'pode fazer', 'manda bala', 'ok', 'fechado') ou discordar de um adicional pendente informado no contexto.",
      parameters: {
        type: "object",
        properties: {
          acao: {
            type: "string",
            enum: ["aprovar", "negar", "cancelar_adicional", "cancelar_tudo"],
            description: "A ação a ser tomada. 'aprovar' é a escolha se o cliente concordar com o serviço extra proposto."
          },
          adicional_id: { type: "string", description: "O ID do adicional informado no contexto da OS." },
          os_id: { type: "string", description: "O ID da OS associada." },
          valor_total: { type: "number", description: "Valor total do adicional proposto." }
        },
        required: ["acao", "adicional_id", "os_id", "valor_total"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "escalar_para_humano",
      description: "Pausa a IA e sinaliza necessidade de atendente humano. Use quando o cliente tiver dúvida complexa sobre o serviço, pedir desconto, ou quando não há certeza sobre a intenção.",
      parameters: {
        type: "object",
        properties: {
          motivo: { type: "string", description: "O motivo do escalonamento." }
        },
        required: ["motivo"]
      }
    }
  }
];

interface FreteResult {
  valor: string;
  prazo: string;
  cidade: string;
  estado: string;
}

export async function executeCalcularFrete(args: {
  cep_destino: string;
  tipo_carga: "bike_completa" | "quadro";
  valor_nf: number;
}): Promise<FreteResult> {
  const { cep_destino, tipo_carga, valor_nf } = args;
  const cep = cep_destino.replace(/\D/g, "");
  const peso = tipo_carga === "bike_completa" ? 15.5 : 6;

  const viacepRes = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  const viacepData = await viacepRes.json();

  if (viacepData.erro) {
    throw new Error("CEP não encontrado. Verifique se o CEP está correto.");
  }

  const cidade = viacepData.localidade;
  const estado = viacepData.uf;

  if (!cidade || !estado) {
    throw new Error("Não foi possível identificar cidade/estado para o CEP informado.");
  }

  const RODONAVES_USER = Deno.env.get("RODONAVES_USER");
  const RODONAVES_PASS = Deno.env.get("RODONAVES_PASS");

  if (!RODONAVES_USER || !RODONAVES_PASS) {
    throw new Error("Credenciais da Rodonaves não configuradas.");
  }

  const authTypesToTry = ["DEV", "dev"];
  let accessToken: string | null = null;

  for (const authType of authTypesToTry) {
    const tokenRes = await fetch("https://quotation-apigateway.rte.com.br/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "password",
        username: RODONAVES_USER,
        password: RODONAVES_PASS,
        companyId: "1",
        auth_type: authType,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Rodonaves token error:", { status: tokenRes.status, auth_type: authType, body: errText.slice(0, 300) });
      continue;
    }

    const tokenData = await tokenRes.json();
    accessToken = tokenData?.access_token ?? null;
    if (accessToken) break;
  }

  if (!accessToken) {
    throw new Error("Erro ao autenticar na transportadora Rodonaves.");
  }

  const cotacaoRes = await fetch(
    "https://quotation-apigateway.rte.com.br/api/v1/gera-cotacao",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        CidadeOrigem: "Sorocaba",
        EstadoOrigem: "SP",
        CidadeDestino: cidade,
        EstadoDestino: estado,
        TipoEmbalagem: "CAIXA",
        TipoDocumento: "NF-E",
        QtdVolumes: 1,
        Altura: 78,
        Largura: 20,
        Comprimento: 148,
        PesoPorVolume: peso,
        ValorNF: valor_nf,
      }),
    }
  );

  if (!cotacaoRes.ok) {
    const errText = await cotacaoRes.text();
    console.error("Rodonaves quotation error:", errText);
    throw new Error("Erro ao calcular cotação de frete.");
  }

  const cotacao = await cotacaoRes.json();
  const valor = cotacao.Valor ?? cotacao.valor ?? cotacao.value ?? "N/A";
  const prazo = cotacao.Prazo ?? cotacao.prazo ?? cotacao.deadline ?? "N/A";

  return {
    valor: typeof valor === "number" ? `R$ ${valor.toFixed(2)}` : String(valor),
    prazo: String(prazo),
    cidade,
    estado,
  };
}
