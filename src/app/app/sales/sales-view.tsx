"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLang, useT } from "@/lib/i18n/client.tsx";
import { tx, type Lang } from "@/lib/i18n/lang.ts";
import type { Compare, FrameData, Range, StatusKey } from "@/modules/sales/frames.ts";
import type { Source } from "@/modules/sales/summary.ts";
import { CalendarPicker } from "../calendar-picker";
import { GmvChart } from "../gmv-chart";
import { ProductCard } from "../product-card";
import "../marketplace/marketplace.css";
import "./sales.css";

const SOURCES: [Source, string, string][] = [
  ["all", tx("All your sales"), tx("Everything your TikTok Shop account earned as an affiliate, from any shop or campaign.")],
  ["techwide", tx("Through Rezekii"), tx("Sales through Rezekii. These count for your level and Rankings.")],
  ["other", tx("Other shops"), tx("Sales from shops and campaigns outside Rezekii.")],
];
/** The owner's quick choices, listed beside the calendar. */
const PRESETS: [string, string][] = [["yesterday", tx("Yesterday")], ["7d", tx("7 days")], ["14d", tx("14 days")], ["30d", tx("30 days")], ["60d", tx("60 days")], ["90d", tx("90 days")], ["month", tx("This month")], ["lastmonth", tx("Last month")], ["1y", tx("1 year")], ["all", tx("All time")]];
const COMPARE: [Compare, string, string][] = [["none", tx("Don't compare"), tx("Just this period")], ["prev", tx("The period before"), tx("Same length, just before")], ["year", tx("Same time last year"), tx("The same dates a year earlier")]];
const SHORT: Record<StatusKey, string> = { settled: tx("Settled"), toSettle: tx("To settle"), awaiting: tx("Awaiting"), refunded: tx("Refunded"), ineligible: tx("Ineligible") };
const STATUS: Record<StatusKey, [string, string, string, string, string]> = {
  settled: [tx("Settled"), "#00a862", "var(--gsoft)", tx("TikTok has paid this commission into your account."), "m5 12 5 5 9-10"],
  toSettle: [tx("To settle"), "#2f80ed", "var(--bsoft)", tx("Delivered. TikTok pays it after the return window closes."), "M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18"],
  awaiting: [tx("Awaiting payment"), "#f2a93b", "var(--asoft)", tx("The buyer hasn't paid yet."), "M3 7h18v12H3zM3 11h18"],
  refunded: [tx("Refunded"), "#e5484d", "var(--rsoft)", tx("Returned or refunded, so no commission."), "M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3"],
  ineligible: [tx("Ineligible"), "#8b95a1", "var(--surface2)", tx("Doesn't qualify for commission (TikTok's rules)."), "M18 6 6 18M6 6l12 12"],
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = 86400_000;
const MYT = 8 * 3600_000;
const money = (v: number) => `RM ${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const rm0 = (v: number) => `RM ${Math.round(v).toLocaleString("en-US")}`;
const n = (v: number) => Math.round(v).toLocaleString("en-US");
const ymd = (t: number) => { const d = new Date(t + MYT); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() }; };
/** The label of chart point `i` of a range ("7 Oct", "Oct 2026"; in Chinese "10月7日", "2026年10月"). */
const pointLabel = (r: Range, i: number, lang: Lang) => {
  if (r.unit === "hour") return `${String(i).padStart(2, "0")}:00`;
  if (r.unit === "day") { const x = ymd(r.from + i * DAY); return lang === "zh" ? `${x.m + 1}月${x.d}日` : `${x.d} ${MONTHS[x.m]}`; }
  const x = ymd(r.from); const m = x.m + i; const mm = ((m % 12) + 12) % 12, yy = x.y + Math.floor(m / 12);
  return lang === "zh" ? `${yy}年${mm + 1}月` : `${MONTHS[mm]} ${yy}`;
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
export function SalesView({ initial, handle, photo }: { initial: FrameData; handle: string | null; photo: string | null }) {
  const t = useT();
  const lang = useLang();
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
        <div className="nv-seg sl-seg" role="group" aria-label={t("Which sales")}>
          <span className="nv-segthumb" aria-hidden="true" style={{ width: "calc(33.333% - 1.4px)", transform: `translateX(${sIdx * 100}%)` }} />
          {SOURCES.map(([v, label]) => <button key={v} type="button" className={source === v ? "on" : ""} aria-pressed={source === v} onClick={() => setSource(v)}>{t(label)}</button>)}
        </div>
        <CalendarPicker
          mode="range"
          label={d.range.label}
          sub={`${d.range.dates}${compare !== "none" ? t(" · vs {x}", { x: t(COMPARE.find(([c]) => c === compare)![1]).toLowerCase() }) : ""}`}
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
      <p key={`n-${source}`} className="sl-note">{t(SOURCES[sIdx][2])}</p>

      <section className="sl-tiles" aria-label={t("Totals for the period")}>
        <Tile label={t("GMV · {range}", { range: d.range.label })} value={s.gmv} format={money} note={change === null ? d.range.dates : `${change >= 0 ? "▲" : "▼"} ${t("{p}% vs {x}", { p: Math.abs(change), x: d.compare!.range.label.toLowerCase() })}`} noteColor={change !== null && change < 0 ? "var(--red)" : "var(--gink)"} delay={0} />
        {agency ? (
          <Tile label={t("Commission earned")} value={s.earned} format={money} note={t("TikTok pays this to your agency")} noteColor="var(--muted)" delay={60} />
        ) : shared ? (
          <Tile label={t("Commission earned")} value={s.earned} format={money} note={t("{a} to your partner · you keep {b}", { a: money(s.partnerShare), b: money(s.commission) })} noteColor="var(--muted)" delay={60} />
        ) : (
          <Tile label={t("Commission")} value={s.commission} format={money} note={pending ? t("{x} not settled yet", { x: money(pending) }) : t("All settled")} noteColor="var(--muted)" delay={60} />
        )}
        <Tile label={t("Orders")} value={s.orders} format={n} note={s.items === 1 ? t("{n} item sold", { n: 1 }) : t("{n} items sold", { n: n(s.items) })} noteColor="var(--muted)" delay={120} />
        <Tile label={t("Refunded")} value={s.refunded} format={money} note={s.gmv + s.refunded > 0 ? t("{p}% of sales", { p: Math.round((s.refunded / (s.gmv + s.refunded)) * 100) }) : t("No refunds")} noteColor={s.refunded ? "var(--red)" : "var(--muted)"} delay={180} />
      </section>

      <section className="nv-card sl-card cj-wrap" aria-labelledby="cjhead">
        <div className="cj-top">
          <div className="cj-ring" role="img" aria-label={t("{p}% of commission settled", { p: settledPct })} style={{ background: `conic-gradient(${STATUS.settled[1]}${hi("settled")} 0deg ${ringA}deg, ${STATUS.toSettle[1]}${hi("toSettle")} ${ringA}deg ${ringB}deg, ${STATUS.awaiting[1]}${hi("awaiting")} ${ringB}deg 360deg)` }}>
            <div className="cj-hole"><b>{settledPct}%</b><span>{t("settled")}</span></div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <h2 id="cjhead" className="nv-h2">{shared ? t("Commission earned") : t("Commission")}</h2>
            <div className="cj-big"><b>{money(settled)}</b><span>/ {money(total)}</span></div>
            {agency && <span className="sl-muted">{t("TikTok pays this to your agency")}</span>}
            <div className="cj-meter" aria-hidden="true">
              {(["settled", "toSettle", "awaiting"] as StatusKey[]).map((k) => <i key={`${key}-${k}`} style={{ width: `${total > 0 ? (comOf(k) / total) * 100 : 0}%`, background: STATUS[k][1], opacity: hi(k) ? 0.45 : 1 }} />)}
            </div>
          </div>
        </div>
        <div className="cj-flow" role="group" aria-label={t("Where your commission is")}>
          {(["awaiting", "toSettle", "settled"] as StatusKey[]).map((k, i) => {
            const r = s.status.find((x) => x.key === k)!;
            const [, color, soft, help, icon] = STATUS[k];
            return (
              <div key={k} style={{ display: "contents" }}>
                <button type="button" className={`cj-stage ${stage === k ? "on" : ""}`} style={{ ["--c" as string]: color, ["--s" as string]: soft }} aria-pressed={stage === k} title={t(help)} onClick={() => setStage(k)}>
                  <span className="cj-ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icon} /></svg></span>
                  <span className="cj-lab">{t(SHORT[k])}</span>
                  <b className="cj-amt">{money(comOf(k))}</b>
                  <span className="cj-n">{n(r.orders)}<small> {t("orders")}</small></span>
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
                <span id="cjlost">{t("Commission missed")}</span>
                <b>{sum > 0 ? `−${money(sum)}` : "RM 0.00"}</b>
              </div>
              <div className="cj-lostrow">
                {lost.map((r) => {
                  const [label, color, soft, help, icon] = STATUS[r.key];
                  return (
                    <button key={r.key} type="button" className={`cj-miss ${stage === r.key ? "on" : ""}`} style={{ ["--c" as string]: color, ["--s" as string]: soft }} aria-pressed={stage === r.key} onClick={() => setStage(r.key)}>
                      <span className="cj-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icon} /></svg></span>
                      <span className="cj-misst">
                        <span className="cj-lab">{t(label)}</span>
                        <b>{r.commission > 0 ? `−${money(r.commission)}` : "RM 0.00"}</b>
                        <small>{r.orders === 1 ? t("{n} order · {x} in sales", { n: 1, x: money(r.gmv) }) : t("{n} orders · {x} in sales", { n: n(r.orders), x: money(r.gmv) })}</small>
                        <small className="cj-help">{t(help)}</small>
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
              <span className="cj-dt"><i style={{ background: STATUS[stage][1] }} />{t(STATUS[stage][0])}</span>
              <span><small>{t("Sales")}</small><b>{money(r.gmv)}</b></span>
              <span><small>{t("Orders")}</small><b>{n(r.orders)}</b></span>
              <span><small>{t("Per order")}</small><b>{lostK || !r.orders ? "RM 0.00" : money(comOf(stage) / r.orders)}</b></span>
              <span><small>{t("Of all orders")}</small><b>{Math.round((r.orders / orderTotal) * 100)}%</b></span>
            </div>
          );
        })()}
      </section>

      <section className="nv-card sl-card" aria-labelledby="slchart">
        <div className="sl-head">
          <h2 id="slchart" className="nv-h2">{t("GMV over time · {range}", { range: d.range.label })}</h2>
          <span className="sl-split">
            <i style={{ background: "#00c073" }} />{d.range.label} {rm0(s.gmv)}
            {d.compare && <><i style={{ background: "#2f80ed" }} />{d.compare.range.label} {rm0(d.compare.gmv)}</>}
          </span>
        </div>
        {d.compare && change !== null && (
          <span className="sl-delta" style={{ background: change < 0 ? "var(--rsoft)" : "var(--gsoft)", color: change < 0 ? "var(--red)" : "var(--gink)" }}>
            {change >= 0 ? "▲" : "▼"} {change >= 0 ? t("{p}% GMV · {x} more than {y} ({d})", { p: Math.abs(change), x: rm0(Math.abs(s.gmv - d.compare.gmv)), y: d.compare.range.label.toLowerCase(), d: d.compare.range.dates }) : t("{p}% GMV · {x} less than {y} ({d})", { p: Math.abs(change), x: rm0(Math.abs(s.gmv - d.compare.gmv)), y: d.compare.range.label.toLowerCase(), d: d.compare.range.dates })}
          </span>
        )}
        {source === "all" && s.gmv > 0 && (
          <div className="sl-share">
            <div className="sl-sharehead">
              <span><i style={{ background: "#00c073" }} />{t("Through Rezekii")} <b>{rm0(s.techwideGmv)}</b> · {Math.round((s.techwideGmv / s.gmv) * 100)}%</span>
              <span><i style={{ background: "var(--muted)", opacity: 0.5 }} />{t("Other shops")} <b>{rm0(s.otherGmv)}</b> · {Math.round((s.otherGmv / s.gmv) * 100)}%</span>
            </div>
            <div className="sl-stack" role="img" aria-label={t("{p}% of GMV through Rezekii, the rest from other shops", { p: Math.round((s.techwideGmv / s.gmv) * 100) })}>
              <span style={{ width: `${(s.techwideGmv / s.gmv) * 100}%`, background: "#00c073" }} />
              <span style={{ width: `${(s.otherGmv / s.gmv) * 100}%`, background: "var(--muted)", opacity: 0.5 }} />
            </div>
          </div>
        )}
        <GmvChart key={key} values={s.buckets} labels={Array.from({ length: s.buckets.length }, (_, i) => pointLabel(d.range, i, lang))} compare={d.compare?.buckets} compareName={d.compare?.range.label.toLowerCase()} ariaLabel={`${t("GMV per {unit} for {range}", { unit: t(d.range.unit), range: d.range.label })}${d.compare ? t(", compared with {x}", { x: d.compare.range.label.toLowerCase() }) : ""}`} />
        <div className="sl-axis"><span>{pointLabel(d.range, 0, lang)}</span><span>{t("GMV per {unit}", { unit: t(d.range.unit) })}</span><span>{pointLabel(d.range, d.range.buckets - 1, lang)}</span></div>
        {!d.compare && <p className="sl-muted" style={{ margin: 0 }}>{t("To compare with another period, open the calendar and choose a comparison.")}</p>}
      </section>

      <div className="sl-two">
        <section className="nv-card sl-card" aria-labelledby="slprod">
          <div className="sl-head"><h2 id="slprod" className="nv-h2">{t("Top products")}</h2><span className="sl-muted">{agency ? t("By GMV · commission in full, paid to your agency") : t("By GMV")}</span></div>
          {s.products.length === 0 && <p className="sl-empty">{t("No sales in this period.")}</p>}
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
                  <span className="sl-muted">{p.orders === 1 ? t("{n} order", { n: 1 }) : t("{n} orders", { n: p.orders })}{p.shop ? ` · ${p.shop}` : ""}</span>
                  <span className="sl-meter"><i style={{ width: `${(p.gmv / topProduct) * 100}%`, animationDelay: `${120 + i * 50}ms` }} /></span>
                </span>
                <span className="sl-amt"><b>{money(p.gmv)}</b><span>{t("{x} commission", { x: money(shared ? p.earned : p.commission) })}</span></span>
              </>
            );
            return p.productId ? (
              <button key={`${key}-${p.productId}`} type="button" className="sl-row sl-link sl-btn" style={{ animationDelay: `${i * 50}ms` }} onClick={() => setProduct(p.productId)} aria-label={t("{name}: open product details", { name: p.name })}>{body}</button>
            ) : (
              <div key={`${key}-${p.name}`} className="sl-row" style={{ animationDelay: `${i * 50}ms` }}>{body}</div>
            );
          })}
        </section>
        {([["slvid", t("Top videos"), s.content.filter((c) => !/LIVE/i.test(c.type)), t("No sales from videos in this period.")], ["sllive", t("Top LIVEs"), s.content.filter((c) => /LIVE/i.test(c.type)), t("No sales from LIVEs in this period.")]] as const).map(([id, title, list, empty]) => {
          const live = id === "sllive";
          const top = list[0]?.gmv || 1;
          return (
            <section key={id} className="nv-card sl-card" aria-labelledby={id}>
              <div className="sl-head"><h2 id={id} className="nv-h2">{title}</h2><span className="sl-muted">{t("Sales each one made")}</span></div>
              {list.length === 0 && <p className="sl-empty">{empty}</p>}
              {list.slice(0, 6).map((c, i) => {
                const v = d.videos[c.id];
                const url = v?.url ?? (handle && !live ? `https://www.tiktok.com/@${handle}/video/${c.id}` : null);
                const tm = new Date(Date.parse(c.at) + MYT), day = lang === "zh" ? `${tm.getUTCMonth() + 1}月${tm.getUTCDate()}日` : `${tm.getUTCDate()} ${MONTHS[tm.getUTCMonth()]}`;
                const body = (
                  <>
                    {live ? (
                      <span className="sl-cover sl-kind sl-live" style={photo ? { backgroundImage: `url("${photo}")` } : { background: "#fe2c55" }} aria-hidden="true"><i>{t("LIVE")}</i></span>
                    ) : v?.cover ? (
                      <span className="sl-cover" style={{ backgroundImage: `url("${v.cover}")` }} aria-hidden="true" />
                    ) : (
                      <span className="sl-cover sl-kind" style={{ background: "#0d1117" }} aria-hidden="true">{t("VIDEO")}</span>
                    )}
                    <span style={{ minWidth: 0 }}>
                      <span className="sl-name">{live ? t("LIVE on {day}", { day }) : (v?.title ?? t("Video · first sale {day}", { day }))}</span>
                      <span className="sl-muted">{c.orders === 1 ? t("{n} order", { n: 1 }) : t("{n} orders", { n: c.orders })}</span>
                      <span className="sl-meter"><i style={{ width: `${(c.gmv / top) * 100}%`, animationDelay: `${120 + i * 50}ms` }} /></span>
                    </span>
                    <span className="sl-amt"><b>{money(c.gmv)}</b><span>{url ? t("Watch on TikTok") : ""}</span></span>
                  </>
                );
                return url ? (
                  <a key={`${key}-${c.id}`} href={url} target="_blank" rel="noopener" className="sl-row sl-link" style={{ animationDelay: `${i * 50}ms` }}>{body}</a>
                ) : (
                  <div key={`${key}-${c.id}`} className="sl-row" style={{ animationDelay: `${i * 50}ms` }}>{body}</div>
                );
              })}
            </section>
          );
        })}
      </div>
      {product && <ProductCard key={product} productId={product} onClose={() => setProduct(null)} />}
      <p className="sl-foot">
        {t("From your TikTok Shop affiliate orders, all shops, updated automatically. GMV is what buyers paid; commission is TikTok's estimate until the order settles.")}
      </p>
    </>
  );
}
