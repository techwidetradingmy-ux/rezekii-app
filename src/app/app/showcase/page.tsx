"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Lock, Seg, Title } from "@/components/ui";
import { ProductSheet } from "@/components/creator2/view-sheets";
import { CoverageRing } from "@/components/creator1/showcase-coverage";
import { product } from "@/lib/mock";
import { NOT_YET, ON_IDS, ON_REZEKII, SHOWCASE_TOTAL, type OffItem, type ReqStatus } from "@/lib/mock-showcase";
import "@/app/creator1.css";

type Tab = "On Rezekii" | "Not yet" | "Requested";
const STEPS: ReqStatus[] = ["Requested", "Seller contacted", "On Rezekii"];

/** A plain tile for products we don't have a photo of yet: the first letter on the product's colour. */
const Tile = ({ it }: { it: OffItem }) => <span className="sc-tile" style={{ background: it.color }} aria-hidden="true">{it.name[0]}</span>;

/**
 * My Showcase (owner, 29 Oct 2026): which of her showcase products are on Rezekii, the ones that aren't yet, and her requests
 * for us to bring them in. Requests go to the admin's Product Requests list, so Techwide knows which sellers to approach.
 */
export default function MyShowcase() {
  const { linked, setLinked, toast } = useDemo();
  const [tab, setTab] = useState<Tab>("Not yet");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<OffItem[]>(NOT_YET);
  const [view, setView] = useState<string | null>(null);
  const s = q.trim().toLowerCase();
  const match = (name: string) => !s || name.toLowerCase().includes(s);
  const asked = items.filter((it) => it.status);
  const notYet = items.filter((it) => !it.status);

  const request = (ids: string[]) => {
    if (!linked) return setLinked(true);
    setItems((all) => all.map((it) => (ids.includes(it.id) ? { ...it, status: "Requested", when: "Just now" } : it)));
    toast(ids.length > 1 ? `${ids.length} products requested. We'll ask the sellers.` : "Requested. We'll ask the seller.");
  };

  return (
    <div className="v2-stack v2-in" style={{ gap: 14 }}>
      <Title title="My Showcase" sub="Which of your showcase products are on Rezekii. Ask us to bring in the rest and we'll talk to the sellers." />

      <section className="v2-card sc-sum">
        <CoverageRing size={64} />
        <span className="sc-main">
          <b>{ON_REZEKII} of {SHOWCASE_TOTAL.toLocaleString("en-MY")} on Rezekii</b>
          <small>{asked.length} requested · {(SHOWCASE_TOTAL - ON_REZEKII).toLocaleString("en-MY")} not yet</small>
        </span>
      </section>

      <div className="sc-tabs"><Seg value={tab} options={["On Rezekii", "Not yet", "Requested"] as const} onChange={setTab} /></div>
      <label className="sc-search">
        <Icon name="search" size={17} />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your showcase" aria-label="Search your showcase" />
      </label>

      <Lock what="your showcase">
        {tab === "On Rezekii" && (
          <ul className="sc-list">
            {ON_IDS.map(product).filter((p) => match(p.name)).map((p) => (
              <li key={p.id}>
                <button type="button" className="sc-row" onClick={() => setView(p.id)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt="" />
                  <span className="sc-main"><b>{p.name}</b><small>{p.publicRate}% open plan · <em>{p.tapRate}% on Rezekii</em></small></span>
                  <Icon name="arrow" size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {tab === "Not yet" && (
          <>
            <div className="sc-bulk">
              <span>Your top sellers not on Rezekii</span>
              {notYet.length > 1 && <button type="button" className="btn-outline v2-btn-sm" onClick={() => request(notYet.filter((it) => match(it.name)).map((it) => it.id))}>Request all</button>}
            </div>
            <ul className="sc-list">
              {notYet.filter((it) => match(it.name)).map((it) => (
                <li key={it.id} className="sc-row">
                  <Tile it={it} />
                  <span className="sc-main"><b>{it.name}</b><small>{it.shop} · {it.sold} sold by you</small></span>
                  <button type="button" className="np-btn v2-btn-sm sc-req" onClick={() => request([it.id])}><Icon name="plus" size={15} /> Request</button>
                </li>
              ))}
              {notYet.length === 0 && <li className="sc-empty">All requested. We&apos;ll let you know when they arrive.</li>}
            </ul>
          </>
        )}

        {tab === "Requested" && (
          <ul className="sc-list">
            {asked.filter((it) => match(it.name)).map((it) => {
              const step = STEPS.indexOf(it.status!);
              return (
                <li key={it.id} className="sc-row sc-asked">
                  <Tile it={it} />
                  <span className="sc-main">
                    <b>{it.name}</b>
                    <span className="sc-steps" aria-label={`Status: ${it.status}`}>{STEPS.map((x, k) => <i key={x} className={k <= step ? "on" : undefined} />)}</span>
                    <small>{it.status} · {it.when}</small>
                  </span>
                  {it.status === "On Rezekii" && <span className="badge">Live</span>}
                </li>
              );
            })}
            {asked.length === 0 && <li className="sc-empty">No requests yet.</li>}
          </ul>
        )}
      </Lock>

      {view && <ProductSheet productId={view} onClose={() => setView(null)} />}
    </div>
  );
}
