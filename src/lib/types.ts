export type StoreId = "weis-markets" | "giant" | "aldi";

export const STORES: Record<StoreId, { name: string }> = {
  "weis-markets": { name: "Weis Markets" },
  giant: { name: "Giant Food" },
  aldi: { name: "ALDI" },
};

export interface Product {
  store: StoreId;
  name: string;
  size: string | null;
  price: number;
  unitPrice: number | null; // per oz (weight/volume) or per ct
  unitKind: "oz" | "ct" | null;
  url: string;
}

export interface ShoppingItem {
  query: string;
  qty: number;
  department: string;
  deptOrder: number;
  best: Product | null;
  alternatives: Product[];
}

export interface StoreList {
  store: StoreId;
  name: string;
  total: number;
  items: ShoppingItem[];
}

export interface CompareResult {
  lists: StoreList[];
  notFound: string[];
  total: number;
  singleStoreBest: { store: StoreId; name: string; total: number } | null;
  savings: number;
}
