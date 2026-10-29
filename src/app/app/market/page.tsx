"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Flow, Hidden, Sheet, Title } from "@/components/ui";
import { PoolTag } from "@/components/creator1/brand";
import { CREATOR, MY_SAMPLES, PRODUCTS, product, rm, type Product } from "@/lib/mock";
import { SAMPLE_ACCESS as ACCESS, SAMPLE_LEFT, SAMPLE_STREAK, SELLER_CONDS, type Cond, type Pool } from "@/lib/mock-creator1";
import "@/app/creator1.css";

const WITH_SAMPLES = PRODUCTS.filter((p) => p.samples);
/** Free samples she can request right now (her streak is long enough). */
const CAN_GET = WITH_SAMPLES.filter((p) => ACCESS[p.samples as Pool]);
const CATS = Array.from(new Set(PRODUCTS.map((p) => p.category))).sort();
const SORTS = [
  ["sold", "Best-selling"],
  ["rate", "Highest commission"],
  ["earn", "Earn per sale"],
  ["cheap", "Price: low to high"],
  ["dear", "Price: high to low"],
  ["samples", "Most samples left"],
] as const;
type SortKey = (typeof SORTS)[number][0];
const earn = (p: Product) => (p.price * p.tapRate) / 100;

const unfinished = MY_SAMPLES.find((s) => s.status === "Posting");
const unfinishedName = unfinished ? product(unfinished.productId).name : "";

/** The conditions for one product, ticked against Aisyah (Active, 16-day streak, Silver, TikTok Lv.4, one sample still posting). */
function conditionsFor(p: Product): Cond[] {
  const pool = p.samples as Pool;
  const base: Cond[] = [
    { label: "TikTok Shop linked", ok: CREATOR.tiktokShopLinked, you: "Linked as @aisyah.glow" },
    { label: "Basic profile complete (name, state, WhatsApp)", ok: true, you: "Complete" },
    { label: "No overdue samples", ok: true, you: unfinished ? `${unfinishedName}: ${unfinished.videos ? "first video posted. On time." : `first video due ${unfinished.due}.`}` : "None" },
  ];
  if (pool === "advanced") base.push({ label: "Posting 10 days in a row", ok: true, you: `You're on day ${CREATOR.streak}` });
  if (pool === "designated") {
    base.push({ label: "Posting 30 days in a row", ok: false, you: `You're on day ${CREATOR.streak} (${30 - CREATOR.streak} to go)` });
    base.push({ label: "All samples delivered", ok: !unfinished, you: unfinished ? `${unfinishedName} needs ${3 - unfinished.videos} more video` : "All delivered" });
  }
  return [...base, ...(SELLER_CONDS[p.id] ?? [])];
}

/**
 * Marketplace: every product in Techwide's TAP campaigns, with TikTok's open-plan rate next to the Rezekii rate and what you earn
 * per sale. Add to showcase in one tap; request a free sample where the product has one. Filter by category, samples and tier, then sort.
 */
