"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Lock, Seg, Sheet } from "@/components/ui";
import { LinkFinder, WishSteps, useWishes } from "@/components/creator1/wish";
import { product, rateFor } from "@/lib/mock";
import { NOT_YET, ON_IDS, ON_REZEKII, SHOWCASE_TOTAL, commitText } from "@/lib/mock-showcase";
import { productHref } from "@/lib/product-view";

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

type Tab = "On Rezekii" | "Not yet" | "Wish List";

/**
 * Home card (owner, 29 Oct 2026, layout A): what share of her showcase is on Rezekii, opening in place. Not yet lists her top
 * sellers that aren't on Rezekii, for awareness; the wish list sits one step deeper, inside a product, so only creators who mean
 * it add one. She can also paste a product link.
 */
export function CoverageCard() {
  const { wishes, mine } = useWishes();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("Not yet");
  const [limit, setLimit] = useState(5);
  const [paste, setPaste] = useState(false);
  const pickTab = (t: Tab) => { setTab(t); setLimit(5); };
  const all = tab === "On Rezekii" ? ON_IDS.length : tab === "Not yet" ? NOT_YET.length : wishes.length;
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
            <div className="sc-tabs"><Seg value={tab} options={["On Rezekii", "Not yet", "Wish List"] as const} onChange={pickTab} /></div>
            {tab === "Not yet" && <p className="sc-hint">Your Top Sellers Not on Rezekii</p>}
            {/* On her own wish list she's already chosen to be here, so adding is a plain button (owner, 29 Oct 2026). */}
            {tab === "Wish List" && <button type="button" className="btn-outline v2-btn-sm sc-add" onClick={() => setPaste(true)}><Icon name="plus" size={16} /> Add a Product</button>}
            <ul className="sc-list">
              {tab === "On Rezekii" && ON_IDS.slice(0, limit).map(product).map((p) => (
                <li key={p.id}>
                  <Link href={productHref(p.id)} className="sc-row">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.img} alt="" />
                    <span className="sc-main"><b>{p.name}</b><small>{p.publicRate}% open plan · <em>{rateFor(p).rate}% on Rezekii</em></small></span>
                  </Link>
                </li>
              ))}
              {tab === "Not yet" && NOT_YET.slice(0, limit).map((it) => (
                <li key={it.id}>
                  <Link href={productHref(it.id)} className="sc-row">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.img} alt="" />
                    <span className="sc-main"><b>{it.name}</b><small>{it.shop} · {it.sold} sold by you</small></span>
                    {mine(it.id) && <span className="sc-tag">On wish list</span>}
                  </Link>
                </li>
              ))}
              {tab === "Wish List" && wishes.slice(0, limit).map((w) => (
                <li key={w.id}>
                  <Link href={productHref(w.id)} className="sc-row sc-asked">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={w.img} alt="" />
                    <span className="sc-main"><b>{w.name}</b><WishSteps w={w} /><small>{commitText(w.commit)}</small></span>
                  </Link>
                </li>
              ))}
              {tab === "Wish List" && wishes.length === 0 && <li className="sc-empty">Your wish list is empty.</li>}
            </ul>
            {more > 0 && <button type="button" className="sc-more" onClick={() => setLimit((l) => l + 5)}>Show {more} more</button>}
            {tab === "Not yet" && <button type="button" className="sc-paste" onClick={() => setPaste(true)}><Icon name="link" size={15} /> Paste a product link</button>}
          </Lock>
        </div>
      )}

      {paste && (
        <Sheet title="Add to Wish List" onClose={() => setPaste(false)}>
          <p className="v2-muted" style={{ margin: 0 }}>Paste any TikTok Shop product link, even one that&apos;s not in your showcase.</p>
          <LinkFinder />
          {tab === "Wish List" && <button type="button" className="btn-outline" onClick={() => { setPaste(false); pickTab("Not yet"); }}>Pick From Your Showcase</button>}
        </Sheet>
      )}
    </section>
  );
}
