"use client";

import Link from "next/link";
import { DetailsLock } from "@/components/details-lock";
import { updatedWhen } from "@/components/data-note";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { AiHead, Count, Hidden, Seg, Tip } from "@/components/ui";
import { productHref, requestedSamples } from "@/lib/product-view";
import { AI_PICKS, AI_PROFILE, PRODUCTS, bestRate, product, rateFor, rm, short, type AiPick } from "@/lib/mock";
import { canGetSample } from "@/lib/mock-creator1";
import { AddButton } from "@/components/add-button";
import { DirToggle, useSortPref } from "@/components/sort-bar";
import { NO_PHOTO, shortName } from "@/lib/live-perf";

type Fit = AiPick["fit"];
// Title Case (owner, 1 Nov 2026).
const SORTS = ["Best Match", "Best Selling", "Top Commission", "Lowest Price"] as const;
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
/** How long her last real analysis took (owner, 1 Nov 2026: about a minute), so the steps keep pace with it. */
const RUN_KEY = "rz2_ai_ms";
const lastRunMs = () => { try { const n = Number(localStorage.getItem(RUN_KEY)); return n >= 3000 && n <= 180_000 ? n : 60_000; } catch { return 60_000; } };
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
  /** Her details aren't complete yet (owner, 31 Oct 2026): AI Picks stays locked. */
  locked?: "profile" | "race";
  profile: {
    categories: [string, number][]; video: number; price: string | null; aov: number; orders: number; days: number; gmv: number; commission: number;
    sales?: { video: number; live: number; other: number };
    hours: [string, number][]; you: { gender: string | null; race: string | null } | null; audience: { female: number; male: number; age: string; places: string } | null;
  };
  effort: { id: string; name: string; videos: number; lives: number; gmv: number; commission: number; perPost: number; hit: { gmv: number } | null; per1k?: number | null; perVideo?: number | null; perLive?: number | null; gmvPerPost?: number }[];
  compared: number; picks: LivePick[];
  rising: { category: string; change: number }[];
  peers: { user: string; name: string; img: string | null; followers: number; lo: number; hi: number; video: number }[];
  swap: { count: number; items: { id: string; name: string; img: string | null }[] };
  at: string;
  /** Saved picks shown straight away; `ms` is how long the analysis took. */
  saved?: boolean; ms?: number;
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
  // Each sort can run either way, remembered (owner, 1 Nov 2026).
  const [sort, setSort, dir, flip] = useSortPref<Sort>("ai-picks", SORTS, "Best Match");
  const router = useRouter();
  const [requested, setRequested] = useState<string[]>([]);
  useEffect(() => setRequested(requestedSamples()), []);
  const [real, setReal] = useState<LivePicks | null>(null);
  const [channel, setChannel] = useState<"Overall" | "Video" | "LIVE">("Overall");
  const [failed, setFailed] = useState(false);
  const linked = live ? !!me?.shop : demoLinked;

  // Signed in (owner, 1 Nov 2026): the steps keep pace with how long her last analysis took (about a minute at first), with a
  // progress bar; the last step only shows done when the picks are really there. Saved picks show at once.
  const [runMs, setRunMs] = useState(60_000);
  const [started, setStarted] = useState(0);
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!linked) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches && !live) return setPhase(STEPS.length);
    setPhase(0);
    if (!live) {
      const timers = STEPS.map((_, i) => window.setTimeout(() => setPhase(i + 1), STEP_MS * (i + 1)));
      return () => timers.forEach(clearTimeout);
    }
    const ms = lastRunMs();
    setRunMs(ms);
    const t0 = Date.now();
    setStarted(t0);
    setNow(t0);
    // Steps 1 to 4 at their share of the expected time; step 5 waits for the answer.
    const timers = STEPS.slice(0, -1).map((_, i) => window.setTimeout(() => setPhase((p) => Math.max(p, i + 1)), (ms * (i + 1)) / STEPS.length));
    const tick = window.setInterval(() => setNow(Date.now()), 500);
    return () => { timers.forEach(clearTimeout); clearInterval(tick); };
  }, [run, linked, live, channel]);

  useEffect(() => {
    if (!live || !linked) return;
    let on = true;
    // A tab shows its own progress, never another tab's or the sample's picks (owner, 1 Nov 2026).
    setReal(null);
    setFailed(false);
    fetch(`/api/v2/ai-picks?channel=${channel === "Video" ? "video" : channel === "LIVE" ? "live" : "all"}${run ? "&fresh=1" : ""}`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<LivePicks>) : null))
      .then((d) => {
        if (!on) return;
        if (!d) return setFailed(true);
        if (!d.saved && d.ms) { try { localStorage.setItem(RUN_KEY, String(d.ms)); } catch {} }
        setReal(d);
        setPhase(STEPS.length);
        if (d.locked) return;
        // Open on the side she sells more on.
        setFit(d.profile.video >= 50 || !d.profile.orders ? "video" : "live");
      })
      .catch(() => on && setFailed(true));
    return () => { on = false; };
  }, [run, live, linked, channel]);
  const progress = live ? Math.min(0.95, started ? (now - started) / runMs : 0) : phase / STEPS.length;
  const left = live ? Math.max(0, Math.round((runMs - (now - started)) / 1000)) : 0;

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
  // Signed in, the Overall / Video / LIVE switch at the top decides; the sample keeps its video and LIVE tabs.
  const sorted = items.filter((pk) => live || pk.fit === fit).sort((a, b) => {
    if (sort === "Best Selling") return b.sold - a.sold;
    if (sort === "Top Commission") return b.rate - a.rate || b.match - a.match;
    if (sort === "Lowest Price") return a.price - b.price;
    return b.match - a.match;
  });
  const list = dir === "asc" ? sorted.reverse() : sorted;


  if (!linked || (live && real && !real.linked)) {
    return (
      <section id="ai-picks" className="v2-aicard ai-box" aria-label="AI picks">
        <AiHead title="AI Picks" sub="What should you sell next? Link TikTok Shop to get your picks." />
        <button type="button" className="np-btn" style={{ alignSelf: "flex-start" }} onClick={() => setLinked(true)}>Link TikTok Shop</button>
      </section>
    );
  }

  if (live && real?.locked) {
    return (
      <section id="ai-picks" className="v2-aicard ai-box" aria-label="AI picks">
        <AiHead title="AI Picks" sub="Your account analysed from the last 30 days, and the products that fit you best." />
        <DetailsLock missing={real.locked} what="AI Picks" />
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
        sub={failed ? "Couldn't load your picks." : done ? (live ? `Your account, last 30 days · Updated ${at} · ${(real?.compared ?? 0).toLocaleString("en-MY")} products compared` : `What to sell next · Today 09:12 · ${AI_PROFILE.compared.toLocaleString("en-MY")} best-sellers compared`) : live ? "Analysing your account. This can take about a minute." : "Analysing your account. Takes a few seconds."}
      >
        {(done || failed) && (
          <button type="button" className="btn-outline v2-btn-sm" onClick={() => setRun((r) => r + 1)}>
            <Icon name="refresh" size={15} /> {failed ? "Try again" : "Analyse again"}
          </button>
        )}
      </AiHead>

      {live && (
        <div className="ai-channel">
          <Seg value={channel} options={["Overall", "Video", "LIVE"] as const} onChange={setChannel} />
          <small>{channel === "Overall" ? "All your sales" : channel === "Video" ? "Only your sales from videos, and products in TikTok's top-selling videos" : "Only your sales from LIVEs"}</small>
          {/* Where her sales come from, under the tabs (owner, 1 Nov 2026). */}
          {real?.profile.sales && real.profile.orders > 0 && (
            <span className="ai-share" role="img" aria-label={`Your sales, last 30 days: video ${real.profile.sales.video}%, LIVE ${real.profile.sales.live}%, other ${real.profile.sales.other}%`}>
              <span className="ai-share-bar"><i className="v" style={{ width: `${real.profile.sales.video}%` }} /><i className="l" style={{ width: `${real.profile.sales.live}%` }} /><i className="o" style={{ width: `${real.profile.sales.other}%` }} /></span>
              <small><b>Video {real.profile.sales.video}%</b> · <b>LIVE {real.profile.sales.live}%</b>{real.profile.sales.other > 0 && <> · Other {real.profile.sales.other}%</>} of your sales</small>
            </span>
          )}
        </div>
      )}
      {failed ? null : !done ? (
        <div className="ai-run" aria-live="polite">
          {live && (
            <div className="ai-prog" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Analysing your account">
              <span><i style={{ width: `${Math.round(progress * 100)}%` }} /></span>
              <small>{left > 0 ? `About ${left >= 60 ? "a minute" : `${left} seconds`} left` : "Almost done…"}</small>
            </div>
          )}
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
              {channel === "Overall" && <div>
                <small>Where you sell more</small>
                {prof.orders ? (() => {
                  // By sales (owner, 1 Nov 2026), video against LIVE.
                  const s = prof.sales ?? { video: prof.video, live: 100 - prof.video, other: 0 };
                  const vl = s.video + s.live || 1;
                  const v = Math.round((s.video / vl) * 100);
                  return (
                    <>
                      <b>{v >= 50 ? `Video ${s.video}%` : `LIVE ${s.live}%`}</b>
                      <span className="ai-split"><i style={{ width: `${v}%` }} /></span>
                      <em>{v >= 50 ? `LIVE ${s.live}%` : `Video ${s.video}%`} of your sales</em>
                    </>
                  );
                })() : (
                  <em>No orders in the last 30 days</em>
                )}
              </div>}
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
                {prof.you?.gender && !prof.you.race && <em><Link href="/app/account" className="v2-link">Add Your Race</Link></em>}
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
              <h3>Worth Your Effort <Tip label="Worth your effort" text="For each product you sold in the last 30 days: sales per 1,000 views on your videos (sales per video where TikTok hasn't given Rezekii your views), and sales per LIVE (TikTok doesn't share how long a LIVE ran, so it can't be per hour). Best sales per post first. A star marks a single video or LIVE that took off. Only posts that made a sale are counted." /></h3>
              <ol className="ai-effort">
                {real.effort.map((e) => (
                  <li key={e.id}>
                    {/* Each row opens its product (owner, 1 Nov 2026). */}
                    <Link href={productHref(e.id)} className="ai-effort-row">
                      <span><b>{shortName(e.name)}</b><small>{[e.videos && `${e.videos} video${e.videos === 1 ? "" : "s"}`, e.lives && `${e.lives} LIVE${e.lives === 1 ? "" : "s"}`].filter(Boolean).join(" · ")} · {rm(e.commission)} commission</small></span>
                      <span className="ai-per">
                        {e.per1k != null ? <span><b>{rm(e.per1k)}</b><small>per 1K views</small></span> : e.videos > 0 && <span><b>{rm(e.perVideo ?? e.gmvPerPost ?? e.perPost)}</b><small>per video</small></span>}
                        {e.perLive != null && <span><b>{rm(e.perLive)}</b><small>per LIVE</small></span>}
                      </span>
                      <Icon name="arrow" size={15} />
                    </Link>
                    {e.hit && <i className="ai-hit"><Icon name="star" size={12} width={2.4} /> 1 post made {rm(e.hit.gmv)}</i>}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {!live && <div className="ai-fit" role="group" aria-label="Video or LIVE">
            <button type="button" className={fit === "video" ? "on" : undefined} aria-pressed={fit === "video"} onClick={() => setFit("video")}>
              <span className="ai-fico"><Icon name="video" size={18} /></span>
              <span><b>Best for video <em>{count("video")}</em></b><small>Sells more on video</small></span>
            </button>
            <button type="button" className={fit === "live" ? "on live" : "live"} aria-pressed={fit === "live"} onClick={() => setFit("live")}>
              <span className="ai-fico"><span className="ai-dot" />LIVE</span>
              <span><b>Best for LIVE <em>{count("live")}</em></b><small>Needs a demo</small></span>
            </button>
          </div>}

          <div className="ai-sort nv-noscroll" role="group" aria-label="Sort picks">
            <span>Sort</span>
            {SORTS.map((s) => (
              <button key={s} type="button" className={sort === s ? "on" : undefined} aria-pressed={sort === s} onClick={() => setSort(s)}>{s}</button>
            ))}
            <DirToggle dir={dir} onFlip={flip} />
          </div>

          {list.length === 0 && (
            <p className="v2-muted" style={{ margin: 0 }}>
              {live && !prof?.orders ? `No ${channel === "Overall" ? "" : channel === "Video" ? "video " : "LIVE "}sales in the last 30 days to learn from yet.` : items.length === 0 ? "No picks right now. Rezekii adds products every day, so check again tomorrow." : fit === "video" ? "No video picks this time. Your sales in these categories come mostly from LIVE." : "No LIVE picks this time. Your sales in these categories come mostly from video."}
            </p>
          )}

          <div className="ai-grid" key={`${fit}-${sort}-${dir}-${run}`}>
            {list.map((it, i) => {
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
                    {it.source && <i className={`ai-src${it.source === "Rezekii campaign" ? " rz" : ""}`}>{it.source}</i>}
                    <span className="ai-why">{it.why}</span>
                    <span className="ai-foot">
                      <span className="ai-earn">Earn <b><Hidden>{it.rate}%</Hidden></b></span>
                      {it.sample && (
                        <button type="button" className={`ai-btn ghost ${asked ? "asked" : ""}`} disabled={asked} onClick={() => requireWa(() => router.push(productHref(it.id, { sample: true })))}>
                          <Icon name={asked ? "check" : "gift"} size={14} width={asked ? 2.8 : 1.9} /> {asked ? "Requested" : "Free sample"}
                        </button>
                      )}
                      <AddButton id={it.id} name={it.name} rate={it.rate} size="sm" />
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
                  <h3>Rising in Your Niche</h3>
                  {real.rising.map((r) => (
                    <p key={r.category} className="ai-rise"><b>{r.category}</b> <span className={r.change >= 0 ? "up" : "down"}>{r.change >= 0 ? "+" : ""}{r.change}%</span><small>TikTok&apos;s top 100 sales, last 7 days against the 7 before</small></p>
                  ))}
                </div>
              )}
              {real.peers.length > 0 && (
                <div className="ai-more">
                  <h3>Creators Like You <Tip label="Creators like you" text="TikTok's top creators in your main category over the last 30 days, with how much of their sales come from video." /></h3>
                  <ol className="ai-peers">
                    {real.peers.map((c) => (
                      <li key={c.user}>
                        {/* Each creator opens their TikTok profile (owner, 1 Nov 2026). */}
                        <a href={`https://www.tiktok.com/@${encodeURIComponent(c.user)}`} target="_blank" rel="noreferrer" className="ai-peer" aria-label={`${c.name} on TikTok`}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {c.img ? <img src={c.img} alt="" referrerPolicy="no-referrer" /> : <span className="ai-av">{c.name.slice(0, 1)}</span>}
                          <span><b>{c.name}</b><small>@{c.user} · {short(c.followers)} followers{c.video >= 0 ? ` · ${c.video >= 50 ? `video ${c.video}%` : `LIVE ${100 - c.video}%`}` : ""}</small></span>
                          <em>RM {short(c.lo)}–{short(c.hi)}</em>
                        </a>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {real.swap.count > 0 && (
                <div className="ai-more">
                  <h3>Swap Out <Tip label="Swap out" text="Products in your showcase with no orders from you in the last 30 days. Swap them for picks above. Low-rated products are in Risk Check." /></h3>
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
              <b>Earn</b>: the product&apos;s commission; on Rezekii campaign products, your Rezekii rate.
            </p>
          ) : (
            <p className="ai-fine">
              <b>Match</b>: fit with you, out of 100. Not a forecast.{" "}
              <b>Earn</b>: Techwide&apos;s rate, or your own rate if it&apos;s higher.
            </p>
          )}
        </>
      )}
    </section>
  );
}
