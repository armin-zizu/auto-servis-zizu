import { PartLineItem } from '@/app/work-order-managment/data/mockWorkOrders';

const IGNORED_LINE = /^(?:subtotal|sub\s*-?total|total|ukupno|za uplatu|pdv|vat|porez|popust|discount|predra[cč]un|ra[cč]un|invoice|datum|date|strana|page|opis|artik(a|l)|naziv|koli[cč]ina|kol\.?|cijena|cena|iznos|jed\.?\s*cijena)\b/i;
const MONEY_TOKEN = /(?<![\w])(?:\d{1,3}(?:[ .]\d{3})+|\d+)(?:[,.]\d{1,2})?(?:\s?(?:KM|BAM|EUR|\u20ac|USD|\$))?(?!\w)/gi;

function parseMoney(value: string): number {
  const normalized = value
    .replace(/\s?(?:KM|BAM|EUR|USD|\u20ac|\$)/gi, '')
    .replace(/\s/g, '');
  const commaIndex = normalized.lastIndexOf(',');
  const dotIndex = normalized.lastIndexOf('.');

  if (commaIndex >= 0 && dotIndex >= 0) {
    const decimalSeparator = commaIndex > dotIndex ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
    return Number(
      normalized
        .replace(new RegExp(`\\${thousandsSeparator}`, 'g'), '')
        .replace(decimalSeparator, '.')
    );
  }
  if (commaIndex >= 0) {
    const decimals = normalized.length - commaIndex - 1;
    return Number(
      decimals > 0 && decimals <= 2
        ? normalized.replace(',', '.')
        : normalized.replace(/,/g, '')
    );
  }
  if (dotIndex >= 0) {
    const decimals = normalized.length - dotIndex - 1;
    return Number(decimals > 0 && decimals <= 2 ? normalized : normalized.replace(/\./g, ''));
  }
  return Number(normalized);
}

function cleanDescription(value: string): string {
  return value
    .replace(/^\s*\d+(?:[,.]\d+)?\s*(?:x|×)\s*/i, '')
    .replace(/\b(?:qty|quantity|kol|kom|komad|pcs|pc)\s*:?\s*\d+(?:[,.]\d+)?\s*$/i, '')
    .replace(/\d+(?:[,.]\d+)?\s*(?:kom|komad|pcs|pc)\s*$/i, '')
    .replace(/(?:\s|x)\d+(?:[,.]\d+)?\s*$/i, '')
    .replace(/\b(?:price|cijena|cena|sa\s+pdv|s\s+pdv|incl\.?\s*vat|ukljucujuci\s+pdv)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:;|#.,-]+|[\s:;|#.,-]+$/g, '')
    .trim();
}

/**
 * Parses product descriptions and VAT-inclusive unit prices from estimate OCR.
 * Quantity defaults to one; totals/subtotals are deliberately ignored because
 * the work-order form calculates the total from the accepted item rows.
 */
export function parseEstimateText(text: string): PartLineItem[] {
  const rows: PartLineItem[] = [];
  let pendingDescription: string[] = [];

  text.split(/\r?\n/).forEach((sourceLine, index) => {
    const line = sourceLine.replace(/[|]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!line) return;

    if (IGNORED_LINE.test(line)) {
      // Header/summary rows must not leak into the next item's description.
      if (/^(?:subtotal|sub\s*-?total|total|ukupno|za uplatu|pdv|vat|porez|popust|discount)\b/i.test(line)) {
        pendingDescription = [];
      }
      return;
    }

    const amounts = [...line.matchAll(MONEY_TOKEN)].filter((match) =>
      /[,.]\d{1,2}(?:\s?(?:KM|BAM|EUR|USD|\u20ac|\$))?$/i.test(match[0]) ||
      /(?:KM|BAM|EUR|USD|\u20ac|\$)$/i.test(match[0])
    );
    if (!amounts.length) {
      const description = cleanDescription(line);
      if (description && !/^\d+[\s./-]*$/.test(description)) pendingDescription.push(description);
      return;
    }

    // When a row includes both a VAT-inclusive unit price and a line amount,
    // use the last unit-price-like amount before the final row total.
    const priceMatch = amounts.length > 1 ? amounts[amounts.length - 2] : amounts[0];
    const unitCost = parseMoney(priceMatch[0]);
    const inlineDescription = cleanDescription(
      line.slice(0, amounts[0].index ?? line.length)
    );
    const name = [...pendingDescription, inlineDescription]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    pendingDescription = [];

    if (!name || name.length < 2 || !Number.isFinite(unitCost) || unitCost <= 0) return;
    if (/^(?:\d+[\s.,]*)+$/.test(name)) return;

    const category = /(motorno\s+ulje|\bulje\b|engine\s+oil|motor\s+oil|\b\d+w[- ]?\d{2}\b)/i.test(name)
      && !/filter/i.test(name)
      ? 'oil'
      : 'part';

    rows.push({
      id: `estimate-part-${Date.now()}-${index}`,
      name,
      qty: 1,
      unitCost,
      category,
    });
  });

  return rows;
}
