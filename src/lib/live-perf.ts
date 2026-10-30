"use client";

import { useEffect, useState } from "react";
import { useDemo } from "@/components/demo";
import type { VideoRow } from "./mock-creator2";

/** Performance on real data (owner, 31 Oct 2026), loaded once per visit and shared by the video, LIVE and product lists. */
export type LivePerf = {
  videos: VideoRow[];
  lives: { id: string; date: string; time: string; orders: number; gmv: number; commission: number; cancel: number; products: [string, number, number, number, number][] }[];
  products: { productId: string; commission: number; orders: number; cancel: number; prevOrders: number; split: { video: number; live: number; other: number } }[];
  names: Record<string, { name: string; img: string | null }>;
  totals: { orders: number; cancelled: number; returns: number; cancelRate: number; clawback: number };
  asOf: string;
};

/** A plain tile for a product without a photo. */
export const NO_PHOTO = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="12" fill="#e6f4ec"/><path d="M26 30h28l-3 24H29z" fill="none" stroke="#00a862" stroke-width="3" stroke-linejoin="round"/><path d="M33 30a7 7 0 0 1 14 0" fill="none" stroke="#00a862" stroke-width="3"/></svg>');

let cache: Promise<LivePerf> | null = null;

/** Her real performance when signed in; null signed out (the lists keep their sample data). */
export function useLivePerf(): LivePerf | "wait" | "error" | null {
  const { live } = useDemo();
  const [d, setD] = useState<LivePerf | "wait" | "error">("wait");
  useEffect(() => {
    if (!live) return;
    cache ??= fetch("/api/v2/performance", { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))));
    cache.then(setD).catch(() => { cache = null; setD("error"); });
  }, [live]);
  return live ? d : null;
}

/** A product's name and photo from the performance data. */
/** A TikTok product title without its [promo] prefixes, cut to fit one line. */
export const shortName = (n: string) => { const t = n.replace(/^(\s*[\[(【][^\])】]*[\])】]\s*)+/, "").trim() || n; return t.length > 30 ? `${t.slice(0, 28).trimEnd()}…` : t; };

export const perfProduct = (p: LivePerf, id: string) => ({ id, name: p.names[id]?.name ?? "Product", img: p.names[id]?.img ?? NO_PHOTO });
