"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { Lock, Seg } from "@/components/ui";
import { bestRate, product, rateFor } from "@/lib/mock";
import { NOT_YET, ON_IDS, ON_REZEKII, SHOWCASE_TOTAL } from "@/lib/mock-showcase";
import { productHref } from "@/lib/product-view";
import { useKept } from "@/lib/keep";

const pct = (n: number) => Math.round((n / SHOWCASE_TOTAL) * 100);

/** A ring showing how much of her showcase is on Rezekii. */
export function CoverageRing({ size = 56 }: { size?: number }) {
  const p = pct(ON_REZEKII);
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
  const [open, setOpen] = useKept("cov-open", false);
  const [kept, setTab] = useKept<string>("cov-tab", "Not yet");
  const tab: Tab = kept === "On Rezekii" ? "On Rezekii" : "Not yet";
  const [limit, setLimit] = useKept("cov-limit", 5);
  const pickTab = (t: Tab) => { setTab(t); setLimit(5); };
  const all = tab === "On Rezekii" ? ON_IDS.length : NOT_YET.length;
  const more = Math.min(5, all - limit);

  return (
    <section className={`v2-card sc-card${open ? " open" : ""}`}>
      <button type="button" className="sc-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <CoverageRing />
        <span className="sc-main">
          <b>Your Showcase on Rezekii</b>
          <small>{ON_REZEKII} of your {SHOWCASE_TOTAL.toLocaleString("en-MY")} products</small>
        </span>
        <span className="sc-chev"><Icon name="arrow" size={18} /></span>
      </button>

      {open && (
        <div className="sc-body">
          <Lock what="your showcase">
            <div className="sc-tabs"><Seg value={tab} options={["On Rezekii", "Not yet"] as const} onChange={pickTab} /></div>
            {tab === "Not yet" && <p className="sc-hint">Your Top Sellers Not on Rezekii</p>}
            <ul className="sc-list">
              {tab === "On Rezekii" && ON_IDS.slice(0, limit).map(product).map((p) => (
                <li key={p.id}>
                  <Link href={productHref(p.id)} className="sc-row">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.img} alt="" />
                    <span className="sc-main"><b>{p.name}</b><small>{bestRate(p).rate}% {bestRate(p).plan.toLowerCase()} · {bestRate(p).rate < rateFor(p).rate ? <em>{rateFor(p).rate}% on Rezekii</em> : "pays more than Rezekii"}</small></span>
                  </Link>
                </li>
              ))}
              {tab === "Not yet" && NOT_YET.slice(0, limit).map((it) => (
                <li key={it.id}>
                  <Link href={productHref(it.id)} className="sc-row">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.img} alt="" />
                    <span className="sc-main"><b>{it.name}</b><small>{it.shop} · {it.sold} sold by you</small></span>
                  </Link>
                </li>
              ))}
            </ul>
            {more > 0 && <button type="button" className="sc-more" onClick={() => setLimit((l) => l + 5)}>Show {more} more</button>}
          </Lock>
        </div>
      )}
    </section>
  );
}
