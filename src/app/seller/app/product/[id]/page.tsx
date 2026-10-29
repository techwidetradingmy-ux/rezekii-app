"use client";

import "@/app/seller.css";
import "@/app/creator1.css";
import "@/app/product-page.css";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Progress, Tip } from "@/components/ui";
import { Trend } from "@/components/creator1/shoot-today";
import { SELLER, rm, short } from "@/lib/mock";
import { BY_PRODUCT, DESTINATIONS, SHOP_ITEMS, heat, listStatus, type ShopItem } from "@/lib/mock-seller";
import { HOT_RAISE, MIN_RAISE, commitText, hotFor } from "@/lib/mock-showcase";
import { BONUSES, PARTNER_ID, mostWantedRank, sellerWanted, weekLine } from "@/lib/product-pages";

const BADGE = { "Not submitted": "badge-gray", "Under review": "badge-amber", Live: "", "Not approved": "badge-red" } as const;
const n = (v: number) => v.toLocaleString("en-MY");

/**
 * Product (owner, 29 Oct 2026): the seller's own shop product as one full page, same layout as the creator's. It shows how the
 * product does on Rezekii (status, public → TAP rate, samples left, 7-day sales, Rezekii results) and, when creators asked for
 * it, the Wanted by Creators pitch (moved here from the sheet on Wanted by Creators). Buttons follow the status: Submit to TAP,
 * Track Progress, See Results or Fix and Resubmit. No Add Samples here (owner, 29 Oct 2026).
 */
export default function SellerProductPage() {
  const { id } = useParams<{ id: string }>();
  const found = SHOP_ITEMS.find((s) => s.id === id) ?? null;
  if (!found) {
    return (
      <div className="v2-stack v2-in">
        <section className="v2-card flat" style={{ alignItems: "flex-start" }}>
          <b>We couldn&apos;t find this product</b>
          <Link href="/seller/app/products" className="np-btn v2-btn-sm">Open Shop Products</Link>
        </section>
      </div>
    );
  }
  return <SellerProduct key={found.id} item={found} />;
}

