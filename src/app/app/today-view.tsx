"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TapProduct } from "@/modules/tap/catalog.ts";
import type { TodayData, TodayStat } from "@/modules/today/today.ts";
import type { ConvertRow } from "@/modules/tap/convert.ts";
import { n } from "./marketplace/format";
import { ProductCard, ProductPanel } from "./marketplace/product-view";
import { Hud, useTap, useToast } from "./marketplace/use-tap-actions";
import "./marketplace/marketplace.css";
import "./today.css";

const IC = {
  video: "M4 5h16v14H4zM10 9l5 3-5 3z",
  live: "M12 12h.01M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7M5.6 18.4a9 9 0 0 1 0-12.8M18.4 5.6a9 9 0 0 1 0 12.8",
  coins: "M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6",
  link: "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1",
  cart: "M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6M10 20.5h.01M17 20.5h.01",
  store: "M3 9l1.5-5h15L21 9M3 9h18v11H3zM3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 20v-6h6v6",
  box: "M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
};

const QUICK: [string, string, string, keyof typeof IC, string, string][] = [
  ["Post a video", "Schedule to your TikTok", "/app/new", "video", "#fe2c55", "#ffffff"],
  ["Convert links", "Your affiliate links", "/app/links", "link", "#25c8f4", "#ffffff"],
  ["TAP Marketplace", "Products with free samples", "/app/marketplace", "store", "#00c073", "#ffffff"],
  ["My TAP products", "Samples, sales, posts", "/app/my-tap", "cart", "#ffc700", "#3b2a00"],
  ["Earnings & level", "Grow to Silver and Gold", "/app/levels", "coins", "#7c3aed", "#ffffff"],
  ["Top LIVEs", "See who sells live", "/app/rankings", "live", "#0d1117", "#25f4ee"],
];

const STAT_LOOK: Record<TodayStat["key"], [string, string, keyof typeof IC, string, string]> = {
  links: ["Links made this week", "/app/links", "link", "#d9f6fd", "#0e7490"],
  showcase: ["Products in showcase", "/app/marketplace", "cart", "#fff4c2", "#8a6100"],
  samples: ["Samples on the way", "/app/my-tap", "box", "#ffe4ea", "#c21f45"],
  open: ["TAP products open", "/app/marketplace", "store", "#e1f8eb", "#007a4b"],
};

const TAGS = ["threads", "whatsapp", "facebook", "instagram", "telegram", "youtube"];
const BADGE = { green: "b-green", blue: "b-blue", amber: "b-amber", red: "b-red" } as const;
const pad2 = (v: number) => String(v).padStart(2, "0");

