"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { AiMark, Count, Hidden } from "@/components/ui";
import { productHref, requestedSamples } from "@/lib/product-view";
import { AI_PICKS, AI_PROFILE, PRODUCTS, product, rateFor, rm, short, type AiPick } from "@/lib/mock";
import { SAMPLE_ACCESS, type Pool } from "@/lib/mock-creator1";

type Fit = AiPick["fit"];
const SORTS = ["Best match", "Best-selling", "Top commission", "Lowest price"] as const;
type Sort = (typeof SORTS)[number];

/** What the AI does, in order, with what it found at each step. */
const STEPS: [string, string][] = [
  ["Reading your sales", AI_PROFILE.categories.map(([c, v]) => `${c} ${v}%`).slice(0, 2).join(" · ")],
  ["Finding what sells for you", `Video ${AI_PROFILE.video}% · LIVE ${100 - AI_PROFILE.video}%`],
  ["Checking TikTok best-sellers", `${AI_PROFILE.compared.toLocaleString("en-MY")} products`],
  ["Matching campaigns", "Rezekii rates and samples found"],
  ["Ranking picks", `${AI_PICKS.length} picks`],
];
const STEP_MS = 650;
const COUNTED = [0, 380, 1460, AI_PROFILE.compared, AI_PROFILE.compared, AI_PROFILE.compared];
const THUMBS = [...PRODUCTS, ...PRODUCTS];

/** Techwide's rate where there's a campaign, otherwise TikTok's open-plan rate. */
const rateOf = (pk: AiPick) => (pk.from === "tap" ? rateFor(product(pk.productId)).rate : product(pk.productId).publicRate);

/**
 * AI picks on Home: the AI reads the creator's sales, compares TikTok Shop's best-sellers with Techwide's campaigns,
 * and ranks what fits, split into products that sell on video and products that sell on LIVE.
 */
