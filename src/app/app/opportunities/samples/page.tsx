"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Hidden, Sheet, Title } from "@/components/ui";
import { PoolTag } from "@/components/creator1/brand";
import { CREATOR, MY_SAMPLES, PRODUCTS, product, rm, type Product } from "@/lib/mock";
import { POOLS, SAMPLE_LEFT, SELLER_CONDS, type Cond, type Pool } from "@/lib/mock-creator1";
import "../../../creator1.css";

type Filter = "All" | Pool;
const WITH_SAMPLES = PRODUCTS.filter((p) => p.samples);
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

/** Sample market (blueprint W6b): every product with a free sample, its pool and conditions, and an honest warning before a likely no. */
export default function SampleMarket() {
  const { linked, setLinked, toast } = useDemo();
  const [filter, setFilter] = useState<Filter>("All");
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

  const list = WITH_SAMPLES.filter((p) => filter === "All" || p.samples === filter);
  const n = (f: Filter) => WITH_SAMPLES.filter((p) => f === "All" || p.samples === f).length;
  const conds = sel ? conditionsFor(sel) : [];
  const unmet = conds.filter((c) => !c.ok);
  // Open samples she doesn't already have, same category first.
  const mine = MY_SAMPLES.map((s) => s.productId);
  const openOnes = WITH_SAMPLES.filter((p) => p.samples === "open" && p.id !== sel?.id && !mine.includes(p.id));
  const suggest = [...openOnes.filter((p) => p.category === sel?.category), ...openOnes.filter((p) => p.category !== sel?.category)].slice(0, 3);

  return (
    <div className="v2-stack v2-in" style={{ gap: 20 }}>
      <Title title="Sample market" sub="Free samples from sellers in Techwide's TAP campaigns. 1 sample = 3 videos.">
        <Link href="/app/opportunities/my-samples" className="btn-outline v2-btn-sm">My samples <span className="badge">{MY_SAMPLES.filter((s) => !["Done", "Not approved"].includes(s.status)).length}</span></Link>
      </Title>

      <section className="v2-card cr1-me">
        <div className="cr1-me-top">
          <span className="v2-av" style={{ width: 44, height: 44, fontSize: 15 }}>{CREATOR.initials}</span>
          <span>
            <b>Where you stand</b>
            <small>{CREATOR.activity} · {CREATOR.streak}-day streak · {CREATOR.level} · TikTok Lv.{CREATOR.tiktokLevel}</small>
          </span>
          <span className="cr1-flamechip"><Icon name="flame" size={16} /> {CREATOR.streak} days</span>
        </div>
        <div className="cr1-pools">
          {(Object.keys(POOLS) as Pool[]).map((k) => {
            const ok = k !== "designated";
            return (
              <div key={k} className={`cr1-pool ${ok ? "ok" : ""}`}>
                <span className="v2-row" style={{ justifyContent: "space-between", gap: 6 }}>
                  <b>{POOLS[k].label}</b>
                  {ok ? <span className="badge"><Icon name="check" size={12} width={3} />&nbsp;You qualify</span> : <span className="badge badge-amber">Day {CREATOR.streak} of 30</span>}
                </span>
                <small>{POOLS[k].line}</small>
              </div>
            );
          })}
        </div>
        <p className="cr1-rule">
          <Icon name="shield" size={16} /> Anyone can request any sample; the Techwide team approves. Requests need a complete basic profile (name, state,
          WhatsApp). Yours is complete.
        </p>
      </section>

      <div className="v2-chips" role="group" aria-label="Filter by sample pool">
        {(["All", "open", "advanced", "designated"] as Filter[]).map((f) => (
          <button key={f} type="button" className={`v2-chip ${filter === f ? "on" : ""}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === "All" ? "All" : POOLS[f].label} <small>{n(f)}</small>
          </button>
        ))}
      </div>

      <div className="v2-pgrid">
        {list.map((p) => (
          <button key={p.id} type="button" className="v2-pcard cr1-scard" onClick={() => open(p)}>
            <span className="cr1-scard-img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.img} alt="" />
              {requested.includes(p.id) && <span className="cr1-reqd"><Icon name="check" size={13} width={3} /> Requested</span>}
            </span>
            <PoolTag pool={p.samples as Pool} />
            <strong>{p.name}</strong>
            <span className="v2-row" style={{ gap: 6, justifyContent: "space-between" }}>
              <span className="badge badge-gray">Earn <Hidden>{p.tapRate}%</Hidden></span>
              <small>{rm(p.price)}</small>
            </span>
            <small>{SAMPLE_LEFT[p.id] ?? 10} samples left</small>
          </button>
        ))}
      </div>

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
                The Techwide team reviews it and you&apos;ll hear back in Notifications. Track it in My samples: Applied → Approved → Shipped → Received.
              </p>
              <div className="v2-row" style={{ justifyContent: "center" }}>
                <Link href="/app/opportunities/my-samples" className="np-btn v2-btn-sm">Go to My samples</Link>
                <button type="button" className="btn-outline v2-btn-sm" onClick={() => setSel(null)}>Keep browsing</button>
              </div>
            </div>
          )}
        </Sheet>
      )}
    </div>
  );
}
