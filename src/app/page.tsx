"use client";

import { useState } from "react";
import { STORES, type CompareResult, type Product, type ShoppingItem, type StoreId } from "@/lib/types";

const money = (n: number) => `$${n.toFixed(2)}`;

export default function Home() {
  const [list, setList] = useState("");
  const [stores, setStores] = useState<StoreId[]>(Object.keys(STORES) as StoreId[]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [picks, setPicks] = useState<Record<string, Product>>({});
  // User-entered aisle numbers, keyed "store:department". Saved in this browser.
  const [aisles, setAisles] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem("aisles") ?? "{}");
    } catch {
      return {};
    }
  });
  const setAisle = (key: string, v: string) =>
    setAisles((cur) => {
      const next = { ...cur, [key]: v };
      try {
        localStorage.setItem("aisles", JSON.stringify(next));
      } catch {}
      return next;
    });

  // Re-group items by the (possibly user-swapped) chosen product's store.
  const lists = (() => {
    if (!result) return [];
    const all = result.lists.flatMap((l) => l.items);
    const by = new Map<StoreId, { item: ShoppingItem; p: Product }[]>();
    for (const item of all) {
      const p = picks[item.query] ?? item.best;
      if (!p) continue;
      by.set(p.store, [...(by.get(p.store) ?? []), { item, p }]);
    }
    return [...by.entries()].map(([store, rows]) => {
      // Entered aisle numbers sort first (ascending); unnumbered departments follow in walk order.
      const num = (r: { item: ShoppingItem }) => {
        const n = parseFloat(aisles[`${store}:${r.item.department}`] ?? "");
        return Number.isNaN(n) ? Infinity : n;
      };
      rows.sort(
        (a, b) =>
          (num(a) === num(b) ? 0 : num(a) < num(b) ? -1 : 1) ||
          a.item.deptOrder - b.item.deptOrder ||
          a.item.query.localeCompare(b.item.query),
      );
      return { store, name: STORES[store].name, rows, total: rows.reduce((t, r) => t + r.p.price * r.item.qty, 0) };
    });
  })();
  const grandTotal = lists.reduce((t, l) => t + l.total, 0);

  const toggleStore = (s: StoreId) =>
    setStores((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  async function run() {
    setLoading(true);
    setError("");
    setResult(null);
    setChecked({});
    setPicks({});
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list, stores }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
      <h1 className="text-2xl font-bold">Grocery Price Compare</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Paste your list (one item per line, or comma-separated). Prefix a number for quantity, e.g. &ldquo;2 milk&rdquo;.
      </p>

      <textarea
        className="mt-4 h-40 w-full rounded-lg border border-neutral-300 p-3 dark:border-neutral-700 dark:bg-neutral-900"
        placeholder={"milk\neggs\n2 bread\nbananas\nchicken breast"}
        value={list}
        onChange={(e) => setList(e.target.value)}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {(Object.keys(STORES) as StoreId[]).map((s) => (
          <label
            key={s}
            className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${
              stores.includes(s) ? "border-green-600 bg-green-600 text-white" : "border-neutral-300"
            }`}
          >
            <input type="checkbox" className="hidden" checked={stores.includes(s)} onChange={() => toggleStore(s)} />
            {STORES[s].name}
          </label>
        ))}
      </div>

      <button
        onClick={run}
        disabled={loading || !list.trim() || !stores.length}
        className="mt-4 rounded-lg bg-green-600 px-5 py-2 font-medium text-white disabled:opacity-50"
      >
        {loading ? "Comparing prices… (can take a minute)" : "Find best prices"}
      </button>
      {error && <p className="mt-3 text-red-600">{error}</p>}

      {result && (
        <section className="mt-8 space-y-6">
          <div className="rounded-lg bg-green-50 p-4 text-green-900 dark:bg-green-950 dark:text-green-100">
            <div className="text-lg font-semibold">Total: {money(grandTotal)}</div>
            {result.singleStoreBest && result.singleStoreBest.total - grandTotal > 0.005 && (
              <div className="text-sm">
                Saves {money(result.singleStoreBest!.total - grandTotal)} vs. buying everything at {result.singleStoreBest.name} (
                {money(result.singleStoreBest.total)}).
              </div>
            )}
            {result.notFound.length > 0 && (
              <div className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                Not found anywhere: {result.notFound.join(", ")}
              </div>
            )}
          </div>

          {lists.map((l) => {
            let lastDept = "";
            return (
              <div key={l.store} className="rounded-lg border border-neutral-300 dark:border-neutral-700">
                <div className="flex items-baseline justify-between border-b border-neutral-300 p-3 dark:border-neutral-700">
                  <h2 className="text-lg font-semibold">{l.name}</h2>
                  <span className="text-sm text-neutral-500">
                    {l.rows.length} items · {money(l.total)}
                  </span>
                </div>
                <ul>
                  {l.rows.map(({ item: it, p }) => {
                    const id = `${l.store}:${it.query}`;
                    const showDept = it.department !== lastDept;
                    lastDept = it.department;
                    return (
                      <li key={id}>
                        {showDept && (
                          <div className="flex items-center justify-between bg-neutral-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                            <span>{it.department}</span>
                            <label className="flex items-center gap-1 normal-case">
                              Aisle
                              <input
                                className="w-12 rounded border border-neutral-300 bg-transparent px-1 text-center dark:border-neutral-600"
                                inputMode="decimal"
                                placeholder="#"
                                value={aisles[`${l.store}:${it.department}`] ?? ""}
                                onChange={(e) => setAisle(`${l.store}:${it.department}`, e.target.value)}
                              />
                            </label>
                          </div>
                        )}
                        <label className="flex cursor-pointer items-start gap-3 p-3">
                          <input
                            type="checkbox"
                            className="mt-1 h-5 w-5"
                            checked={!!checked[id]}
                            onChange={() => setChecked((c) => ({ ...c, [id]: !c[id] }))}
                          />
                          <span className={`flex-1 ${checked[id] ? "text-neutral-400 line-through" : ""}`}>
                            <span className="font-medium">
                              {it.qty > 1 ? `${it.qty}× ` : ""}
                              {p.name}
                            </span>
                            <span className="block text-xs text-neutral-500">
                              {p.size} · for &ldquo;{it.query}&rdquo;
                            </span>
                            {it.alternatives.length > 0 && (
                              <select
                                className="mt-1 max-w-full rounded border border-neutral-300 bg-transparent text-xs dark:border-neutral-700"
                                value={p.url}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  const opts = [it.best!, ...it.alternatives];
                                  const next = opts.find((o) => o.url === e.target.value);
                                  if (next) setPicks((c) => ({ ...c, [it.query]: next }));
                                }}
                              >
                                {[it.best!, ...it.alternatives].map((o) => (
                                  <option key={o.url} value={o.url}>
                                    {STORES[o.store].name}: {o.name} {o.size} {money(o.price)}
                                  </option>
                                ))}
                              </select>
                            )}
                          </span>
                          <span className="font-mono">{money(p.price * it.qty)}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          <p className="text-xs text-neutral-500">
            Prices come from each store&apos;s Instacart storefront and may be higher than in-store shelf prices.
          </p>
        </section>
      )}
    </main>
  );
}
