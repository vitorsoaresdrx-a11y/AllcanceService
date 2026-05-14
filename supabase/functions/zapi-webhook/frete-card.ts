const W = 640;
const H = 380;

// Inicializa o WASM de forma global e resiliente
let wasmCache: ArrayBuffer | null = null;
let wasmInitialized: Promise<void> | null = null;

async function ensureWasmInitialized() {
  if (wasmInitialized) return wasmInitialized;
  
  wasmInitialized = (async () => {
    try {
      // @ts-ignore
      const { initWasm } = await import("https://esm.sh/resvg-wasm@2.6.2");
      if (!wasmCache) {
        console.log("Loading WASM from unpkg...");
        const wasmRes = await fetch("https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm");
        if (!wasmRes.ok) throw new Error(`WASM download failed: ${wasmRes.status}`);
        wasmCache = await wasmRes.arrayBuffer();
      }
      await initWasm(wasmCache);
      console.log("resvg-wasm initialized");
    } catch (err) {
      wasmInitialized = null;
      console.error("WASM Error:", err);
      throw err;
    }
  })();
  
  return wasmInitialized;
}

// Função Base64 segura para Deno (evita estouro de pilha em buffers grandes)
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  const chunkSize = 16384; 
  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, len)));
  }
  return btoa(binary);
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

/**
 * Gera o SVG do card de frete.
 */
export function buildFreteCardSVG(opts: {
  destino: string;
  origem: string;
  valor: number;
  prazo: number;
  cep: string;
}): string {
  const { destino, valor, prazo, cep } = opts;
  const valorStr = formatCurrency(valor);
  const dataGeracao = new Date().toLocaleDateString("pt-BR");

  const destinoDisplay = destino.length > 30 ? destino.slice(0, 30) + "..." : destino;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="100%" height="100%" fill="#0f172a" rx="16"/>
  <rect width="100%" height="60" fill="#f97316" rx="16"/>
  <rect width="100%" height="30" y="30" fill="#f97316"/>
  
  <text x="25" y="40" font-family="sans-serif" font-size="24" font-weight="bold" fill="white">Allcance</text>
  <text x="${W - 25}" y="38" font-family="sans-serif" font-size="12" fill="white" fill-opacity="0.8" text-anchor="end">${dataGeracao}</text>

  <rect x="25" y="85" width="280" height="90" rx="12" fill="white" fill-opacity="0.05" stroke="white" stroke-opacity="0.1"/>
  <text x="40" y="110" font-family="sans-serif" font-size="10" fill="white" fill-opacity="0.5" font-weight="bold">DESTINO</text>
  <text x="40" y="135" font-family="sans-serif" font-size="18" fill="white" font-weight="bold">${escapeXml(destinoDisplay)}</text>
  <text x="40" y="158" font-family="sans-serif" font-size="12" fill="white" fill-opacity="0.4">CEP ${formatCEP(cep)}</text>

  <rect x="325" y="85" width="290" height="90" rx="12" fill="#f97316" fill-opacity="0.1" stroke="#f97316" stroke-opacity="0.3"/>
  <text x="340" y="110" font-family="sans-serif" font-size="10" fill="white" fill-opacity="0.6" font-weight="bold">VALOR DO FRETE</text>
  <text x="340" y="150" font-family="sans-serif" font-size="34" font-weight="bold" fill="#f97316" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))">${escapeXml(valorStr)}</text>

  <rect x="25" y="195" width="185" height="85" rx="12" fill="white" fill-opacity="0.05"/>
  <text x="40" y="220" font-family="sans-serif" font-size="10" fill="white" fill-opacity="0.5" font-weight="bold">PRAZO</text>
  <text x="40" y="255" font-family="sans-serif" font-size="28" font-weight="bold" fill="white">${prazo}</text>
  <text x="85" y="255" font-family="sans-serif" font-size="14" fill="#f97316"> Dias úteis</text>

  <rect x="225" y="195" width="185" height="85" rx="12" fill="white" fill-opacity="0.05"/>
  <text x="240" y="220" font-family="sans-serif" font-size="10" fill="white" fill-opacity="0.5" font-weight="bold">LOGÍSTICA</text>
  <text x="240" y="255" font-family="sans-serif" font-size="18" font-weight="bold" fill="white">Rodonaves</text>

  <rect x="425" y="195" width="190" height="85" rx="12" fill="white" fill-opacity="0.05"/>
  <text x="440" y="220" font-family="sans-serif" font-size="10" fill="white" fill-opacity="0.5" font-weight="bold">TRANSPORTE</text>
  <text x="440" y="255" font-family="sans-serif" font-size="18" font-weight="bold" fill="white">Rodoviário</text>

  <text x="${W / 2}" y="320" font-family="sans-serif" font-size="11" fill="white" fill-opacity="0.3" text-anchor="middle">Cotação estimada via sistema oficial da transportadora.</text>
  <text x="25" y="355" font-family="sans-serif" font-size="14" fill="#f97316" font-weight="bold" opacity="0.7">Allcance</text>
  <text x="${W - 25}" y="355" font-family="sans-serif" font-size="11" fill="white" fill-opacity="0.2" text-anchor="end">allcance.com.br</text>
</svg>`;
}

function escapeXml(str: string): string {
  return str.replace(/[<>&"']/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;", "'": "&apos;"
  }[c] || c));
}

function formatCEP(cep: string): string {
  const c = cep.replace(/\D/g, "");
  return c.length === 8 ? `${c.slice(0, 5)}-${c.slice(5)}` : cep;
}

/**
 * Converte SVG para PNG ou retorna o SVG se falhar.
 */
export async function svgToPngBase64(svgString: string): Promise<{ base64: string; mimeType: string }> {
  try {
    await ensureWasmInitialized();
    // @ts-ignore
    const { Resvg } = await import("https://esm.sh/resvg-wasm@2.6.2");
    
    const resvg = new Resvg(svgString, {
      fitTo: { mode: "width", value: W },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();
    const base64 = toBase64(pngBuffer);
    
    return { base64, mimeType: "image/png" };
  } catch (err) {
    console.error("Generation Error:", err);
    // Fallback: Retorna o SVG base64
    const svgBase64 = toBase64(new TextEncoder().encode(svgString));
    return { base64: svgBase64, mimeType: "image/svg+xml" };
  }
}
