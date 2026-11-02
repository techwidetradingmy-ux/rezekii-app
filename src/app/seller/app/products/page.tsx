"use client";

import "@/app/seller.css";
import "@/app/product-page.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet, Title } from "@/components/ui";
import { ConnBanner, Rich } from "@/components/seller/seller-ui";
import { SELLER, rm, short } from "@/lib/mock";
import { SHOP_ITEMS, UPDATED, listStatus, type ShopItem } from "@/lib/mock-seller";
import { sellerProductHref } from "@/lib/product-pages";
import { useKept } from "@/lib/keep";
import { loadShop } from "@/lib/live";
import { labelCase } from "@/lib/label-case";
import { useLang, useT } from "@/lib/i18n/client";
import { dateLocale } from "@/lib/i18n/lang";

const FILTERS = ["All", "Not submitted", "Under review", "Live", "Not approved"] as const;
type Filter = (typeof FILTERS)[number];
const BADGE: Record<Exclude<Filter, "All">, string> = { "Not submitted": "badge-gray", "Under review": "badge-amber", Live: "", "Not approved": "badge-red" };

/** Every product in the connected shop, with its status in Techwide's TAP. */
export default function ShopProducts() {
  const t = useT();
  const lang = useLang();
  const { toast, live } = useDemo();
  const [items, setItems] = useState<ShopItem[]>(SHOP_ITEMS);
  // Signed in (owner, 30 Oct 2026): the real products of the shop this account authorized in Seller Center.
  const [shop, setShop] = useState<{ name: string; at: string; notLive: number } | null>(null);
  const [noShop, setNoShop] = useState(false);
  const [filter, setFilter] = useKept<Filter>("sp-filter", "All");
  const [q, setQ] = useKept("sp-q", "");
  const [syncing, setSyncing] = useState(false);
  const [fix, setFix] = useState<ShopItem | null>(null);
  const [samples, setSamples] = useState(40);

  const count = (f: Filter) => (f === "All" ? items.length : items.filter((i) => listStatus(i.stage) === f).length);
  const shown = items.filter((i) => (filter === "All" || listStatus(i.stage) === filter) && i.name.toLowerCase().includes(q.trim().toLowerCase()));

  const loadReal = (said: boolean) => {
    setSyncing(true);
    loadShop(said)
      .then((s) => {
        setNoShop(!s);
        setShop(s && { name: s.shop, at: s.at, notLive: s.notLive });
        setItems(s?.items ?? []);
        if (s && said) toast(s.items.length === 1 ? t("Synced · {n} product", { n: 1 }) : t("Synced · {n} products", { n: s.items.length }));
      })
      .catch((e: Error) => toast(e.message))
      .finally(() => setSyncing(false));
  };
  useEffect(() => {
    if (!live) return;
    setItems([]);
    loadReal(false);
  }, [live]); // eslint-disable-line react-hooks/exhaustive-deps

  const sync = () => {
    if (live) return loadReal(true);
    setSyncing(true);
    window.setTimeout(() => { setSyncing(false); toast(t("Synced · {n} products, nothing new", { n: items.length })); }, 1000);
  };
  const syncedAt = (at: string) => t("today {time}", { time: new Date(at).toLocaleTimeString(dateLocale(lang), { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" }) });

  return (
    <div className="v2-stack v2-in">
      <Title title={t("Shop Products")} sub={!live ? <>{SELLER.shop} · {t("synced {when}", { when: t(UPDATED) })}</> : shop ? <>{shop.name} · {t("synced {when}", { when: syncedAt(shop.at) })}{shop.notLive ? ` · ${t("{n} not live in Seller Center", { n: shop.notLive })}` : ""}</> : noShop ? t("No Seller Center shop connected") : t("Loading your shop…")}>
        <button type="button" className="btn-outline" onClick={sync} disabled={syncing}>
          {syncing ? <span className="sl-spin" /> : <Icon name="refresh" size={18} />} {t("Sync now")}
        </button>
        <Link href="/seller/app/submit" className="np-btn v2-btn-sm" style={{ height: 42 }}>{t("Register Products")}</Link>
      </Title>

      <ConnBanner shop={live ? !noShop : undefined} />

      <div className="sl-chipline" role="group" aria-label={t("Filter by status")}>
        {FILTERS.map((f) => (
          <button key={f} type="button" className={`v2-chip ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>
            {t(labelCase(f))} <small>{count(f)}</small>
          </button>
        ))}
      </div>

      <section className="v2-card">
        <input className="np-input" type="search" aria-label={t("Search your products")} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search your products")} />
        <div>
          {shown.map((p) => {
            const st = listStatus(p.stage);
            return (
              <div key={p.id} className="sl-prow">
                {/* Product (owner, 29 Oct 2026): the photo and name open the product's page; the row's buttons stay. */}
                <Link href={sellerProductHref(p.id)} className="pg-rowimg" aria-label={t("Open {name}", { name: p.name })} tabIndex={-1}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt="" />
                </Link>
                <span className="sl-pinfo">
                  <strong><Link href={sellerProductHref(p.id)} className="pg-name">{p.name}</Link></strong>
                  <small>{rm(p.price)}{p.soldLabel ? ` · ${p.sold ? t("{n} sold in 90 days", { n: short(p.sold) }) : t("No sales in 90 days")}` : p.salesUnknown ? "" : ` · ${p.sold ? t("{n} sold", { n: short(p.sold) }) : t("No sales yet")}`} · {p.publicRate === null ? t("Public unknown") : t("Public {rate}%", { rate: p.publicRate })}</small>
                  {(p.fromSellerCenter || p.note) && (
                    <span className="v2-row">
                      {p.fromSellerCenter && <span className="badge badge-blue">{t("From Seller Center")}</span>}
                      {p.note && st === "Not submitted" && <span className="badge badge-gray">{t(p.note)}</span>}
                    </span>
                  )}
                  {st === "Not approved" && p.reason && <span className="sl-reason">{t(p.reason)}</span>}
                </span>
                <span className="sl-pside">
                  <span className={`badge ${BADGE[st]}`}>{t(labelCase(st))}</span>
                  {st === "Live" && p.tapRate !== undefined && (
                    <span className="sl-rate">{p.publicRate}% <Icon name="arrow" size={12} /> <Rich text={t("<b>{rate}%</b> in TAP", { rate: p.tapRate })} /></span>
                  )}
                  {st === "Under review" && (
                    <small className="v2-small">{p.stage === "Submitted to TikTok" ? t("With TikTok since {date}", { date: p.dates?.["Submitted to TikTok"] ?? "" }) : p.stage === "Under review" ? t("Our review") : t("Submitted")}</small>
                  )}
                  {st === "Not submitted" && p.listing !== "PENDING" && <Link href="/seller/app/submit" className="np-btn v2-btn-sm">{t("Register")}</Link>}
                  {st === "Not approved" && (p.real
                    ? <Link href="/seller/app/submit" className="np-btn v2-btn-sm">{t("Register Again")}</Link>
                    : <button type="button" className="np-btn v2-btn-sm" onClick={() => setFix(p)}>{t("Fix")}</button>)}
                  {st === "Live" && <Link href="/seller/app/changes" className="v2-link" style={{ fontSize: 13.5 }}>{t("Change")}</Link>}
                  {st === "Under review" && p.register && <a href={p.register} target="_blank" rel="noopener noreferrer" className="np-btn v2-btn-sm">{t("Register in Seller Center")}</a>}
                  {st === "Under review" && !p.register && <Link href="/seller/app/progress" className="v2-link" style={{ fontSize: 13.5 }}>{t("Progress")}</Link>}
                </span>
              </div>
            );
          })}
          {shown.length === 0 && <p className="v2-muted" style={{ margin: "8px 0" }}>{live && syncing && !items.length ? t("Loading your products…") : live && noShop ? t("Connect Seller Center to see your products.") : live && !items.length ? t("No products live or in TikTok review yet.") : t("No products match.")}</p>}
        </div>
      </section>

      <p className="v2-small" style={{ margin: 0, display: "flex", gap: 8 }}>
        <Icon name="link" size={16} /> {t("Products added in Seller Center show here too.")}
      </p>

      {fix && (
        <Sheet title={t("Fix and Resubmit")} onClose={() => setFix(null)}>
          <div className="sl-prow" style={{ paddingTop: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fix.img} alt="" />
            <span className="sl-pinfo"><strong>{fix.name}</strong><span className="sl-reason">{fix.reason && t(fix.reason)}</span></span>
          </div>
          <div className="v2-field">{t("Samples per SKU")} <small>{t("Most shops pick 30–50")}</small>
            <div className="v2-chips">
              {[30, 40, 50].map((n) => (
                <button key={n} type="button" className={`v2-chip ${samples === n ? "on" : ""}`} onClick={() => setSamples(n)}>{n}</button>
              ))}
            </div>
          </div>
          <button type="button" className="np-btn" onClick={() => {
            setItems((all) => all.map((i) => (i.id === fix.id ? { ...i, stage: "Under review", samples, reason: undefined } : i)));
            setFix(null);
            toast(t("{n} samples added · resubmitted", { n: samples }));
          }}>{t("Resubmit with {n} samples", { n: samples })}</button>
        </Sheet>
      )}
    </div>
  );
}
