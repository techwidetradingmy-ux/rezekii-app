"use client";

import Link from "next/link";
import { updatedWhen } from "@/components/data-note";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { AiHead, Count, Hidden, Tip } from "@/components/ui";
import { productHref, requestedSamples } from "@/lib/product-view";
import { AI_PICKS, AI_PROFILE, PRODUCTS, bestRate, product, rateFor, rm, short, type AiPick } from "@/lib/mock";
import { canGetSample } from "@/lib/mock-creator1";
import { addOne } from "@/lib/live";
import { NO_PHOTO, shortName } from "@/lib/live-perf";

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

/** Her highest rate: Techwide's where there's a campaign, or her own (target plan if she has one, else open plan) if that's more. */
const rateOf = (pk: AiPick) => Math.max(pk.from === "tap" ? rateFor(product(pk.productId)).rate : 0, bestRate(product(pk.productId)).rate);

/** What /api/v2/ai-picks sends back (modules/picks/ai.ts): her account from the last 30 days, and the products that fit her. */
type LivePick = {
  id: string; name: string; shop: string | null; category: string | null; image: string | null; priceLo: number | null; openRate: number | null; silverRate: number | null;
  sold: number; rating: number | null; samples: number; source: "tiktok" | "market" | "rezekii"; match: number;
  parts: { category: number; price: number; rate: number; demand: number; rating: number }; fit: Fit; video: number; live: number; why: string[];
};
type LivePicks = {
  linked: boolean;
  profile: {
    categories: [string, number][]; video: number; price: string | null; aov: number; orders: number; days: number; gmv: number; commission: number;
    hours: [string, number][]; you: { gender: string | null; race: string | null } | null; audience: { female: number; male: number; age: string; places: string } | null;
  };
  effort: { id: string; name: string; videos: number; lives: number; gmv: number; commission: number; perPost: number; hit: { gmv: number } | null }[];
  compared: number; picks: LivePick[];
  rising: { category: string; change: number }[];
  peers: { user: string; name: string; img: string | null; followers: number; lo: number; hi: number; video: number }[];
  swap: { count: number; items: { id: string; name: string; img: string | null }[] };
  at: string;
};
const SOURCE: Record<LivePick["source"], string> = { tiktok: "TikTok best seller", market: "TikTok marketplace", rezekii: "Rezekii campaign" };

/** One card, the same for sample and real picks. */
type Item = {
  id: string; name: string; img: string; price: number; sold: number; soldLabel: string; rankLabel: string | null; match: number;
  video: number; live: number; fit: Fit; why: string; rate: number; sample: boolean; source?: string;
};

/**
 * AI picks on Home: the AI reads the creator's sales, compares TikTok Shop's best-sellers with Techwide's campaigns,
 * and ranks what fits, split into products that sell on video and products that sell on LIVE.
 * Signed in (owner, 31 Oct 2026): her own last 30 days of sales against Rezekii's campaign products, ranked by a rule score.
 */
