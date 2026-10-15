"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { ConvertRow } from "@/modules/tap/convert.ts";
import { n } from "../marketplace/format";
import { Hud, useToast } from "../marketplace/use-tap-actions";
import { copyText, downloadCsv } from "./file-tools";
import "../marketplace/marketplace.css";
import "../today.css";
import "./links.css";

const PRESETS = ["threads", "whatsapp", "facebook", "instagram", "telegram", "youtube"];
const MAX = 50;
type HistoryRow = { product_id: string; product_name: string | null; image: string | null; tag: string | null; link: string; made_at: string; when?: string };
/** A link's sales in TikTok's link-share channel (from /api/tap/history). */
type Perf = { orders: number; items: number; gmv: number; commission: number; last: string | null; lastWhen?: string };
/** Link-share sales of one product through links made outside Rezekii (TikTok doesn't say which link). */
type Outside = Perf & { product_id: string; product_name: string | null; image: string | null; tag: string | null };
/** Orders counted once each: all, via Rezekii links, via other links, and by tag. */
type Counts = { all: number; mine: number; outside: number; byTag: Record<string, number> };
type HistoryReply = { links?: HistoryRow[]; perf?: Record<string, Perf>; outside?: Outside[]; counts?: Counts | null };
/** Dates as labels, worked out once when the data arrives. */
function labelled(d: HistoryReply) {
  const now = Date.now();
  return {
    links: (d.links ?? []).map((h) => ({ ...h, when: when(h.made_at, now) })),
    perf: Object.fromEntries(Object.entries(d.perf ?? {}).map(([k, p]) => [k, { ...p, lastWhen: p.last ? when(p.last, now) : undefined }])),
    outside: (d.outside ?? []).map((o) => ({ ...o, lastWhen: o.last ? when(o.last, now) : undefined })),
    counts: d.counts ?? null,
  };
}
const getHistory = () => fetch("/api/tap/history", { cache: "no-store" }).then((r) => r.json() as Promise<HistoryReply>).then(labelled);
const rm = (v: number) => `RM${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
/** A Techwide TAP link adds the product to the showcase; it isn't a share link. */
const isTap = (link: string) => link.startsWith("https://affiliate.tiktok.com/");
const tagOf = (h: HistoryRow) => (isTap(h.link) ? "TAP" : h.tag ?? "no tag");
const outTag = (o: Outside) => o.tag ?? "no tag";
type SortKey = "made" | "orders" | "gmv";

// Custom tags are kept on this device, "saved for next time" as in the mockup.
const tagListeners = new Set<() => void>();
let tagCache: { raw: string | null; list: string[] } = { raw: null, list: [] };
const readTags = (): string[] => {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem("rz_tags");
  } catch {}
  if (raw !== tagCache.raw) {
    try {
      tagCache = { raw, list: raw ? (JSON.parse(raw) as string[]).filter((t) => typeof t === "string") : [] };
    } catch {
      tagCache = { raw, list: [] };
    }
  }
  return tagCache.list;
};
const NO_TAGS: string[] = [];
const subscribeTags = (fn: () => void) => {
  tagListeners.add(fn);
  return () => {
    tagListeners.delete(fn);
  };
};
function saveCustomTags(list: string[]) {
  try {
    window.localStorage.setItem("rz_tags", JSON.stringify(list));
  } catch {}
  tagListeners.forEach((fn) => fn());
}

/** "Today 11:02 AM" or "12 Oct 3:30 PM", Malaysia time. */
const when = (iso: string, now: number) => {
  const d = new Date(iso);
  const day = (t: number) => new Date(t + 8 * 3600_000).toISOString().slice(0, 10);
  const today = day(now);
  const label = day(d.getTime()) === today ? "Today" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" });
  return `${label} ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" })}`;
};

/** A sort heading with ▲▼: the first click sorts high to low, the next low to high. */
function SortHead({ label, on, d, go }: { label: string; on: boolean; d: "a" | "d"; go: () => void }) {
  return (
    <button type="button" className={`lk-sort ${on ? "on" : ""}`} onClick={go} aria-label={`Sort by ${label}${on ? (d === "d" ? ", high to low" : ", low to high") : ""}`}>
      {label}<span className="lk-ar" aria-hidden="true"><b className={on && d === "a" ? "on" : ""}>▲</b><b className={on && d === "d" ? "on" : ""}>▼</b></span>
    </button>
  );
}

