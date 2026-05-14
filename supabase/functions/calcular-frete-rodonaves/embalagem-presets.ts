export const PRESETS_EMBALAGEM = {
  bike_completa: {
    label: "Bike completa",
    quantidade: 1,
    pesoPorUnidade: 15.5, // kg
    comprimento: 148,     // cm
    largura: 20,          // cm
    altura: 78,           // cm
  },
  quadro: {
    label: "Quadro",
    quantidade: 1,
    pesoPorUnidade: 6.0,  // kg
    comprimento: 148,     // cm
    largura: 20,          // cm
    altura: 78,           // cm
  },
};

export type PresetKey = keyof typeof PRESETS_EMBALAGEM;
