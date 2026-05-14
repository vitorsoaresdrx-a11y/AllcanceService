export interface ParsedBill {
  type: 'boleto' | 'concessionaria' | 'cartao' | 'desconhecido';
  amount: number | null;
  due_date: string | null;
  bank_name: string | null;
  beneficiary: string | null;
  barcode: string;
}

const BANK_CODES: Record<string, string> = {
  '001': 'Banco do Brasil',
  '033': 'Santander',
  '104': 'Caixa Econômica',
  '237': 'Bradesco',
  '341': 'Itaú',
  '356': 'BMG',
  '422': 'Safra',
  '745': 'Citibank',
  '756': 'Sicoob',
};

export function parseBarcode(code: string): ParsedBill {
  const digits = code.replace(/\D/g, '');

  // Boleto bancário (47 ou 48 dígitos)
  if (digits.length === 47 || digits.length === 48) {
    const bankCode = digits.substring(0, 3);
    const bankName = BANK_CODES[bankCode] || `Banco ${bankCode}`;

    // Extrair vencimento e valor (posições padrão FEBRABAN)
    let dueFactor: string;
    let valueStr: string;

    if (digits.length === 48) {
      // Código de barras puro
      dueFactor = digits.substring(5, 9);
      valueStr = digits.substring(9, 19);
    } else {
      // Linha digitável (47 dígitos) — converter para posições de barras
      dueFactor = digits.substring(33, 37);
      valueStr = digits.substring(37, 47);
    }

    const amount = parseInt(valueStr) / 100;

    let dueDate: string | null = null;
    if (dueFactor !== '0000' && parseInt(dueFactor) > 0) {
      const base = new Date('1997-10-07');
      base.setDate(base.getDate() + parseInt(dueFactor));
      dueDate = base.toISOString().split('T')[0];
    }

    return { type: 'boleto', amount: amount > 0 ? amount : null, due_date: dueDate, bank_name: bankName, beneficiary: null, barcode: digits };
  }

  // Concessionária (44 dígitos — energia, água, telefone, cartão)
  if (digits.length === 44) {
    const productId = digits.substring(1, 2);
    const valueStr = digits.substring(4, 15);
    const amount = parseInt(valueStr) / 100;

    const types: Record<string, string> = {
      '1': 'Energia Elétrica',
      '2': 'Água/Saneamento',
      '3': 'Gás',
      '4': 'Telefone/Internet',
      '6': 'Cartão de Crédito',
      '7': 'Taxa/Imposto',
      '9': 'Outros',
    };

    return {
      type: productId === '6' ? 'cartao' : 'concessionaria',
      amount: amount > 0 ? amount : null,
      due_date: null,
      bank_name: null,
      beneficiary: types[productId] || 'Concessionária',
      barcode: digits,
    };
  }

  return { type: 'desconhecido', amount: null, due_date: null, bank_name: null, beneficiary: null, barcode: digits };
}
