"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { Compare, FrameData, Range, StatusKey } from "@/modules/sales/frames.ts";
import type { Source } from "@/modules/sales/summary.ts";
import "../marketplace/marketplace.css";
import "./sales.css";

const SOURCES: [Source, string, string][] = [
  ["all", "All your sales", "Everything your TikTok Shop account earned as an affiliate, from any shop or campaign."],
  ["techwide", "Through Techwide TAP", "Sales of products in Techwide's TAP campaigns. These count for your Rezekii level and Rankings."],
  ["other", "Other shops", "Sales from shops and campaigns outside Techwide's TAP campaigns."],
];
/** The owner's time frames, grouped as in the mockup's calendar picker. */
const GROUPS: [string, [string, string][]][] = [
  ["Recent", [["yesterday", "Yesterday"], ["7d", "7 days"], ["14d", "14 days"]]],
  ["Days", [["30d", "30 days"], ["60d", "60 days"], ["90d", "90 days"]]],
  ["Months", [["month", "This month"], ["lastmonth", "Last month"]]],
  ["Longer", [["1y", "1 year"], ["all", "All time"]]],
];
const COMPARE: [Compare, string, string][] = [["none", "Don't compare", "Just this period"], ["prev", "The period before", "Same length, just before"], ["year", "Same time last year", "The same dates a year earlier"]];
const STATUS: Record<StatusKey, [string, string, string, string, string]> = {
  settled: ["Settled", "#00a862", "var(--gsoft)", "TikTok has paid this commission into your account.", "m5 12 5 5 9-10"],
  toSettle: ["To settle", "#2f80ed", "var(--bsoft)", "Delivered. TikTok pays it after the return window closes.", "M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18"],
  awaiting: ["Awaiting payment", "#f2a93b", "var(--asoft)", "The buyer hasn't paid yet.", "M3 7h18v12H3zM3 11h18"],
  refunded: ["Refunded", "#e5484d", "var(--rsoft)", "Returned or refunded, so no commission.", "M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3"],
  ineligible: ["Ineligible", "#8b95a1", "var(--surface2)", "Doesn't qualify for commission (TikTok's rules).", "M18 6 6 18M6 6l12 12"],
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = 86400_000;
const MYT = 8 * 3600_000;
const money = (v: number) => `RM ${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const rm0 = (v: number) => `RM ${Math.round(v).toLocaleString("en-US")}`;
const n = (v: number) => Math.round(v).toLocaleString("en-US");
const ymd = (t: number) => { const d = new Date(t + MYT); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() }; };
/** The label of chart point `i` of a range. */
const pointLabel = (r: Range, i: number) => {
  if (r.unit === "hour") return `${String(i).padStart(2, "0")}:00`;
  if (r.unit === "day") { const x = ymd(r.from + i * DAY); return `${x.d} ${MONTHS[x.m]}`; }
  const x = ymd(r.from); const m = x.m + i; return `${MONTHS[((m % 12) + 12) % 12]} ${x.y + Math.floor(m / 12)}`;
};

/** Counts up to `value` (iOS-style ease-out) whenever it changes. */
function useCountUp(value: number, ms = 700) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const v = a + (value - a) * (1 - Math.pow(1 - k, 3));
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

function Tile({ label, value, format, note, noteColor, delay }: { label: string; value: number; format: (v: number) => string; note: string; noteColor: string; delay: number }) {
  const v = useCountUp(value);
  return (
    <div className="nv-card sl-tile" style={{ animationDelay: `${delay}ms` }}>
      <span className="nv-cap">{label}</span>
      <b>{format(v)}</b>
      <span style={{ fontSize: 13, fontWeight: 600, color: noteColor }}>{note}</span>
    </div>
  );
}

/** GMV over time: the chosen period, and the comparison as a dashed line over the same points. */
function SalesChart({ d }: { d: FrameData }) {
  const id = useId();
  const [at, setAt] = useState<number | null>(null);
  const W = 600, H = 200;
  const cur = d.stats.buckets, cmp = d.compare?.buckets ?? [];
  const len = cur.length;
  const top = Math.max(1, ...cur, ...cmp) * 1.1;
  const x = (i: number) => (len <= 1 ? W / 2 : (i / (len - 1)) * W);
  const y = (v: number) => H - 6 - (v / top) * (H - 16);
  const line = (arr: number[]) => arr.slice(0, len).map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const pick = (clientX: number, el: SVGSVGElement) => { const r = el.getBoundingClientRect(); setAt(Math.max(0, Math.min(len - 1, Math.round(((clientX - r.left) / r.width) * (len - 1))))); };
  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img" aria-label={`GMV per ${d.range.unit} for ${d.range.label}${d.compare ? `, compared with ${d.compare.range.label.toLowerCase()}` : ""}`}
        onMouseMove={(e) => pick(e.clientX, e.currentTarget)} onTouchStart={(e) => pick(e.touches[0].clientX, e.currentTarget)} onMouseLeave={() => setAt(null)} style={{ display: "block", overflow: "visible", cursor: "crosshair" }}>
        <defs>
          <linearGradient id={`${id}f`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#00c073" stopOpacity="0.28" /><stop offset="1" stopColor="#00c073" stopOpacity="0" /></linearGradient>
          <clipPath id={`${id}c`}><rect className="gc-reveal" x={-4} y={-20} width={W + 8} height={H + 40} /></clipPath>
        </defs>
        {[0.25, 0.5, 0.75].map((k) => <line key={k} x1={0} x2={W} y1={H * k} y2={H * k} stroke="var(--line)" vectorEffect="non-scaling-stroke" />)}
        <path className="gc-area" d={`${line(cur)} L${x(len - 1)} ${H} L0 ${H} Z`} fill={`url(#${id}f)`} />
        {d.compare && <path d={line(cmp)} clipPath={`url(#${id}c)`} fill="none" stroke="#2f80ed" strokeWidth="2.2" strokeDasharray="6 5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
        <path d={line(cur)} clipPath={`url(#${id}c)`} fill="none" stroke="#00c073" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {at !== null && <line x1={x(at)} x2={x(at)} y1={0} y2={H} stroke="#00c073" strokeOpacity="0.35" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
      </svg>
      {at !== null && (
        <span className="gc-tip" style={{ left: `${(x(at) / W) * 100}%` }}>
          {pointLabel(d.range, at)} · {money(cur[at] ?? 0)}{d.compare ? ` · before ${money(cmp[at] ?? 0)}` : ""}
        </span>
      )}
    </div>
  );
}

/** Sales, as chosen from the mockup (direction A, with the owner's changes). */
export function SalesView({ initial, handle, syncedAt }: { initial: FrameData; handle: string | null; syncedAt: string | null }) {
  const router = useRouter();
  const [frame, setFrame] = useState("30d");
  const [source, setSource] = useState<Source>("all");
  const [compare, setCompare] = useState<Compare>("none");
  const [d, setD] = useState<FrameData>(initial);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  /** Bumped when new orders were read, so the chosen view is read again. */
  const [tick, setTick] = useState(0);
  const first = useRef(true);

  // A new time frame, source or comparison is read from the server (busy creators have tens of thousands of orders).
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    let live = true;
    setLoading(true);
    fetch(`/api/sales/frame?frame=${encodeURIComponent(frame)}&source=${source}&compare=${compare}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((x: FrameData | null) => { if (live && x) setD(x); })
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [frame, source, compare, tick]);

  // The latest orders from TikTok, in the background (at most every 15 minutes), with no button to press.
  const [reading, setReading] = useState(false);
  useEffect(() => {
    let stop = false;
    (async () => {
      for (let i = 0; i < 6 && !stop; i++) {
        setReading(true);
        const x = (await fetch("/api/sales/refresh", { method: "POST" }).then((r) => r.json()).catch(() => ({}))) as { synced?: boolean; done?: boolean };
        if (x.synced) {
          first.current = false;
          setTick((t) => t + 1);
          router.refresh();
        }
        if (!x.synced || x.done !== false) break;
      }
      if (!stop) setReading(false);
    })();
    return () => { stop = true; };
  }, [router]);

  const s = d.stats;
  const change = d.compare && d.compare.gmv > 0 ? Math.round(((s.gmv - d.compare.gmv) / d.compare.gmv) * 100) : null;
  const sIdx = SOURCES.findIndex(([v]) => v === source);
  const topProduct = s.products[0]?.gmv || 1;
  const topContent = s.content[0]?.gmv || 1;
  const synced = syncedAt ? new Date(syncedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kuala_Lumpur" }) : null;
  const shared = s.partnerShare > 0;
  // Commission settled: what each status earns (the full commission when the creator shares it with a partner).
  const comOf = (k: StatusKey) => { const r = s.status.find((x) => x.key === k)!; return shared && k !== "refunded" && k !== "ineligible" ? r.earned : r.commission; };
  const settled = comOf("settled"), pending = comOf("toSettle") + comOf("awaiting"), total = settled + pending;
  const lost = comOf("refunded") + comOf("ineligible");
  const settledPct = total > 0 ? Math.round((settled / total) * 100) : 0;
  const orderTotal = s.status.reduce((a, r) => a + r.orders, 0) || 1;
  const ringA = total > 0 ? (settled / total) * 360 : 0, ringB = total > 0 ? ((settled + comOf("toSettle")) / total) * 360 : 0;
  const months = Array.from({ length: 12 }, (_, i) => { const t = ymd(d.now); const m = t.m - 11 + i; const yy = t.y + Math.floor(m / 12); const mm = ((m % 12) + 12) % 12; return [`m:${yy}-${String(mm + 1).padStart(2, "0")}`, `${MONTHS[mm]} ${String(yy).slice(2)}`] as const; });
  const key = `${frame}|${source}|${compare}`;

  return (
    <>
      <div className="sl-bar">
        <div className="nv-seg sl-seg" role="group" aria-label="Which sales">
          <span className="nv-segthumb" aria-hidden="true" style={{ width: "calc(33.333% - 1.4px)", transform: `translateX(${sIdx * 100}%)` }} />
          {SOURCES.map(([v, label]) => <button key={v} type="button" className={source === v ? "on" : ""} aria-pressed={source === v} onClick={() => setSource(v)}>{label}</button>)}
        </div>
        <div className="sl-ddw">
          <button type="button" className="sl-dd nv-press" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="4" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>
            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.2 }}>
              <strong>{d.range.label}</strong>
              <span style={{ fontSize: 12, opacity: 0.8 }}>{d.range.dates}{compare !== "none" ? ` · vs ${COMPARE.find(([c]) => c === compare)![1].toLowerCase()}` : ""}</span>
            </span>
            {loading ? <span className="nv-sping" aria-hidden="true" /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>}
          </button>
          {open && (
            <>
              <button type="button" aria-label="Close" className="sl-popdim" onClick={() => setOpen(false)} />
              <div className="sl-pop" role="dialog" aria-label="Choose a time frame">
                {GROUPS.map(([title, items]) => (
                  <div key={title} className="sl-grp">
                    <span className="sl-gt">{title}</span>
                    <div className="sl-opts">{items.map(([k, label]) => <button key={k} type="button" className={`sl-opt ${frame === k ? "on" : ""}`} onClick={() => { setFrame(k); setOpen(false); }}>{label}</button>)}</div>
                  </div>
                ))}
                <div className="sl-grp">
                  <span className="sl-gt">Compare</span>
                  <div className="sl-opts">{COMPARE.map(([c, label, note]) => <button key={c} type="button" className={`sl-opt ${compare === c ? "on" : ""}`} disabled={c === "prev" && frame === "all"} onClick={() => { setCompare(c); setOpen(false); }}><strong>{label}</strong><span>{c === "prev" && frame === "all" ? "Not for all time" : note}</span></button>)}</div>
                </div>
                <div className="sl-grp">
                  <span className="sl-gt">Pick a month</span>
                  <div className="sl-cal">{months.map(([k, label]) => <button key={k} type="button" className={`sl-mo ${frame === k ? "on" : ""}`} onClick={() => { setFrame(k); setOpen(false); }}>{label}</button>)}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <p key={`n-${source}`} className="sl-note">{SOURCES[sIdx][2]}</p>

      <section className="sl-tiles" aria-label="Totals for the period">
        <Tile label={`GMV · ${d.range.label}`} value={s.gmv} format={money} note={change === null ? d.range.dates : `${change >= 0 ? "▲" : "▼"} ${Math.abs(change)}% vs ${d.compare!.range.label.toLowerCase()}`} noteColor={change !== null && change < 0 ? "var(--red)" : "var(--gink)"} delay={0} />
        {shared ? (
          <Tile label="Commission earned" value={s.earned} format={money} note={`${money(s.partnerShare)} to your partner · you keep ${money(s.commission)}`} noteColor="var(--muted)" delay={60} />
        ) : (
          <Tile label="Commission" value={s.commission} format={money} note={pending ? `${money(pending)} not settled yet` : "All settled"} noteColor="var(--muted)" delay={60} />
        )}
        <Tile label="Orders" value={s.orders} format={n} note={`${n(s.items)} ${s.items === 1 ? "item" : "items"} sold`} noteColor="var(--muted)" delay={120} />
        <Tile label="Refunded" value={s.refunded} format={money} note={s.gmv + s.refunded > 0 ? `${Math.round((s.refunded / (s.gmv + s.refunded)) * 100)}% of sales` : "No refunds"} noteColor={s.refunded ? "var(--red)" : "var(--muted)"} delay={180} />
      </section>

      <section className="nv-card sl-card cs-wrap" aria-labelledby="cshead">
        <div className="cs-head">
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
            <h2 id="cshead" className="nv-h2">Commission settled · {d.range.label}</h2>
            <div className="cs-big"><b>{money(settled)}</b><span>of {money(total)} {shared ? "commission earned" : "commission"}</span></div>
            <span className="cs-pill">{settledPct}% of your commission is settled (paid by TikTok)</span>
            <span className="cs-sub"><strong>{n(s.status.find((r) => r.key === "settled")!.orders)}</strong> of {n(orderTotal)} orders settled · {money(s.status.find((r) => r.key === "settled")!.gmv)} in sales{lost > 0 ? ` · ${money(lost)} commission lost to refunds and ineligible orders` : ""}{shared ? " · your partner gets their share of it" : ""}</span>
          </div>
          <div className="cs-ring" role="img" aria-label={`${settledPct}% of commission settled`} style={{ background: `conic-gradient(#00a862 0deg ${ringA}deg, #2f80ed ${ringA}deg ${ringB}deg, #f2a93b ${ringB}deg 360deg)` }}>
            <div className="cs-hole"><strong>{settledPct}%</strong><span>settled</span></div>
          </div>
        </div>
        <div className="cs-track" role="img" aria-label={`Orders by status for ${d.range.label}`}>
          {s.status.map((r) => r.orders > 0 && <i key={`${key}-${r.key}`} style={{ width: `${(r.orders / orderTotal) * 100}%`, background: STATUS[r.key][1] }}><span>{r.orders / orderTotal > 0.09 ? `${STATUS[r.key][0]} ${Math.round((r.orders / orderTotal) * 100)}%` : ""}</span></i>)}
        </div>
        <div className="cs-tiles">
          {s.status.map((r) => {
            const [label, color, soft, help, icon] = STATUS[r.key];
            const isLost = r.key === "refunded" || r.key === "ineligible";
            return (
              <div key={r.key} className="cs-tile" style={{ borderTopColor: color }}>
                <span className="cs-tl"><span className="cs-ic" style={{ background: soft, color }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icon} /></svg></span><strong>{label}</strong></span>
                <span className="cs-n">{n(r.orders)} <small>orders · {Math.round((r.orders / orderTotal) * 100)}%</small></span>
                <span className="cs-row"><span>Sales</span><strong>{money(r.gmv)}</strong></span>
                <span className="cs-row"><span>Commission</span><strong style={{ color: r.key === "settled" ? "var(--gink)" : isLost ? "var(--red)" : "var(--text)" }}>{isLost ? (r.commission > 0 ? `None (${money(r.commission)} lost)` : "None") : money(comOf(r.key))}</strong></span>
                <span className="cs-help">{help}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="nv-card sl-card" aria-labelledby="slchart">
        <div className="sl-head">
          <h2 id="slchart" className="nv-h2">GMV over time · {d.range.label}</h2>
          <span className="sl-split">
            <i style={{ background: "#00c073" }} />{d.range.label} {rm0(s.gmv)}
            {d.compare && <><i style={{ background: "#2f80ed" }} />{d.compare.range.label} {rm0(d.compare.gmv)}</>}
          </span>
        </div>
        {d.compare && change !== null && (
          <span className="sl-delta" style={{ background: change < 0 ? "var(--rsoft)" : "var(--gsoft)", color: change < 0 ? "var(--red)" : "var(--gink)" }}>
            {change >= 0 ? "▲" : "▼"} {Math.abs(change)}% GMV · {rm0(Math.abs(s.gmv - d.compare.gmv))} {change >= 0 ? "more" : "less"} than {d.compare.range.label.toLowerCase()} ({d.compare.range.dates})
          </span>
        )}
        {source === "all" && s.gmv > 0 && (
          <div className="sl-stack" aria-hidden="true">
            <span style={{ width: `${(s.techwideGmv / s.gmv) * 100}%`, background: "#00c073" }} />
            <span style={{ width: `${(s.otherGmv / s.gmv) * 100}%`, background: "var(--seg)" }} />
          </div>
        )}
        <SalesChart key={key} d={d} />
        <div className="sl-axis"><span>{pointLabel(d.range, 0)}</span><span>GMV per {d.range.unit}</span><span>{pointLabel(d.range, d.range.buckets - 1)}</span></div>
        {!d.compare && <p className="sl-muted" style={{ margin: 0 }}>To compare with another period, open the calendar and choose a comparison.</p>}
      </section>

      <div className="sl-two">
        <section className="nv-card sl-card" aria-labelledby="slprod">
          <div className="sl-head"><h2 id="slprod" className="nv-h2">Top products</h2><span className="sl-muted">By GMV</span></div>
          {s.products.length === 0 && <p className="sl-empty">No sales in this period.</p>}
          {s.products.slice(0, 6).map((p, i) => (
            <div key={`${key}-${p.productId || p.name}`} className="sl-row" style={{ animationDelay: `${i * 50}ms` }}>
              <span className="sl-rank">{i + 1}</span>
              <span style={{ minWidth: 0 }}>
                <span className="sl-name">{p.name}</span>
                <span className="sl-muted">{p.orders} {p.orders === 1 ? "order" : "orders"}{p.shop ? ` · ${p.shop}` : ""}</span>
                <span className="sl-meter"><i style={{ width: `${(p.gmv / topProduct) * 100}%`, animationDelay: `${120 + i * 50}ms` }} /></span>
              </span>
              <span className="sl-amt"><b>{money(p.gmv)}</b><span>{money(p.commission)} commission</span></span>
            </div>
          ))}
        </section>
        <section className="nv-card sl-card" aria-labelledby="slcont">
          <div className="sl-head"><h2 id="slcont" className="nv-h2">Top videos and LIVEs</h2><span className="sl-muted">Sales each one made</span></div>
          {s.content.length === 0 && <p className="sl-empty">No sales from videos or LIVEs in this period.</p>}
          {s.content.slice(0, 6).map((c, i) => {
            const v = d.videos[c.id];
            const live = /LIVE/i.test(c.type);
            const url = v?.url ?? (handle && !live ? `https://www.tiktok.com/@${handle}/video/${c.id}` : null);
            const body = (
              <>
                {v?.cover ? <span className="sl-cover" style={{ backgroundImage: `url("${v.cover}")` }} aria-hidden="true" /> : <span className="sl-cover sl-kind" style={{ background: live ? "#fe2c55" : "#0d1117" }} aria-hidden="true">{live ? "LIVE" : "VIDEO"}</span>}
                <span style={{ minWidth: 0 }}>
                  <span className="sl-name">{v?.title ?? (live ? "LIVE" : /SHOWCASE|LINK|SHOP/i.test(c.type) ? "Showcase or shared link" : "Video")}</span>
                  <span className="sl-muted">{c.orders} {c.orders === 1 ? "order" : "orders"}</span>
                  <span className="sl-meter"><i style={{ width: `${(c.gmv / topContent) * 100}%`, animationDelay: `${120 + i * 50}ms` }} /></span>
                </span>
                <span className="sl-amt"><b>{money(c.gmv)}</b><span>{url ? "Watch on TikTok" : ""}</span></span>
              </>
            );
            return url ? (
              <a key={`${key}-${c.id}`} href={url} target="_blank" rel="noopener" className="sl-row sl-link" style={{ animationDelay: `${i * 50}ms` }}>{body}</a>
            ) : (
              <div key={`${key}-${c.id}`} className="sl-row" style={{ animationDelay: `${i * 50}ms` }}>{body}</div>
            );
          })}
        </section>
      </div>
      <p className="sl-foot">
        From your TikTok Shop affiliate orders, all shops, updated automatically{reading ? " · reading your latest orders from TikTok Shop…" : synced ? ` · last read ${synced}` : ""}. GMV is what buyers paid; commission is TikTok&apos;s estimate until the order settles.
      </p>
    </>
  );
}
