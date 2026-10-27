"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Hidden, Progress, Seg, Sheet, Title } from "@/components/ui";
import { AI_PICKS, CREATOR, product, rm, short, type Pick } from "@/lib/mock";
import { BRONZE_PREVIEW, NOT_INTERESTED, SOURCES } from "@/lib/mock-creator1";
import "../../../creator1.css";

type Filter = "All" | Pick["source"];
const VIEWS = ["Your view (Silver)", "Preview: Bronze"] as const;

/** AI picks (blueprint 10b): what to promote next, with the reason and where it comes from. Silver and Gold only. */
export default function AiPicks() {
  const { linked, setLinked, toast } = useDemo();
  const [view, setView] = useState<(typeof VIEWS)[number]>(VIEWS[0]);
  const [filter, setFilter] = useState<Filter>("All");
  const [added, setAdded] = useState<string[]>([]);
  const [gone, setGone] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [nope, setNope] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const list = AI_PICKS.filter((p) => !hidden.includes(p.productId) && (filter === "All" || p.source === filter));
  const count = (s: Filter) => AI_PICKS.filter((p) => !hidden.includes(p.productId) && (s === "All" || p.source === s)).length;

  function send() {
    if (!nope) return;
    const id = nope;
    setNope(null);
    setReason(null);
    setNote("");
    setGone((g) => [...g, id]);
    window.setTimeout(() => setHidden((h) => [...h, id]), 380);
    toast("Thanks. You'll see fewer picks like this.");
  }

  const nopeProduct = nope ? product(nope) : null;

  return (
    <div className="v2-stack v2-in" style={{ gap: 20 }}>
      <Title title="AI picks" sub="What to promote next, and why. Updated today 09:12." />

      <div className="cr1-gate">
        <span className="cr1-gate-ico"><Icon name="spark" size={20} /></span>
        <span>
          <b>AI picks are for Silver and Gold creators.</b>
          <small>You&apos;re {CREATOR.level}, so they&apos;re on for you. Preview what a Bronze creator sees instead:</small>
        </span>
        <Seg value={view} options={VIEWS} onChange={setView} />
      </div>

      {view === VIEWS[1] ? (
        <BronzeView />
      ) : (
        <>
          <div className="cr1-legend">
            {(Object.keys(SOURCES) as Pick["source"][]).map((k) => (
              <span key={k}>
                <span className={`cr1-srcchip ${SOURCES[k].cls}`}><Icon name={SOURCES[k].icon} size={13} width={2.4} /> {SOURCES[k].label}</span>
                <small>{SOURCES[k].line}</small>
              </span>
            ))}
          </div>

          <div className="v2-chips" role="group" aria-label="Filter by source">
            {(["All", "your-data", "tap", "trending"] as Filter[]).map((f) => (
              <button key={f} type="button" className={`v2-chip ${filter === f ? "on" : ""}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f === "All" ? "All" : SOURCES[f].label} <small>{count(f)}</small>
              </button>
            ))}
          </div>

          <div className="cr1-picks">
            {list.map((pk) => {
              const p = product(pk.productId);
              const src = SOURCES[pk.source];
              const isAdded = added.includes(p.id);
              return (
                <article key={p.id} className={`cr1-pick ${gone.includes(p.id) ? "cr1-gone" : ""}`}>
                  <div className="cr1-pick-img">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.img} alt="" />
                    <span className={`cr1-srcchip on-img ${src.cls}`}><Icon name={src.icon} size={13} width={2.4} /> {src.label}</span>
                  </div>
                  <div className="cr1-pick-body">
                    <div>
                      <strong>{p.name}</strong>
                      <small className="v2-small" style={{ display: "block" }}>{p.shop}</small>
                    </div>
                    <div className="cr1-pickstats">
                      <span><small>You earn</small><b className="green"><Hidden>{p.tapRate}%</Hidden></b></span>
                      <span><small>Price</small><b>{rm(p.price)}</b></span>
                      <span><small>Sold</small><b>{short(p.sold)}</b></span>
                    </div>
                    <p className="cr1-why"><b>Why: </b>{pk.why}</p>
                    <small className="v2-small">{src.label} · data as of 28 Oct</small>
                    <div className="cr1-pick-acts">
                      <button
                        type="button"
                        className={isAdded ? "btn-outline v2-btn-sm" : "np-btn v2-btn-sm"}
                        disabled={isAdded}
                        onClick={() => {
                          if (!linked) return setLinked(true);
                          setAdded((a) => [...a, p.id]);
                          toast(`Added to your showcase: ${p.name}`);
                        }}
                      >
                        {isAdded ? <><Icon name="check" size={16} /> In your showcase</> : <><Icon name="plus" size={16} /> Add to showcase</>}
                      </button>
                      {p.samples ? (
                        <Link href={`/app/opportunities/samples?p=${p.id}`} className="btn-outline v2-btn-sm">Request sample</Link>
                      ) : (
                        <span className="v2-small">No sample for this one</span>
                      )}
                      <button type="button" className="v2-link cr1-nope" onClick={() => setNope(p.id)}>Not interested</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {list.length === 0 && (
            <div className="v2-card flat" style={{ alignItems: "flex-start" }}>
              <b>No picks left here</b>
              <span className="v2-muted">New picks arrive every morning. Try another source, or check your scan results.</span>
              <Link href="/app/opportunities" className="np-btn v2-btn-sm">See scan results</Link>
            </div>
          )}
          <p className="hm-fine">
            Picks use your own data, Techwide&apos;s campaign rates and TikTok&apos;s public best-seller lists in Malaysia. &ldquo;Trending&rdquo; means on those
            lists, not the whole market. Adding to your showcase doesn&apos;t request a sample; that&apos;s a separate step the Techwide team approves.
          </p>
        </>
      )}

      {nope && nopeProduct && (
        <Sheet title="Not interested?" onClose={() => setNope(null)}>
          <div className="v2-row" style={{ gap: 12, flexWrap: "nowrap" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={nopeProduct.img} alt="" style={{ width: 52, height: 52, borderRadius: 12, objectFit: "cover" }} />
            <span className="v2-stack" style={{ gap: 2 }}>
              <b>{nopeProduct.name}</b>
              <span className="v2-small">Tell us why and we&apos;ll pick better. Optional, but it helps.</span>
            </span>
          </div>
          <div className="v2-chips">
            {NOT_INTERESTED.map((r) => (
              <button key={r} type="button" className={`v2-chip ${reason === r ? "on" : ""}`} aria-pressed={reason === r} onClick={() => setReason(r)}>
                {r}
              </button>
            ))}
          </div>
          {reason === "Something else" && (
            <label className="v2-field">
              What&apos;s the reason?
              <textarea className="np-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. I only do skincare" />
            </label>
          )}
          <button type="button" className="np-btn" onClick={send}>{reason ? "Hide this pick" : "Hide without a reason"}</button>
        </Sheet>
      )}
    </div>
  );
}

/** What a Bronze creator sees: why picks are off, and how to reach Silver. */
function BronzeView() {
  const b = BRONZE_PREVIEW;
  return (
    <div className="v2-stack" style={{ gap: 16 }}>
      <section className="cr1-bronze">
        <span className="cr1-bronze-medals" aria-hidden="true"><i className="b">B</i><Icon name="arrow" size={18} /><i className="s">S</i></span>
        <h2>AI picks open at Silver</h2>
        <p>
          Picks need enough of your own sales data to be useful, so they start at Silver. You reach Silver with <b>either one</b>{" "}of these;
          whichever comes first.
        </p>
        <div className="cr1-bronze-goals">
          <div>
            <span className="v2-row" style={{ justifyContent: "space-between" }}><b>TikTok Shop level</b><span>Lv.{b.tiktokLevel} of Lv.{b.levelNeeded}</span></span>
            <Progress value={b.tiktokLevel} max={b.levelNeeded} />
            <small>TikTok raises your level as your sales grow.</small>
          </div>
          <div className="cr1-or">or</div>
          <div>
            <span className="v2-row" style={{ justifyContent: "space-between" }}><b>Sales last month</b><span>{rm(b.sales, 0)} of {rm(b.salesNeeded, 0)}</span></span>
            <Progress value={b.sales} max={b.salesNeeded} />
            <small>All your TikTok Shop sales count, not only Techwide products.</small>
          </div>
        </div>
        <div className="v2-row">
          <Link href="/app/rewards/level" className="v2-btn-white">See my level <Icon name="arrow" size={18} /></Link>
        </div>
      </section>
      <div className="v2-grid2">
        <Link href="/app/opportunities" className="cr1-meanwhile">
          <span className="v2-qico" style={{ background: "linear-gradient(135deg,#22dc95,#00a862)" }}><Icon name="scan" /></span>
          <span><b>Scan results are open to everyone</b><small>Bronze sees the rate open to all creators.</small></span>
          <Icon name="arrow" size={18} />
        </Link>
        <Link href="/app/opportunities/samples" className="cr1-meanwhile">
          <span className="v2-qico" style={{ background: "linear-gradient(135deg,#7aa2ff,#1d4ed8)" }}><Icon name="gift" /></span>
          <span><b>Open samples are for everyone</b><small>Post 3 videos per sample to build your record.</small></span>
          <Icon name="arrow" size={18} />
        </Link>
      </div>
    </div>
  );
}
