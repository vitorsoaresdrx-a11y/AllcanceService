/**
 * Generic CSV export utility
 */
export function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const BOM = "\uFEFF"; // UTF-8 BOM for Excel compatibility
  const csv = [
    headers.join(";"),
    ...rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";")),
  ].join("\n");

  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportSalesCSV(sales: any[]) {
  const headers = ["Data", "Cliente", "Método", "Itens", "Total", "Taxa Cartão", "Líquido", "Obs"];
  const rows = sales.map((sale) => {
    const date = new Date(sale.created_at).toLocaleDateString("pt-BR");
    const customer = sale.customers?.name || "Não informado";
    const method = sale.payment_method || "—";
    const items = (sale.sale_items || [])
      .map((i: any) => `${i.quantity}x ${i.description}`)
      .join(", ");
    const total = Number(sale.total).toFixed(2);
    const fee = Number(sale.card_fee || 0).toFixed(2);
    const net = (Number(sale.total) - Number(sale.card_fee || 0)).toFixed(2);
    return [date, customer, method, items, total, fee, net, sale.notes || ""];
  });

  const now = new Date().toISOString().slice(0, 10);
  downloadCSV(`vendas_${now}.csv`, headers, rows);
}

export function exportInventoryCSV(parts: any[], bikes: any[]) {
  const headers = ["Tipo", "SKU", "Nome", "Categoria", "Estoque", "Alerta", "Preço Venda", "Custo"];
  const rows: string[][] = [];

  for (const p of parts) {
    rows.push([
      "Peça",
      p.sku || "—",
      p.name,
      p.category || "—",
      String(p.stock_qty),
      String(p.alert_stock),
      Number(p.sale_price || 0).toFixed(2),
      Number(p.unit_cost || 0).toFixed(2),
    ]);
  }

  for (const b of bikes) {
    rows.push([
      "Bike",
      b.sku || "—",
      b.name,
      b.category || "—",
      String(b.stock_qty),
      String(b.alert_stock),
      Number(b.sale_price || 0).toFixed(2),
      Number(b.cost_price || 0).toFixed(2),
    ]);
  }

  const now = new Date().toISOString().slice(0, 10);
  downloadCSV(`estoque_${now}.csv`, headers, rows);
}
