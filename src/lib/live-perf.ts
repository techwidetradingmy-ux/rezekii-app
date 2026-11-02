"use client";

import { useEffect, useState } from "react";
import { useDemo } from "@/components/demo";
import type { RangeKey, VideoRow } from "./mock-creator2";
import { useSharedRange, type SharedRange } from "./range";

/** Performance on real data (owner, 31 Oct 2026), loaded once per visit and shared by the video, LIVE and product lists. */
export type LivePerf = {
  videos: VideoRow[];
  /** Each product in a LIVE: id, commission, orders, cancel rate, GMV, items, cancelled items. */
  lives: { id: string; date: string; time: string; orders: number; gmv: number; commission: number; cancel: number; items?: number; cancelItems?: number; start?: number; end?: number; products: [string, number, number, number, number, number?, number?][] }[];
  products: { productId: string; commission: number; orders: number; cancel: number; items?: number; cancelItems?: number; prevOrders: number; split: { video: number; live: number; other: number } }[];
  names: Record<string, { name: string; img: string | null }>;
  /** Cancel rate by items (owner, 1 Nov 2026). */
  totals: { orders: number; cancelled: number; returns: number; items?: number; cancelItems?: number; cancelRate: number; clawback: number };
  asOf: string;
  /** When her orders and videos were last read from TikTok (the older of the two). */
  updated: string | null;
};

/** A plain tile for a product without a photo. */
export const NO_PHOTO = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="12" fill="#e6f4ec"/><path d="M26 30h28l-3 24H29z" fill="none" stroke="#00a862" stroke-width="3" stroke-linejoin="round"/><path d="M33 30a7 7 0 0 1 14 0" fill="none" stroke="#00a862" stroke-width="3"/></svg>');

const caches = new Map<string, Promise<LivePerf>>();
const DAYS: Record<RangeKey, number> = { "3 days": 3, "7 days": 7, "14 days": 14, "30 days": 30, "90 days": 90, Lifetime: 0 };
const mytDay = (ms: number) => new Date(ms + 8 * 3_600_000).toISOString().slice(0, 10);
/** The Malaysia days a shared range covers. */
export function spanOf(r: SharedRange): [string, string] {
  if (r.custom) return r.custom;
  const n = DAYS[r.preset];
  return [n ? mytDay(Date.now() - (n - 1) * 86_400_000) : "2020-01-01", mytDay(Date.now())];
}

/**
 * Her real performance when signed in; null signed out (the lists keep their sample data). `withRange`: for the days picked on
 * Analytics or Performance (owner, 1 Nov 2026), loading again when they change; otherwise the last 30 days.
 */
export function useLivePerf(withRange = false): LivePerf | "wait" | "error" | null {
  const { live } = useDemo();
  const [range] = useSharedRange();
  const span = withRange ? spanOf(range) : null;
  const key = span ? `from=${span[0]}&to=${span[1]}` : "";
  const [d, setD] = useState<{ key: string; v: LivePerf | "wait" | "error" }>({ key: "", v: "wait" });
  useEffect(() => {
    if (!live) return;
    let on = true;
    let p = caches.get(key);
    if (!p) {
      p = fetch(`/api/v2/performance${key ? `?${key}` : ""}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))));
      caches.set(key, p);
    }
    p.then((v) => { if (on) setD({ key, v }); }).catch(() => { caches.delete(key); if (on) setD({ key, v: "error" }); });
    return () => { on = false; };
  }, [live, key]);
  return live ? (d.key === key ? d.v : "wait") : null;
}

/** A TikTok product title without its [promo] prefixes, cut to fit one line. */
export const shortName = (n: string) => { const t = n.replace(/^(\s*[\[(【][^\])】]*[\])】]\s*)+/, "").trim() || n; return t.length > 30 ? `${t.slice(0, 28).trimEnd()}…` : t; };

/** A product's name and photo from the performance data. */
export const perfProduct = (p: LivePerf, id: string) => ({ id, name: p.names[id]?.name ?? "Product", img: p.names[id]?.img ?? NO_PHOTO });
