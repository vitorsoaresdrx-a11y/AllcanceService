/**
 * Classificador de Localidade e Motor de Multiplicadores Allcance
 */

export type LocalityBucket = 'capital' | 'interior' | 'remoto';

export const MULTIPLIERS: Record<LocalityBucket, number> = {
  capital: 1.25,   
  interior: 1.65,  
  remoto: 2.90,    
};

const BRAZIL_CAPITALS = [
  "ARACAJU", "BELEM", "BELO HORIZONTE", "BOA VISTA", "CAMPO GRANDE", "CUIABA", 
  "CURITIBA", "FLORIANOPOLIS", "FORTALEZA", "GOIANIA", "JOAO PESSOA", "MACEIO", 
  "MANAUS", "NATAL", "PALMAS", "PORTO ALEGRE", "PORTO VELHO", "RECIFE", 
  "RIO BRANCO", "RIO DE JANEIRO", "SALVADOR", "SAO LUIS", "SAO PAULO", 
  "TERESINA", "VITORIA", "BRASILIA"
];

const REMOTE_STATES = ["AC", "AM", "RO", "RR", "AP", "PA", "TO"];

/**
 * Classifica uma cidade baseada em heurísticas de logística
 */
export function classifyLocality(cidade: string = "", uf: string = ""): LocalityBucket {
  try {
    const normalizedCity = (cidade || "").toString().toUpperCase().trim();
    const normalizedUF = (uf || "").toString().toUpperCase().trim();

    // 1. Check if it is a capital
    if (BRAZIL_CAPITALS.includes(normalizedCity)) {
      return 'capital';
    }

    // 2. Check if it is North Region (non-capital) -> Deep remote
    if (REMOTE_STATES.includes(normalizedUF)) {
      return 'remoto';
    }

    // 3. Known remote cities in other states (Manual additions)
    const manualRemoteCities = ["GARRUCHOS"]; 
    if (manualRemoteCities.some(name => normalizedCity.includes(name))) {
      return 'remoto';
    }

    // 4. Default to interior
    return 'interior';
  } catch (error) {
    console.error("classifyLocality Error:", error);
    return 'interior'; // Fallback seguro
  }
}
