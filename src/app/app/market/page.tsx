"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Flow, Hidden, Sheet, Title } from "@/components/ui";
import { POOL_ICON, PoolTag } from "@/components/creator1/brand";
import { CREATOR, MY_SAMPLES, PRODUCTS, product, rm, type Product } from "@/lib/mock";
import { POOLS, SAMPLE_ACCESS as ACCESS, SAMPLE_LEFT, SELLER_CONDS, type Cond, type Pool } from "@/lib/mock-creator1";
import "@/app/creator1.css";

const WITH_SAMPLES = PRODUCTS.filter((p) => p.samples);
const CATS = ["All", ...Array.from(new Set(WITH_SAMPLES.map((p) => p.category)))];
const POOL_KEYS = Object.keys(POOLS) as Pool[];

const unfinished = MY_SAMPLES.find((s) => s.status === "Posting");
const unfinishedName = unfinished ? product(unfinished.productId).name : "";

/** The conditions for one product, ticked against Aisyah (Active, 16-day streak, Silver, TikTok Lv.4, one sample still posting). */
function conditionsFor(p: Product): Cond[] {
  const pool = p.samples as Pool;
  const base: Cond[] = [
    { label: "TikTok Shop linked", ok: CREATOR.tiktokShopLinked, you: "Linked as @aisyah.glow" },
    { label: "Basic profile complete (name, state, WhatsApp)", ok: true, you: "Complete" },
    { label: "No overdue samples", ok: true, you: unfinished ? `${unfinishedName}: ${unfinished.videos} of 3 videos, due ${unfinished.due}. On time.` : "None" },
  ];
  if (pool === "advanced") base.push({ label: "Active: posting 10 days in a row", ok: true, you: `You're ${CREATOR.activity}` });
  if (pool === "designated") {
    base.push({ label: "Highly active: posting 30 days in a row", ok: false, you: `You're on day ${CREATOR.streak} (${30 - CREATOR.streak} to go)` });
    base.push({ label: "Every sample delivered, none still posting", ok: !unfinished, you: unfinished ? `${unfinishedName} needs ${3 - unfinished.videos} more video` : "All delivered" });
  }
  return [...base, ...(SELLER_CONDS[p.id] ?? [])];
}

