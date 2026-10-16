"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Compare, FrameData, Range, StatusKey } from "@/modules/sales/frames.ts";
import type { Source } from "@/modules/sales/summary.ts";
import { CalendarPicker } from "../calendar-picker";
import { GmvChart } from "../gmv-chart";
import { ProductCard } from "../product-card";
import "../marketplace/marketplace.css";
import "./sales.css";

const SOURCES: [Source, string, string][] = [
  ["all", "All your sales", "Everything your TikTok Shop account earned as an affiliate, from any shop or campaign."],
  ["techwide", "Through Rezekii", "Sales through Rezekii. These count for your level and Rankings."],
  ["other", "Other shops", "Sales from shops and campaigns outside Rezekii."],
];
/** The owner's quick choices, listed beside the calendar. */
const PRESETS: [string, string][] = [["yesterday", "Yesterday"], ["7d", "7 days"], ["14d", "14 days"], ["30d", "30 days"], ["60d", "60 days"], ["90d", "90 days"], ["month", "This month"], ["lastmonth", "Last month"], ["1y", "1 year"], ["all", "All time"]];
const COMPARE: [Compare, string, string][] = [["none", "Don't compare", "Just this period"], ["prev", "The period before", "Same length, just before"], ["year", "Same time last year", "The same dates a year earlier"]];
const SHORT: Record<StatusKey, string> = { settled: "Settled", toSettle: "To settle", awaiting: "Awaiting", refunded: "Refunded", ineligible: "Ineligible" };
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

