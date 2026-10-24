import { PartLineItem } from '@/app/work-order-managment/data/mockWorkOrders';

const IGNORED_LINE = /^(?:subtotal|sub\s*-?total|total|ukupno|za uplatu|pdv|vat|porez|popust|discount|predra[cč]un|ra[cč]un|invoice|datum|date|strana|page|opis|artik(a|l)|naziv|koli[cč]ina|kol\.?|cijena|cena|iznos|jed\.?\s*cijena)\b/i;
const MONEY_TOKEN = /(?<![\w])(?:\d{1,3}(?:[ .]\d{3})+|\d+)(?:[,.]\d{1,2})?(?:\s?(?:KM|BAM|EUR|\u20ac|USD|\$))?(?!\w)/gi;
const NUMBER_TOKEN = /\d+(?:[,.]\d+)?/g;

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
    .replace(/\b(?:price|cijena|cena|sa\s+pdv|s\s+pdv|incl\.?\s*vat|ukljucujuci\s+pdv)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:;|#.,-]+|[\s:;|#.,-]+$/g, '')
    .trim();
}

function findQuantity(
  line: string,
  firstPriceIndex: number,
  hasLineTotal: boolean,
  hasPriorDescription: boolean
): { qty: number; index?: number } {
  const markerPatterns = [
    /\b(?:qty|quantity|kol(?:i[cč]ina)?)\s*[:=]?\s*(\d+(?:[,.]\d+)?)/i,
    /(\d+(?:[,.]\d+)?)\s*(?:x|×|kom(?:ad)?|pcs?|jed\.?)/i,
  ];
  for (const pattern of markerPatterns) {
    const match = pattern.exec(line);
    if (match?.index !== undefined) {
      const quantityText = match[1];
      const offset = match[0].lastIndexOf(quantityText);
      const index = match.index + offset;
      const qty = parseMoney(quantityText);
      if (index < firstPriceIndex && Number.isFinite(qty) && qty > 0 && qty <= 10000) {
        return { qty, index };
      }
    }
  }

  // Common invoice row: description | quantity | unit price | row total.
  // Only infer a column quantity when there is also a separate total amount.
  if (hasLineTotal) {
    const beforePrice = line.slice(0, firstPriceIndex);
    const numericTokens = [...beforePrice.matchAll(NUMBER_TOKEN)];
    const candidate = numericTokens[numericTokens.length - 1];
    if (candidate?.index !== undefined) {
      const beforeCandidate = beforePrice.slice(0, candidate.index);
      const qty = parseMoney(candidate[0]);
      if (
        (/[a-zA-ZÀ-ž]/.test(beforeCandidate) || hasPriorDescription) &&
        /(?:^|\s)$/.test(beforeCandidate) &&
        Number.isFinite(qty) && qty > 0 && qty <= 10000
      ) {
        return { qty, index: candidate.index };
      }
    }
  }

  return { qty: 1 };
}

function categoryForName(name: string): 'part' | 'oil' {
  return /(motorno\s+ulje|\bulje\b|engine\s+oil|motor\s+oil|\b\d+w[- ]?\d{2}\b)/i.test(name)
    && !/filter/i.test(name)
    ? 'oil'
    : 'part';
}

/** Parses each product row in the MOTOREX-style table, even if OCR misses headers. */
function parseBosnianColumnEstimate(text: string): PartLineItem[] {
  const rows: PartLineItem[] = [];
  text.split(/\r?\n/).forEach((sourceLine, index) => {
    const line = sourceLine
      .replace(/[|]/g, ' ')
      .replace(/(?<=\d)[Il](?=\s|$)/g, '1')
      .replace(/\s+/g, ' ')
      .trim();
    const unitMatch = /\b(?:K[O0О]M|S[E3]T|PCS?|KOMAD(?:A)?|JED\.?)\.?\s+([0-9Il|]{1,3}(?:[,.][0-9Il|]+)?)/i.exec(line);
    if (!unitMatch || unitMatch.index === undefined) return;

    const prefix = line
      .slice(0, unitMatch.index)
      .replace(/^\s*\d{1,3}[.)]?\s*/, '')
      .replace(/\bFERODO\b/gi, ' ')
      .trim();
    const name = cleanDescription(prefix);
    const qty = parseMoney(unitMatch[1].replace(/[Il|]/g, '1'));

    const prices = [...line.matchAll(/(?<![\w])\d{1,4}[,.][0-9Il|]{2}(?!\d)/g)]
      .filter((match) => !/^\s*%/.test(line.slice((match.index ?? 0) + match[0].length)))
      .map((match) => match[0].replace(/[Il|]/g, '1'));
    if (!name || name.length < 2 || !Number.isFinite(qty) || qty <= 0 || !prices.length) return;

    // In this layout the final decimal amount on each row is the VAT-inclusive total.
    const inclusiveRowTotal = parseMoney(prices[prices.length - 1]);
    const unitCost = inclusiveRowTotal / qty;
    if (!Number.isFinite(unitCost) || unitCost <= 0) return;

    rows.push({
      id: `estimate-part-${Date.now()}-${index}`,
      name,
      qty,
      unitCost,
      category: categoryForName(name),
    });
  });
  return rows;
}

