"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDemo } from "@/components/demo";
import { NO_PHOTO, shortName } from "@/lib/live-perf";
import { Icon } from "@/components/icons";
import { Lock, Seg } from "@/components/ui";
import { bestRate, product, rateFor } from "@/lib/mock";
import { NOT_YET, ON_IDS, ON_REZEKII, SHOWCASE_TOTAL } from "@/lib/mock-showcase";
import { productHref } from "@/lib/product-view";
import { useKept } from "@/lib/keep";
import { useT } from "@/lib/i18n/client";

const pct = (n: number, of = SHOWCASE_TOTAL) => (of ? Math.round((n / of) * 100) : 0);

/** /api/v2/coverage (signed in): her showcase products on Rezekii, and her best sellers that aren't. */
type LiveCoverage = {
  linked: boolean; count: number; more: boolean; at: string;
  on: { id: string; name: string; img: string | null; openRate: number | null; silverRate: number | null }[];
  notYet: { id: string; name: string; shop: string | null; img: string | null; sold: number }[];
};

/** A ring showing how much of her showcase is on Rezekii. */
export function CoverageRing({ size = 56, on = ON_REZEKII, of = SHOWCASE_TOTAL }: { size?: number; on?: number; of?: number }) {
  const p = pct(on, of);
  return (
    <span className="sc-ring" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 42 42">
        <circle cx="21" cy="21" r="17" fill="none" stroke="var(--line)" strokeWidth="5" />
        <circle cx="21" cy="21" r="17" fill="none" stroke="#00c073" strokeWidth="5" strokeLinecap="round" pathLength={100} strokeDasharray={`${Math.max(2, p)} 100`} transform="rotate(-90 21 21)" />
      </svg>
      <b>{p}%</b>
    </span>
  );
}

type Tab = "On Rezekii" | "Not yet";

/**
 * Home card (owner, 29 Oct 2026, layout A): what share of her showcase is on Rezekii, opening in place. Not yet lists her top
 * sellers that aren't on Rezekii, for awareness. No wish list here (owner, 30 Oct 2026): it lives on each product page.
 */
export function CoverageCard() {
  const t = useT();
  const { live, me } = useDemo();
  // Signed in (owner, 31 Oct 2026): her real showcase and sales.
  const [real, setReal] = useState<LiveCoverage | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!live) return;
    fetch("/api/v2/coverage", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: LiveCoverage | null) => (d ? setReal(d) : setFailed(true)))
      .catch(() => setFailed(true));
  }, [live]);
  const [open, setOpen] = useKept("cov-open", false);
  const [kept, setTab] = useKept<string>("cov-tab", "Not yet");
  const tab: Tab = kept === "On Rezekii" ? "On Rezekii" : "Not yet";
  const [limit, setLimit] = useKept("cov-limit", 5);
  const pickTab = (t: Tab) => { setTab(t); setLimit(5); };
  const onList = live
    ? (real?.on ?? []).map((p) => {
        const open = (p.openRate ?? 0) / 100;
        const tap = ((me?.level === "bronze" ? p.openRate : p.silverRate ?? p.openRate) ?? 0) / 100;
        return { id: p.id, name: shortName(p.name), img: p.img ?? NO_PHOTO, line: tap > open ? <>{t("{n}% open plan", { n: open })} · <em>{t("{n}% on Rezekii", { n: tap })}</em></> : <>{t("{n}% on Rezekii", { n: tap })}</> };
      })
    : ON_IDS.map(product).map((p) => ({
        id: p.id, name: p.name, img: p.img,
        line: <>{bestRate(p).plan === "Target plan" ? t("{n}% target plan", { n: bestRate(p).rate }) : t("{n}% open plan", { n: bestRate(p).rate })} · {bestRate(p).rate < rateFor(p).rate ? <em>{t("{n}% on Rezekii", { n: rateFor(p).rate })}</em> : t("pays more than Rezekii")}</>,
      }));
  const notYet = live
    ? (real?.notYet ?? []).map((it) => ({ id: it.id, name: shortName(it.name), img: it.img ?? NO_PHOTO, line: `${it.shop ? `${it.shop} · ` : ""}${t("{n} sold by you, 30 days", { n: it.sold })}` }))
    : NOT_YET.map((it) => ({ id: it.id, name: it.name, img: it.img, line: `${it.shop} · ${t("{n} sold by you", { n: it.sold })}` }));
  const all = tab === "On Rezekii" ? onList.length : notYet.length;
  const more = Math.min(5, all - limit);
  const onCount = live ? real?.on.length ?? 0 : ON_REZEKII;
  const total = live ? real?.count ?? 0 : SHOWCASE_TOTAL;
  const sub = live
    ? !real ? (failed ? t("Couldn't load your showcase") : t("Checking your showcase…")) : !real.linked ? t("Link TikTok Shop to see it") : real.more ? t("{n} of your first {total} products", { n: onCount, total: total.toLocaleString("en-MY") }) : t("{n} of your {total} products", { n: onCount, total: total.toLocaleString("en-MY") })
    : t("{n} of your {total} products", { n: ON_REZEKII, total: SHOWCASE_TOTAL.toLocaleString("en-MY") });
  // The tabs in her language; the kept choice stays in English.
  const TABS: Record<Tab, string> = { "On Rezekii": t("On Rezekii"), "Not yet": t("Not yet") };

  return (
    <section className={`v2-card sc-card${open ? " open" : ""}`}>
      <button type="button" className="sc-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <CoverageRing on={onCount} of={total} />
        <span className="sc-main">
          <b>{t("Your Showcase on Rezekii")}</b>
          <small>{sub}</small>
        </span>
        <span className="sc-chev"><Icon name="arrow" size={18} /></span>
      </button>

      {open && (
        <div className="sc-body">
          <Lock what={t("your showcase")}>
            <div className="sc-tabs"><Seg value={TABS[tab]} options={[TABS["On Rezekii"], TABS["Not yet"]]} onChange={(v) => pickTab(v === TABS["On Rezekii"] ? "On Rezekii" : "Not yet")} /></div>
            {tab === "Not yet" && <p className="sc-hint">{t("Your Top Sellers Not on Rezekii")}</p>}
            <ul className="sc-list">
              {(tab === "On Rezekii" ? onList : notYet).slice(0, limit).map((it) => (
                <li key={it.id}>
                  <Link href={productHref(it.id)} className="sc-row">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.img} alt="" />
                    <span className="sc-main"><b>{it.name}</b><small>{it.line}</small></span>
                  </Link>
                </li>
              ))}
              {live && real && all === 0 && <li className="sc-empty">{tab === "On Rezekii" ? t("None of your showcase products are on Rezekii yet.") : t("Everything you sold in the last 30 days is on Rezekii.")}</li>}
            </ul>
            {more > 0 && <button type="button" className="sc-more" onClick={() => setLimit((l) => l + 5)}>{t("Show {n} more", { n: more })}</button>}
          </Lock>
        </div>
      )}
    </section>
  );
}
