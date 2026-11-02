"use client";

import "@/app/seller.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Bars, Columns, Count, Seg, Stat, Title } from "@/components/ui";
import { Ava, Source } from "@/components/seller/seller-ui";
import { product, rm } from "@/lib/mock";
import { BY_PRODUCT, RANGES, RESULTS, TOP_CREATORS, type Range } from "@/lib/mock-seller";
import { sellerProductHref } from "@/lib/product-pages";
import { recordResults } from "@/lib/live-rewards";
import { LiveResults } from "@/components/seller/live-results";
import { useT } from "@/lib/i18n/client";

/** How the shop's products are doing in Techwide's TAP campaigns: charts, top creators, per product. */
export default function Results() {
  const t = useT();
  const router = useRouter();
  const { toast, live } = useDemo();
  // Opening results counts for today's mission (owner, 31 Oct 2026).
  useEffect(() => {
    if (live) void recordResults();
  }, [live]);
  const [range, setRange] = useState<Range>("30 days");
  if (live) return <LiveResults />;
  const r = RESULTS[range];
  const k = r.gmv / RESULTS["30 days"].gmv;

  return (
    <div className="v2-stack v2-in">
      <Title title={t("TAP Performance")} sub={<Source />}>
        <button type="button" className="btn-outline" onClick={() => toast(t("Report saved as CSV"))}><Icon name="doc" size={18} /> {t("Export")}</button>
      </Title>
      {/* The ranges in her language; the page keeps the English one. */}
      <Seg value={t(range)} options={RANGES.map((x) => t(x))} onChange={(v) => setRange(RANGES.find((x) => t(x) === v) ?? range)} />

      <section className="v2-grid4" key={range} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <Stat label={t("Sales (GMV)")} value={<Count value={r.gmv} format={(n) => rm(n, 0)} />} note={!r.prev ? t("Since first product went live") : range === "7 days" ? t("+{n}% on the 7 days before", { n: r.prev }) : range === "30 days" ? t("+{n}% on the 30 days before", { n: r.prev }) : t("+{n}% on the 90 days before", { n: r.prev })} tone={r.prev ? "up" : undefined} />
        <Stat label={t("Units Sold")} value={<Count value={r.units} />} />
        <Stat label={t("Creators Selling")} value={<Count value={r.creators} />} />
        <Stat label={t("Videos")} value={<Count value={r.videos} />} />
        <Stat label={t("LIVEs")} value={<Count value={r.lives} />} />
        <Stat label={t("Commission Paid")} value={<Count value={r.paid} format={(n) => rm(n, 0)} />} note={t("Earned by creators")} />
      </section>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">{range === "90 days" ? t("Weekly Sales") : t("Daily Sales")}</h2>
          <span className="v2-small">{t(r.unit)}</span>
        </div>
        <div className={r.daily.length > 20 ? "sl-cols sl-dense" : "sl-cols"}><Columns key={range} values={r.daily} labels={r.labels} /></div>
      </section>

      <div className="v2-split">
        <section className="v2-card">
          <div className="v2-card-h"><h2 className="v2-h2">{t("Top Creators")}</h2><span className="v2-small">{t(range)}</span></div>
          <div className="v2-tablewrap">
            <table className="v2-table">
              <thead>
                <tr><th>{t("Creator")}</th><th>{t("Videos")}</th><th>{t("LIVEs")}</th><th>{t("Units")}</th><th style={{ textAlign: "right" }}>{t("Sales")}</th></tr>
              </thead>
              <tbody>
                {TOP_CREATORS.map((c) => (
                  <tr key={c.handle}>
                    <td><span className="v2-row" style={{ flexWrap: "nowrap", gap: 8 }}><Ava name={c.handle} /><span style={{ display: "flex", flexDirection: "column" }}><b style={{ whiteSpace: "nowrap" }}>{c.handle}</b><small className="v2-small">{t(c.level)}</small></span></span></td>
                    <td>{Math.max(1, Math.round(c.videos * (range === "7 days" ? 0.4 : range === "90 days" ? 2.2 : 1)))}</td>
                    <td>{Math.round(c.lives * (range === "7 days" ? 0.5 : range === "90 days" ? 2 : 1))}</td>
                    <td>{Math.round(c.units * k).toLocaleString("en-MY")}</td>
                    <td style={{ textAlign: "right", fontWeight: 800, whiteSpace: "nowrap" }}>{rm(c.gmv * k, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="v2-card">
          <div className="v2-card-h"><h2 className="v2-h2">{t("By Product")}</h2><span className="v2-small">{t("Sales")}</span></div>
          <Bars key={range} rows={BY_PRODUCT.map((b) => ({ label: product(b.id).name, value: b.gmv * k, display: rm(b.gmv * k, 0), href: sellerProductHref(b.id) }))} />
          <div className="v2-divide">
            {BY_PRODUCT.map((b) => {
              const p = product(b.id);
              const makers = Math.max(1, Math.round(b.creators * Math.min(1.4, Math.max(0.6, k))));
              const vids = Math.round(b.videos * k);
              return (
                <div key={b.id} className="sl-act" style={{ gridTemplateColumns: "36px minmax(0,1fr)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
                  <img className="pv-open" src={p.img} alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }} onClick={() => router.push(sellerProductHref(b.id))} />
                  <span><b style={{ fontSize: 14 }}><Link href={sellerProductHref(b.id)} className="pv-open">{p.name}</Link></b><small>{t("{n} units", { n: Math.round(b.units * k).toLocaleString("en-MY") })} · {makers === 1 ? t("{n} creator", { n: 1 }) : t("{n} creators", { n: makers })} · {vids === 1 ? t("{n} video", { n: 1 }) : t("{n} videos", { n: vids })}</small></span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <p className="v2-small" style={{ margin: 0 }}>{t("TAP sales only. Numbers can change for up to 14 days (cancellations, returns).")}</p>
    </div>
  );
}