function Icon({ d, size, stroke, width = 2.2 }: { d: string; size: number; stroke: string; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** Today, as designed in the mockup (Main page): quick actions, this week, picks, link converter, next posts, closing soon and best sellers. */
export function TodayView({ data }: { data: TodayData }) {
  const tap = useTap(data.requestedIds);
  const byId = new Map(data.products.map((p) => [p.id, p]));
  const [now, setNow] = useState(data.now);
  const [sort, setSort] = useState<0 | 1>(0);
  const [open, setOpen] = useState<TapProduct | null>(null);
  const [closing, setClosing] = useState(false);
  const [paste, setPaste] = useState("");
  const [tags, setTags] = useState<string[]>(["threads", "whatsapp"]);
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");
  const [rows, setRows] = useState<ConvertRow[]>([]);
  const { toast: msg, flash } = useToast();
  const [showcase, setShowcase] = useState<{ count: number; tap: number; more: boolean } | null>(null);
  useEffect(() => {
    // The saved showcase count shows straight away; once a day it is recounted from TikTok Shop in the background.
    if (!data.showcaseStale) return;
    fetch("/api/tap/showcase?count=1", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { linked?: boolean; count: number; tap: number; more: boolean }) => d.linked && setShowcase(d))
      .catch(() => {});
  }, [data.showcaseStale]);

  useEffect(() => {
    if (!data.camp) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [data.camp]);

  const openPanel = (p: TapProduct) => {
    setClosing(false);
    setOpen(p);
  };
  const closePanel = () => {
    setClosing(true);
    setTimeout(() => {
      setOpen(null);
      setClosing(false);
    }, 250);
  };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closePanel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const lines = paste.split("\n").map((l) => l.trim()).filter(Boolean);
  const tagsUsed = tags.length ? tags : ["no tag"];

  async function convert() {
    if (phase === "loading") return;
    if (!lines.length) return flash("Paste at least one product link", false);
    setPhase("loading");
    try {
      const r = await fetch("/api/tap/convert", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ links: lines, tags }) });
      const d = (await r.json().catch(() => ({}))) as { rows?: ConvertRow[]; error?: string };
      if (!r.ok || !d.rows) throw new Error(d.error || "Could not convert the links. Please try again.");
      setRows(d.rows);
      setPhase("done");
    } catch (err) {
      setPhase("idle");
      flash(err instanceof Error ? err.message : String(err), false);
    }
  }
  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      flash("Link copied");
    } catch {
      flash("Copy did not work. Select the link and copy it.", false);
    }
  }

  const camp = data.camp;
  const left = camp ? Math.max(0, Math.floor((camp.end * 1000 - now) / 1000)) : 0;
  const campDay = camp ? new Date(camp.end * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" }) : "";
  const best = data.best[sort].map((id) => byId.get(id)).filter((p): p is TapProduct => !!p);
  const picks = data.picks.map(([id, why]) => [byId.get(id), why] as const).filter((x): x is readonly [TapProduct, string] => !!x[0]);
  const hasWaiting = rows.some((r) => r.kind === "shop");

  return (
    <>
      <section className="nv-up" aria-label="Quick actions" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {QUICK.map(([label, note, href, icon, bg, fg]) => (
          <Link key={label} href={href} className="nv-card nv-press td-quick" style={{ textDecoration: "none", color: "var(--text)", padding: 16, display: "flex", flexDirection: "column", gap: 10, borderRadius: 22 }}>
            <span className="td-qico" style={{ background: bg }}><Icon d={IC[icon]} size={24} stroke={fg} /></span>
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <strong style={{ fontSize: 15 }}>{label}</strong>
              <span style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>{note}</span>
            </span>
          </Link>
        ))}
      </section>

      <section className="nv-up nv-card" aria-label="This week" style={{ boxShadow: "var(--shadow)", borderRadius: 26, padding: "24px 12px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 8 }}>
        {data.stats.map((raw) => {
          const st = raw.key === "showcase" && showcase ? { ...raw, value: showcase.count, note: `${showcase.tap} from TAP campaigns${showcase.more ? " · first 200" : ""}` } : raw;
          const [label, href, icon, bg, fg] = STAT_LOOK[st.key];
          return (
            <Link key={st.key} href={href} className="nv-row" style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 16px", borderRadius: 16, textDecoration: "none", color: "var(--text)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="td-sico" style={{ background: bg }}><Icon d={IC[icon]} size={16} stroke={fg} width={2.4} /></span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>{label}</span>
              </span>
              <span style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontSize: 32, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{n(st.value)}</span>
                {st.delta && <span className={`nv-badge ${st.delta.startsWith("-") ? "b-red" : "b-green"}`}>{st.delta}</span>}
              </span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{st.note}</span>
            </Link>
          );
        })}
      </section>

      <section className="nv-up" aria-labelledby="mrec" style={{ animationDelay: "60ms", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 10 }}>
          <span style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: "1 1 320px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="td-ai">✦ AI</span>
              <h2 id="mrec" className="nv-h2" style={{ fontSize: 22 }}>Recommended for you</h2>
            </span>
            <span style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.5 }}>{data.basis}</span>
          </span>
          <Link href="/app/marketplace" className="nv-link">See all</Link>
        </div>
        <div className="mk-grid">
          {picks.map(([p, why]) => (
            <div key={p.id} className="td-rec">
              <span className="td-why">{why}</span>
              <ProductCard p={p} tap={tap} onOpen={openPanel} />
            </div>
          ))}
        </div>
      </section>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
        <section className="nv-up nv-card" aria-labelledby="mconv" style={{ animationDelay: "80ms", flex: "999 1 540px", minWidth: 0, padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <h2 id="mconv" className="nv-h2">Convert product links</h2>
            <Link href="/app/links" className="nv-link">Open link converter</Link>
          </div>
          <label htmlFor="mpaste" className="nv-label">Paste TikTok product links, one per line. Each becomes your own affiliate link.</label>
          <textarea id="mpaste" className="nv-input" rows={3} value={paste} placeholder="https://shop.tiktok.com/view/product/…" onChange={(e) => { setPaste(e.target.value); setPhase("idle"); }} />
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }} role="group" aria-label="Link tags">
            <span className="nv-label" style={{ marginRight: 4 }}>One link per tag</span>
            {TAGS.map((t) => {
              const on = tags.includes(t);
              return (
                <button key={t} type="button" className={`nv-chip nv-press${on ? " on" : ""}`} aria-pressed={on} onClick={() => { setTags(on ? tags.filter((x) => x !== t) : [...tags, t]); setPhase("idle"); }}>
                  {t}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
            <button type="button" className="nv-btn nv-press nv-cta" onClick={convert} style={{ height: 50, padding: "0 24px", fontSize: 16 }}>
              {phase === "loading" && <span className="nv-spin" aria-hidden="true" />}
              {phase === "loading" ? "Converting via TikTok Shop…" : phase === "done" ? "Convert again" : "Convert links"}
            </button>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              {lines.length} {lines.length === 1 ? "link" : "links"} · {tagsUsed.length} {tagsUsed.length === 1 ? "tag" : "tags"}
            </span>
          </div>
          {phase === "done" && (
            <div style={{ borderRadius: 18, background: "var(--surface2)", overflow: "hidden" }}>
              {rows.map((r, i) => (
                <div key={i} className="nv-up" style={{ animationDelay: `${i * 60}ms`, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: "12px 14px", borderTop: i ? "1px solid var(--border)" : 0 }}>
                  <span className={`nv-badge ${r.kind === "tap" || r.kind === "aff" ? "b-green" : r.kind === "shop" ? "b-amber" : "b-red"}`} style={{ background: r.kind === "tap" || r.kind === "aff" ? "var(--surface)" : undefined }}>
                    {r.kind === "aff" ? (r.tag ?? "no tag") : r.kind === "tap" ? "TAP · add to showcase" : r.tag ? `${r.tag} · ${r.note}` : r.note}
                  </span>
                  <span style={{ flex: 1, minWidth: 200, fontFamily: "ui-monospace, monospace", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={r.link ?? r.input}>
                    {r.link ?? r.input}
                  </span>
                  {r.kind === "tap" && r.link && (
                    <a href={r.link} target="_blank" rel="noreferrer" className="nv-btn2 nv-sm nv-press" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Open</a>
                  )}
                  {r.link && <button type="button" className="nv-btn2 nv-sm nv-press" onClick={() => copy(r.link!)}>Copy</button>}
                </div>
              ))}
              {hasWaiting && (
                <p style={{ margin: 0, padding: "12px 14px", borderTop: "1px solid var(--border)", fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                  Tagged affiliate links for any product turn on once TikTok approves Rezekii&apos;s TikTok Shop connection. Products in Techwide&apos;s TAP campaigns work now.
                </p>
              )}
            </div>
          )}
        </section>

        <div style={{ flex: "1 1 320px", display: "flex", flexDirection: "column", gap: 24 }}>
          <section className="nv-up nv-card" aria-labelledby="mnext" style={{ animationDelay: "110ms", padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <h2 id="mnext" className="nv-h2" style={{ fontSize: 19 }}>Your next posts</h2>
              <Link href="/app/posts" className="nv-link">My posts</Link>
            </div>
            {data.nextPosts.length ? (
              data.nextPosts.map((np, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="td-sico" style={{ width: 36, height: 36, borderRadius: 11, background: np.posted ? "#0d1117" : "#fe2c55" }}><Icon d={IC.video} size={18} stroke="#ffffff" /></span>
                  <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{np.title}</span>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>{np.when}</span>
                  </span>
                  <span className={`nv-badge ${BADGE[np.tone]}`}>{np.status}</span>
                </div>
              ))
            ) : (
              <span style={{ fontSize: 14, color: "var(--muted)" }}>Nothing scheduled yet. Post a video now or pick a time.</span>
            )}
            <Link href="/app/new" className="nv-btn nv-press" style={{ height: 42, fontSize: 14, textDecoration: "none" }}>New post</Link>
          </section>
        </div>
      </div>

      {camp && (
        <Link href="/app/marketplace" className="nv-up nv-press td-camp" style={{ animationDelay: "240ms" }}>
          <span className="td-camp-copy">
            <span className="td-camp-tag">TAP CAMPAIGNS · CLOSING SOON</span>
            <span className="td-camp-title">{camp.products} {camp.products === 1 ? "product" : "products"} closing soon, up to {camp.upto}% commission</span>
            <span className="td-camp-sub">
              {camp.campaigns} {camp.campaigns === 1 ? "campaign closes" : "campaigns close"} in the next 30 days. First: {camp.first} on {campDay}. Add them to your showcase before they go.
            </span>
          </span>
          <span className="td-camp-time" aria-label={`Time left until ${camp.first} closes`}>
            {([[Math.floor(left / 86400), "days"], [pad2(Math.floor((left % 86400) / 3600)), "hrs"], [pad2(Math.floor((left % 3600) / 60)), "min"], [pad2(left % 60), "sec"]] as const).map(([v, u]) => (
              <span key={u} className="td-camp-cell"><b>{v}</b><small>{u}</small></span>
            ))}
          </span>
        </Link>
      )}

      <section className="nv-up" aria-labelledby="mtap" style={{ animationDelay: "300ms", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <h2 id="mtap" className="nv-h2" style={{ fontSize: 22 }}>Best-selling TAP products</h2>
            <span style={{ fontSize: 14, color: "var(--muted)" }}>{sort === 0 ? "Most units sold since yesterday" : "Highest Silver commission first"}</span>
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 14px", minWidth: 0 }}>
            <div className="nv-seg td-seg" role="group" aria-label="Sort products">
              <span className="nv-segthumb" aria-hidden="true" style={{ width: "calc(50% - 2px)", transform: sort === 0 ? "translateX(0)" : "translateX(100%)" }} />
              {(["Selling now", "Highest commission"] as const).map((label, i) => (
                <button key={label} type="button" className={sort === i ? "on" : ""} aria-pressed={sort === i} onClick={() => setSort(i as 0 | 1)}>{label}</button>
              ))}
            </div>
            <Link href="/app/my-tap" className="nv-link">My TAP products</Link>
            <Link href="/app/marketplace" className="nv-link nv-hidem">See all</Link>
          </div>
        </div>
        <div className="mk-grid">
          {best.map((p) => <ProductCard key={p.id} p={p} tap={tap} onOpen={openPanel} />)}
        </div>
      </section>

      {open && <ProductPanel p={open} tap={tap} closing={closing} onClose={closePanel} />}
      <Hud toast={msg ?? tap.toast} />
    </>
  );
}
