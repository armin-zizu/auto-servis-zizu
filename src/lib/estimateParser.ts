import { PartLineItem } from '@/app/work-order-managment/data/mockWorkOrders';

function parseNumber(value: string): number {
  const normalized = value.replace(/\s/g, '');
  const commaIndex = normalized.lastIndexOf(',');
  const dotIndex = normalized.lastIndexOf('.');

  if (commaIndex >= 0 && dotIndex >= 0) {
    const decimalSeparator = commaIndex > dotIndex ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
    return Number(
      normalized.replace(new RegExp(`\\${thousandsSeparator}`, 'g'), '').replace(decimalSeparator, '.')
    );
  }
  if (commaIndex >= 0) {
    const decimals = normalized.length - commaIndex - 1;
    return Number(decimals > 0 && decimals <= 2 ? normalized.replace(',', '.') : normalized.replace(/,/g, ''));
  }
  if (dotIndex >= 0) {
    const decimals = normalized.length - dotIndex - 1;
    return Number(decimals > 0 && decimals <= 2 ? normalized : normalized.replace(/\./g, ''));
  }
  return Number(normalized);
}

export function parseEstimateText(text: string): PartLineItem[] {
  const ignoredLine = /^(subtotal|sub-total|total|ukupno|za uplatu|pdv|vat|porez|popust|discount|predra[cč]un|ra[cč]un|invoice|datum|date|strana|page)\b/i;
  const numericToken = /\d[\d.,]*/g;

  return text
    .split(/\r?\n/)
    .map((line, index) => {
      const cleaned = line.replace(/[|]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!cleaned || ignoredLine.test(cleaned)) return null;

      const matches = [...cleaned.matchAll(numericToken)];
      if (!matches.length) return null;

      const tokenCount = Math.min(matches.length, 3);
      const tail = matches.slice(-tokenCount);
      const descriptionEnd = tail[0].index ?? 0;
      const name = cleaned.slice(0, descriptionEnd).replace(/[\s:;#-]+$/, '').trim();
      if (name.length < 2) return null;

      let qty = 1;
      let unitCost = 0;
      if (tail.length >= 3) {
        qty = parseNumber(tail[0][0]);
        unitCost = parseNumber(tail[1][0]);
      } else if (tail.length === 2) {
        qty = parseNumber(tail[0][0]);
        unitCost = parseNumber(tail[1][0]);
      } else {
        unitCost = parseNumber(tail[0][0]);
      }

      if (!Number.isFinite(qty) || qty <= 0 || qty > 10000) return null;
      if (!Number.isFinite(unitCost) || unitCost <= 0 || unitCost > 10000000) return null;

      const isOil = /(motorno\s+ulje|\bulje\b|engine\s+oil|motor\s+oil|\b\d+w[- ]?\d{2}\b)/i.test(name)
        && !/filter/i.test(name);

      return {
        id: `estimate-part-${Date.now()}-${index}`,
        name,
        qty,
        unitCost,
        category: isOil ? 'oil' : 'part',
      } satisfies PartLineItem;
    })
    .filter((part): part is Exclude<typeof part, null> => part !== null);
}
