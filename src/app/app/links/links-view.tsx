"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
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

function Thumb({ src, size }: { src: string | null; size: number }) {
  return src ? (
    // TikTok's image CDN hosts vary, so a plain img.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" style={{ width: size, height: size, borderRadius: size / 4, objectFit: "cover", background: "var(--surface2)", flexShrink: 0 }} />
  ) : (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: size / 4, background: "var(--surface2)", flexShrink: 0 }} />
  );
}

/** The Link converter, as designed in the mockup (Links page): Convert with tags, and the link history. */
export function LinksView({ handle, linked, weekCount, allCount, start }: { handle: string; linked: boolean; weekCount: number; allCount: number; start: string }) {
  const { toast, flash } = useToast();
  const custom = useSyncExternalStore(subscribeTags, readTags, () => NO_TAGS);
  const [view, setView] = useState<0 | 1>(0);
  const [paste, setPaste] = useState(start);
  const [tags, setTags] = useState<string[]>(["threads", "whatsapp"]);
  const [adding, setAdding] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");
  const [prog, setProg] = useState(0);
  const [rows, setRows] = useState<ConvertRow[]>([]);
  const [made, setMade] = useState(0);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);
  const [hq, setHq] = useState("");

  const allTags = [...PRESETS, ...custom.filter((t) => !PRESETS.includes(t))];
  const lines = paste.split("\n").map((l) => l.trim()).filter(Boolean);
  const tooMany = lines.length > MAX;
  const total = Math.max(1, Math.min(lines.length, MAX));
  const ok = rows.filter((r) => r.link);
  const waiting = rows.filter((r) => r.kind === "shop").length;
  const failed = rows.length - ok.length - waiting;

  function openHistory() {
    setView(1);
    fetch("/api/tap/history", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { links?: HistoryRow[] }) => {
        const now = Date.now();
        setHistory((d.links ?? []).map((h) => ({ ...h, when: when(h.made_at, now) })));
      })
      .catch(() => setHistory([]));
  }

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
    setHistory(null);
    setPhase("done");
  }

  const rowName = (r: ConvertRow, i: number) => r.name ?? (r.productId ? `Product ${r.productId}` : `Unknown product (line ${i + 1})`);
  async function copyAll() {
    const text = ok.map((r) => `${r.name ?? r.productId ?? ""}${r.tag ? ` (${r.tag})` : r.kind === "tap" ? " (TAP)" : ""}: ${r.link}`).join("\n");
    flash((await copyText(text)) ? `${ok.length} ${ok.length === 1 ? "link" : "links"} copied` : "Copy did not work. Export CSV instead.", true);
  }
  const exportRows = () => downloadCsv("rezekii-links.csv", [["Product", "Product ID", "Tag", "Link", "Note"], ...rows.map((r, i) => [rowName(r, i), r.productId, r.kind === "tap" ? "TAP" : r.tag, r.link, r.link ? "" : r.note])]);
  const q = hq.trim().toLowerCase();
  const histF = (history ?? []).filter((h) => !q || `${h.product_name ?? ""} ${h.tag ?? ""} ${h.product_id}`.toLowerCase().includes(q));
  const exportHistory = () => downloadCsv("rezekii-link-history.csv", [["Made", "Product", "Product ID", "Tag", "Link"], ...histF.map((h) => [h.made_at, h.product_name, h.product_id, h.tag ?? "TAP", h.link])]);
  const copy = async (link: string) => flash((await copyText(link)) ? "Link copied" : "Copy did not work. Select the link and copy it.", true);

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
        <div style={{ minWidth: 0, flex: "1 1 320px" }}>
          <h1 className="nv-title">Link converter</h1>
          <p className="nv-sub">Turn any TikTok product link into your own affiliate link · no phone needed · via TikTok Shop</p>
        </div>
        <div className="nv-seg" role="group" aria-label="View" style={{ width: 240 }}>
          <span className="nv-segthumb" aria-hidden="true" style={{ width: "calc(50% - 2px)", transform: view === 0 ? "translateX(0)" : "translateX(100%)" }} />
          <button type="button" className={view === 0 ? "on" : ""} aria-pressed={view === 0} onClick={() => setView(0)}>Convert</button>
          <button type="button" className={view === 1 ? "on" : ""} aria-pressed={view === 1} onClick={openHistory}>History</button>
        </div>
      </div>

      {view === 0 && (
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
                <span className="nv-label">Tags · one link per tag, so you can see which platform sells</span>
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
                linked ? "Copy a link per platform tag. Sales are credited to your TikTok account." : "Open a TAP link to add the product to your showcase, then share it as usual.",
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
      )}

      {view === 1 && (
        <section className="nv-up nv-card" aria-labelledby="lkhist" style={{ boxShadow: "var(--shadow)", borderRadius: 26, padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
            <h2 id="lkhist" className="nv-h2" style={{ flex: 1 }}>Link history · {handle}</h2>
            <label htmlFor="lkq" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Search history</label>
            <input id="lkq" type="text" className="nv-input" placeholder="Search product or tag" value={hq} onChange={(e) => setHq(e.target.value)} style={{ width: 260, maxWidth: "100%" }} />
            <button type="button" className="nv-btn2 nv-press" onClick={exportHistory} disabled={!histF.length}>Export CSV</button>
          </div>
          {history === null ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[0, 1, 2].map((i) => <span key={i} className="nv-skel" style={{ height: 44 }} />)}
            </div>
          ) : (
            <div className="nv-scrollx">
              <div role="table" aria-label="Link history" style={{ minWidth: 820 }}>
                <div role="row" className="nv-tr nv-trh" style={{ gridTemplateColumns: "140px minmax(240px, 2fr) 110px minmax(240px, 2fr) 90px" }}>
                  <span role="columnheader">Made</span><span role="columnheader">Product</span><span role="columnheader">Tag</span><span role="columnheader">Link</span><span role="columnheader" />
                </div>
                {histF.map((h, i) => (
                  <div key={i} role="row" className="nv-tr nv-trow" style={{ gridTemplateColumns: "140px minmax(240px, 2fr) 110px minmax(240px, 2fr) 90px" }}>
                    <span role="cell" style={{ whiteSpace: "nowrap", color: "var(--muted)" }}>{h.when}</span>
                    <span role="cell" style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <Thumb src={h.image} size={36} />
                      <span style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.product_name ?? `Product ${h.product_id}`}</span>
                    </span>
                    <span role="cell"><span className="nv-badge b-green">{h.tag ?? "TAP"}</span></span>
                    <span role="cell" title={h.link} style={{ fontFamily: "ui-monospace, monospace", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{h.link}</span>
                    <span role="cell" style={{ textAlign: "right" }}><button type="button" className="nv-btn2 nv-sm nv-press" onClick={() => copy(h.link)}>Copy</button></span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {history !== null && !histF.length && (
            <span style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>{q ? `No links match "${hq}".` : "No links yet. Convert a product link to start your history."}</span>
          )}
        </section>
      )}
      <Hud toast={toast} />
    </>
  );
}