export default function Marketplace() {
  const { linked, setLinked, toast, requireWa } = useDemo();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState<SortKey>("sold");
  const [onlySamples, setOnlySamples] = useState(false);
  const [added, setAdded] = useState<string[]>([]);
  // Grid or list (owner, 28 Oct 2026: a list is easier to browse), remembered on this device.
  const [view, setView] = useState<"grid" | "list">("grid");
  useEffect(() => {
    try {
      if (localStorage.getItem("rz2_market_view") === "list") setView("list");
    } catch {}
  }, []);
  const pickView = (v: "grid" | "list") => {
    setView(v);
    try {
      localStorage.setItem("rz2_market_view", v);
    } catch {}
  };
  const [sel, setSel] = useState<Product | null>(null);
  const [step, setStep] = useState<"detail" | "warn" | "sent">("detail");
  const [requested, setRequested] = useState<string[]>([]);

  // Arriving from AI picks with ?p=<product> opens that product straight away.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("p");
    const p = id ? WITH_SAMPLES.find((x) => x.id === id) : null;
    if (p) open(p);
  }, []);

  function open(p: Product) {
    setSel(p);
    setStep("detail");
  }

  function request(p: Product) {
    toast("Opening TikTok's sample request…");
    setRequested((r) => [...r, p.id]);
    setStep("sent");
  }

  const term = q.trim().toLowerCase();
  const list = PRODUCTS.filter((p) => (!onlySamples || CAN_GET.includes(p)) && (cat === "All" || p.category === cat) && (!term || `${p.name} ${p.shop}`.toLowerCase().includes(term))).sort((a, b) => {
    if (sort === "rate") return b.tapRate - a.tapRate;
    if (sort === "earn") return earn(b) - earn(a);
    if (sort === "cheap") return a.price - b.price;
    if (sort === "dear") return b.price - a.price;
    if (sort === "samples") return (b.samples ? SAMPLE_LEFT[b.id] ?? 10 : -1) - (a.samples ? SAMPLE_LEFT[a.id] ?? 10 : -1);
    return b.sold - a.sold;
  });
  const addToShowcase = (p: Product) => {
    if (!linked) return setLinked(true);
    setAdded((a) => [...a, p.id]);
    toast(`Added at ${p.tapRate}%: ${p.name}`);
  };
  const conds = sel ? conditionsFor(sel) : [];
  const unmet = conds.filter((c) => !c.ok);
  // Open samples she doesn't already have, same category first.
  const mine = MY_SAMPLES.map((s) => s.productId);
  const openOnes = WITH_SAMPLES.filter((p) => p.samples === "open" && p.id !== sel?.id && !mine.includes(p.id));
  const suggest = [...openOnes.filter((p) => p.category === sel?.category), ...openOnes.filter((p) => p.category !== sel?.category)].slice(0, 3);

  return (
    <div className="v2-stack v2-in mk-page" style={{ gap: 20 }}>
      <Title title="Marketplace" sub="Better rates than TikTok's open plan. Free Samples on many.">
        <Link href="/app/account#samples" className="mk-mysamples" aria-label={`My samples: ${MY_SAMPLES.filter((s) => !["Done", "Not approved"].includes(s.status)).length} in progress`} title="My samples"><Icon name="box" size={20} /><span className="badge">{MY_SAMPLES.filter((s) => !["Done", "Not approved"].includes(s.status)).length}</span></Link>
      </Title>


      <div className="mk-bar">
        <span className="mk-bar-h">Filters</span>
        <label className="mk-search">
          <Icon name="search" size={18} />
          <input className="np-input" type="search" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products or shops" />
        </label>
        <label className="mk-select">
          <span>Category</span>
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="All">All categories ({PRODUCTS.length})</option>
            {CATS.map((c) => <option key={c} value={c}>{c} ({PRODUCTS.filter((p) => p.category === c).length})</option>)}
          </select>
        </label>
        <label className="mk-select">
          <span>Sort by</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            {SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        <button type="button" role="switch" aria-checked={onlySamples} className={`mk-switch ${onlySamples ? "on" : ""}`} onClick={() => setOnlySamples((o) => !o)}>
          <span className="np-switch-like" aria-hidden="true"><i /></span>
          <Icon name="gift" size={16} /> Free Samples <em>{CAN_GET.length}</em>
        </button>
      </div>

      <section className="v2-card tight">
        <Flow
          label="How the marketplace works"
          steps={[
            { icon: "tag", title: "Better rate" },
            { icon: "plus", title: "Add to showcase" },
            { icon: "gift", title: "Or Free Samples" },
            { icon: "video", title: "Post 1 video" },
            { icon: "wallet", title: "Earn per sale" },
          ]}
        />
      </section>

      <p className="mk-count">
        {list.length} product{list.length === 1 ? "" : "s"}
        {(cat !== "All" || onlySamples || term) && <button type="button" className="v2-link" onClick={() => { setQ(""); setCat("All"); setOnlySamples(false); }}>Clear</button>}
        <span className="mk-view" role="group" aria-label="View">
          <button type="button" aria-pressed={view === "grid"} aria-label="Grid view" onClick={() => pickView("grid")}><Icon name="grid" size={16} /></button>
          <button type="button" aria-pressed={view === "list"} aria-label="List view" onClick={() => pickView("list")}><Icon name="list" size={16} /></button>
        </span>
      </p>

      <div className={`mk-grid${view === "list" ? " list" : ""}`}>
        {list.map((p, i) => {
          const left = SAMPLE_LEFT[p.id] ?? 10;
          const isAdded = added.includes(p.id);
          const asked = requested.includes(p.id);
          // Option A, clean grid (owner, 28 Oct 2026): name, open → Rezekii rate, what she earns, Add and a gift button.
          return (
            <article key={p.id} className="mk-card mka" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
              <span className="mk-img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt="" />
                {p.samples && <PoolTag pool={p.samples as Pool} label={false} />}
                {asked && <span className="cr1-reqd"><Icon name="check" size={13} width={3} /> Requested</span>}
              </span>
              <strong>{p.name}</strong>
              <small className="mk-meta">{rm(p.price)} · {p.sold >= 1e6 ? `${(p.sold / 1e6).toFixed(1)}M` : `${Math.round(p.sold / 1e3)}K`} sold</small>
              <span className="mka-rate" aria-label={`Open plan ${p.publicRate}%, Rezekii ${p.tapRate}%`}><s>{p.publicRate}%</s><Icon name="arrow" size={13} /><b><Hidden>{p.tapRate}%</Hidden></b></span>
              <span className="mka-earn">Earn <b><Hidden>{rm(earn(p))}</Hidden></b></span>
              <span className="mka-acts">
                <button type="button" className={isAdded ? "mka-add done" : "mka-add"} disabled={isAdded} onClick={() => addToShowcase(p)}>
                  <Icon name={isAdded ? "check" : "plus"} size={15} width={2.6} /> {isAdded ? "Added" : "Add"}
                </button>
                {p.samples ? (
                  <button type="button" className={`mka-gift ${asked ? "asked" : ""}`} disabled={asked} onClick={() => requireWa(() => open(p))} aria-label={asked ? "Free sample requested" : `Free sample, ${left} left`} title={asked ? "Requested" : `Free sample · ${left} left`}>
                    <Icon name={asked ? "check" : "gift"} size={16} />
                  </button>
                ) : (
                  <button type="button" className="mka-gift off" disabled aria-label="No free sample" title="No free sample"><Icon name="gift" size={16} /></button>
                )}
              </span>
            </article>
          );
        })}
      </div>
      {list.length === 0 && (
        <div className="v2-card flat" style={{ alignItems: "flex-start" }}>
          <b>No products match</b>
          <span className="v2-muted">Try other filters.</span>
          <button type="button" className="np-btn v2-btn-sm" onClick={() => { setQ(""); setCat("All"); setOnlySamples(false); }}>Show all</button>
        </div>
      )}

      {sel && (
        <Sheet title={step === "warn" ? "Before You Request" : step === "sent" ? "Request Sent" : "Free Sample"} onClose={() => setSel(null)}>
          <div className="cr1-sheetprod">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sel.img} alt="" />
            <span>
              <b>{sel.name}</b>
              <small>{sel.shop} · {rm(sel.price)} · earn <Hidden>{sel.tapRate}%</Hidden></small>
              <PoolTag pool={sel.samples as Pool} />
            </span>
          </div>

          {step === "detail" && (
            <>
              <p className="v2-small" style={{ margin: 0 }}>{ACCESS[sel.samples as Pool] ? "You can request now." : `Unlocks at a ${SAMPLE_STREAK[sel.samples as Pool]}-day streak. You're on day ${CREATOR.streak}.`}</p>
              <div className="cr1-sec">
                <h3>Conditions <span className="v2-small">{conds.length - unmet.length} of {conds.length} met</span></h3>
                <ul className="cr1-conds">
                  {conds.map((c) => (
                    <li key={c.label}>
                      <span className={`cr1-tick ${c.ok ? "" : "no"}`}><Icon name={c.ok ? "check" : "x"} size={13} width={3} /></span>
                      <span>{c.label}<small>{c.you}</small></span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="cr1-sec">
                <h3>After You Get It</h3>
                <ul className="cr1-after">
                  <li><Icon name="video" size={18} /> Post 1 video with it in your yellow cart by the due date.</li>
                  <li><Icon name="gift" size={18} /> Post 3 videos to unlock an extra reward.</li>
                  <li><Icon name="flame" size={18} /> Bonus if you post within 1 day (smaller within 3 or 7).</li>
                  <li><Icon name="cal" size={18} /> We count videos from TikTok. Nothing to upload.</li>
                </ul>
              </div>
              {!linked ? (
                <button type="button" className="np-btn" onClick={() => setLinked(true)}><Icon name="lock" size={18} /> Link TikTok Shop to request</button>
              ) : requested.includes(sel.id) ? (
                <button type="button" className="btn-outline" disabled><Icon name="check" size={18} /> Requested</button>
              ) : (
                <button type="button" className="np-btn" onClick={() => (unmet.length ? setStep("warn") : request(sel))}>
                  Request sample {unmet.length === 0 && "(opens TikTok)"}
                </button>
              )}
              <p className="v2-small" style={{ margin: 0, textAlign: "center" }}>Techwide approves requests, usually within 2 working days.</p>
            </>
          )}

          {step === "warn" && (
            <>
              <div className="cr1-warn">
                <span className="cr1-warn-ico"><Icon name="alert" size={22} /></span>
                <div>
                  <b>Likely to be rejected:</b>
                  <ul>
                    {unmet.map((c) => (
                      <li key={c.label}>{c.label}. <span>{c.you}.</span></li>
                    ))}
                  </ul>
                </div>
              </div>
              <p style={{ margin: 0, fontWeight: 800 }}>Request anyway?</p>
              <div className="v2-stack" style={{ gap: 8 }}>
                <button type="button" className="np-btn" onClick={() => request(sel)}>Request anyway (opens TikTok)</button>
                <button type="button" className="btn-outline" onClick={() => setSel(null)}>Not now</button>
              </div>
              <div className="cr1-sec">
                <h3>You Can Get These Now</h3>
                <div className="v2-divide">
                  {suggest.map((p) => (
                    <button key={p.id} type="button" className="cr1-suggest" onClick={() => requireWa(() => open(p))}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.img} alt="" />
                      <span>
                        <strong>{p.name}</strong>
                        <small>Free sample · {rm(p.price)}</small>
                      </span>
                      <Icon name="arrow" size={18} />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === "sent" && (
            <div className="cr1-sent">
              <span className="v2-medal green" style={{ width: 84, height: 84 }}><Icon name="send" size={34} width={2.2} /></span>
              <b>TikTok request opened</b>
              <p className="v2-muted" style={{ margin: 0 }}>
                Techwide reviews it. We&apos;ll tell you in Notifications.
              </p>
              <div className="v2-row" style={{ justifyContent: "center" }}>
                <Link href="/app/account#samples" className="np-btn v2-btn-sm">Go to My samples</Link>
                <button type="button" className="btn-outline v2-btn-sm" onClick={() => setSel(null)}>Keep browsing</button>
              </div>
            </div>
          )}
        </Sheet>
      )}
    </div>
  );
}
