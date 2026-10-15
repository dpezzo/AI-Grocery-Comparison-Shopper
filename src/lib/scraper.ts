import { existsSync } from "node:fs";
import { chromium, type Browser, type BrowserContext } from "playwright";
import { parseCard } from "./normalize";
import type { Product, StoreId } from "./types";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; products: Product[] }>();

let ctxPromise: Promise<{ browser: Browser; ctx: BrowserContext }> | null = null;
function getContext() {
  ctxPromise ??= (async () => {
    const browser = await chromium.launch({ headless: true });
    // A saved logged-in session (see scripts/login.ts) pins results to the user's own address.
    const state = process.env.INSTACART_STORAGE_STATE ?? ".instacart-state.json";
    const ctx = await browser.newContext({
      userAgent: UA,
      ...(existsSync(state) ? { storageState: state } : {}),
    });
    return { browser, ctx };
  })();
  return ctxPromise;
}

export async function searchStore(store: StoreId, query: string): Promise<Product[]> {
  const key = `${store}:${query.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.products;

  const { ctx } = await getContext();
  const page = await ctx.newPage();
  try {
    await page.goto(
      `https://www.instacart.com/store/${store}/s?k=${encodeURIComponent(query)}`,
      { waitUntil: "domcontentloaded", timeout: 45000 },
    );
    await page.waitForSelector('a[href*="/products/"]', { timeout: 20000 }).catch(() => null);
    const cards = await page.$$eval('a[href*="/products/"]', (as) =>
      as.slice(0, 12).map((a) => ({
        href: a.getAttribute("href") ?? "",
        text: (a.closest("li,div[role=listitem]") ?? a).textContent?.replace(/\s+/g, " ") ?? "",
      })),
    );
    const seen = new Set<string>();
    const products: Product[] = [];
    for (const c of cards) {
      if (seen.has(c.href)) continue;
      seen.add(c.href);
      const p = parseCard(store, c.href, c.text);
      if (p) products.push(p);
    }
    cache.set(key, { at: Date.now(), products });
    return products;
  } finally {
    await page.close();
  }
}