function Thumb({ src, size }: { src: string | null; size: number }) {
  return src ? (
    // TikTok's image CDN hosts vary, so a plain img.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" style={{ width: size, height: size, borderRadius: size / 4, objectFit: "cover", background: "var(--surface2)", flexShrink: 0 }} />
  ) : (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: size / 4, background: "var(--surface2)", flexShrink: 0 }} />
  );
}

/**
 * The Link converter and, on the same page, the link-share sales of every link made here (owner, 15 Oct 2026: layout A with
 * C's chart of sales by tag; link-share is its own channel, kept apart from the Sales page).
 */
export function LinksView({ handle, linked, weekCount, allCount, start }: { handle: string; linked: boolean; weekCount: number; allCount: number; start: string }) {
  const { toast, flash } = useToast();
  const custom = useSyncExternalStore(subscribeTags, readTags, () => NO_TAGS);
  const [paste, setPaste] = useState(start);
  const [tags, setTags] = useState<string[]>(["threads", "whatsapp"]);
  const [adding, setAdding] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");
  const [prog, setProg] = useState(0);
  const [rows, setRows] = useState<ConvertRow[]>([]);
  const [made, setMade] = useState(0);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);
  const [perf, setPerf] = useState<Record<string, Perf>>({});
  const [outside, setOutside] = useState<Outside[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [hq, setHq] = useState("");
  const [soldOnly, setSoldOnly] = useState(false);
  const [pickTag, setPickTag] = useState<string | null>(null);
  const [sort, setSort] = useState<{ k: SortKey; d: "a" | "d" }>({ k: "made", d: "d" });

  const allTags = [...PRESETS, ...custom.filter((t) => !PRESETS.includes(t))];
  const lines = paste.split("\n").map((l) => l.trim()).filter(Boolean);
  const tooMany = lines.length > MAX;
  const total = Math.max(1, Math.min(lines.length, MAX));
  const ok = rows.filter((r) => r.link);
  const waiting = rows.filter((r) => r.kind === "shop").length;
  const failed = rows.length - ok.length - waiting;

  const show = (d: Awaited<ReturnType<typeof getHistory>>) => { setHistory(d.links); setPerf(d.perf); setOutside(d.outside); setCounts(d.counts); };
  function loadHistory() {
    getHistory().then(show).catch(() => setHistory([]));
  }
  useEffect(() => {
    let live = true;
    getHistory().then((d) => { if (live) { setHistory(d.links); setPerf(d.perf); setOutside(d.outside); setCounts(d.counts); } }).catch(() => live && setHistory([]));
    return () => { live = false; };
  }, []);

  function saveTag() {
    const t = newTag.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 20);
    if (!t) return flash("Type a tag name first", false);
    if (!allTags.includes(t)) {
      saveCustomTags([...custom, t]);
      flash(`Tag "${t}" saved for next time`);
    }
    setTags((x) => (x.includes(t) ? x : [...x, t]));
    setAdding(false);
    setNewTag("");
    setPhase("idle");
  }

  async function convert() {
    if (phase === "loading") return;
    if (!lines.length) return flash("Paste at least one product link", false);
    setPhase("loading");
    setProg(0);
    const out: ConvertRow[] = [];
    const todo = lines.slice(0, MAX);
    for (let i = 0; i < todo.length; i++) {
      try {
        const r = await fetch("/api/tap/convert", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ links: [todo[i]], tags }) });
        const d = (await r.json().catch(() => ({}))) as { rows?: ConvertRow[]; error?: string };
        out.push(...(d.rows ?? [{ input: todo[i], kind: "error", productId: null, name: null, image: null, tag: null, link: null, note: d.error || "Could not convert this link" }]));
      } catch {
        out.push({ input: todo[i], kind: "error", productId: null, name: null, image: null, tag: null, link: null, note: "Could not reach Rezekii. Check your connection." });
      }
      setProg(i + 1);
    }
    setRows(out);
    setMade((m) => m + out.filter((r) => r.link).length);
    setPhase("done");
    loadHistory();
  }

  const rowName = (r: ConvertRow, i: number) => r.name ?? (r.productId ? `Product ${r.productId}` : `Unknown product (line ${i + 1})`);
  async function copyAll() {
    const text = ok.map((r) => `${r.name ?? r.productId ?? ""}${r.tag ? ` (${r.tag})` : r.kind === "tap" ? " (TAP)" : ""}: ${r.link}`).join("\n");
    flash((await copyText(text)) ? `${ok.length} ${ok.length === 1 ? "link" : "links"} copied` : "Copy did not work. Export CSV instead.", true);
  }
  const exportRows = () => downloadCsv("rezekii-links.csv", [["Product", "Product ID", "Tag", "Link", "Note"], ...rows.map((r, i) => [rowName(r, i), r.productId, r.kind === "tap" ? "TAP" : r.tag, r.link, r.link ? "" : r.note])]);
  const q = hq.trim().toLowerCase();
  const none: Perf = { orders: 0, items: 0, gmv: 0, commission: 0, last: null };
  const pf = (h: HistoryRow) => perf[h.link] ?? none;
  const shareLinks = (history ?? []).filter((h) => !isTap(h.link));
  const mine = shareLinks.reduce((a, h) => { const p = pf(h); return { o: a.o + p.orders, g: a.g + p.gmv, c: a.c + p.commission, sold: a.sold + (p.orders ? 1 : 0) }; }, { o: 0, g: 0, c: 0, sold: 0 });
  const other = outside.reduce((a, o) => ({ o: a.o + o.orders, g: a.g + o.gmv, c: a.c + o.commission }), { o: 0, g: 0, c: 0 });
  // Order totals count an order once even when it holds several products (counts from the server).
  const tot = { o: counts?.all ?? mine.o + other.o, g: mine.g + other.g, c: mine.c + other.c };
  // Sales by tag (the channel a link was shared on), from both kinds of link, most first.
  const byTag = Object.values([...shareLinks.map((h) => [tagOf(h), pf(h)] as const), ...outside.map((o) => [outTag(o), o] as const)].reduce<Record<string, { tag: string; o: number; g: number }>>((a, [t, p]) => {
    a[t] ??= { tag: t, o: 0, g: 0 }; a[t].o += p.orders; a[t].g += p.gmv;
    return a;
  }, {})).map((t) => ({ ...t, o: counts?.byTag[t.tag] ?? t.o })).sort((x, y) => y.g - x.g || y.o - x.o);
  const topTag = Math.max(1, ...byTag.map((t) => t.g));
  const best = byTag.find((t) => t.g > 0 && t.tag !== "no tag");
  const key = (h: HistoryRow) => (sort.k === "orders" ? pf(h).orders : sort.k === "gmv" ? pf(h).gmv : Date.parse(h.made_at));
  const histF = (history ?? [])
    .filter((h) => (!q || `${h.product_name ?? ""} ${tagOf(h)} ${h.product_id}`.toLowerCase().includes(q)) && (!soldOnly || pf(h).orders > 0) && (!pickTag || tagOf(h) === pickTag))
    .sort((a, b) => (sort.d === "d" ? key(b) - key(a) : key(a) - key(b)));
  const okey = (o: Outside) => (sort.k === "orders" ? o.orders : sort.k === "gmv" ? o.gmv : Date.parse(o.last ?? "") || 0);
  const outF = outside
    .filter((o) => (!q || `${o.product_name ?? ""} ${outTag(o)} ${o.product_id}`.toLowerCase().includes(q)) && (!soldOnly || o.orders > 0) && (!pickTag || outTag(o) === pickTag))
    .sort((a, b) => (sort.d === "d" ? okey(b) - okey(a) : okey(a) - okey(b)));
  const flip = (k: SortKey) => setSort((x) => ({ k, d: x.k === k && x.d === "d" ? "a" : "d" }));
  const exportHistory = () => downloadCsv("rezekii-link-sales.csv", [
    ["Link made", "Made", "Product", "Product ID", "Tags", "Link", "Orders", "GMV (RM)", "Commission (RM)", "Last sale"],
    ...histF.map((h) => { const p = pf(h); return ["In Rezekii", h.made_at, h.product_name, h.product_id, tagOf(h), h.link, String(p.orders), p.gmv.toFixed(2), p.commission.toFixed(2), p.last ?? ""]; }),
    ...outF.map((o) => ["Outside Rezekii", "", o.product_name, o.product_id, outTag(o), "", String(o.orders), o.gmv.toFixed(2), o.commission.toFixed(2), o.last ?? ""]),
  ]);
  const copy = async (link: string) => flash((await copyText(link)) ? "Link copied" : "Copy did not work. Select the link and copy it.", true);

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <div style={{ minWidth: 0, flex: "1 1 320px" }}>
          <h1 className="nv-title">Link converter</h1>
          <p className="nv-sub">Turn any TikTok product link into your own affiliate link · no phone needed · via TikTok Shop</p>
        </div>
        <a href="#lktrack" className="nv-btn2 nv-press" style={{ textDecoration: "none" }}>Link-share sales</a>
      </div>

      <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
            <section className="nv-up nv-card" aria-labelledby="lkform" style={{ flex: "999 1 560px", minWidth: 0, boxShadow: "var(--shadow)", borderRadius: 26, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <h2 id="lkform" className="nv-h2">Convert links</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                <div style={{ flex: "1 1 260px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <label htmlFor="lkacc" className="nv-label">Make links for</label>
                  <select id="lkacc" className="nv-input" defaultValue={handle}>
                    <option value={handle}>{handle}</option>
                  </select>
                </div>
                <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className="nv-label">Linked through</span>
                  <span style={{ height: 44, display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: linked ? "var(--gink)" : "var(--amber)" }}>
                    <span className={linked ? "nv-dot" : "lk-dot-off"} aria-hidden="true" />
                    {linked ? "TikTok Shop · Affiliate Connection" : "Techwide TAP · TikTok Shop link coming soon"}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <label htmlFor="lkpaste" className="nv-label">TikTok product links, one per line</label>
                  <span style={{ fontSize: 13, color: tooMany ? "var(--amber)" : "var(--muted)", fontWeight: 700 }}>{lines.length} of {MAX} links{tooMany ? ` · only the first ${MAX} are used` : ""}</span>
                </span>
                <textarea id="lkpaste" className="nv-input" rows={5} value={paste} placeholder="https://shop.tiktok.com/view/product/…" onChange={(e) => { setPaste(e.target.value); setPhase("idle"); }} style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span className="nv-label">Tags · one link carries every tag you pick (e.g. {tags.length > 1 ? tags.join("-") : "threads-whatsapp"}), so you can see where it sold</span>
                <div role="group" aria-label="Link tags" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  {allTags.map((t) => {
                    const on = tags.includes(t);
                    return (
                      <button key={t} type="button" className={`nv-chip nv-press${on ? " on" : ""}`} aria-pressed={on} onClick={() => { setTags(on ? tags.filter((x) => x !== t) : [...tags, t]); setPhase("idle"); }}>{t}</button>
                    );
                  })}
                  {adding ? (
                    <span className="nv-expand" style={{ display: "inline-flex", gap: 6 }}>
                      <label htmlFor="lknewtag" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>New tag</label>
                      <input id="lknewtag" type="text" className="nv-input" placeholder="e.g. lemon8" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveTag()} style={{ width: 150, height: 34, fontSize: 13 }} autoFocus />
                      <button type="button" className="nv-btn nv-sm nv-press" onClick={saveTag} style={{ height: 34 }}>Add</button>
                    </span>
                  ) : (
                    <button type="button" className="nv-chip nv-press" onClick={() => { setAdding(true); setNewTag(""); }} style={{ borderStyle: "dashed" }}>+ Custom tag</button>
                  )}
                </div>
                {!linked && <span style={{ fontSize: 12, color: "var(--muted)" }}>Tags apply to TikTok Shop affiliate links. TAP links are one per product.</span>}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
                <button type="button" className="nv-btn nv-press nv-cta" onClick={convert} style={{ height: 52, padding: "0 26px", fontSize: 16 }}>
                  {phase === "loading" && <span className="nv-spin" aria-hidden="true" />}
                  {phase === "loading" ? `Converting ${Math.min(prog + 1, total)} of ${total}…` : phase === "done" ? "Convert again" : `Convert ${lines.length} ${lines.length === 1 ? "link" : "links"}`}
                </button>
                {phase === "loading" && (
                  <span style={{ flex: 1, minWidth: 180 }} className="nv-prog" role="progressbar" aria-label="Progress" aria-valuenow={prog} aria-valuemax={total}>
                    <span style={{ width: `${Math.round((prog / total) * 100)}%` }} />
                  </span>
                )}
              </div>
            </section>

            <section className="nv-up nv-card" aria-labelledby="lkhow" style={{ animationDelay: "80ms", flex: "1 1 300px", padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
              <h2 id="lkhow" className="nv-h2" style={{ fontSize: 18 }}>How it works</h2>
              {[
                `Paste any TikTok product link, or many at once (up to ${MAX}).`,
                linked
                  ? "Rezekii asks TikTok Shop for your affiliate link through your linked account."
                  : "Products in Techwide's TAP campaigns get a TAP link now. Other products need your TikTok Shop link, which opens once TikTok approves Rezekii.",
                linked ? "Copy your link and share it. Sales are credited to your TikTok account and show in Link-share sales below." : "Open a TAP link to add the product to your showcase, then share it as usual.",
              ].map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--gsoft)", color: "var(--gink)", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: 14, lineHeight: 1.5, color: "var(--body)" }}>{t}</span>
                </div>
              ))}
              <div style={{ borderRadius: 16, background: "var(--surface2)", padding: 14, display: "flex", justifyContent: "space-between" }}>
                <span style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: 26, fontWeight: 800 }}>{n(weekCount + made)}</span><span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Links this week</span></span>
                <span style={{ display: "flex", flexDirection: "column", textAlign: "right" }}><span style={{ fontSize: 26, fontWeight: 800 }}>{n(allCount + made)}</span><span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>All time</span></span>
              </div>
              <Link href="/app/lookup" className="nv-link">Look up product facts</Link>
            </section>
          </div>

          {phase === "done" && (
            <section className="nv-up nv-card" aria-labelledby="lkres" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <h2 id="lkres" className="nv-h2" style={{ fontSize: 18 }}>{ok.length} {ok.length === 1 ? "link" : "links"} ready{waiting ? ` · ${waiting} waiting for TikTok Shop` : ""}{failed ? ` · ${failed} failed` : ""}</h2>
                <span style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="nv-btn2 nv-sm nv-press" onClick={copyAll} disabled={!ok.length}>Copy all</button>
                  <button type="button" className="nv-btn2 nv-sm nv-press" onClick={exportRows}>Export CSV</button>
                </span>
              </div>
              <div className="nv-scrollx">
                <div role="table" aria-label="Converted links" style={{ minWidth: 760 }}>
                  <div role="row" className="nv-tr nv-trh" style={{ gridTemplateColumns: "minmax(240px, 2fr) 130px minmax(260px, 3fr) 90px" }}>
                    <span role="columnheader">Product</span><span role="columnheader">Tag</span><span role="columnheader">Affiliate link</span><span role="columnheader" />
                  </div>
                  {rows.map((r, i) => (
                    <div key={i} role="row" className="nv-tr nv-trow nv-up" style={{ gridTemplateColumns: "minmax(240px, 2fr) 130px minmax(260px, 3fr) 90px", animationDelay: `${Math.min(i, 20) * 50}ms` }}>
                      <span role="cell" style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <Thumb src={r.image} size={40} />
                        <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: r.name ? 1 : 0.6 }}>{rowName(r, i)}</span>
                      </span>
                      <span role="cell">
                        <span className={`nv-badge ${r.link ? "b-green" : r.kind === "shop" ? "b-amber" : "b-red"}`}>{r.kind === "tap" ? "TAP" : r.link ? (r.tag ?? "no tag") : r.kind === "shop" ? "waiting" : "failed"}</span>
                      </span>
                      <span role="cell" title={r.link ?? r.note} style={{ fontFamily: r.link ? "ui-monospace, monospace" : undefined, fontSize: 13, color: r.link ? "var(--text)" : r.kind === "shop" ? "var(--amber)" : "var(--red)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>
                        {r.link ?? r.note}
                      </span>
                      <span role="cell" style={{ textAlign: "right" }}>{r.link && <button type="button" className="nv-btn2 nv-sm nv-press" onClick={() => copy(r.link!)}>Copy</button>}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
      </>

      <section id="lktrack" className="nv-up nv-card lk-sales" aria-labelledby="lktrackh" style={{ animationDelay: "120ms" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
          <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: "1 1 360px" }}>
            <h2 id="lktrackh" className="nv-h2">Link-share sales · {handle}</h2>
            <span style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>Every link-share order on your TikTok account, from the links you made here and the links you made in the TikTok app. Kept apart from your Sales page. TikTok doesn&apos;t share link clicks.</span>
          </span>
        </div>

        <div className="lk-tiles">
          {([
            ["Link-share GMV", rm(tot.g), "All your link-share orders"],
            ["Orders", n(tot.o), `${n(counts?.mine ?? mine.o)} via Rezekii links · ${n(counts?.outside ?? other.o)} via other links`],
            ["Commission", rm(tot.c), "Before any agency share"],
            ["Best channel", best ? best.tag : "–", best ? rm(best.g) : tot.o ? "No tagged sales yet" : "No sales yet"],
          ] as [string, string, string][]).map(([k, v, note]) => (
            <div key={k} className="lk-tile"><span className="nv-cap">{k}</span><b>{history === null ? "…" : v}</b><span>{note}</span></div>
          ))}
        </div>

        {tot.o > 0 && (
          <div className="lk-bars" role="group" aria-label="Sales by tag">
            <span className="nv-cap">Where your links sell · tap a tag to see its links</span>
            {byTag.map((t, i) => (
              <button key={t.tag} type="button" className={`lk-bar ${pickTag === t.tag ? "on" : ""}`} aria-pressed={pickTag === t.tag} onClick={() => setPickTag(pickTag === t.tag ? null : t.tag)}>
                <span className="nv-badge b-green" style={{ justifySelf: "start", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>{t.tag}</span>
                <span className="lk-track"><i style={{ width: `${Math.max(2, Math.round((t.g / topTag) * 100))}%`, animationDelay: `${i * 70}ms` }} /></span>
                <span className="lk-barv">{t.g ? rm(t.g) : "–"}<small>{t.o} {t.o === 1 ? "order" : "orders"}</small></span>
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <button type="button" className={`nv-chip nv-press ${soldOnly ? "on" : ""}`} aria-pressed={soldOnly} onClick={() => setSoldOnly(!soldOnly)}>With sales only</button>
          {pickTag && <button type="button" className="nv-chip nv-press on" onClick={() => setPickTag(null)} aria-label={`Remove the ${pickTag} filter`}>Tag: {pickTag} ✕</button>}
          <span style={{ flex: "1 1 0" }} />
          <label htmlFor="lkq" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Search links</label>
          <input id="lkq" type="text" className="nv-input" placeholder="Search product or tag" value={hq} onChange={(e) => setHq(e.target.value)} style={{ width: 220, maxWidth: "100%", height: 38, fontSize: 13 }} />
          <button type="button" className="nv-btn2 nv-press" onClick={exportHistory} disabled={!histF.length && !outF.length}>Export CSV</button>
        </div>

        <div className="lk-subh">
          <h3>Links made in Rezekii</h3>
          {history !== null && <span>{mine.sold} of {shareLinks.length} share {shareLinks.length === 1 ? "link" : "links"} sold</span>}
        </div>

        {history === null ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[0, 1, 2].map((i) => <span key={i} className="nv-skel" style={{ height: 44 }} />)}
          </div>
        ) : (
          <div className="nv-scrollx">
            <div role="table" aria-label="Your links and their link-share sales" style={{ minWidth: 980 }}>
              <div role="row" className="nv-tr nv-trh lk-cols">
                {([["made", "Made"]] as [SortKey, string][]).map(([k, label]) => <span key={k} role="columnheader"><SortHead label={label} on={sort.k === k} d={sort.d} go={() => flip(k)} /></span>)}
                <span role="columnheader">Product</span><span role="columnheader">Tags</span>
                <span role="columnheader"><SortHead label="Orders" on={sort.k === "orders"} d={sort.d} go={() => flip("orders")} /></span>
                <span role="columnheader"><SortHead label="GMV" on={sort.k === "gmv"} d={sort.d} go={() => flip("gmv")} /></span>
                <span role="columnheader">Commission</span><span role="columnheader">Last sale</span><span role="columnheader" />
              </div>
              {histF.map((h, i) => {
                const p = pf(h);
                const tap = isTap(h.link);
                return (
                  <div key={i} role="row" className="nv-tr nv-trow lk-cols">
                    <span role="cell" style={{ whiteSpace: "nowrap", color: "var(--muted)" }}>{h.when}</span>
                    <span role="cell" style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <Thumb src={h.image} size={36} />
                      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <span style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.product_name ?? `Product ${h.product_id}`}</span>
                        <span title={h.link} style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.link}</span>
                      </span>
                    </span>
                    <span role="cell"><span className={`nv-badge ${tap ? "b-gray" : "b-green"}`} style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>{tagOf(h)}</span></span>
                    {tap ? (
                      <span role="cell" style={{ gridColumn: "span 4", fontSize: 13, color: "var(--muted)" }}>Adds the product to your showcase · not a share link</span>
                    ) : (
                      <>
                        <span role="cell" className={`lk-num ${p.orders ? "" : "lk-zero"}`}>{n(p.orders)}</span>
                        <span role="cell" className={`lk-num ${p.orders ? "" : "lk-zero"}`}>{p.gmv ? rm(p.gmv) : "–"}</span>
                        <span role="cell" className={`lk-num ${p.orders ? "" : "lk-zero"}`}>{p.commission ? rm(p.commission) : "–"}</span>
                        <span role="cell" style={{ fontSize: 13, color: "var(--muted)", whiteSpace: "nowrap" }}>{p.lastWhen ?? "–"}</span>
                      </>
                    )}
                    <span role="cell" style={{ textAlign: "right" }}><button type="button" className="nv-btn2 nv-sm nv-press" onClick={() => copy(h.link)}>Copy</button></span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {history !== null && !histF.length && (
          <span style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>{q || soldOnly || pickTag ? "No links match these filters." : "No links yet. Convert a product link to start tracking its sales."}</span>
        )}

        {history !== null && outside.length > 0 && (
          <>
            <div className="lk-subh">
              <h3>Links made outside Rezekii</h3>
              <span>Link-share orders from links you made in the TikTok app. TikTok doesn&apos;t say which link, so they&apos;re added up by product.</span>
            </div>
            <div className="nv-scrollx">
              <div role="table" aria-label="Link-share sales from links made outside Rezekii" style={{ minWidth: 860 }}>
                <div role="row" className="nv-tr nv-trh lk-cols2">
                  <span role="columnheader">Product</span><span role="columnheader">Tags</span>
                  <span role="columnheader"><SortHead label="Orders" on={sort.k === "orders"} d={sort.d} go={() => flip("orders")} /></span>
                  <span role="columnheader"><SortHead label="GMV" on={sort.k === "gmv"} d={sort.d} go={() => flip("gmv")} /></span>
                  <span role="columnheader">Commission</span>
                  <span role="columnheader"><SortHead label="Last sale" on={sort.k === "made"} d={sort.d} go={() => flip("made")} /></span>
                </div>
                {outF.map((o) => (
                  <div key={`${o.product_id}|${o.tag ?? ""}`} role="row" className="nv-tr nv-trow lk-cols2">
                    <span role="cell" style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <Thumb src={o.image} size={36} />
                      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <span style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.product_name ?? `Product ${o.product_id}`}</span>
                        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: "var(--muted)" }}>Product ID {o.product_id}</span>
                      </span>
                    </span>
                    <span role="cell"><span className={`nv-badge ${o.tag ? "b-green" : "b-gray"}`} style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>{outTag(o)}</span></span>
                    <span role="cell" className={`lk-num ${o.orders ? "" : "lk-zero"}`}>{n(o.orders)}</span>
                    <span role="cell" className={`lk-num ${o.orders ? "" : "lk-zero"}`}>{o.gmv ? rm(o.gmv) : "–"}</span>
                    <span role="cell" className={`lk-num ${o.orders ? "" : "lk-zero"}`}>{o.commission ? rm(o.commission) : "–"}</span>
                    <span role="cell" style={{ fontSize: 13, color: "var(--muted)", whiteSpace: "nowrap" }}>{o.lastWhen ?? "–"}</span>
                  </div>
                ))}
              </div>
            </div>
            {!outF.length && <span style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>No products match these filters.</span>}
          </>
        )}
      </section>
      <Hud toast={toast} />
    </>
  );
}
