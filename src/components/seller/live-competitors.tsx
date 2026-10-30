"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Title } from "@/components/ui";
import { Ava } from "@/components/seller/seller-ui";
import { NO_PHOTO, shortName } from "@/lib/live-perf";
import { rm, short } from "@/lib/mock";

type Data = {
  linked: boolean;
  categories: { name: string; mine: number; products: { id: string; name: string; shop: string | null; image: string | null; price: number | null; sold: number; rate: number | null; creators: number; mine: boolean }[]; creators: { handle: string; products: number; gmv: number; videos: number }[] }[];
};

/**
 * AI Competitors on real data (owner, 31 Oct 2026): in each category your products are in, the best sellers in Techwide's
 * TAP catalog from other shops, their commission and how many creators promote them, and the creators selling most there.
 */
export function LiveCompetitors() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cat, setCat] = useState("");
  useEffect(() => {
    fetch("/api/v2/seller/competitors", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load"))))
      .then((x: Data) => { setD(x); setCat(x.categories[0]?.name ?? ""); })
      .catch(() => setErr("Couldn't reach TikTok Shop. Please try again."));
  }, []);
  const c = d?.categories.find((x) => x.name === cat);
  return (
    <div className="v2-stack v2-in">
      <Title ai title="AI Competitors" sub="Best sellers in your categories from other shops in Techwide's TAP, and the creators selling them." />
      {!d ? <p className="v2-muted">{err ?? "Reading your categories and the TAP catalog…"}</p> : !d.linked ? (
        <section className="v2-card flat" style={{ alignItems: "flex-start" }}>
          <b>Connect your Seller Center shop</b>
          <p className="v2-muted" style={{ margin: 0 }}>Competitors show here for the categories your products are in.</p>
          <Link href="/seller/app/account" className="np-btn v2-btn-sm">Connect shop</Link>
        </section>
      ) : !d.categories.length ? (
        <section className="v2-card flat"><p className="v2-muted" style={{ margin: 0 }}>None of Techwide&apos;s campaign products are in your categories yet.</p></section>
      ) : (
        <>
          <div className="v2-chips" role="group" aria-label="Category">
            {d.categories.map((x) => <button key={x.name} type="button" className={`v2-chip ${cat === x.name ? "on" : ""}`} onClick={() => setCat(x.name)}>{x.name} <small>({x.mine} yours)</small></button>)}
          </div>
          {c && (
            <div className="v2-split">
              <section className="v2-card">
                <div className="v2-card-h"><h2 className="v2-h2">Best Sellers</h2><span className="v2-small">All-time sold on TikTok Shop</span></div>
                <div className="v2-divide">
                  {c.products.map((p, i) => (
                    <div key={p.id} className="sl-act" style={{ gridTemplateColumns: "24px 40px minmax(0,1fr)" }}>
                      <b>{i + 1}</b>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.image ?? NO_PHOTO} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />
                      <span><b style={{ fontSize: 14 }}>{shortName(p.name)}{p.mine ? " · yours" : ""}</b><small>{p.shop ?? ""} · {p.price !== null ? rm(p.price) : "—"} · {short(p.sold)} sold · {p.rate !== null ? `${p.rate / 100}%` : "—"} · {p.creators} creator{p.creators === 1 ? "" : "s"} promoting</small></span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="v2-card">
                <div className="v2-card-h"><h2 className="v2-h2">Creators Selling Here</h2><span className="v2-small">Through Techwide&apos;s campaigns</span></div>
                <div className="v2-divide">
                  {c.creators.map((x) => (
                    <div key={x.handle} className="sl-act" style={{ gridTemplateColumns: "36px minmax(0,1fr)" }}>
                      <Ava name={x.handle} />
                      <span><b style={{ fontSize: 14 }}>{x.handle}</b><small>{x.products} product{x.products === 1 ? "" : "s"} · {x.videos} videos · {rm(x.gmv, 0)} sales</small></span>
                    </div>
                  ))}
                  {!c.creators.length && <p className="v2-muted" style={{ margin: 0 }}>No creators promoting these yet.</p>}
                </div>
              </section>
            </div>
          )}
          <p className="v2-small" style={{ margin: 0 }}>From Rezekii&apos;s TAP catalog and creator data, not all of TikTok Shop.</p>
        </>
      )}
    </div>
  );
}