export function AiPicks() {
  const { linked: demoLinked, setLinked, toast, requireWa, live, me } = useDemo();
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState(0);
  const [fit, setFit] = useState<Fit>("video");
  const [sort, setSort] = useState<Sort>("Best match");
  const [added, setAdded] = useState<string[]>([]);
  const router = useRouter();
  const [requested, setRequested] = useState<string[]>([]);
  useEffect(() => setRequested(requestedSamples()), []);
  const [real, setReal] = useState<LivePicks | null>(null);
  const [failed, setFailed] = useState(false);
  const linked = live ? !!me?.shop : demoLinked;

  useEffect(() => {
    if (!linked) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches && !live) return setPhase(STEPS.length);
    setPhase(0);
    // Signed in, the last step waits for the real answer.
    const timers = STEPS.map((_, i) => window.setTimeout(() => setPhase((p) => (live && i + 1 >= STEPS.length ? Math.max(p, STEPS.length - 1) : i + 1)), STEP_MS * (i + 1)));
    return () => timers.forEach(clearTimeout);
  }, [run, linked, live]);

  useEffect(() => {
    if (!live || !linked) return;
    let on = true;
    setReal(null);
    setFailed(false);
    fetch(`/api/v2/ai-picks${run ? "?fresh=1" : ""}`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<LivePicks>) : null))
      .then((d) => {
        if (!on) return;
        if (!d) return setFailed(true);
        setReal(d);
        setPhase(STEPS.length);
        // Open on the side she sells more on.
        setFit(d.profile.video >= 50 || !d.profile.orders ? "video" : "live");
      })
      .catch(() => on && setFailed(true));
    return () => { on = false; };
  }, [run, live, linked]);

  const level = me?.level ?? "silver";
  const items: Item[] = live
    ? (real?.picks ?? []).map((p) => ({
        id: p.id, name: p.name, img: p.image ?? NO_PHOTO, price: p.priceLo ?? 0, sold: p.sold, soldLabel: "sold on TikTok", match: p.match, video: p.video, live: p.live, fit: p.fit,
        rankLabel: null, why: p.why.join(" · ") || "Sells well on TikTok", source: SOURCE[p.source],
        rate: ((p.source !== "rezekii" || level === "bronze" ? p.openRate : p.silverRate ?? p.openRate) ?? 0) / 100, sample: p.samples > 0,
      }))
    : AI_PICKS.map((pk) => {
        const p = product(pk.productId);
        return {
          id: p.id, name: p.name, img: p.img, price: p.price, sold: pk.week, soldLabel: "sold this week", match: pk.match, video: pk.video, live: pk.live, fit: pk.fit,
          rankLabel: pk.rank ? `#${pk.rank} in ${p.category}` : null, why: pk.why, rate: rateOf(pk),
          // A free sample only for Techwide campaign products, and only when this creator's level opens that sample pool.
          sample: pk.from === "tap" && canGetSample(p.samples),
        };
      });

  const steps: [string, string][] = live
    ? [
        ["Reading your sales", real ? (real.profile.categories.slice(0, 2).map(([c, v]) => `${c} ${v}%`).join(" · ") || `${real.profile.orders} orders`) : ""],
        ["Finding what sells for you", !real ? "" : real.profile.orders ? `Video ${real.profile.video}% · LIVE ${100 - real.profile.video}%` : "Not enough sales yet"],
        ["Checking TikTok's best sellers, marketplace and Rezekii campaigns", real ? `${real.compared.toLocaleString("en-MY")} products you can add` : ""],
        ["Matching your categories and prices", !real ? "" : real.profile.price ? `Your range ${real.profile.price}` : "Commission and sales"],
        ["Ranking picks", real ? `${real.picks.length} picks` : ""],
      ]
    : STEPS;

  const done = phase >= STEPS.length;
  const count = (f: Fit) => items.filter((pk) => pk.fit === f).length;
  const list = items.filter((pk) => pk.fit === fit).sort((a, b) => {
    if (sort === "Best-selling") return b.sold - a.sold;
    if (sort === "Top commission") return b.rate - a.rate || b.match - a.match;
    if (sort === "Lowest price") return a.price - b.price;
    return b.match - a.match;
  });

  const add = (it: Item) => {
    if (!live) {
      setAdded((a) => [...a, it.id]);
      return toast(`Added to showcase: ${it.name}`);
    }
    // For real: straight into her TikTok Shop showcase, or a TAP link to open when TikTok asks for one.
    addOne(it.id).then((r) => {
      if (r.added) {
        setAdded((a) => [...a, it.id]);
        toast(`Added to showcase: ${it.name}`);
      } else if (r.link) window.open(r.link, "_blank", "noopener");
      else toast(r.error ?? "TikTok Shop didn't add it. Please try again.");
    });
  };

  if (!linked || (live && real && !real.linked)) {
    return (
      <section id="ai-picks" className="v2-aicard ai-box" aria-label="AI picks">
        <AiHead title="AI Picks" sub="What should you sell next? Link TikTok Shop to get your picks." />
        <button type="button" className="np-btn" style={{ alignSelf: "flex-start" }} onClick={() => setLinked(true)}>Link TikTok Shop</button>
      </section>
    );
  }

  const at = real ? updatedWhen(real.at) : "09:12";
  const prof = real?.profile;
  return (
    <section id="ai-picks" className="v2-aicard ai-box" aria-label="AI picks">
      <AiHead
        title="AI Picks"
        busy={!done && !failed}
        sub={failed ? "Couldn't load your picks." : done ? (live ? `Your account, last 30 days · Updated ${at} · ${(real?.compared ?? 0).toLocaleString("en-MY")} products compared` : `What to sell next · Today 09:12 · ${AI_PROFILE.compared.toLocaleString("en-MY")} best-sellers compared`) : "Analysing your account. Takes a few seconds."}
      >
        {(done || failed) && (
          <button type="button" className="btn-outline v2-btn-sm" onClick={() => setRun((r) => r + 1)}>
            <Icon name="refresh" size={15} /> {failed ? "Try again" : "Analyse again"}
          </button>
        )}
      </AiHead>

      {failed ? null : !done ? (
        <div className="ai-run" aria-live="polite">
          <ol className="ai-steps">
            {steps.map(([t, found], i) => (
              <li key={t} className={i < phase ? "done" : i === phase ? "now" : undefined}>
                <i>{i < phase && <Icon name="check" size={12} width={3.2} />}</i>
                <span>
                  {t}
                  {i < phase && found && <small>{found}</small>}
                </span>
              </li>
            ))}
          </ol>
          {!live && (
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
          )}
        </div>
      ) : (
        <>
          {live && prof ? (
            <div className="ai-insight">
              <div>
                <small>Your top categories</small>
                {prof.categories.length ? (
                  <>
                    <span className="ai-stack">
                      {prof.categories.map(([c, v], i) => <i key={c} className={`c${i}`} style={{ width: `${v}%` }} title={`${c} ${v}%`} />)}
                    </span>
                    <em>{prof.categories.map(([c, v]) => `${c} ${v}%`).join(" · ")}</em>
                  </>
                ) : (
                  <em>Not enough sales yet</em>
                )}
              </div>
              <div>
                <small>Where you sell more</small>
                {prof.orders ? (
                  <>
                    <b>{prof.video >= 50 ? `Video ${prof.video}%` : `LIVE ${100 - prof.video}%`}</b>
                    <span className="ai-split"><i style={{ width: `${prof.video}%` }} /></span>
                    <em>{prof.video >= 50 ? `LIVE ${100 - prof.video}%` : `Video ${prof.video}%`} of your commission</em>
                  </>
                ) : (
                  <em>No orders in the last 30 days</em>
                )}
              </div>
              <div>
                <small>Your price range</small>
                <b>{prof.price ?? "Not enough sales yet"}</b>
                {prof.price && <em>8 in 10 of the items you sold</em>}
              </div>
              <div>
                <small>Your average order</small>
                <b>{rm(prof.aov)}</b>
                <em>{prof.orders.toLocaleString("en-MY")} orders · last 30 days</em>
              </div>
              <div>
                <small>When your buyers order</small>
                <b>{prof.hours[0]?.[0] ?? "Not enough sales yet"}</b>
                {prof.hours.length > 1 && <em>Then {prof.hours.slice(1).map(([h]) => h).join(", ")}</em>}
              </div>
              <div>
                <small>Your followers</small>
                {prof.audience ? (
                  <>
                    <b>{prof.audience.female >= prof.audience.male ? `${prof.audience.female}% women` : `${prof.audience.male}% men`}</b>
                    <em>{[prof.audience.age && `Mostly ${prof.audience.age}`, prof.audience.places].filter(Boolean).join(" · ")}</em>
                  </>
                ) : (
                  <em>TikTok hasn&apos;t shared your followers with Rezekii yet</em>
                )}
              </div>
              <div>
                <small>You</small>
                {prof.you?.gender ? <b>{[prof.you.gender, prof.you.race].filter(Boolean).join(" · ")}</b> : <em>Add your details in My Account</em>}
                {prof.you?.gender && !prof.you.race && <em><Link href="/app/account" className="v2-link">Add your race</Link></em>}
              </div>
              <div>
                <small>Your 30 days</small>
                <b>{rm(prof.gmv)} sales</b>
                <em>{rm(prof.commission)} commission</em>
              </div>
            </div>
          ) : (
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
          )}

          {live && real && real.effort.length > 0 && (
            <div className="ai-more">
              <h3>Worth your effort <Tip label="Worth your effort" text="Commission per video or LIVE for each product you sold in the last 30 days, best first. A star marks a single video or LIVE that took off. Only posts that made a sale are counted." /></h3>
              <ol className="ai-effort">
                {real.effort.map((e) => (
                  <li key={e.id}>
                    <span><b>{shortName(e.name)}</b><small>{[e.videos && `${e.videos} video${e.videos === 1 ? "" : "s"}`, e.lives && `${e.lives} LIVE${e.lives === 1 ? "" : "s"}`].filter(Boolean).join(" · ")} · {rm(e.commission)} commission</small></span>
                    <span className="ai-per"><b>{rm(e.perPost)}</b><small>per post</small></span>
                    {e.hit && <i className="ai-hit"><Icon name="star" size={12} width={2.4} /> 1 post made {rm(e.hit.gmv)}</i>}
                  </li>
                ))}
              </ol>
            </div>
          )}

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

          {list.length === 0 && (
            <p className="v2-muted" style={{ margin: 0 }}>
              {items.length === 0 ? "No picks right now. Rezekii adds products every day, so check again tomorrow." : fit === "video" ? "No video picks this time. Your sales in these categories come mostly from LIVE." : "No LIVE picks this time. Your sales in these categories come mostly from video."}
            </p>
          )}

          <div className="ai-grid" key={`${fit}-${sort}-${run}`}>
            {list.map((it, i) => {
              const isAdded = added.includes(it.id);
              const asked = requested.includes(it.id);
              return (
                <article key={it.id} className="ai-item" style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}>
                  <Link href={productHref(it.id)} className="ai-img" aria-label={it.name}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.img} alt="" />
                    {!live && it.rankLabel && <span className="ai-rank" title={`${it.rankLabel} on TikTok Shop Malaysia this week`}>{it.rankLabel.split(" ")[0]}</span>}
                  </Link>
                  <span className="ai-body">
                    <span className="ai-row1">
                      <Link href={productHref(it.id)} className="ai-name"><strong>{live ? shortName(it.name) : it.name}</strong></Link>
                      <span className="ai-match" style={{ "--m": it.match } as React.CSSProperties} title="Match with you, out of 100"><b>{it.match}</b></span>
                    </span>
                    <small className="ai-meta">{rm(it.price)} · {short(it.sold)} {it.soldLabel}{it.rankLabel ? ` · ${it.rankLabel}` : ""}</small>
                    <span className="ai-conv">
                      <span className={fit === "video" ? "on" : undefined}><Icon name="video" size={13} /> Video <b>{it.video}%</b></span>
                      <span className={fit === "live" ? "on live" : undefined}><span className="ai-dot" /> LIVE <b>{it.live}%</b></span>
                    </span>
                    {it.source && <i className={`ai-src${it.source === "Rezekii campaign" ? " rz" : ""}`}>{it.source}</i>}
                    <span className="ai-why">{it.why}</span>
                    <span className="ai-foot">
                      <span className="ai-earn">Earn <b><Hidden>{it.rate}%</Hidden></b></span>
                      {it.sample && (
                        <button type="button" className={`ai-btn ghost ${asked ? "asked" : ""}`} disabled={asked} onClick={() => requireWa(() => router.push(productHref(it.id, { sample: true })))}>
                          <Icon name={asked ? "check" : "gift"} size={14} width={asked ? 2.8 : 1.9} /> {asked ? "Requested" : "Free sample"}
                        </button>
                      )}
                      <button type="button" className={`ai-btn ${isAdded ? "done" : ""}`} disabled={isAdded} onClick={() => add(it)}>
                        <Icon name={isAdded ? "check" : "plus"} size={14} width={2.6} /> {isAdded ? "Added" : "Add"}
                      </button>
                    </span>
                  </span>
                </article>
              );
            })}
          </div>

          {live && real && (real.rising.length > 0 || real.peers.length > 0 || real.swap.count > 0) && (
            <div className="ai-extras">
              {real.rising.length > 0 && (
                <div className="ai-more">
                  <h3>Rising in your niche</h3>
                  {real.rising.map((r) => (
                    <p key={r.category} className="ai-rise"><b>{r.category}</b> <span className={r.change >= 0 ? "up" : "down"}>{r.change >= 0 ? "+" : ""}{r.change}%</span><small>TikTok&apos;s top 100 sales, last 7 days against the 7 before</small></p>
                  ))}
                </div>
              )}
              {real.peers.length > 0 && (
                <div className="ai-more">
                  <h3>Creators like you <Tip label="Creators like you" text="TikTok's top creators in your main category over the last 30 days, with how much of their sales come from video." /></h3>
                  <ol className="ai-peers">
                    {real.peers.map((c) => (
                      <li key={c.user}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {c.img ? <img src={c.img} alt="" referrerPolicy="no-referrer" /> : <span className="ai-av">{c.name.slice(0, 1)}</span>}
                        <span><b>{c.name}</b><small>@{c.user} · {short(c.followers)} followers{c.video >= 0 ? ` · ${c.video >= 50 ? `video ${c.video}%` : `LIVE ${100 - c.video}%`}` : ""}</small></span>
                        <em>RM {short(c.lo)}–{short(c.hi)}</em>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {real.swap.count > 0 && (
                <div className="ai-more">
                  <h3>Swap out <Tip label="Swap out" text="Products in your showcase with no orders from you in the last 30 days. Swap them for picks above. Low-rated products are in Risk Check." /></h3>
                  <p className="v2-small" style={{ margin: 0 }}>{real.swap.count} product{real.swap.count === 1 ? "" : "s"} in your showcase didn&apos;t sell in 30 days, for example:</p>
                  <ol className="ai-swap">
                    {real.swap.items.map((x) => (
                      <li key={x.id}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={x.img ?? NO_PHOTO} alt="" />
                        <b>{shortName(x.name)}</b>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          {live ? (
            <p className="ai-fine">
              <b>Match</b>: fit with you, out of 100, from your categories (up to 35), your price range (20), how well it sells on TikTok (20), commission (15) and rating (10). Not a forecast.{" "}
              <b>Video / LIVE</b>: where your own sales in that category came from, last 30 days. <b>Earn</b>: the product&apos;s commission; on Rezekii campaign products, your Rezekii rate.
            </p>
          ) : (
            <p className="ai-fine">
              <b>Match</b>: fit with you, out of 100. Not a forecast. <b>Video / LIVE</b>: orders per 100 viewers, last 7 days.{" "}
              <b>Earn</b>: Techwide&apos;s rate, or your own rate if it&apos;s higher.
            </p>
          )}
        </>
      )}
    </section>
  );
}
