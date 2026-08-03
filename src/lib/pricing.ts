export type PricedLine = {
  quantity: number;
  unitPrice: number;
  discountPct: number;
  taxRate: number;
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateLine(line: PricedLine) {
  const gross = line.quantity * line.unitPrice;
  const net = roundMoney(gross * (1 - line.discountPct / 100));
  const tax = roundMoney(net * (line.taxRate / 100));
  return { net, tax, total: roundMoney(net + tax) };
}

export function calculateDocument(lines: PricedLine[], globalDiscountPct = 0) {
  const beforeGlobalDiscount = lines.reduce((total, line) => total + calculateLine(line).net, 0);
  const net = roundMoney(beforeGlobalDiscount * (1 - globalDiscountPct / 100));
  const tax = roundMoney(lines.reduce((total, line) => total + calculateLine(line).tax, 0) * (1 - globalDiscountPct / 100));
  return { net, tax, total: roundMoney(net + tax) };
}