export function AiPicks() {
  const { linked, setLinked, toast, requireWa } = useDemo();
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState(0);
  const [fit, setFit] = useState<Fit>("video");
  const [sort, setSort] = useState<Sort>("Best match");
  const [added, setAdded] = useState<string[]>([]);
  const router = useRouter();
  const [requested, setRequested] = useState<string[]>([]);
  useEffect(() => setRequested(requestedSamples()), []);

  useEffect(() => {
    if (!linked) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setPhase(STEPS.length);
    setPhase(0);
    const timers = STEPS.map((_, i) => window.setTimeout(() => setPhase(i + 1), STEP_MS * (i + 1)));
    return () => timers.forEach(clearTimeout);
  }, [run, linked]);

  const done = phase >= STEPS.length;
  const count = (f: Fit) => AI_PICKS.filter((pk) => pk.fit === f).length;
  const list = AI_PICKS.filter((pk) => pk.fit === fit).sort((a, b) => {
    if (sort === "Best-selling") return b.week - a.week;
    if (sort === "Top commission") return rateOf(b) - rateOf(a) || b.match - a.match;
    if (sort === "Lowest price") return product(a.productId).price - product(b.productId).price;
    return b.match - a.match;
  });

  if (!linked) {
    return (
      <section id="ai-picks" className="v2-aicard ai-box" aria-label="AI picks">
        <div className="ai-head">
          <AiMark size={48} />
          <span>
            <span className="v2-ailabel">AI picks</span>
            <h2>What Should You Sell Next?</h2>
            <small>Link TikTok Shop to get AI picks.</small>
          </span>
        </div>
        <button type="button" className="np-btn" style={{ alignSelf: "flex-start" }} onClick={() => setLinked(true)}>Link TikTok Shop</button>
      </section>
    );
  }

  return (
    <section id="ai-picks" className="v2-aicard ai-box" aria-label="AI picks">
      <div className="ai-head">
        <AiMark size={48} busy={!done} />
        <span>
          <span className="v2-ailabel">AI picks for you</span>
          <h2>{done ? "What to sell next" : "Analysing your account…"}</h2>
          <small>{done ? `Today 09:12 · ${AI_PROFILE.compared.toLocaleString("en-MY")} best-sellers compared` : "Takes a few seconds"}</small>
        </span>
        {done && (
          <button type="button" className="btn-outline v2-btn-sm" onClick={() => setRun((r) => r + 1)}>
            <Icon name="refresh" size={15} /> Analyse again
          </button>
        )}
      </div>

      {!done ? (
        <div className="ai-run" aria-live="polite">
          <ol className="ai-steps">
            {STEPS.map(([t, found], i) => (
              <li key={t} className={i < phase ? "done" : i === phase ? "now" : undefined}>
                <i>{i < phase && <Icon name="check" size={12} width={3.2} />}</i>
                <span>
                  {t}
                  {i < phase && <small>{found}</small>}
                </span>
              </li>
            ))}
          </ol>
          <div className="ai-lens" aria-hidden="true">
            <div className="ai-track">
              {THUMBS.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={p.img} alt="" />
              ))}
            </div>
            <span className="ai-beam" />
            <span className="ai-counted"><b><Count value={COUNTED[phase]} ms={600} /></b> products compared</span>
          </div>
        </div>
      ) : (
        <>
          <div className="ai-insight">
            <div>
              <small>Your top categories</small>
              <span className="ai-stack">
                {AI_PROFILE.categories.map(([c, v], i) => <i key={c} className={`c${i}`} style={{ width: `${v}%` }} title={`${c} ${v}%`} />)}
              </span>
              <em>{AI_PROFILE.categories.map(([c, v]) => `${c} ${v}%`).join(" · ")}</em>
            </div>
            <div>
              <small>Where you sell more</small>
              <b>Video {AI_PROFILE.video}%</b>
              <span className="ai-split"><i style={{ width: `${AI_PROFILE.video}%` }} /></span>
              <em>LIVE {100 - AI_PROFILE.video}% of your commission</em>
            </div>
            <div>
              <small>Your price range</small>
              <b>{AI_PROFILE.price}</b>
              <em>8 in 10 of your orders</em>
            </div>
            <div>
              <small>Your average order</small>
              <b>RM {AI_PROFILE.aov.toFixed(2)}</b>
              <em>Last 30 days</em>
            </div>
          </div>

          <div className="ai-fit" role="group" aria-label="Video or LIVE">
            <button type="button" className={fit === "video" ? "on" : undefined} aria-pressed={fit === "video"} onClick={() => setFit("video")}>
              <span className="ai-fico"><Icon name="video" size={18} /></span>
              <span><b>Best for video <em>{count("video")}</em></b><small>Sells more on video</small></span>
            </button>
            <button type="button" className={fit === "live" ? "on live" : "live"} aria-pressed={fit === "live"} onClick={() => setFit("live")}>
              <span className="ai-fico"><span className="ai-dot" />LIVE</span>
              <span><b>Best for LIVE <em>{count("live")}</em></b><small>Needs a demo</small></span>
            </button>
          </div>

          <div className="ai-sort nv-noscroll" role="group" aria-label="Sort picks">
            <span>Sort</span>
            {SORTS.map((s) => (
              <button key={s} type="button" className={sort === s ? "on" : undefined} aria-pressed={sort === s} onClick={() => setSort(s)}>{s}</button>
            ))}
          </div>

          <div className="ai-grid" key={`${fit}-${sort}-${run}`}>
            {list.map((pk, i) => {
              const p = product(pk.productId);
              const isAdded = added.includes(p.id);
              // A free sample only for Techwide campaign products, and only when this creator's level opens that sample pool.
              const sample = pk.from === "tap" && !!p.samples && SAMPLE_ACCESS[p.samples as Pool];
              const asked = requested.includes(p.id);
              return (
                <article key={p.id} className="ai-item" style={{ animationDelay: `${i * 45}ms` }}>
                  <Link href={productHref(p.id)} className="ai-img" aria-label={p.name}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.img} alt="" />
                    {pk.rank && <span className="ai-rank" title={`#${pk.rank} in ${p.category} on TikTok Shop Malaysia this week`}>#{pk.rank}</span>}
                  </Link>
                  <span className="ai-body">
                    <span className="ai-row1">
                      <Link href={productHref(p.id)} className="ai-name"><strong>{p.name}</strong></Link>
                      <span className="ai-match" style={{ "--m": pk.match } as React.CSSProperties} title="Match with you, out of 100"><b>{pk.match}</b></span>
                    </span>
                    <small className="ai-meta">{rm(p.price)} · {short(pk.week)} sold this week{pk.rank ? ` · #${pk.rank} in ${p.category}` : ""}</small>
                    <span className="ai-conv">
                      <span className={fit === "video" ? "on" : undefined}><Icon name="video" size={13} /> Video <b>{pk.video}%</b></span>
                      <span className={fit === "live" ? "on live" : undefined}><span className="ai-dot" /> LIVE <b>{pk.live}%</b></span>
                    </span>
                    <span className="ai-why">{pk.why}</span>
                    <span className="ai-foot">
                      <span className="ai-earn">Earn <b><Hidden>{rateOf(pk)}%</Hidden></b></span>
                      {sample && (
                        <button type="button" className={`ai-btn ghost ${asked ? "asked" : ""}`} disabled={asked} onClick={() => requireWa(() => router.push(productHref(p.id, { sample: true })))}>
                          <Icon name={asked ? "check" : "gift"} size={14} width={asked ? 2.8 : 1.9} /> {asked ? "Requested" : "Free sample"}
                        </button>
                      )}
                      <button
                        type="button"
                        className={`ai-btn ${isAdded ? "done" : ""}`}
                        disabled={isAdded}
                        onClick={() => { setAdded((a) => [...a, p.id]); toast(`Added to showcase: ${p.name}`); }}
                      >
                        <Icon name={isAdded ? "check" : "plus"} size={14} width={2.6} /> {isAdded ? "Added" : "Add"}
                      </button>
                    </span>
                  </span>
                </article>
              );
            })}
          </div>


          <p className="ai-fine">
            <b>Match</b>: fit with you, out of 100. Not a forecast. <b>Video / LIVE</b>: orders per 100 viewers, last 7 days.{" "}
            <b>Earn</b>: Techwide&apos;s rate, or TikTok&apos;s open rate.
          </p>
        </>
      )}
    </section>
  );
}