/** Sales, as chosen from the mockup (direction A, with the owner's changes). */
export function SalesView({ initial, handle }: { initial: FrameData; handle: string | null }) {
  const router = useRouter();
  const [frame, setFrame] = useState("30d");
  const [source, setSource] = useState<Source>("all");
  const [compare, setCompare] = useState<Compare>("none");
  const [d, setD] = useState<FrameData>(initial);
  const [loading, setLoading] = useState(false);
  /** The status shown in the commission detail strip. */
  const [stage, setStage] = useState<StatusKey>("settled");
  /** Bumped when new orders were read, so the chosen view is read again. */
  const [tick, setTick] = useState(0);
  /** The product whose card is open. */
  const [product, setProduct] = useState<string | null>(null);
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
  useEffect(() => {
    let stop = false;
    (async () => {
      for (let i = 0; i < 6 && !stop; i++) {
        const x = (await fetch("/api/sales/refresh", { method: "POST" }).then((r) => r.json()).catch(() => ({}))) as { synced?: boolean; done?: boolean };
        if (x.synced) {
          first.current = false;
          setTick((t) => t + 1);
          router.refresh();
        }
        if (!x.synced || x.done !== false) break;
      }
    })();
    return () => { stop = true; };
  }, [router]);

  const s = d.stats;
  const change = d.compare && d.compare.gmv > 0 ? Math.round(((s.gmv - d.compare.gmv) / d.compare.gmv) * 100) : null;
  const sIdx = SOURCES.findIndex(([v]) => v === source);
  const topProduct = s.products[0]?.gmv || 1;
  const topContent = s.content[0]?.gmv || 1;
  const shared = s.partnerShare > 0;
  /** TikTok pays the whole commission to the creator's agency: show it in full, and say so. */
  const agency = shared && s.commission < 0.005;
  // Commission settled: what each status earns (the full commission when the creator shares it with a partner).
  const comOf = (k: StatusKey) => { const r = s.status.find((x) => x.key === k)!; return shared && k !== "refunded" && k !== "ineligible" ? r.earned : r.commission; };
  const settled = comOf("settled"), pending = comOf("toSettle") + comOf("awaiting"), total = settled + pending;
  const settledPct = total > 0 ? Math.round((settled / total) * 100) : 0;
  const orderTotal = s.status.reduce((a, r) => a + r.orders, 0) || 1;
  const ringA = total > 0 ? (settled / total) * 360 : 0, ringB = total > 0 ? ((settled + comOf("toSettle")) / total) * 360 : 0;
  const hi = (k: StatusKey) => (stage === k || stage === "refunded" || stage === "ineligible" ? "" : "66");
  // The picker works in Malaysian calendar days ("2026-10-07").
  const today = ymd(d.now);
  const iso = (t: number) => new Date(t + MYT).toISOString().slice(0, 10);
  const todayIso = `${today.y}-${String(today.m + 1).padStart(2, "0")}-${String(today.d).padStart(2, "0")}`;
  const key = `${frame}|${source}|${compare}`;

  return (
    <>
      <div className="sl-bar">
        <div className="nv-seg sl-seg" role="group" aria-label="Which sales">
          <span className="nv-segthumb" aria-hidden="true" style={{ width: "calc(33.333% - 1.4px)", transform: `translateX(${sIdx * 100}%)` }} />
          {SOURCES.map(([v, label]) => <button key={v} type="button" className={source === v ? "on" : ""} aria-pressed={source === v} onClick={() => setSource(v)}>{label}</button>)}
        </div>
        <CalendarPicker
          mode="range"
          label={d.range.label}
          sub={`${d.range.dates}${compare !== "none" ? ` · vs ${COMPARE.find(([c]) => c === compare)![1].toLowerCase()}` : ""}`}
          loading={loading}
          today={todayIso}
          from={iso(d.range.from)}
          to={iso(Math.min(d.range.to, Date.UTC(today.y, today.m, today.d) - MYT + DAY) - DAY)}
          onRange={(a, b) => setFrame(`c:${a}:${b}`)}
          presets={PRESETS}
          preset={PRESETS.some(([k]) => k === frame) ? frame : null}
          onPreset={setFrame}
          compare={{ value: compare, options: COMPARE.map(([c, label]) => [c, label]), onChange: (v) => setCompare(v as Compare), disabled: (v) => v === "prev" && frame === "all" }}
        />
      </div>
      <p key={`n-${source}`} className="sl-note">{SOURCES[sIdx][2]}</p>

      <section className="sl-tiles" aria-label="Totals for the period">
        <Tile label={`GMV · ${d.range.label}`} value={s.gmv} format={money} note={change === null ? d.range.dates : `${change >= 0 ? "▲" : "▼"} ${Math.abs(change)}% vs ${d.compare!.range.label.toLowerCase()}`} noteColor={change !== null && change < 0 ? "var(--red)" : "var(--gink)"} delay={0} />
        {agency ? (
          <Tile label="Commission earned" value={s.earned} format={money} note="TikTok pays this to your agency" noteColor="var(--muted)" delay={60} />
        ) : shared ? (
          <Tile label="Commission earned" value={s.earned} format={money} note={`${money(s.partnerShare)} to your partner · you keep ${money(s.commission)}`} noteColor="var(--muted)" delay={60} />
        ) : (
          <Tile label="Commission" value={s.commission} format={money} note={pending ? `${money(pending)} not settled yet` : "All settled"} noteColor="var(--muted)" delay={60} />
        )}
        <Tile label="Orders" value={s.orders} format={n} note={`${n(s.items)} ${s.items === 1 ? "item" : "items"} sold`} noteColor="var(--muted)" delay={120} />
        <Tile label="Refunded" value={s.refunded} format={money} note={s.gmv + s.refunded > 0 ? `${Math.round((s.refunded / (s.gmv + s.refunded)) * 100)}% of sales` : "No refunds"} noteColor={s.refunded ? "var(--red)" : "var(--muted)"} delay={180} />
      </section>

      <section className="nv-card sl-card cj-wrap" aria-labelledby="cjhead">
        <div className="cj-top">
          <div className="cj-ring" role="img" aria-label={`${settledPct}% of commission settled`} style={{ background: `conic-gradient(${STATUS.settled[1]}${hi("settled")} 0deg ${ringA}deg, ${STATUS.toSettle[1]}${hi("toSettle")} ${ringA}deg ${ringB}deg, ${STATUS.awaiting[1]}${hi("awaiting")} ${ringB}deg 360deg)` }}>
            <div className="cj-hole"><b>{settledPct}%</b><span>settled</span></div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <h2 id="cjhead" className="nv-h2">{shared ? "Commission earned" : "Commission"}</h2>
            <div className="cj-big"><b>{money(settled)}</b><span>/ {money(total)}</span></div>
            {agency && <span className="sl-muted">TikTok pays this to your agency</span>}
            <div className="cj-meter" aria-hidden="true">
              {(["settled", "toSettle", "awaiting"] as StatusKey[]).map((k) => <i key={`${key}-${k}`} style={{ width: `${total > 0 ? (comOf(k) / total) * 100 : 0}%`, background: STATUS[k][1], opacity: hi(k) ? 0.45 : 1 }} />)}
            </div>
          </div>
        </div>
        <div className="cj-flow" role="group" aria-label="Where your commission is">
          {(["awaiting", "toSettle", "settled"] as StatusKey[]).map((k, i) => {
            const r = s.status.find((x) => x.key === k)!;
            const [, color, soft, help, icon] = STATUS[k];
            return (
              <div key={k} style={{ display: "contents" }}>
                <button type="button" className={`cj-stage ${stage === k ? "on" : ""}`} style={{ ["--c" as string]: color, ["--s" as string]: soft }} aria-pressed={stage === k} title={help} onClick={() => setStage(k)}>
                  <span className="cj-ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icon} /></svg></span>
                  <span className="cj-lab">{SHORT[k]}</span>
                  <b className="cj-amt">{money(comOf(k))}</b>
                  <span className="cj-n">{n(r.orders)}<small> orders</small></span>
                  <span className="cj-bar"><i key={`${key}-${k}`} style={{ width: `${(r.orders / orderTotal) * 100}%` }} /></span>
                </button>
                {i < 2 && <span className="cj-arrow" aria-hidden="true" />}
              </div>
            );
          })}
        </div>
        {(() => {
          const lost = (["refunded", "ineligible"] as StatusKey[]).map((k) => s.status.find((x) => x.key === k)!);
          const sum = lost.reduce((a, r) => a + r.commission, 0);
          return (
            <div className="cj-lost" role="group" aria-labelledby="cjlost">
              <div className="cj-losthead">
                <span id="cjlost">Commission missed</span>
                <b>{sum > 0 ? `−${money(sum)}` : "RM 0.00"}</b>
              </div>
              <div className="cj-lostrow">
                {lost.map((r) => {
                  const [label, color, soft, help, icon] = STATUS[r.key];
                  return (
                    <button key={r.key} type="button" className={`cj-miss ${stage === r.key ? "on" : ""}`} style={{ ["--c" as string]: color, ["--s" as string]: soft }} aria-pressed={stage === r.key} onClick={() => setStage(r.key)}>
                      <span className="cj-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icon} /></svg></span>
                      <span className="cj-misst">
                        <span className="cj-lab">{label}</span>
                        <b>{r.commission > 0 ? `−${money(r.commission)}` : "RM 0.00"}</b>
                        <small>{n(r.orders)} {r.orders === 1 ? "order" : "orders"} · {money(r.gmv)} in sales</small>
                        <small className="cj-help">{help}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}
        {(() => {
          const r = s.status.find((x) => x.key === stage)!;
          const lostK = stage === "refunded" || stage === "ineligible";
          return (
            <div key={`${key}-${stage}`} className="cj-detail" style={{ ["--c" as string]: STATUS[stage][1] }}>
              <span className="cj-dt"><i style={{ background: STATUS[stage][1] }} />{STATUS[stage][0]}</span>
              <span><small>Sales</small><b>{money(r.gmv)}</b></span>
              <span><small>Orders</small><b>{n(r.orders)}</b></span>
              <span><small>Per order</small><b>{lostK || !r.orders ? "RM 0.00" : money(comOf(stage) / r.orders)}</b></span>
              <span><small>Of all orders</small><b>{Math.round((r.orders / orderTotal) * 100)}%</b></span>
            </div>
          );
        })()}
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
          <div className="sl-share">
            <div className="sl-sharehead">
              <span><i style={{ background: "#00c073" }} />Through Rezekii <b>{rm0(s.techwideGmv)}</b> · {Math.round((s.techwideGmv / s.gmv) * 100)}%</span>
              <span><i style={{ background: "var(--muted)", opacity: 0.5 }} />Other shops <b>{rm0(s.otherGmv)}</b> · {Math.round((s.otherGmv / s.gmv) * 100)}%</span>
            </div>
            <div className="sl-stack" role="img" aria-label={`${Math.round((s.techwideGmv / s.gmv) * 100)}% of GMV through Rezekii, the rest from other shops`}>
              <span style={{ width: `${(s.techwideGmv / s.gmv) * 100}%`, background: "#00c073" }} />
              <span style={{ width: `${(s.otherGmv / s.gmv) * 100}%`, background: "var(--muted)", opacity: 0.5 }} />
            </div>
          </div>
        )}
        <GmvChart key={key} values={s.buckets} labels={Array.from({ length: s.buckets.length }, (_, i) => pointLabel(d.range, i))} compare={d.compare?.buckets} compareName={d.compare?.range.label.toLowerCase()} ariaLabel={`GMV per ${d.range.unit} for ${d.range.label}${d.compare ? `, compared with ${d.compare.range.label.toLowerCase()}` : ""}`} />
        <div className="sl-axis"><span>{pointLabel(d.range, 0)}</span><span>GMV per {d.range.unit}</span><span>{pointLabel(d.range, d.range.buckets - 1)}</span></div>
        {!d.compare && <p className="sl-muted" style={{ margin: 0 }}>To compare with another period, open the calendar and choose a comparison.</p>}
      </section>

      <div className="sl-two">
        <section className="nv-card sl-card" aria-labelledby="slprod">
          <div className="sl-head"><h2 id="slprod" className="nv-h2">Top products</h2><span className="sl-muted">{agency ? "By GMV · commission in full, paid to your agency" : "By GMV"}</span></div>
          {s.products.length === 0 && <p className="sl-empty">No sales in this period.</p>}
          {s.products.slice(0, 6).map((p, i) => {
            const body = (
              <>
                <span className="sl-pic">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" loading="lazy" />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 8h14l-1 12H6zM9 8a3 3 0 0 1 6 0" /></svg>
                  )}
                  <span className="sl-picn">{i + 1}</span>
                </span>
                <span style={{ minWidth: 0 }}>
                  <span className="sl-name">{p.name}</span>
                  <span className="sl-muted">{p.orders} {p.orders === 1 ? "order" : "orders"}{p.shop ? ` · ${p.shop}` : ""}</span>
                  <span className="sl-meter"><i style={{ width: `${(p.gmv / topProduct) * 100}%`, animationDelay: `${120 + i * 50}ms` }} /></span>
                </span>
                <span className="sl-amt"><b>{money(p.gmv)}</b><span>{money(shared ? p.earned : p.commission)} commission</span></span>
              </>
            );
            return p.productId ? (
              <button key={`${key}-${p.productId}`} type="button" className="sl-row sl-link sl-btn" style={{ animationDelay: `${i * 50}ms` }} onClick={() => setProduct(p.productId)} aria-label={`${p.name}: open product details`}>{body}</button>
            ) : (
              <div key={`${key}-${p.name}`} className="sl-row" style={{ animationDelay: `${i * 50}ms` }}>{body}</div>
            );
          })}
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
      {product && <ProductCard key={product} productId={product} onClose={() => setProduct(null)} />}
      <p className="sl-foot">
        From your TikTok Shop affiliate orders, all shops, updated automatically. GMV is what buyers paid; commission is TikTok&apos;s estimate until the order settles.
      </p>
    </>
  );
}
