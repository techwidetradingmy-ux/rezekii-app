"use client";

import Link from "next/link";
import { DataNote } from "@/components/data-note";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Bars, Count, Stat, Title, Loading } from "@/components/ui";
import { Ava, Source } from "@/components/seller/seller-ui";
import { rm } from "@/lib/mock";
import { sellerProductHref } from "@/lib/product-pages";
import { NO_PHOTO, shortName } from "@/lib/live-perf";
import { useLang, useT } from "@/lib/i18n/client";
import { dateLocale, type Lang, type T } from "@/lib/i18n/lang";

type Results = {
  linked: boolean;
  totals: { gmv: number; orders: number; creators: number; videos: number; lives: number; live: number };
  products: { id: string; name: string; img: string | null; gmv: number; orders: number; creators: number; selling: number; samples: number; videos: number; lives: number }[];
  creators: { handle: string; name: string; avatar: string | null; followers: number; gmv: number; videos: number; lives: number }[];
  asOf: string | null;
};

const when = (iso: string, lang: Lang) =>
  new Date(iso).toLocaleString(dateLocale(lang), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" });

/** A CSV of the per-product numbers, saved on her device. */
function exportCsv(r: Results, t: T) {
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [[t("Product"), t("Product ID"), t("Sales (RM)"), t("Orders"), t("Creators"), t("Creators selling"), t("Samples asked"), t("Videos"), t("LIVEs")], ...r.products.map((p) => [p.name, p.id, p.gmv.toFixed(2), p.orders, p.creators, p.selling, p.samples, p.videos, p.lives])];
  const blob = new Blob([rows.map((row) => row.map(q).join(",")).join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `rezekii-tap-results-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * TAP Performance on real data (owner, 31 Oct 2026). TikTok reports lifetime totals for campaign products, so there are no
 * 7/30/90-day tabs or daily chart here: everything is since each product went live.
 */
export function LiveResults() {
  const t = useT();
  const lang = useLang();
  const { toast } = useDemo();
  const [r, setR] = useState<Results | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch("/api/v2/seller/results", { cache: "no-store" })
      .then((x) => (x.ok ? x.json() : null))
      .then((d: Results | null) => (d ? setR(d) : setFailed(true)))
      .catch(() => setFailed(true));
  }, []);

  if (!r) {
    return (
      <div className="v2-stack v2-in">
        <Title title={t("TAP Performance")} />
        {failed ? <p className="v2-muted">{t("Couldn't reach TikTok Shop. Please try again.")}</p> : <Loading text={t("Loading your results from TikTok…")} />}
      </div>
    );
  }
  if (!r.linked) {
    return (
      <div className="v2-stack v2-in">
        <Title title={t("TAP Performance")} />
        <section className="v2-card flat" style={{ alignItems: "flex-start" }}>
          <b>{t("Connect your Seller Center shop")}</b>
          <p className="v2-muted" style={{ margin: 0 }}>{t("Your TAP results show here once your shop is connected.")}</p>
          <Link href="/seller/app/account" className="np-btn v2-btn-sm">{t("Connect Shop")}</Link>
        </section>
      </div>
    );
  }
  const tot = r.totals;
  return (
    <div className="v2-stack v2-in">
      <Title title={t("TAP Performance")} sub={<Source when={r.asOf ? when(r.asOf, lang) : t("not yet")} />}>
        <button type="button" className="btn-outline" disabled={!r.products.length} onClick={() => { exportCsv(r, t); toast(t("Report saved as CSV")); }}><Icon name="doc" size={18} /> {t("Export")}</button>
      </Title>
      <DataNote latest={r.asOf} every={t("Read from TikTok when you open this page")} what={t("TikTok's numbers as of")} />

      <section className="v2-grid4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <Stat label={t("Sales (GMV)")} value={<Count value={tot.gmv} format={(n) => rm(n, 0)} />} note={t("Since each product went live")} />
        <Stat label={t("Orders")} value={<Count value={tot.orders} />} />
        <Stat label={t("Creators Promoting")} value={<Count value={tot.creators} />} />
        <Stat label={t("Videos")} value={<Count value={tot.videos} />} />
        <Stat label={t("LIVEs")} value={<Count value={tot.lives} />} />
        <Stat label={t("Products Live")} value={<Count value={tot.live} />} note={t("In Techwide's TAP")} />
      </section>

      {!r.products.length ? (
        <section className="v2-card flat" style={{ alignItems: "flex-start" }}>
          <b>{t("No products live in TAP yet")}</b>
          <p className="v2-muted" style={{ margin: 0 }}>{t("Register products and their results show here once they're live.")}</p>
          <Link href="/seller/app/submit" className="np-btn v2-btn-sm">{t("Register Products")}</Link>
        </section>
      ) : (
        <div className="v2-split">
          <section className="v2-card">
            <div className="v2-card-h"><h2 className="v2-h2">{t("Top Creators")}</h2><span className="v2-small">{t("Since Live")}</span></div>
            {r.creators.length ? (
              <div className="v2-tablewrap">
                <table className="v2-table">
                  <thead>
                    <tr><th>{t("Creator")}</th><th>{t("Videos")}</th><th>{t("LIVEs")}</th><th style={{ textAlign: "right" }}>{t("Sales")}</th></tr>
                  </thead>
                  <tbody>
                    {r.creators.map((c) => (
                      <tr key={c.handle}>
                        <td><span className="v2-row" style={{ flexWrap: "nowrap", gap: 8 }}><Ava name={`@${c.handle}`} /><span style={{ display: "flex", flexDirection: "column" }}><b style={{ whiteSpace: "nowrap" }}>@{c.handle}</b><small className="v2-small">{c.followers === 1 ? t("{n} follower", { n: 1 }) : t("{n} followers", { n: c.followers.toLocaleString("en-MY") })}</small></span></span></td>
                        <td>{c.videos}</td>
                        <td>{c.lives}</td>
                        <td style={{ textAlign: "right", fontWeight: 800, whiteSpace: "nowrap" }}>{rm(c.gmv, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="v2-muted" style={{ margin: 0 }}>{t("No creators promoting your products yet. Creators on Rezekii see them in the Marketplace.")}</p>
            )}
          </section>

          <section className="v2-card">
            <div className="v2-card-h"><h2 className="v2-h2">{t("By Product")}</h2><span className="v2-small">{t("Sales")}</span></div>
            <Bars rows={r.products.map((p) => ({ label: shortName(p.name), value: p.gmv, display: rm(p.gmv, 0), href: sellerProductHref(p.id) }))} />
            <div className="v2-divide">
              {r.products.map((p) => (
                <div key={p.id} className="sl-act" style={{ gridTemplateColumns: "36px minmax(0,1fr)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img ?? NO_PHOTO} alt="" style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover" }} />
                  <span><b style={{ fontSize: 14 }}><Link href={sellerProductHref(p.id)} className="pv-open">{shortName(p.name)}</Link></b><small>{p.orders === 1 ? t("{n} order", { n: 1 }) : t("{n} orders", { n: p.orders.toLocaleString("en-MY") })} · {p.creators === 1 ? t("{n} creator", { n: 1 }) : t("{n} creators", { n: p.creators })} · {p.videos === 1 ? t("{n} video", { n: 1 }) : t("{n} videos", { n: p.videos })}{p.samples ? ` · ${t("{n} asked for samples", { n: p.samples })}` : ""}</small></span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <p className="v2-small" style={{ margin: 0 }}>{t("TAP sales only, from TikTok. Numbers can change for up to 14 days (cancellations, returns).")}</p>
    </div>
  );
}
