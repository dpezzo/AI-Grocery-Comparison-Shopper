import type { Product, StoreId } from "./types";

const TO_BASE: Record<string, { f: number; kind: "oz" | "ct" }> = {
  oz: { f: 1, kind: "oz" },
  "fl oz": { f: 1, kind: "oz" },
  lb: { f: 16, kind: "oz" },
  lbs: { f: 16, kind: "oz" },
  gal: { f: 128, kind: "oz" },
  gl: { f: 128, kind: "oz" },
  qt: { f: 32, kind: "oz" },
  pt: { f: 16, kind: "oz" },
  l: { f: 33.814, kind: "oz" },
  ml: { f: 0.033814, kind: "oz" },
  g: { f: 0.035274, kind: "oz" },
  kg: { f: 35.274, kind: "oz" },
  ct: { f: 1, kind: "ct" },
  count: { f: 1, kind: "ct" },
  each: { f: 1, kind: "ct" },
  ea: { f: 1, kind: "ct" },
  pk: { f: 1, kind: "ct" },
};

const SIZE_RE =
  /(\d+(?:\.\d+)?)\s*(fl oz|oz|lbs?|gal|gl|qt|pt|ml|kg|ct|count|each|ea|pk|l|g)(?![a-z])/;

/** Parse an Instacart card's flattened text into a Product. */
export function parseCard(store: StoreId, href: string, raw: string): Product | null {
  const priceM = raw.match(/Current price: \$(\d+(?:\.\d{2})?)\$\d+/);
  if (!priceM) return null;
  const price = parseFloat(priceM[1]);
  let rest = raw.slice((priceM.index ?? 0) + priceM[0].length);
  rest = rest.replace(/^Original Price: \$\d+\.\d{2}\$\d+\.\d{2}(\d+% off)?/, "");
  rest = rest.replace(/^\d+% off/, "");
  const sizeM = rest.match(SIZE_RE);
  let name = rest;
  let size: string | null = null;
  if (sizeM && sizeM.index !== undefined) {
    name = rest.slice(0, sizeM.index);
    size = sizeM[0];
  } else {
    name = rest.replace(/(Many in stock|Add|Only \d+ left).*$/, "");
  }
  name = name.replace(/^(Spend \$\d+(\.\d+)?, save \$\d+(\.\d+)?|Buy \d+,? get [^A-Z]*|\d+ for \$\d+(\.\d+)?)/i, "").replace(/★+.*$/, "").replace(/\(\d+\)$/, "").trim();
  if (!name) return null;
  let unitPrice: number | null = null;
  let unitKind: "oz" | "ct" | null = null;
  if (sizeM) {
    const u = TO_BASE[sizeM[2].toLowerCase()];
    const q = parseFloat(sizeM[1]);
    if (u && q > 0) {
      unitPrice = price / (q * u.f);
      unitKind = u.kind;
    }
  }
  return { store, name, size, price, unitPrice, unitKind, url: `https://www.instacart.com${href}` };
}
