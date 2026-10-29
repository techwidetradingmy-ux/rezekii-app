"use client";

import "@/app/admin.css";
import "@/app/creator1.css";
import "@/app/product-page.css";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Stepper, Tip } from "@/components/ui";
import { Pill, type Tone } from "@/components/admin/bits";
import { Trend } from "@/components/creator1/shoot-today";
import { CUSTOM_RATES, PRODUCTS, rm, short, type CreatorLevel, type CustomRate, type Product } from "@/lib/mock";
import { SAMPLE_LEFT } from "@/lib/mock-creator1";
import { BOARD_MIN, WANTED, commitText, isReady, onBoard, type Wanted } from "@/lib/mock-showcase";
import { campaignFor, pitch, ticketsFor } from "@/lib/product-pages";
import { productView, type ProductView } from "@/lib/product-view";

const n = (v: number) => v.toLocaleString("en-MY");
const closed = (w: Wanted) => w.status === "Joined" || w.status === "Bonus" || w.status === "Declined";
const wishPill = (w: Wanted): [string, Tone] =>
  w.status === "Joined" ? [`Joined +${w.raise ?? 1}%`, "ok"]
  : w.status === "Bonus" ? ["Bonus program", "ok"]
  : w.status === "Declined" ? ["Declined", "bad"]
  : w.status === "Contacting" ? ["Contacting", "warn"]
  : isReady(w) ? ["Ready to pitch", "info"]
  : ["Collecting", "mute"];

/**
 * Product (owner, 29 Oct 2026): any product as admin sees it, same full page as the creator's. Marketplace products are run
 * in TAP from here (Change Creator Commission, Review Sample Requests, Contact Seller, Pause or End) with the campaign they're in;
 * wish-list products show what creators committed, with Copy Seller Pitch and Open in Wish List.
 */
export default function AdminProductPage() {
  const { id } = useParams<{ id: string }>();
  const m = PRODUCTS.find((p) => p.id === id) ?? null;
  const w = WANTED.find((x) => x.id === id) ?? null;
  const v = productView(id);
  if (!v || (!m && !w)) {
    return (
      <div className="v2-stack v2-in">
        <section className="v2-card flat" style={{ alignItems: "flex-start" }}>
          <b>We couldn&apos;t find this product</b>
          <Link href="/admin/tap/requests" className="np-btn v2-btn-sm">Open Wish List</Link>
        </section>
      </div>
    );
  }
  return <AdminProduct key={id} v={v} m={m} w={w} />;
}