/**
 * Parses each invoice item as name, quantity and VAT-inclusive unit price.
 * Line totals and invoice subtotals are not imported; totals are calculated
 * from quantity × unit price by the work-order form.
 */
export function parseEstimateText(text: string): PartLineItem[] {
  const columnRows = parseBosnianColumnEstimate(text);
  if (columnRows.length) return columnRows;

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

    const amounts = [...line.matchAll(MONEY_TOKEN)].filter((match) => {
      const index = match.index ?? 0;
      const suffix = line.slice(index + match[0].length);
      if (/^\s*%/.test(suffix)) return false;
      return (
        /[,.]\d{1,2}(?:\s?(?:KM|BAM|EUR|USD|\u20ac|\$))?$/i.test(match[0]) ||
        /(?:KM|BAM|EUR|USD|\u20ac|\$)$/i.test(match[0])
      );
    });
    if (!amounts.length) {
      const description = cleanDescription(line);
      if (description && !/^\d+[\s./-]*$/.test(description)) pendingDescription.push(description);
      return;
    }

    // In a typical item row the last amount is the line total; the amount
    // immediately before it is the VAT-inclusive unit price.
    const firstPriceIndex = amounts[0].index ?? line.length;
    let quantity = findQuantity(
      line,
      firstPriceIndex,
      amounts.length > 1,
      pendingDescription.length > 0
    );
    let priceAmounts = amounts;

    // Some invoices print the quantity as a decimal, e.g. 2,00, before the
    // unit price and line total. Treat that first numeric column as quantity.
    if (quantity.index === undefined && amounts.length >= 3) {
      const firstAmount = amounts[0];
      const firstIndex = firstAmount.index ?? line.length;
      const prefix = line.slice(0, firstIndex);
      const candidateQty = parseMoney(firstAmount[0]);
      if (
        (/[a-zA-ZÀ-ž]/.test(prefix) || pendingDescription.length > 0) &&
        Number.isFinite(candidateQty) && candidateQty > 0 && candidateQty <= 10000
      ) {
        quantity = { qty: candidateQty, index: firstIndex };
      }
    }

    if (quantity.index !== undefined) {
      const quantityEnd = quantity.index + (line.slice(quantity.index).match(/^\d+(?:[,.]\d+)?/)?.[0].length ?? 0);
      priceAmounts = amounts.filter((amount) => {
        const amountIndex = amount.index ?? 0;
        return amountIndex < quantity.index! || amountIndex >= quantityEnd;
      });
    }

    const priceMatch = priceAmounts.length > 1
      ? priceAmounts[priceAmounts.length - 2]
      : priceAmounts[0];
    const unitCost = parseMoney(priceMatch[0]);
    const inlineDescription = cleanDescription(
      line.slice(0, quantity.index ?? firstPriceIndex)
    );
    const name = [...pendingDescription, inlineDescription]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    pendingDescription = [];

    if (!name || name.length < 2 || !Number.isFinite(unitCost) || unitCost <= 0) return;
    if (/^(?:\d+[\s.,]*)+$/.test(name)) return;

    const category = categoryForName(name);

    rows.push({
      id: `estimate-part-${Date.now()}-${index}`,
      name,
      qty: quantity.qty,
      unitCost,
      category,
    });
  });

  return rows;
}
