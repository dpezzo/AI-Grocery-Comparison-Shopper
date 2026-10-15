import { departmentFor } from "./departments";
import { searchStore } from "./scraper";
import { STORES, type CompareResult, type Product, type ShoppingItem, type StoreId, type StoreList } from "./types";

export interface ParsedLine {
  query: string;
  qty: number;
}

export function parseList(text: string): ParsedLine[] {
  return text
    .split(/[\n,;]+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(\d+)\s*(?:x\s*)?(.+)$/i);
      return m ? { qty: parseInt(m[1], 10), query: m[2].trim() } : { qty: 1, query: l };
    });
}

const stem = (w: string) => w.toLowerCase().replace(/(ies|es|s)$/, "");

const DERIVED = ["yogurt", "chip", "chips", "bar", "bars", "cookie", "cookies", "cake", "juice", "smoothie", "pouch", "pouches", "snack", "candy", "cereal", "muffin", "pudding", "flavored", "shake", "chocolate", "almond", "oat", "soy", "coconut", "creamer", "condensed", "evaporated", "pie", "bread", "baby food", "puree", "dried", "freeze"];

/** Keep products whose names contain every query word; drop "derived" products and organic unless asked. */
function relevant(query: string, products: Product[]): Product[] {
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter((w) => w.length > 1).map(stem);
  const wantsOrganic = /organic/.test(q);
  return products.filter((p) => {
    const name = p.name.toLowerCase();
    if (!words.every((w) => name.includes(w))) return false;
    if (!wantsOrganic && /organic/.test(name)) return false;
    return !DERIVED.some((d) => !q.includes(d) && new RegExp(`\\b${d}\\b`).test(name));
  });
}

function rank(a: Product, b: Product): number {
  if (a.unitPrice !== null && b.unitPrice !== null && a.unitKind === b.unitKind) {
    return a.unitPrice - b.unitPrice;
  }
  return a.price - b.price;
}

async function pool<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

export async function compare(lines: ParsedLine[], stores: StoreId[]): Promise<CompareResult> {
  const jobs = lines.flatMap((l) => stores.map((s) => ({ line: l, store: s })));
  const results = await pool(jobs, 4, async (j) => {
    try {
      return await searchStore(j.store, j.line.query);
    } catch {
      return [] as Product[];
    }
  });

  const notFound: string[] = [];
  const perStore = new Map<StoreId, ShoppingItem[]>(stores.map((s) => [s, []]));
  const storeTotals = new Map<StoreId, { total: number; complete: boolean }>(
    stores.map((s) => [s, { total: 0, complete: true }]),
  );
  let optimalTotal = 0;

  lines.forEach((line) => {
    const cands: Product[] = [];
    const bestByStore = new Map<StoreId, Product>();
    jobs.forEach((j, idx) => {
      if (j.line !== line) return;
      const ok = relevant(line.query, results[idx]).sort(rank);
      if (ok[0]) bestByStore.set(j.store, ok[0]);
      cands.push(...ok);
    });
    for (const s of stores) {
      const b = bestByStore.get(s);
      const t = storeTotals.get(s)!;
      if (b) t.total += b.price * line.qty;
      else t.complete = false;
    }
    // Compare across stores by unit price when comparable, otherwise by sticker price.
    const best = [...bestByStore.values()].sort(rank)[0] ?? null;
    if (!best) {
      notFound.push(line.query);
      return;
    }
    optimalTotal += best.price * line.qty;
    const { department, deptOrder } = departmentFor(line.query);
    perStore.get(best.store)!.push({
      query: line.query,
      qty: line.qty,
      department,
      deptOrder,
      best,
      alternatives: cands.filter((c) => c !== best).sort(rank).slice(0, 5),
    });
  });

  const lists: StoreList[] = stores
    .map((s) => {
      const items = perStore.get(s)!.sort((a, b) => a.deptOrder - b.deptOrder || a.query.localeCompare(b.query));
      return {
        store: s,
        name: STORES[s].name,
        total: items.reduce((sum, i) => sum + (i.best?.price ?? 0) * i.qty, 0),
        items,
      };
    })
    .filter((l) => l.items.length > 0);

  const complete = stores
    .filter((s) => storeTotals.get(s)!.complete)
    .map((s) => ({ store: s, name: STORES[s].name, total: storeTotals.get(s)!.total }))
    .sort((a, b) => a.total - b.total);
  const singleStoreBest = complete[0] ?? null;

  return {
    lists,
    notFound,
    total: optimalTotal,
    singleStoreBest,
    savings: singleStoreBest ? Math.max(0, singleStoreBest.total - optimalTotal) : 0,
  };
}