function SellerProduct({ item }: { item: ShopItem }) {
  const router = useRouter();
  const { toast } = useDemo();
  const [p, setP] = useState(item);
  const [fixOpen, setFixOpen] = useState(false);
  const [samples, setSamples] = useState(40);
  const [own, setOwn] = useState(false);
  const [bonus, setBonus] = useState<string | null>(null);
  const [asked, setAsked] = useState(false);

  const st = listStatus(p.stage);
  const wanted = sellerWanted(p.id);
  const rank = wanted ? mostWantedRank(wanted) : null;
  const h = heat(p.sold);
  const raise = Math.max(hotFor(p.id) ? HOT_RAISE : MIN_RAISE, h.raise);
  const week = weekLine(p.id, p.sold);
  const res = BY_PRODUCT.find((b) => b.id === p.id);
  const dests = DESTINATIONS.filter((d) => d.item === p.id);
  const low = p.samples !== undefined && p.samplesLeft !== undefined && p.samplesLeft < p.samples * 0.25;

  const back = () => (window.history.length > 1 ? router.back() : router.push("/seller/app/products"));
  const go = (to: string) => window.setTimeout(() => document.getElementById(to)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  const resubmit = () => {
    setP((x) => ({ ...x, stage: "Under review", samples, reason: undefined, dates: { ...x.dates, Submitted: "Today", "Under review": "Today" } }));
    setFixOpen(false);
    toast(`${samples} samples added · resubmitted`);
  };

  const buy =
    st === "Not submitted" ? (
      <>
        <Link href={`/seller/app/submit?p=${p.id}`} className="np-btn"><Icon name="send" size={18} /> Submit to TAP</Link>
        {wanted && <button type="button" className="btn-outline" onClick={() => go("wanted")}><Icon name="users" size={18} /> See Creators Who Want It</button>}
      </>
    ) : st === "Under review" ? (
      <Link href="/seller/app/progress" className="np-btn"><Icon name="clock" size={18} /> Track Progress</Link>
    ) : st === "Live" ? (
      <>
        <Link href="/seller/app/results" className="np-btn"><Icon name="chart" size={18} /> See Results</Link>
        <Link href="/seller/app/changes" className="btn-outline"><Icon name="edit" size={18} /> Change or End</Link>
      </>
    ) : fixOpen ? null : (
      <button type="button" className="np-btn" onClick={() => { setFixOpen(true); go("fix"); }}><Icon name="edit" size={18} /> Fix and Resubmit</button>
    );

  return (
    <div className="pp">
      <button type="button" className="pp-back" onClick={back} aria-label="Back"><Icon name="back" size={20} /></button>
      <div className="pp-photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.img} alt={p.name} />
      </div>

      <div className="pp-info">
        <h1 className="pp-name">{p.name}</h1>
        <p className="pp-meta">{SELLER.shop} · {rm(p.price)} · {p.sold ? `${short(p.sold)} sold` : "No sales yet"}</p>
        <div className="pp-chips">
          <span className={`badge ${BADGE[st]}`}>{st}</span>
          <span className="pp-chip muted">{h.label}</span>
          {p.fromSellerCenter && <span className="badge badge-blue">From Seller Center</span>}
          {wanted && <span className="pp-chip">{wanted.creators} Creators Want It</span>}
        </div>

        {st === "Not approved" && p.reason && <div className="v2-alert red"><Icon name="alert" size={18} /><span>{p.reason}</span></div>}

        {p.tapRate !== undefined ? (
          <div className="pp-rate">
            <span className="pp-rate-line">
              {p.publicRate !== null && <><s>{p.publicRate}%</s> <Icon name="arrow" size={14} /></>}
              <b>{p.tapRate}%</b> on Rezekii
            </span>
            <small>Creators earn <b>{rm((p.price * p.tapRate) / 100)}</b> per sale{st === "Live" ? "" : " once it's live"}</small>
          </div>
        ) : (
          <div className="pp-rate off">
            <span className="pp-rate-line">Public rate {p.publicRate === null ? "unknown" : `${p.publicRate}%`}</span>
            <small>
              We suggest <b>+{raise}%</b> on Rezekii{p.publicRate !== null ? ` (${p.publicRate + raise}%)` : ""}{" "}
              <Tip text={`Because ${h.why}.${hotFor(p.id) ? ` Creators want it most, so it starts at +${HOT_RAISE}% or more.` : ` Every product starts at +${MIN_RAISE}% or more.`}`} />
            </small>
          </div>
        )}

        {buy && <div className="pp-buy">{buy}</div>}

        <section className="v2-card pp-card">
          {week ? <Trend points={week} label="Sales, last 7 days" /> : <p className="pg-line">No sales yet. New listing.</p>}
          <div className="pp-facts">
            <span><small>Total sold</small><b>{p.sold ? short(p.sold) : "0"}</b></span>
            <span><small>Category</small><b>{p.category}</b></span>
            {st === "Live" && p.dates?.Live && <span><small>Live since</small><b>{p.dates.Live}</b></span>}
            {st === "Under review" && (p.stage === "Submitted to TikTok"
              ? <span><small>With TikTok since</small><b>{p.dates?.["Submitted to TikTok"]}</b></span>
              : <span><small>Submitted</small><b>{p.dates?.Submitted ?? "Today"}</b></span>)}
            {st !== "Live" && p.samples !== undefined && <span><small>Samples per SKU</small><b>{p.samples}</b></span>}
            {res && (
              <>
                <span><small>Sold via Rezekii, 30 days</small><b>{n(res.units)}</b></span>
                <span><small>Rezekii sales, 30 days</small><b>{rm(res.gmv, 0)}</b></span>
                <span><small>Creators selling it</small><b>{res.creators}</b></span>
                <span><small>Videos</small><b>{res.videos}</b></span>
              </>
            )}
          </div>
          {p.note && st !== "Not submitted" && <p className="v2-small" style={{ margin: 0 }}>{p.note}</p>}
        </section>

        {st === "Live" && p.samples !== undefined && (
          <section className="v2-card pp-card" id="samples">
            <h2 className="v2-h2">Free Samples <span className="v2-small">{p.samplesLeft ?? p.samples} of {p.samples} left</span></h2>
            <Progress value={p.samplesLeft ?? p.samples} max={p.samples} />
            {low && <p className="pg-warn">Running low. Our team will check with you before they run out.</p>}
            {dests.length > 0 && (
              <p className="pg-line">
                {dests.length} creators got one · {dests.reduce((a, d) => a + d.videos, 0)} videos posted ·{" "}
                <Link href="/seller/app/results/samples" className="v2-link">Where Samples Went</Link>
              </p>
            )}
          </section>
        )}

        {st === "Not approved" && fixOpen && (
          <section className="v2-card pp-card" id="fix">
            <h2 className="v2-h2">Fix and Resubmit</h2>
            <div className="v2-field">Samples per SKU <small>Most shops pick 30–50</small>
              <div className="v2-chips">
                {[30, 40, 50].map((k) => (
                  <button key={k} type="button" className={`v2-chip ${samples === k ? "on" : ""}`} onClick={() => setSamples(k)}>{k}</button>
                ))}
              </div>
            </div>
            <div className="pp-stack">
              <button type="button" className="np-btn" onClick={resubmit}>Resubmit with {samples} Samples</button>
              <button type="button" className="btn-outline" onClick={() => setFixOpen(false)}>Cancel</button>
            </div>
          </section>
        )}

        {wanted && (
          <section className="v2-card pp-card" id="wanted">
            <h2 className="v2-h2">Wanted by Creators <Tip text="Creators agreed to share their commitment and their sales of your product with you. We negotiate for them; no rate is promised." /></h2>
            <div className="wb-pitch">
              <div className="wb-band"><b>Rezekii Most Wanted</b>{rank && <span>#{rank} this week</span>}</div>
              <div className="wb-pbody">
                <b className="wb-big">{wanted.creators} creators want to sell your product</b>
                <small>{wanted.sold30 ? `They sold ${n(wanted.sold30)} of it in the last 30 days` : "It's a new listing, and they still want it"}</small>
                <div className="wb-commit">
                  <small>Ready to commit each month</small>
                  <b>{n(wanted.videos)} videos{wanted.lives ? ` · ${wanted.lives} LIVE` : ""}{wanted.rights ? ` · ad rights from ${wanted.rights}` : ""}</b>
                </div>
              </div>
            </div>

            <div className="ad-wl-sec">
              <h3>Creators</h3>
              {wanted.offers.map((o) => (
                <div key={o.handle} className="ad-wl-offer">
                  <b>{o.handle}</b>
                  <small>{o.sold ? `${n(o.sold)} sold in 30 days` : "No sales yet"} · {commitText(o.commit)}</small>
                </div>
              ))}
              {wanted.creators > wanted.offers.length && <small className="v2-muted">and {wanted.creators - wanted.offers.length} more</small>}
            </div>

            {st === "Not submitted" && (
              <>
                <button type="button" className="btn-outline" onClick={() => setOwn((o) => !o)}>Invite Us to Your Own TAP Campaign</button>
                {own && (
                  <ol className="wb-own">
                    <li>In TikTok Seller Center, create a TAP campaign with this product.</li>
                    <li>Run it as long as TikTok allows, at least +{HOT_RAISE}% above your public rate for products creators want.</li>
                    <li>Invite Techwide (partner ID {PARTNER_ID}). We accept and bring these creators in.</li>
                  </ol>
                )}
              </>
            )}

            <div className="ad-wl-sec">
              <h3>Add a Bonus (Optional)</h3>
              <div className="v2-chips">{BONUSES.map((b) => <button key={b} type="button" className={`v2-chip ${bonus === b ? "on" : ""}`} onClick={() => { setBonus(b); setAsked(false); }}>{b}</button>)}</div>
              {bonus && (asked
                ? <p className="v2-small" style={{ margin: 0 }}><Icon name="check" size={14} width={2.6} /> Sent. The Rezekii team will set it up with you.</p>
                : <button type="button" className="btn-outline" onClick={() => { setAsked(true); toast("Sent to the Rezekii team"); }}>Send to Rezekii Team</button>)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
