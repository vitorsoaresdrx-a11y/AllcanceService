export interface StockEntry {
  quantity: number;
  unit_cost: number;
}

export function calculateWeightedAverage(entries: StockEntry[]): number {
  const validEntries = entries.filter(e => e.unit_cost > 0 && e.quantity > 0);
  if (validEntries.length === 0) return 0;

  const totalCost = validEntries.reduce((sum, e) => sum + e.unit_cost * e.quantity, 0);
  const totalQty = validEntries.reduce((sum, e) => sum + e.quantity, 0);

  return totalQty > 0 ? totalCost / totalQty : 0;
}
