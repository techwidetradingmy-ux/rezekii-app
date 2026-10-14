"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { SalesPageData } from "@/modules/sales/page.ts";
import type { Source } from "@/modules/sales/summary.ts";
import { GmvChart } from "../gmv-chart";
import "../marketplace/marketplace.css";
import "./sales.css";

const PERIODS: [number, string][] = [[7, "7 days"], [30, "30 days"], [90, "90 days"], [0, "This month"]];
const SOURCES: [Source, string, string][] = [
  ["all", "All your sales", "Everything your TikTok Shop account earned as an affiliate, from any shop or campaign."],
  ["techwide", "Through Techwide TAP", "Sales of products in Techwide's TAP campaigns. These count for your Rezekii level and Rankings."],
  ["other", "Other shops", "Sales from shops and campaigns outside Techwide's TAP campaigns."],
];
const money = (v: number) => `RM ${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const rm0 = (v: number) => `RM ${Math.round(v).toLocaleString("en-US")}`;

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

/** Sales, as chosen from the mockup (direction A): totals, GMV per day, top products and top videos and LIVEs. */
export function SalesView({ d, handle, syncedAt }: { d: SalesPageData; handle: string | null; syncedAt: string | null }) {
  const router = useRouter();
  const [period, setPeriod] = useState(30);
  const [source, setSource] = useState<Source>("all");
  const s = d.summaries[`${period}|${source}`];
  const days = period || d.monthDays;
  const change = s.prevGmv > 0 ? Math.round(((s.gmv - s.prevGmv) / s.prevGmv) * 100) : null;
  const key = `${period}|${source}`;

  // The latest orders from TikTok, in the background (at most every 15 minutes), with no button to press. Right after
  // linking, TikTok's older history can take a few reads: keep asking until it is all in.
  const [reading, setReading] = useState(false);
  useEffect(() => {
    let stop = false;
    (async () => {
      for (let i = 0; i < 6 && !stop; i++) {
        setReading(true);
        const x = (await fetch("/api/sales/refresh", { method: "POST" }).then((r) => r.json()).catch(() => ({}))) as { synced?: boolean; done?: boolean };
        if (x.synced) router.refresh();
        if (!x.synced || x.done !== false) break;
      }
      if (!stop) setReading(false);
    })();
    return () => { stop = true; };
  }, [router]);

  const pIdx = PERIODS.findIndex(([p]) => p === period);
  const sIdx = SOURCES.findIndex(([v]) => v === source);
  const topProduct = s.products[0]?.gmv || 1;
  const topContent = s.content[0]?.gmv || 1;
  const synced = syncedAt ? new Date(syncedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kuala_Lumpur" }) : null;

  return (
    <>
      <div className="sl-bar">
        <div className="nv-seg sl-seg" role="group" aria-label="Which sales">
          <span className="nv-segthumb" aria-hidden="true" style={{ width: "calc(33.333% - 1.4px)", transform: `translateX(${sIdx * 100}%)` }} />
          {SOURCES.map(([v, label]) => <button key={v} type="button" className={source === v ? "on" : ""} aria-pressed={source === v} onClick={() => setSource(v)}>{label}</button>)}
        </div>
        <div className="nv-seg sl-seg sl-period" role="group" aria-label="Period">
          <span className="nv-segthumb" aria-hidden="true" style={{ width: "calc(25% - 1px)", transform: `translateX(${pIdx * 100}%)` }} />
          {PERIODS.map(([p, label]) => <button key={p} type="button" className={period === p ? "on" : ""} aria-pressed={period === p} onClick={() => setPeriod(p)}>{label}</button>)}
        </div>
      </div>
      <p key={`n-${source}`} className="sl-note">{SOURCES[sIdx][2]}</p>

      <section className="sl-tiles" aria-label="Totals for the period">
        <Tile label="GMV" value={s.gmv} format={money} note={change === null ? `Last ${days} days` : `${change >= 0 ? "▲" : "▼"} ${Math.abs(change)}% vs the ${days} days before`} noteColor={change !== null && change < 0 ? "var(--red)" : "var(--gink)"} delay={0} />
        <Tile label="Commission" value={s.commission} format={money} note={s.toSettle ? `${money(s.toSettle)} to settle` : "All settled"} noteColor="var(--muted)" delay={60} />
        <Tile label="Orders" value={s.orders} format={(v) => Math.round(v).toLocaleString("en-US")} note={`${s.items.toLocaleString("en-US")} ${s.items === 1 ? "item" : "items"} sold`} noteColor="var(--muted)" delay={120} />
        <Tile label="Refunded" value={s.refunded} format={money} note={s.gmv + s.refunded > 0 ? `${Math.round((s.refunded / (s.gmv + s.refunded)) * 100)}% of sales` : "No refunds"} noteColor={s.refunded ? "var(--red)" : "var(--muted)"} delay={180} />
      </section>

      <section className="nv-card sl-card" aria-labelledby="slchart">
        <div className="sl-head">
          <h2 id="slchart" className="nv-h2">GMV per day</h2>
          {source === "all" && <span className="sl-split"><i style={{ background: "#00c073" }} />Techwide TAP {rm0(s.techwideGmv)}<i style={{ background: "var(--seg)" }} />Other shops {rm0(s.otherGmv)}</span>}
        </div>
        {source === "all" && s.gmv > 0 && (
          <div className="sl-stack" aria-hidden="true">
            <span style={{ width: `${(s.techwideGmv / s.gmv) * 100}%`, background: "#00c073" }} />
            <span style={{ width: `${(s.otherGmv / s.gmv) * 100}%`, background: "var(--seg)" }} />
          </div>
        )}
        <GmvChart key={key} daily={s.daily} now={d.now} height={190} />
        <div className="sl-axis"><span>{new Date(d.now - (days - 1) * 86400_000).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" })}</span><span>Today</span></div>
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
                  <span className="sl-name">{v?.title ?? (live ? "LIVE" : /SHOWCASE|LINK/i.test(c.type) ? "Showcase or shared link" : "Video")}</span>
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