function AdminProduct({ v, m, w }: { v: ProductView; m: Product | null; w: Wanted | null }) {
  const router = useRouter();
  const { toast } = useDemo();
  // Creator commission (owner, 29 Oct 2026): one Rezekii rate for everyone, optionally a different rate per level, and special
  // rates for single creators. The seller's TAP commission is fixed; admin moves only these, from the open plan to TAP −1%.
  const [rate, setRate] = useState(m?.tapRate ?? 0);
  const [levels, setLevels] = useState<Partial<Record<CreatorLevel, number>>>(m?.levelRates ?? {});
  const [specials, setSpecials] = useState<CustomRate[]>(() => CUSTOM_RATES.filter((c) => c.productId === m?.id));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(rate);
  const [byLevel, setByLevel] = useState(false);
  const [dLevels, setDLevels] = useState<Partial<Record<CreatorLevel, number>>>({});
  const [dSpecials, setDSpecials] = useState<CustomRate[]>([]);
  const [handle, setHandle] = useState("");
  const [specialRate, setSpecialRate] = useState(rate);
  const [confirm, setConfirm] = useState(false);
  const [state, setState] = useState<"Paused" | "Ended" | null>(null);

  const back = () => (window.history.length > 1 ? router.back() : router.push(m ? "/admin/tap" : "/admin/tap/requests"));
  const go = (to: string) => window.setTimeout(() => document.getElementById(to)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  const copy = async (x: Wanted) => {
    try {
      await navigator.clipboard.writeText(pitch(x));
      toast("Seller pitch copied");
    } catch {
      toast("Couldn't copy. Select the pitch text instead.");
    }
  };

  const wishCard = w && (
    <section className="v2-card pp-card" id="wish">
      <h2 className="v2-h2">Wish List {m && <Pill tone={wishPill(w)[1]}>{wishPill(w)[0]}</Pill>}</h2>
      <div className="ad-wl-stats">
        <span><small>Creators</small><b>{w.creators}</b></span>
        <span><small>Videos a month</small><b>{n(w.videos)}</b></span>
        <span><small>LIVE a month</small><b>{w.lives}</b></span>
        <span><small>Give ad rights</small><b>{w.rights}</b></span>
        <span><small>Their sales, 30 days</small><b>{n(w.sold30)}</b></span>
        <span><small>New this week</small><b>+{w.week}</b></span>
      </div>
      <p className="v2-small" style={{ margin: 0 }}>
        Wanted since {w.first} · {onBoard(w) ? "on the Community Wish List." : w.creators < BOARD_MIN && !closed(w) ? `not public yet: shows on the Community Wish List at ${BOARD_MIN} creators.` : "off the Community Wish List."}
      </p>
      <div className="ad-wl-sec">
        <h3>Top Offers</h3>
        {w.offers.map((o) => (
          <div key={o.handle} className="ad-wl-offer">
            <b>{o.handle}</b>
            <small>{o.sold ? `${n(o.sold)} sold in 30 days` : "New listing, no sales yet"} · {commitText(o.commit)}</small>
          </div>
        ))}
      </div>
      {!m && (
        <div className="ad-wl-sec">
          <h3>Seller Pitch</h3>
          <p className="ad-wl-pitch">{pitch(w)}</p>
        </div>
      )}
    </section>
  );

  /* A wish-list product that isn't on Rezekii yet: pitch the seller. */
  if (!m && w) {
    return (
      <div className="pp">
        <button type="button" className="pp-back" onClick={back} aria-label="Back"><Icon name="back" size={20} /></button>
        <div className="pp-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={v.img} alt={v.name} />
        </div>
        <div className="pp-info">
          <h1 className="pp-name">{v.name}</h1>
          <p className="pp-meta">{w.shop} · {rm(w.price)}{w.sold30 ? ` · ${short(w.sold30)} sold by these creators, 30 days` : ""}</p>
          <div className="pp-chips">
            <Pill tone={wishPill(w)[1]}>{wishPill(w)[0]}</Pill>
            <span className="pp-chip muted">Not on Rezekii Yet</span>
            {w.category && <span className="pp-chip muted">{w.category}</span>}
          </div>
          <div className="pp-rate off">
            <span className="pp-rate-line">Open plan {w.rate === null ? "—" : `${w.rate}%`}</span>
            <small>{w.creators} creators want it on Rezekii</small>
          </div>
          <div className="pp-buy">
            <button type="button" className="np-btn" onClick={() => copy(w)}><Icon name="doc" size={18} /> Copy Seller Pitch</button>
            <Link href="/admin/tap/requests" className="btn-outline"><Icon name="list" size={18} /> Open in Wish List</Link>
          </div>
          <section className="v2-card pp-card">
            <Trend points={v.week} label="Sales, last 7 days" />
            <div className="pp-facts">
              <span><small>Category</small><b>{w.category}</b></span>
              <span><small>Wanted since</small><b>{w.first}</b></span>
            </div>
          </section>
          {wishCard}
        </div>
      </div>
    );
  }

  /* A marketplace product: run it in TAP. */
  const p = m!;
  const camp = campaignFor(p.id);
  const tickets = ticketsFor(p.id);
  const floor = Math.min(rate, p.publicRate);
  const ceil = Math.max(rate, p.partnerRate - 1);
  const LEVELS: CreatorLevel[] = ["Bronze", "Silver", "Gold"];
  const levelSummary = LEVELS.some((l) => levels[l] !== undefined && levels[l] !== rate) ? LEVELS.map((l) => `${l} ${levels[l] ?? rate}%`).join(" · ") : "";
  const openEdit = () => {
    setDraft(rate);
    setDLevels(levels);
    setByLevel(Object.keys(levels).length > 0);
    setDSpecials(specials);
    setSpecialRate(rate);
    setHandle("");
    setEditing(true);
    go("edit");
  };
  const addSpecial = () => {
    const h = handle.trim().startsWith("@") ? handle.trim() : `@${handle.trim()}`;
    if (h.length < 3) return toast("Enter the creator's @handle");
    setDSpecials((l) => [...l.filter((x) => x.handle !== h), { productId: p.id, handle: h, rate: specialRate }]);
    setHandle("");
  };
  const save = () => {
    setRate(draft);
    setLevels(byLevel ? dLevels : {});
    setSpecials(dSpecials);
    setEditing(false);
    toast("Creator commission saved");
  };
  const act = (s: "Paused" | "Ended" | null) => {
    setState(s);
    setConfirm(false);
    toast(s === "Paused" ? "Paused in TAP · seller told · logged" : s === "Ended" ? "Ended in TAP · seller told · logged" : "Resumed in TAP · seller told · logged");
  };

  return (
    <div className="pp">
      <button type="button" className="pp-back" onClick={back} aria-label="Back"><Icon name="back" size={20} /></button>
      <div className="pp-photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.img} alt={p.name} />
      </div>

      <div className="pp-info">
        <h1 className="pp-name">{p.name}</h1>
        <p className="pp-meta">{p.shop} · {rm(p.price)} · {short(p.sold)} sold</p>
        <div className="pp-chips">
          {state ? <Pill tone={state === "Paused" ? "warn" : "bad"}>{state}</Pill> : camp?.status === "Live" ? <Pill tone="ok">Live in TAP</Pill> : <Pill>{camp?.status ?? "Not in a campaign"}</Pill>}
          <span className="pp-chip score"><Icon name="star" size={13} width={2.4} /> {p.rating.toFixed(1)}</span>
          {p.samples !== null && <span className="pp-chip">{p.samples ? `Samples · ${p.samples}-day streak` : "Samples · open to all"}</span>}
          <span className="pp-chip muted">{p.category}</span>
        </div>

        <div className="pp-rate">
          <span className="pp-rate-line"><s>{p.publicRate}%</s> <Icon name="arrow" size={14} /> <b>{rate}%</b> for creators</span>
          <small>
            TAP commission {p.partnerRate}% · Techwide keeps <b>{p.partnerRate - rate}%</b>{" "}
            <Tip text="The seller pays the TAP commission, fixed when they registered; only the seller can raise it. Creators get the Rezekii rate, from the open plan rate up to TAP commission −1%. Techwide keeps the rest." />
          </small>
          {levelSummary && <small>By level: {levelSummary}</small>}
          {specials.length > 0 && <small>Special rates: {specials.map((c) => `${c.handle} ${c.rate}%`).join(" · ")}</small>}
        </div>

        {!editing && (
          <div className="pp-buy">
            <button type="button" className="np-btn" onClick={openEdit}><Icon name="tag" size={18} /> Change Creator Commission</button>
            <Link href="/admin/tap/samples" className="btn-outline"><Icon name="gift" size={18} /> Review Sample Requests</Link>
          </div>
        )}

        {editing && (
          <section className="v2-card pp-card" id="edit">
            <h2 className="v2-h2">Creator Commission <Tip text={`Every rate is from ${p.publicRate}% (open plan) to ${p.partnerRate - 1}% (TAP commission −1%).`} /></h2>
            <div className="ad-wl-line">
              <span>All creators</span>
              <span className="ad-wl-raise"><Stepper label="Rate for all creators in percent" value={draft} min={floor} max={ceil} onChange={setDraft} />%</span>
            </div>
            <label className="pg-check">
              <input type="checkbox" checked={byLevel} onChange={(e) => { setByLevel(e.target.checked); if (e.target.checked) setDLevels(Object.fromEntries(LEVELS.map((l) => [l, dLevels[l] ?? draft]))); }} />
              Different rate by level
            </label>
            {byLevel && LEVELS.map((l) => (
              <div key={l} className="ad-wl-line">
                <span>{l}</span>
                <span className="ad-wl-raise"><Stepper label={`${l} rate in percent`} value={dLevels[l] ?? draft} min={floor} max={ceil} onChange={(n) => setDLevels((d) => ({ ...d, [l]: n }))} />%</span>
              </div>
            ))}
            <h3 className="pg-sub">Special Rates <Tip text="For one creator on this product. They see it as their special rate." /></h3>
            {dSpecials.map((c) => (
              <div key={c.handle} className="ad-wl-line">
                <span>{c.handle}{c.until ? <small className="v2-small"> · until {c.until}</small> : null}</span>
                <span className="pg-special">{c.rate}% <button type="button" className="v2-link" onClick={() => setDSpecials((l) => l.filter((x) => x.handle !== c.handle))}>Remove</button></span>
              </div>
            ))}
            <div className="pg-addrow">
              <input className="np-input" placeholder="@creator" value={handle} onChange={(e) => setHandle(e.target.value)} aria-label="Creator handle" />
              <span className="ad-wl-raise"><Stepper label="Special rate in percent" value={specialRate} min={floor} max={ceil} onChange={setSpecialRate} />%</span>
              <button type="button" className="btn-outline v2-btn-sm" onClick={addSpecial}>Add</button>
            </div>
            <p className="pg-line">At {draft}%, creators earn {rm((p.price * draft) / 100)} per sale · Techwide keeps {p.partnerRate - draft}%</p>
            <div className="pp-stack">
              <button type="button" className="np-btn" onClick={save}>Save</button>
              <button type="button" className="btn-outline" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </section>
        )}

        <div className="pg-more">
          <button type="button" className="btn-outline" onClick={() => toast(`Opening a chat with ${p.shop}…`)}><Icon name="whatsapp" size={17} /> Contact Seller</button>
          {state ? (
            <button type="button" className="btn-outline" onClick={() => act(null)}><Icon name="refresh" size={17} /> Resume</button>
          ) : (
            <button type="button" className="btn-outline pg-danger" onClick={() => setConfirm((c) => !c)} aria-expanded={confirm}><Icon name="x" size={17} /> Pause or End</button>
          )}
        </div>
        {confirm && !state && (
          <div className="v2-card flat pg-confirm">
            <b>Pause or end this product in TAP?</b>
            <span className="v2-small">Paused: creators can&apos;t add it until you resume. Ended: it leaves the campaign. The seller is told either way.</span>
            <div className="v2-row">
              <button type="button" className="btn-outline v2-btn-sm" onClick={() => act("Paused")}>Pause</button>
              <button type="button" className="btn-outline v2-btn-sm pg-danger" onClick={() => act("Ended")}>End Now</button>
              <button type="button" className="v2-link" onClick={() => setConfirm(false)}>Cancel</button>
            </div>
          </div>
        )}

        <section className="v2-card pp-card">
          <Trend points={v.week} label="Sales, last 7 days" />
          <div className="pp-facts">
            <span><small>Total sold</small><b>{short(p.sold)}</b></span>
            <span><small>Samples left</small><b>{p.samples !== null ? SAMPLE_LEFT[p.id] ?? 10 : "No samples"}</b></span>
            <span><small>Rating</small><b>{p.rating.toFixed(1)}</b></span>
            <span><small>Category</small><b>{p.category}</b></span>
          </div>
        </section>

        <section className="v2-card pp-card">
          <h2 className="v2-h2">TAP Campaign</h2>
          {camp ? (
            <div className="pg-camp">
              <b>{camp.shop} · {camp.name}</b>
              <small>{camp.id} · {camp.status === "Ended" ? `Ended ${camp.end}` : `Ends ${camp.end} · ${camp.days} days left`} · auto-extend {camp.auto ? "on" : "off"}</small>
              <small>{rm(camp.gmv30, 0)} GMV last 30 days · {camp.products} products</small>
            </div>
          ) : (
            <p className="pg-line">Not in a campaign yet.</p>
          )}
          {tickets.length > 0 && (
            <div className="ad-wl-sec">
              <h3>In the Pipeline</h3>
              {tickets.map((t) => (
                <div key={t.id} className="ad-wl-offer">
                  <b>{t.id} · {t.col}</b>
                  <small>{t.campaign} · {t.dates}</small>
                </div>
              ))}
            </div>
          )}
          <div className="v2-row">
            <Link href="/admin/tap/campaigns" className="btn-outline v2-btn-sm">Open TAP Campaigns</Link>
            <Link href="/admin/tap" className="btn-outline v2-btn-sm">Open TAP Pipeline</Link>
          </div>
        </section>

        {wishCard}
      </div>
    </div>
  );
}
