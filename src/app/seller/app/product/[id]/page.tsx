"use client";

import "@/app/seller.css";
import "@/app/creator1.css";
import "@/app/product-page.css";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Progress, Tip, Loading } from "@/components/ui";
import { Trend } from "@/components/creator1/shoot-today";
import { SELLER, rm, short } from "@/lib/mock";
import { BY_PRODUCT, DESTINATIONS, SHOP_ITEMS, heat, listStatus, type ShopItem } from "@/lib/mock-seller";
import { HOT_RAISE, MIN_RAISE, commitText, hotFor } from "@/lib/mock-showcase";
import { BONUSES, PARTNER_ID, mostWantedRank, sellerWanted, weekLine } from "@/lib/product-pages";
import { loadShop } from "@/lib/live";
import { labelCase } from "@/lib/label-case";
import { Rich } from "@/components/seller/seller-ui";
import { useT } from "@/lib/i18n/client";
import type { T } from "@/lib/i18n/lang";

const BADGE = { "Not submitted": "badge-gray", "Under review": "badge-amber", Live: "", "Not approved": "badge-red" } as const;
const n = (v: number) => v.toLocaleString("en-MY");

/**
 * The AI pick's chip and the first line of its ⓘ, in her language: from the sample's all-time sales, or a real product's last
 * 90 days (its `raise` says which band it's in: 10 none, 8 a few, 5 selling well).
 */
function pickText(p: ShopItem, t: T): { label: string; why: string } {
  if (p.real) {
    if (!p.ai) return { label: "", why: t("Because every product starts at +{n}% or more.", { n: MIN_RAISE }) };
    const sold = short(p.sold);
    if (p.ai.raise >= 10) return { label: t("No sales in 90 days"), why: t("Because it had no sales in the last 90 days, so creators need a bigger reason to try it.") };
    return p.ai.raise >= 8
      ? { label: t("{n} sold in 90 days", { n: sold }), why: t("Because it sold {n} in the last 90 days, and a little more helps it take off.", { n: sold }) }
      : { label: t("{n} sold in 90 days", { n: sold }), why: t("Because it already sold {n} in the last 90 days, so creators say yes easily.", { n: sold }) };
  }
  if (p.sold === 0) return { label: t("New listing"), why: t("Because it's a new listing with no sales yet, so creators need a bigger reason to try it.") };
  if (p.sold < 10000) return { label: t("Early sales · {n} sold", { n: n(p.sold) }), why: t("Because it has early sales ({n} sold), and a little more helps it take off.", { n: n(p.sold) }) };
  const k = Math.round(p.sold / 1000);
  return { label: t("Best-seller · {n}K sold", { n: k }), why: t("Because it already sells well ({n}K sold), so creators say yes easily.", { n: k }) };
}

/**
 * Product (owner, 29 Oct 2026): the seller's own shop product as one full page, same layout as the creator's. It shows how the
 * product does on Rezekii (status, public → TAP rate, samples left, 7-day sales, Rezekii results) and, when creators asked for
 * it, the Wanted by Creators pitch (moved here from the sheet on Wanted by Creators). Buttons follow the status: Submit to TAP,
 * Track Progress, See Results or Fix and Resubmit. No Add Samples here (owner, 29 Oct 2026).
 */
export default function SellerProductPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const { live } = useDemo();
  // Signed in (owner, 30 Oct 2026): one of the shop's real products; "wait" while it loads.
  const [real, setReal] = useState<ShopItem | null | "wait">("wait");
  useEffect(() => {
    if (!live) return;
    loadShop().then((s) => setReal(s?.items.find((p) => p.id === id) ?? null)).catch(() => setReal(null));
  }, [live, id]);
  const found = live ? (real === "wait" ? null : real) : SHOP_ITEMS.find((s) => s.id === id) ?? null;
  if (live && real === "wait") return <div className="v2-stack v2-in"><Loading text={t("Loading the product…")} /></div>;
  if (!found) {
    return (
      <div className="v2-stack v2-in">
        <section className="v2-card flat" style={{ alignItems: "flex-start" }}>
          <b>{t("We couldn't find this product")}</b>
          <Link href="/seller/app/products" className="np-btn v2-btn-sm">{t("Open Shop Products")}</Link>
        </section>
      </div>
    );
  }
  return <SellerProduct key={found.id} item={found} />;
}