/** Marketplace (blueprint W6b): free samples for the showcase, filtered by access, category or search; conditions and an honest warning before a likely no. */
export default function Marketplace() {
  const { linked, setLinked, toast } = useDemo();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [pool, setPool] = useState<Pool | null>(null);
  const [info, setInfo] = useState(false);
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
  const list = WITH_SAMPLES.filter((p) => (!pool || p.samples === pool) && (cat === "All" || p.category === cat) && (!term || `${p.name} ${p.shop}`.toLowerCase().includes(term)));
  const conds = sel ? conditionsFor(sel) : [];
  const unmet = conds.filter((c) => !c.ok);
  // Open samples she doesn't already have, same category first.
  const mine = MY_SAMPLES.map((s) => s.productId);
  const openOnes = WITH_SAMPLES.filter((p) => p.samples === "open" && p.id !== sel?.id && !mine.includes(p.id));
  const suggest = [...openOnes.filter((p) => p.category === sel?.category), ...openOnes.filter((p) => p.category !== sel?.category)].slice(0, 3);

  return (
    <div className="v2-stack v2-in" style={{ gap: 20 }}>
      <Title title="Marketplace" sub="Free samples for your showcase. Get one, post 3 videos, keep it.">
        <Link href="/app/account#samples" className="btn-outline v2-btn-sm">My samples <span className="badge">{MY_SAMPLES.filter((s) => !["Done", "Not approved"].includes(s.status)).length}</span></Link>
      </Title>

      <div className="mk-hero">
        <label className="mk-search">
          <Icon name="search" size={18} />
          <input className="np-input" type="search" placeholder="Search free samples" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search free samples" />
        </label>
        <div className="mk-tiers" role="group" aria-label="Sample access: tap to filter">
          {POOL_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              className={`mk-tier ${pool === k ? "on" : ""}`}
              aria-pressed={pool === k}
              aria-label={`${POOLS[k].label} samples: ${ACCESS[k] ? "you can get these" : `day ${CREATOR.streak} of 30`}`}
              title={`${POOLS[k].label}: ${ACCESS[k] ? "you can get these" : `day ${CREATOR.streak} of 30`}`}
              onClick={() => setPool(pool === k ? null : k)}
            >
              <span className={`mk-ic ${k}`}><Icon name={POOL_ICON[k]} size={18} width={2.3} /></span>
              <span className={`mk-st ${ACCESS[k] ? "" : "wait"}`}>{ACCESS[k] ? <Icon name="check" size={10} width={3.6} /> : `${CREATOR.streak}/30`}</span>
            </button>
          ))}
          <button type="button" className="mk-tier info" aria-label="How sample access works" onClick={() => setInfo(true)}><b style={{ fontSize: 18 }}>?</b></button>
        </div>
      </div>

      <section className="v2-card tight">
        <Flow
          label="How free samples work"
          steps={[
            { icon: "gift", title: "Request", note: "Free, from TAP sellers" },
            { icon: "shield", title: "Techwide approves", note: "Usually 2 working days" },
            { icon: "box", title: "Ships via TikTok", note: "Track it in My account" },
            { icon: "video", title: "Post 3 videos", note: "Bonus if you post in 1 day" },
            { icon: "wallet", title: "Keep it and earn", note: "Commission on every sale" },
          ]}
        />
      </section>

      <div className="mk-cats nv-noscroll" role="group" aria-label="Category">
        {CATS.map((c) => (
          <button key={c} type="button" className={`v2-chip ${cat === c ? "on" : ""}`} aria-pressed={cat === c} onClick={() => setCat(c)}>
            {c} <small>{WITH_SAMPLES.filter((p) => (c === "All" || p.category === c) && (!pool || p.samples === pool)).length}</small>
          </button>
        ))}
      </div>

      {pool && (
        <p className="v2-small" style={{ margin: "-6px 0 0", display: "flex", alignItems: "center", gap: 8 }}>
          <PoolTag pool={pool} /> {POOLS[pool].who} only.
          <button type="button" className="v2-link" onClick={() => setPool(null)}>Show all</button>
        </p>
      )}

      <div className="mk-grid">
        {list.map((p, i) => {
          const left = SAMPLE_LEFT[p.id] ?? 10;
          return (
            <button key={p.id} type="button" className="mk-card" style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }} onClick={() => open(p)}>
              <span className="mk-img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt="" />
                <PoolTag pool={p.samples as Pool} label={false} />
                <span className="mk-free">FREE</span>
                {requested.includes(p.id) && <span className="cr1-reqd"><Icon name="check" size={13} width={3} /> Requested</span>}
              </span>
              <strong>{p.name}</strong>
              <span className="mk-row"><span>Earn <b><Hidden>{p.tapRate}%</Hidden></b></span><span>{rm(p.price)}</span></span>
              <span className="mk-left">
                {left} left
                <i><span style={{ width: `${Math.min(100, (left / 50) * 100)}%` }} /></i>
              </span>
            </button>
          );
        })}
      </div>
      {list.length === 0 && (
        <div className="v2-card flat" style={{ alignItems: "flex-start" }}>
          <b>No samples match</b>
          <span className="v2-muted">Try another category, or clear your search.</span>
          <button type="button" className="np-btn v2-btn-sm" onClick={() => { setQ(""); setCat("All"); setPool(null); }}>Show all samples</button>
        </div>
      )}

      {info && (
        <Sheet title="Who can get which samples" onClose={() => setInfo(false)}>
          <ul className="mk-tierinfo">
            {POOL_KEYS.map((k) => (
              <li key={k}>
                <span className={`mk-ic ${k}`}><Icon name={POOL_ICON[k]} size={20} width={2.3} /></span>
                <span><b>{POOLS[k].label}</b><small>{POOLS[k].line}</small></span>
                {ACCESS[k] ? <span className="badge"><Icon name="check" size={12} width={3} /> You</span> : <span className="badge badge-amber">Day {CREATOR.streak} of 30</span>}
              </li>
            ))}
          </ul>
          <p className="v2-small" style={{ margin: 0 }}>Anyone can request any sample; the Techwide team approves. You need a complete basic profile (name, state, WhatsApp). Yours is complete.</p>
        </Sheet>
      )}

      {sel && (
        <Sheet title={step === "warn" ? "Before you request" : step === "sent" ? "Request sent" : "Free sample"} onClose={() => setSel(null)}>
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
              <p className="v2-small" style={{ margin: 0 }}>{POOLS[sel.samples as Pool].line}</p>
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
                <h3>What you do after</h3>
                <ul className="cr1-after">
                  <li><Icon name="video" size={18} /> Post 3 videos with this product in your yellow cart.</li>
                  <li><Icon name="flame" size={18} /> Bonus if your first video goes up within 1 day of receiving it (smaller within 3 or 7 days).</li>
                  <li><Icon name="cal" size={18} /> We count your videos from TikTok&apos;s data, so there&apos;s nothing to upload here.</li>
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
              <p className="v2-small" style={{ margin: 0, textAlign: "center" }}>Requests are open to everyone. The Techwide team approves them, usually within 2 working days.</p>
            </>
          )}

          {step === "warn" && (
            <>
              <div className="cr1-warn">
                <span className="cr1-warn-ico"><Icon name="alert" size={22} /></span>
                <div>
                  <b>This request will probably be rejected:</b>
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
                <h3>You can get these now</h3>
                <div className="v2-divide">
                  {suggest.map((p) => (
                    <button key={p.id} type="button" className="cr1-suggest" onClick={() => open(p)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.img} alt="" />
                      <span>
                        <strong>{p.name}</strong>
                        <small>Open sample · {rm(p.price)}</small>
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
              <b>We opened TikTok&apos;s request for you</b>
              <p className="v2-muted" style={{ margin: 0 }}>
                The Techwide team reviews it and you&apos;ll hear back in Notifications. Track it in My account, Samples & delivery: Applied → Approved → Shipped → Received.
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
