// Money helpers. Amounts are stored in whole currency units; totals are computed in cents.
export function toCents(n: number): number {
  return Math.round(n * 100)
}

export interface InvoiceLine { id: string; description: string; qty: number; rate: number }

export function invoiceTotals(lines: InvoiceLine[], taxRate: number) {
  const subtotal = lines.reduce((sum, l) => sum + toCents(l.qty * l.rate), 0)
  const tax = Math.round((subtotal * taxRate) / 100)
  return { subtotal: subtotal / 100, tax: tax / 100, total: (subtotal + tax) / 100 }
}