function SellerProduct({ item }: { item: ShopItem }) {
  const t = useT();
  const router = useRouter();
  const { toast, me } = useDemo();
  const [p, setP] = useState(item);
  const [fixOpen, setFixOpen] = useState(false);
  const [samples, setSamples] = useState(40);
  const [own, setOwn] = useState(false);
  const [bonus, setBonus] = useState<string | null>(null);
  const [asked, setAsked] = useState(false);

  const st = listStatus(p.stage);
  const wanted = sellerWanted(p.id);
  const rank = wanted ? mostWantedRank(wanted) : null;
  // A real product's AI pick comes from its real 90-day sales; without them, the minimum.
  const h = { ...(p.real ? p.ai ?? { raise: MIN_RAISE } : heat(p.sold)), ...pickText(p, t) };
  const raise = Math.max(hotFor(p.id) ? HOT_RAISE : MIN_RAISE, h.raise);
  const week = p.real ? null : weekLine(p.id, p.sold);
  const res = BY_PRODUCT.find((b) => b.id === p.id);
  const dests = DESTINATIONS.filter((d) => d.item === p.id);
  const vidsPosted = dests.reduce((a, d) => a + d.videos, 0);
  const low = p.samples !== undefined && p.samplesLeft !== undefined && p.samplesLeft < p.samples * 0.25;

  const back = () => (window.history.length > 1 ? router.back() : router.push("/seller/app/products"));
  const go = (to: string) => window.setTimeout(() => document.getElementById(to)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  const resubmit = () => {
    setP((x) => ({ ...x, stage: "Under review", samples, reason: undefined, dates: { ...x.dates, Submitted: "Today", "Under review": "Today" } }));
    setFixOpen(false);
    toast(t("{n} samples added · resubmitted", { n: samples }));
  };

  const buy =
    st === "Not submitted" ? (
      <>
        <Link href="/seller/app/submit" className="np-btn"><Icon name="send" size={18} /> {t("Register Product")}</Link>
        {wanted && <button type="button" className="btn-outline" onClick={() => go("wanted")}><Icon name="users" size={18} /> {t("See Creators Who Want It")}</button>}
      </>
    ) : st === "Under review" ? (
      <>
        {p.register && <a href={p.register} target="_blank" rel="noopener noreferrer" className="np-btn"><Icon name="link" size={18} /> {t("Register in Seller Center")}</a>}
        <Link href="/seller/app/progress" className={p.register ? "btn-outline" : "np-btn"}><Icon name="clock" size={18} /> {t("Track Progress")}</Link>
      </>
    ) : st === "Live" ? (
      <>
        <Link href="/seller/app/results" className="np-btn"><Icon name="chart" size={18} /> {t("See Results")}</Link>
        <Link href="/seller/app/changes" className="btn-outline"><Icon name="edit" size={18} /> {t("Change or End")}</Link>
      </>
    ) : p.real ? (
      <Link href="/seller/app/submit" className="np-btn"><Icon name="edit" size={18} /> {t("Register Again")}</Link>
    ) : fixOpen ? null : (
      <button type="button" className="np-btn" onClick={() => { setFixOpen(true); go("fix"); }}><Icon name="edit" size={18} /> {t("Fix and Resubmit")}</button>
    );

  return (
    <div className="pp">
      <button type="button" className="pp-back" onClick={back} aria-label={t("Back")}><Icon name="back" size={20} /></button>
      <div className="pp-photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.img} alt={p.name} />
      </div>

      <div className="pp-info">
        <h1 className="pp-name">{p.name}</h1>
        <p className="pp-meta">{p.real ? me?.sellerShop ?? t("Your shop") : SELLER.shop} · {rm(p.price)}{p.real ? (p.soldLabel ? ` · ${p.sold ? t("{n} sold in 90 days", { n: short(p.sold) }) : t("No sales in 90 days")}` : "") : ` · ${p.sold ? t("{n} sold", { n: short(p.sold) }) : t("No sales yet")}`}</p>
        <div className="pp-chips">
          <span className={`badge ${BADGE[st]}`}>{t(labelCase(st))}</span>
          {h.label && <span className="pp-chip muted">{h.label}</span>}
          {p.note && <span className="pp-chip muted">{t(p.note)}</span>}
          {p.fromSellerCenter && <span className="badge badge-blue">{t("From Seller Center")}</span>}
          {wanted && <span className="pp-chip">{t("{n} Creators Want It", { n: wanted.creators })}</span>}
        </div>

        {st === "Not approved" && p.reason && <div className="v2-alert red"><Icon name="alert" size={18} /><span>{t(p.reason)}</span></div>}

        {p.tapRate !== undefined ? (
          <div className="pp-rate">
            <span className="pp-rate-line">
              {p.publicRate !== null && <><s>{p.publicRate}%</s> <Icon name="arrow" size={14} /></>}
              <Rich text={t("<b>{rate}%</b> TAP commission", { rate: p.tapRate })} />
            </span>
            <small><Rich text={st === "Live" ? t("You pay <b>{amount}</b> per sale, only when it sells", { amount: rm((p.price * p.tapRate) / 100) }) : t("You pay <b>{amount}</b> per sale once it's live, only when it sells", { amount: rm((p.price * p.tapRate) / 100) })} /></small>
          </div>
        ) : (
          <div className="pp-rate off">
            <span className="pp-rate-line">{p.publicRate === null ? t("Public rate unknown") : t("Public rate {rate}%", { rate: p.publicRate })}</span>
            <small>
              <Rich text={p.publicRate !== null ? t("We suggest <b>+{raise}%</b> TAP commission ({total}%)", { raise, total: p.publicRate + raise }) : t("We suggest <b>+{raise}%</b> TAP commission", { raise })} />{" "}
              <Tip text={`${h.why} ${hotFor(p.id) ? t("Creators want it most, so it starts at +{n}% or more.", { n: HOT_RAISE }) : t("Every product starts at +{n}% or more.", { n: MIN_RAISE })}`} />
            </small>
          </div>
        )}

        {buy && <div className="pp-buy">{buy}</div>}

        <section className="v2-card pp-card">
          {week ? <Trend points={week} label={t("Sales, last 7 days")} /> : !p.real && <p className="pg-line">{t("No sales yet. New listing.")}</p>}
          <div className="pp-facts">
            {p.real ? (!p.salesUnknown && <span><small>{t("Sold, last 90 days")}</small><b>{short(p.sold)}</b></span>) : <span><small>{t("Total sold")}</small><b>{p.sold ? short(p.sold) : "0"}</b></span>}
            <span><small>{t("Category")}</small><b>{p.category}</b></span>
            {st === "Live" && p.dates?.Live && <span><small>{t("Live since")}</small><b>{t(p.dates.Live)}</b></span>}
            {st === "Under review" && (p.stage === "Submitted to TikTok"
              ? <span><small>{t("With TikTok since")}</small><b>{p.dates?.["Submitted to TikTok"] && t(p.dates["Submitted to TikTok"])}</b></span>
              : <span><small>{t("Submitted")}</small><b>{p.dates?.Submitted ? t(p.dates.Submitted) : t("Today")}</b></span>)}
            {st !== "Live" && p.samples !== undefined && <span><small>{t("Samples per SKU")}</small><b>{p.samples}</b></span>}
            {res && (
              <>
                <span><small>{t("Sold via Rezekii, 30 days")}</small><b>{n(res.units)}</b></span>
                <span><small>{t("Rezekii sales, 30 days")}</small><b>{rm(res.gmv, 0)}</b></span>
                <span><small>{t("Creators selling it")}</small><b>{res.creators}</b></span>
                <span><small>{t("Videos")}</small><b>{res.videos}</b></span>
              </>
            )}
          </div>
          {p.note && !p.real && st !== "Not submitted" && <p className="v2-small" style={{ margin: 0 }}>{t(p.note)}</p>}
        </section>

        {st === "Live" && p.samples !== undefined && (
          <section className="v2-card pp-card" id="samples">
            <h2 className="v2-h2">{t("Free Samples")} <span className="v2-small">{t("{n} of {total} left", { n: p.samplesLeft ?? p.samples, total: p.samples })}</span></h2>
            <Progress value={p.samplesLeft ?? p.samples} max={p.samples} />
            {low && <p className="pg-warn">{t("Running low. Our team will check with you before they run out.")}</p>}
            {dests.length > 0 && (
              <p className="pg-line">
                {dests.length === 1 ? t("{n} creator got one", { n: 1 }) : t("{n} creators got one", { n: dests.length })} · {vidsPosted === 1 ? t("{n} video posted", { n: 1 }) : t("{n} videos posted", { n: vidsPosted })} ·{" "}
                <Link href="/seller/app/results/samples" className="v2-link">{t("Where Samples Went")}</Link>
              </p>
            )}
          </section>
        )}

        {st === "Not approved" && fixOpen && (
          <section className="v2-card pp-card" id="fix">
            <h2 className="v2-h2">{t("Fix and Resubmit")}</h2>
            <div className="v2-field">{t("Samples per SKU")} <small>{t("Most shops pick 30–50")}</small>
              <div className="v2-chips">
                {[30, 40, 50].map((k) => (
                  <button key={k} type="button" className={`v2-chip ${samples === k ? "on" : ""}`} onClick={() => setSamples(k)}>{k}</button>
                ))}
              </div>
            </div>
            <div className="pp-stack">
              <button type="button" className="np-btn" onClick={resubmit}>{t("Resubmit with {n} Samples", { n: samples })}</button>
              <button type="button" className="btn-outline" onClick={() => setFixOpen(false)}>{t("Cancel")}</button>
            </div>
          </section>
        )}

        {wanted && (
          <section className="v2-card pp-card" id="wanted">
            <h2 className="v2-h2">{t("Wanted by Creators")} <Tip text={t("Creators agreed to share their commitment and their sales of your product with you. We negotiate for them; no rate is promised.")} /></h2>
            <div className="wb-pitch">
              <div className="wb-band"><b>{t("Rezekii Community Wish List")}</b>{rank && <span>{t("#{rank} this week", { rank })}</span>}</div>
              <div className="wb-pbody">
                <b className="wb-big">{wanted.creators === 1 ? t("{n} creator wants to sell your product", { n: 1 }) : t("{n} creators want to sell your product", { n: wanted.creators })}</b>
                <small>{wanted.sold30 ? t("They sold {n} of it in the last 30 days", { n: n(wanted.sold30) }) : t("It's a new listing, and they still want it")}</small>
                <div className="wb-commit">
                  <small>{t("Ready to commit each month")}</small>
                  <b>{wanted.videos === 1 ? t("{n} video", { n: 1 }) : t("{n} videos", { n: n(wanted.videos) })}{wanted.lives ? ` · ${t("{n} LIVE", { n: wanted.lives })}` : ""}{wanted.rights ? ` · ${t("ad rights from {n}", { n: wanted.rights })}` : ""}</b>
                </div>
              </div>
            </div>

            <div className="ad-wl-sec">
              <h3>{t("Creators")}</h3>
              {wanted.offers.map((o) => (
                <div key={o.handle} className="ad-wl-offer">
                  <b>{o.handle}</b>
                  <small>{o.sold ? t("{n} sold in 30 days", { n: n(o.sold) }) : t("No sales yet")} · {commitText(o.commit)}</small>
                </div>
              ))}
              {wanted.creators > wanted.offers.length && <small className="v2-muted">{t("and {n} more", { n: wanted.creators - wanted.offers.length })}</small>}
            </div>

            {st === "Not submitted" && (
              <>
                <button type="button" className="btn-outline" onClick={() => setOwn((o) => !o)}>{t("Invite Us to Your Own TAP Campaign")}</button>
                {own && (
                  <ol className="wb-own">
                    <li>{t("In TikTok Seller Center, create a TAP campaign with this product.")}</li>
                    <li>{t("Run it as long as TikTok allows, at least +{n}% above your public rate for products creators want.", { n: HOT_RAISE })}</li>
                    <li>{t("Invite Techwide (partner ID {id}). We accept and bring these creators in.", { id: PARTNER_ID })}</li>
                  </ol>
                )}
              </>
            )}

            <div className="ad-wl-sec">
              <h3>{t("Add a Bonus (Optional)")}</h3>
              <div className="v2-chips">{BONUSES.map((b) => <button key={b} type="button" className={`v2-chip ${bonus === b ? "on" : ""}`} onClick={() => { setBonus(b); setAsked(false); }}>{t(b)}</button>)}</div>
              {bonus && (asked
                ? <p className="v2-small" style={{ margin: 0 }}><Icon name="check" size={14} width={2.6} /> {t("Sent. The Rezekii team will set it up with you.")}</p>
                : <button type="button" className="btn-outline" onClick={() => { setAsked(true); toast(t("Sent to the Rezekii team")); }}>{t("Send to Rezekii Team")}</button>)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
