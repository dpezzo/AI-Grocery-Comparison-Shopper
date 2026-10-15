import { NextResponse } from "next/server";
import { compare, parseList } from "@/lib/compare";
import { STORES, type StoreId } from "@/lib/types";


export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const text = typeof body.list === "string" ? body.list : "";
  const requested: string[] = Array.isArray(body.stores) ? body.stores : Object.keys(STORES);
  const stores = requested.filter((s): s is StoreId => s in STORES);
  const lines = parseList(text).slice(0, 60);
  if (!lines.length || !stores.length) {
    return NextResponse.json({ error: "Provide a list and at least one store." }, { status: 400 });
  }
  return NextResponse.json(await compare(lines, stores));
}
