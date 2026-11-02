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
import { rich, useOptions } from "@/components/creator2/bits";
import { useT } from "@/lib/i18n/client";
import { tx } from "@/lib/i18n/lang";

type Fit = AiPick["fit"];
// Title Case (owner, 1 Nov 2026).
const SORTS = ["Best Match", "Best Selling", "Top Commission", "Lowest Price"] as const;
type Sort = (typeof SORTS)[number];

/** How many steps the AI shows (what each does and found is written in AiPicks, in her language). */
const STEP_COUNT = 5;
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
  /** One row per product on video or LIVE (owner, 3 Nov 2026); picks saved before then have no `kind` and aren't shown. */
  effort: { id: string; name: string; kind?: "video" | "live"; posts: number; gmv: number; commission: number; worth: number; per: "1k" | "video" | "live"; hit: { gmv: number } | null }[];
  compared: number; picks: LivePick[];
  rising: { category: string; change: number }[];
  peers: { user: string; name: string; img: string | null; followers: number; lo: number; hi: number; video: number }[];
  peersWhy?: string;
  swap: { count: number; items: { id: string; name: string; img: string | null }[] };
  at: string;
  /** Saved picks shown straight away; `ms` is how long the analysis took. */
  saved?: boolean; ms?: number;
};
const SOURCE: Record<LivePick["source"], string> = { tiktok: tx("TikTok best seller"), market: tx("TikTok marketplace"), rezekii: tx("Rezekii campaign") };
/** The product on TikTok Shop (owner, 3 Nov 2026), in the shop.tiktok.com/view/product/<id> format of TikTok's own product links. */
const tiktokHref = (id: string) => `https://shop.tiktok.com/view/product/${id}?region=MY&locale=en`;
const PER: Record<LivePicks["effort"][number]["per"], string> = { "1k": tx("per 1K views"), video: tx("per video"), live: tx("per LIVE") };

/** One card, the same for sample and real picks. */
type Item = {
  /** soldLabel: the English line for how many sold, with {n}; rank: TikTok Shop rank in its category, sample only. */
  id: string; name: string; img: string; price: number; sold: number; soldLabel: string; rank: { n: number; category: string } | null; match: number;
  video: number; live: number; fit: Fit; why: string; rate: number; sample: boolean; source?: string; parts?: LivePick["parts"];
  /** TikTok's buyer rating, when known (owner, 2 Nov 2026). */
  rating: number | null;
};

/** What the match score is made of (item 18, owner, 2 Nov 2026), in the order and with the maximums modules/picks/ai.ts uses. */
const PARTS: [keyof LivePick["parts"], string, number][] = [["category", tx("Your Category"), 35], ["price", tx("Price Range"), 20], ["demand", tx("Sells on TikTok"), 20], ["rate", tx("Commission"), 15], ["rating", tx("Rating"), 10]];
const CHANNELS = ["Overall", "Video", "LIVE"] as const;

/**
 * AI picks on Home: the AI reads the creator's sales, compares TikTok Shop's best-sellers with Techwide's campaigns,
 * and ranks what fits, split into products that sell on video and products that sell on LIVE.
 * Signed in (owner, 31 Oct 2026): her own last 30 days of sales against Rezekii's campaign products, ranked by a rule score.
 */
export function AiPicks() {
  const t = useT();
  const channels = useOptions(CHANNELS);
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
  const [scoreOf, setScoreOf] = useState<string | null>(null);
  const linked = live ? !!me?.shop : demoLinked;

  // Signed in (owner, 1 Nov 2026): the steps keep pace with how long her last analysis took (about a minute at first), with a
  // progress bar; the last step only shows done when the picks are really there. Saved picks show at once.
  const [runMs, setRunMs] = useState(60_000);
  const [started, setStarted] = useState(0);
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!linked) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches && !live) return setPhase(STEP_COUNT);
    setPhase(0);
    if (!live) {
      const timers = Array.from({ length: STEP_COUNT }, (_, i) => window.setTimeout(() => setPhase(i + 1), STEP_MS * (i + 1)));
      return () => timers.forEach(clearTimeout);
    }
    const ms = lastRunMs();
    setRunMs(ms);
    const t0 = Date.now();
    setStarted(t0);
    setNow(t0);
    // Steps 1 to 4 at their share of the expected time; step 5 waits for the answer.
    const timers = Array.from({ length: STEP_COUNT - 1 }, (_, i) => window.setTimeout(() => setPhase((p) => Math.max(p, i + 1)), (ms * (i + 1)) / STEP_COUNT));
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
        setPhase(STEP_COUNT);
        if (d.locked) return;
        // Open on the side she sells more on.
        setFit(d.profile.video >= 50 || !d.profile.orders ? "video" : "live");
      })
      .catch(() => on && setFailed(true));
    return () => { on = false; };
  }, [run, live, linked, channel]);
  const progress = live ? Math.min(0.95, started ? (now - started) / runMs : 0) : phase / STEP_COUNT;
  const left = live ? Math.max(0, Math.round((runMs - (now - started)) / 1000)) : 0;

  const level = me?.level ?? "silver";
  const items: Item[] = live
    ? (real?.picks ?? []).map((p) => ({
        id: p.id, name: p.name, img: p.image ?? NO_PHOTO, price: p.priceLo ?? 0, sold: p.sold, soldLabel: tx("{n} sold on TikTok"), match: p.match, video: p.video, live: p.live, fit: p.fit,
        rank: null, why: p.why.join(" · ") || t("Sells well on TikTok"), source: SOURCE[p.source], parts: p.parts,
        rate: ((p.source !== "rezekii" || level === "bronze" ? p.openRate : p.silverRate ?? p.openRate) ?? 0) / 100, sample: p.samples > 0, rating: p.rating,
      }))
    : AI_PICKS.map((pk) => {
        const p = product(pk.productId);
        return {
          id: p.id, name: p.name, img: p.img, price: p.price, sold: pk.week, soldLabel: tx("{n} sold this week"), match: pk.match, video: pk.video, live: pk.live, fit: pk.fit,
          rank: pk.rank ? { n: pk.rank, category: p.category } : null, why: pk.why, rate: rateOf(pk),
          // A free sample only for Techwide campaign products, and only when this creator's level opens that sample pool.
          sample: pk.from === "tap" && canGetSample(p.samples), rating: p.rating,
        };
      });

  const ordersLine = (n: number) => (n === 1 ? t("{n} order", { n: 1 }) : t("{n} orders", { n: n.toLocaleString("en-MY") }));
  const picksLine = (n: number) => (n === 1 ? t("{n} pick", { n: 1 }) : t("{n} picks", { n }));
  // One product's posts in Worth Your Effort: how many videos or LIVEs, what they sold and earned.
  const effortLine = (k: "video" | "live", n: number, v: { gmv: string; commission: string }) => k === "video"
    ? (n === 1 ? t("{n} video · {gmv} sales · {commission} commission", { n, ...v }) : t("{n} videos · {gmv} sales · {commission} commission", { n, ...v }))
    : (n === 1 ? t("{n} LIVE · {gmv} sales · {commission} commission", { n, ...v }) : t("{n} LIVEs · {gmv} sales · {commission} commission", { n, ...v }));
  const steps: [string, string][] = live
    ? [
        [t("Reading your sales"), real ? (real.profile.categories.slice(0, 2).map(([c, v]) => `${c} ${v}%`).join(" · ") || ordersLine(real.profile.orders)) : ""],
        [t("Finding what sells for you"), !real ? "" : real.profile.orders ? t("Video {video}% · LIVE {live}%", { video: real.profile.video, live: 100 - real.profile.video }) : t("Not enough sales yet")],
        [t("Checking TikTok's best sellers, marketplace and Rezekii campaigns"), real ? t("{n} products you can add", { n: real.compared.toLocaleString("en-MY") }) : ""],
        [t("Matching your categories and prices"), !real ? "" : real.profile.price ? t("Your range {price}", { price: real.profile.price }) : t("Commission and sales")],
        [t("Ranking picks"), real ? picksLine(real.picks.length) : ""],
      ]
    : [
        [t("Reading your sales"), AI_PROFILE.categories.map(([c, v]) => `${c} ${v}%`).slice(0, 2).join(" · ")],
        [t("Finding what sells for you"), t("Video {video}% · LIVE {live}%", { video: AI_PROFILE.video, live: 100 - AI_PROFILE.video })],
        [t("Checking TikTok best-sellers"), t("{n} products", { n: AI_PROFILE.compared.toLocaleString("en-MY") })],
        [t("Matching campaigns"), t("Rezekii rates and samples found")],
        [t("Ranking picks"), picksLine(AI_PICKS.length)],
      ];

  const done = phase >= STEP_COUNT;
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
      <section id="ai-picks" className="v2-aicard ai-box" aria-label={t("AI picks")}>
        <AiHead title={t("AI Picks")} sub={t("What should you sell next? Link TikTok Shop to get your picks.")} />
        <button type="button" className="np-btn" style={{ alignSelf: "flex-start" }} onClick={() => setLinked(true)}>{t("Link TikTok Shop")}</button>
      </section>
    );
  }

  if (live && real?.locked) {
    return (
      <section id="ai-picks" className="v2-aicard ai-box" aria-label={t("AI picks")}>
        <AiHead title={t("AI Picks")} sub={t("Your account analysed from the last 30 days, and the products that fit you best.")} />
        <DetailsLock missing={real.locked} what={t("AI Picks")} />
      </section>
    );
  }
  const at = real ? updatedWhen(real.at) : "09:12";
  const prof = real?.profile;
  return (
    <section id="ai-picks" className="v2-aicard ai-box" aria-label={t("AI picks")}>
      <AiHead
        title={t("AI Picks")}
        busy={!done && !failed}
        sub={failed ? t("Couldn't load your picks.") : done ? (live ? t("Your account, last 30 days · Updated {at} · {n} products compared", { at, n: (real?.compared ?? 0).toLocaleString("en-MY") }) : t("What to sell next · Today 09:12 · {n} best-sellers compared", { n: AI_PROFILE.compared.toLocaleString("en-MY") })) : live ? t("Analysing your account. This can take about a minute.") : t("Analysing your account. Takes a few seconds.")}
      >
        {(done || failed) && (
          <button type="button" className="btn-outline v2-btn-sm" onClick={() => setRun((r) => r + 1)}>
            <Icon name="refresh" size={15} /> {failed ? t("Try again") : t("Analyse again")}
          </button>
        )}
      </AiHead>

      {live && (
        <div className="ai-channel">
          <Seg value={channels.label(channel)} options={channels.labels} onChange={(l) => setChannel(channels.pick(l))} />
          <small>{channel === "Overall" ? t("All your sales") : channel === "Video" ? t("Only your sales from videos, and products in TikTok's top-selling videos") : t("Only your sales from LIVEs")}</small>
          {/* Where her sales come from, under the tabs (owner, 1 Nov 2026). */}
          {real?.profile.sales && real.profile.orders > 0 && (
            <span className="ai-share" role="img" aria-label={t("Your sales, last 30 days: video {video}%, LIVE {live}%, other {other}%", real.profile.sales)}>
              <span className="ai-share-bar"><i className="v" style={{ width: `${real.profile.sales.video}%` }} /><i className="l" style={{ width: `${real.profile.sales.live}%` }} /><i className="o" style={{ width: `${real.profile.sales.other}%` }} /></span>
              <small>{rich(real.profile.sales.other > 0 ? t("**Video {video}%** · **LIVE {live}%** · Other {other}% of your sales", real.profile.sales) : t("**Video {video}%** · **LIVE {live}%** of your sales", real.profile.sales))}</small>
            </span>
          )}
        </div>
      )}
      {failed ? null : !done ? (
        <div className="ai-run" aria-live="polite">
          {live && (
            <div className="ai-prog" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label={t("Analysing your account")}>
              <span><i style={{ width: `${Math.round(progress * 100)}%` }} /></span>
              <small>{left >= 60 ? t("About a minute left") : left > 1 ? t("About {n} seconds left", { n: left }) : left === 1 ? t("About 1 second left") : t("Almost done…")}</small>
            </div>
          )}
          <ol className="ai-steps">
            {steps.map(([step, found], i) => (
              <li key={step} className={i < phase ? "done" : i === phase ? "now" : undefined}>
                <i>{i < phase && <Icon name="check" size={12} width={3.2} />}</i>
                <span>
                  {step}
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
              <span className="ai-counted">{rich(t("{n} products compared"), { n: <b><Count value={COUNTED[phase]} ms={600} /></b> })}</span>
            </div>
          )}
        </div>
      ) : (
        <>
          {live && prof ? (
            <div className="ai-insight">
              <div>
                <small>{t("Your top categories")}</small>
                {prof.categories.length ? (
                  <>
                    <span className="ai-stack">
                      {prof.categories.map(([c, v], i) => <i key={c} className={`c${i}`} style={{ width: `${v}%` }} title={`${c} ${v}%`} />)}
                    </span>
                    <em>{prof.categories.map(([c, v]) => `${c} ${v}%`).join(" · ")}</em>
                  </>
                ) : (
                  <em>{t("Not enough sales yet")}</em>
                )}
              </div>
              {channel === "Overall" && <div>
                <small>{t("Where you sell more")}</small>
                {prof.orders ? (() => {
                  // By sales (owner, 1 Nov 2026), video against LIVE.
                  const s = prof.sales ?? { video: prof.video, live: 100 - prof.video, other: 0 };
                  const vl = s.video + s.live || 1;
                  const v = Math.round((s.video / vl) * 100);
                  return (
                    <>
                      <b>{v >= 50 ? t("Video {pct}%", { pct: s.video }) : t("LIVE {pct}%", { pct: s.live })}</b>
                      <span className="ai-split"><i style={{ width: `${v}%` }} /></span>
                      <em>{v >= 50 ? t("LIVE {pct}% of your sales", { pct: s.live }) : t("Video {pct}% of your sales", { pct: s.video })}</em>
                    </>
                  );
                })() : (
                  <em>{t("No orders in the last 30 days")}</em>
                )}
              </div>}
              <div>
                <small>{t("Your price range")}</small>
                <b>{prof.price ?? t("Not enough sales yet")}</b>
                {prof.price && <em>{t("8 in 10 of the items you sold")}</em>}
              </div>
              <div>
                <small>{t("Your average order")}</small>
                <b>{rm(prof.aov)}</b>
                <em>{prof.orders === 1 ? t("{n} order · last 30 days", { n: 1 }) : t("{n} orders · last 30 days", { n: prof.orders.toLocaleString("en-MY") })}</em>
              </div>
              <div>
                <small>{t("When your buyers order")}</small>
                <b>{prof.hours[0] ? t(prof.hours[0][0]) : t("Not enough sales yet")}</b>
                {prof.hours.length > 1 && <em>{t("Then {times}", { times: prof.hours.slice(1).map(([h]) => t(h)).join(", ") })}</em>}
              </div>
              <div>
                <small>{t("Your followers")}</small>
                {prof.audience ? (
                  <>
                    <b>{prof.audience.female >= prof.audience.male ? t("{pct}% women", { pct: prof.audience.female }) : t("{pct}% men", { pct: prof.audience.male })}</b>
                    <em>{[prof.audience.age && t("Mostly {age}", { age: prof.audience.age }), prof.audience.places].filter(Boolean).join(" · ")}</em>
                  </>
                ) : (
                  <em>{t("TikTok hasn't shared your followers with Rezekii yet")}</em>
                )}
              </div>
              <div>
                <small>{t("You")}</small>
                {/* Her gender and race are picked from fixed lists, whose words My Account translates. */}
                {prof.you?.gender ? <b>{[prof.you.gender, prof.you.race].filter((x): x is string => !!x).map((x) => t(x)).join(" · ")}</b> : <em>{t("Add your details in My Account")}</em>}
                {prof.you?.gender && !prof.you.race && <em><Link href="/app/account" className="v2-link">{t("Add Your Race")}</Link></em>}
              </div>
              <div>
                <small>{t("Your 30 days")}</small>
                <b>{t("{amount} sales", { amount: rm(prof.gmv) })}</b>
                <em>{t("{amount} commission", { amount: rm(prof.commission) })}</em>
              </div>
            </div>
          ) : (
            <div className="ai-insight">
              <div>
                <small>{t("Your top categories")}</small>
                <span className="ai-stack">
                  {AI_PROFILE.categories.map(([c, v], i) => <i key={c} className={`c${i}`} style={{ width: `${v}%` }} title={`${c} ${v}%`} />)}
                </span>
                <em>{AI_PROFILE.categories.map(([c, v]) => `${c} ${v}%`).join(" · ")}</em>
              </div>
              <div>
                <small>{t("Where you sell more")}</small>
                <b>{t("Video {pct}%", { pct: AI_PROFILE.video })}</b>
                <span className="ai-split"><i style={{ width: `${AI_PROFILE.video}%` }} /></span>
                <em>{t("LIVE {pct}% of your commission", { pct: 100 - AI_PROFILE.video })}</em>
              </div>
              <div>
                <small>{t("Your price range")}</small>
                <b>{AI_PROFILE.price}</b>
                <em>{t("8 in 10 of your orders")}</em>
              </div>
              <div>
                <small>{t("Your average order")}</small>
                <b>RM {AI_PROFILE.aov.toFixed(2)}</b>
                <em>{t("Last 30 days")}</em>
              </div>
            </div>
          )}

          {live && real && real.effort.some((e) => e.kind) && (
            <div className="ai-more">
              <h3>{t("Worth Your Effort")} <Tip label={t("Worth your effort")} text={t("For each product you sold in the last 30 days, most worthwhile first. Videos: sales per 1,000 views (then sales per video, where TikTok hasn't given Rezekii your views). LIVEs: sales per LIVE, as TikTok's LIVE length isn't reliable enough for per hour. A star marks a single post that took off. Only posts that made a sale are counted.")} /></h3>
              {/* Videos and LIVEs apart, each sorted most worthwhile first (owner, 3 Nov 2026). */}
              <div className="ai-effort-sets">
                {(["video", "live"] as const).map((k) => {
                  const rows = real.effort.filter((e) => e.kind === k);
                  return rows.length > 0 && (
                    <div key={k}>
                      <small className="ai-effort-h">{k === "video" ? t("Videos") : t("LIVEs")}</small>
                      <ol className="ai-effort">
                        {rows.map((e) => (
                          <li key={e.id}>
                            {/* Each row opens its product (owner, 1 Nov 2026). */}
                            <Link href={productHref(e.id)} className="ai-effort-row">
                              <span>
                                <b>{shortName(e.name)}</b>
                                <small>{effortLine(k, e.posts, { gmv: rm(e.gmv, 0), commission: rm(e.commission) })}</small>
                                {e.hit && <i className="ai-hit"><Icon name="star" size={12} width={2.4} /> {k === "video" ? t("1 video made {gmv}", { gmv: rm(e.hit.gmv) }) : t("1 LIVE made {gmv}", { gmv: rm(e.hit.gmv) })}</i>}
                              </span>
                              <span className="ai-per"><b>{rm(e.worth)}</b><small>{t(PER[e.per])}</small></span>
                              <Icon name="arrow" size={15} />
                            </Link>
                          </li>
                        ))}
                      </ol>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!live && <div className="ai-fit" role="group" aria-label={t("Video or LIVE")}>
            <button type="button" className={fit === "video" ? "on" : undefined} aria-pressed={fit === "video"} onClick={() => setFit("video")}>
              <span className="ai-fico"><Icon name="video" size={18} /></span>
              <span><b>{rich(t("Best for video {n}"), { n: <em>{count("video")}</em> })}</b><small>{t("Sells more on video")}</small></span>
            </button>
            <button type="button" className={fit === "live" ? "on live" : "live"} aria-pressed={fit === "live"} onClick={() => setFit("live")}>
              <span className="ai-fico"><span className="ai-dot" />LIVE</span>
              <span><b>{rich(t("Best for LIVE {n}"), { n: <em>{count("live")}</em> })}</b><small>{t("Needs a demo")}</small></span>
            </button>
          </div>}

          <div className="ai-sort nv-noscroll" role="group" aria-label={t("Sort picks")}>
            <span>{t("Sort")}</span>
            {SORTS.map((s) => (
              <button key={s} type="button" className={sort === s ? "on" : undefined} aria-pressed={sort === s} onClick={() => setSort(s)}>{t(s)}</button>
            ))}
            <DirToggle dir={dir} onFlip={flip} />
          </div>

          {list.length === 0 && (
            <p className="v2-muted" style={{ margin: 0 }}>
              {live && !prof?.orders ? (channel === "Overall" ? t("No sales in the last 30 days to learn from yet.") : channel === "Video" ? t("No video sales in the last 30 days to learn from yet.") : t("No LIVE sales in the last 30 days to learn from yet.")) : items.length === 0 ? t("No picks right now. Rezekii adds products every day, so check again tomorrow.") : fit === "video" ? t("No video picks this time. Your sales in these categories come mostly from LIVE.") : t("No LIVE picks this time. Your sales in these categories come mostly from video.")}
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
                    {!live && it.rank && <span className="ai-rank" title={t("#{n} in {category} on TikTok Shop Malaysia this week", it.rank)}>#{it.rank.n}</span>}
                  </Link>
                  <span className="ai-body">
                    <span className="ai-row1">
                      {/* Short names throughout AI Picks (owner, 3 Nov 2026). */}
                      <Link href={productHref(it.id)} className="ai-name"><strong>{shortName(it.name)}</strong></Link>
                      {it.parts ? (
                        <button type="button" className="ai-match" style={{ "--m": it.match } as React.CSSProperties} aria-expanded={scoreOf === it.id} aria-label={t("Match {n} out of 100. See what makes it up", { n: it.match })} title={t("See what makes up this score")} onClick={() => setScoreOf(scoreOf === it.id ? null : it.id)}><b>{it.match}</b></button>
                      ) : (
                        <span className="ai-match" style={{ "--m": it.match } as React.CSSProperties} title={t("Match with you, out of 100")}><b>{it.match}</b></span>
                      )}
                    </span>
                    {it.parts && scoreOf === it.id && (
                      <span className="ai-parts" role="group" aria-label={t("Match score")}>
                        {PARTS.map(([k, label, max]) => (
                          <span key={k} className="ai-part">
                            <span>{t(label)}</span>
                            <i style={{ "--p": `${Math.round((it.parts![k] / max) * 100)}%` } as React.CSSProperties} />
                            <b>{it.parts![k]}/{max}</b>
                          </span>
                        ))}
                        <small>{t("How well it fits your sales so far. It isn't a sales forecast.")}</small>
                      </span>
                    )}
                    <small className="ai-meta">{rm(it.price)} · {t(it.soldLabel, { n: short(it.sold) })}{it.rank ? ` · ${t("#{n} in {category}", it.rank)}` : ""}{it.rating ? <> · <span className="ai-score"><Icon name="star" size={11} width={2.4} /> {it.rating.toFixed(1)}</span></> : null}</small>
                    {it.source && <i className={`ai-src${it.source === "Rezekii campaign" ? " rz" : ""}`}>{t(it.source)}</i>}
                    <span className="ai-why">{it.why}</span>
                    <span className="ai-foot">
                      <span className="ai-earn">{rich(t("Earn {rate}"), { rate: <b><Hidden>{it.rate}%</Hidden></b> })}</span>
                      {/* Every card opens its product on TikTok Shop (owner, 3 Nov 2026); the sample's products aren't real ones. */}
                      {live
                        ? <a className="ai-btn ghost" href={tiktokHref(it.id)} target="_blank" rel="noreferrer">{t("Open in TikTok")}</a>
                        : <button type="button" className="ai-btn ghost" onClick={() => toast(t("Opening the product in TikTok…"))}>{t("Open in TikTok")}</button>}
                      {it.sample && (
                        <button type="button" className={`ai-btn ghost ${asked ? "asked" : ""}`} disabled={asked} onClick={() => requireWa(() => router.push(productHref(it.id, { sample: true })))}>
                          <Icon name={asked ? "check" : "gift"} size={14} width={asked ? 2.8 : 1.9} /> {asked ? t("Requested") : t("Free sample")}
                        </button>
                      )}
                      <AddButton id={it.id} name={shortName(it.name)} rate={it.rate} size="sm" />
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
                  <h3>{t("Rising in Your Niche")}</h3>
                  {real.rising.map((r) => (
                    <p key={r.category} className="ai-rise"><b>{r.category}</b> <span className={r.change >= 0 ? "up" : "down"}>{r.change >= 0 ? "+" : ""}{r.change}%</span><small>{t("TikTok's top 100 sales, last 7 days against the 7 before")}</small></p>
                  ))}
                </div>
              )}
              {real.peers.length > 0 && (
                <div className="ai-more">
                  <h3>{t("Creators Like You")} <Tip label={t("Creators like you")} text={t("TikTok's top creators in your main category over the last 30 days who sell the way you do: mostly LIVE if most of your sales come from LIVE, mostly video if from video (the Video and LIVE tabs choose for you). Those with sales nearest yours and a video share closest to yours come first, so you know who to learn from.")} /></h3>
                  {real.peersWhy && <small className="ai-peers-why">{real.peersWhy}</small>}
                  <ol className="ai-peers">
                    {real.peers.map((c) => (
                      <li key={c.user}>
                        {/* Each creator opens their TikTok profile (owner, 1 Nov 2026). */}
                        <a href={`https://www.tiktok.com/@${encodeURIComponent(c.user)}`} target="_blank" rel="noreferrer" className="ai-peer" aria-label={t("{name} on TikTok", { name: c.name })}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {c.img ? <img src={c.img} alt="" referrerPolicy="no-referrer" /> : <span className="ai-av">{c.name.slice(0, 1)}</span>}
                          <span><b>{c.name}</b><small>@{c.user} · {c.video < 0 ? t("{n} followers", { n: short(c.followers) }) : c.video >= 50 ? t("{n} followers · video {pct}%", { n: short(c.followers), pct: c.video }) : t("{n} followers · LIVE {pct}%", { n: short(c.followers), pct: 100 - c.video })}</small></span>
                          <em>RM {short(c.lo)}–{short(c.hi)}</em>
                        </a>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {real.swap.count > 0 && (
                <div className="ai-more">
                  <h3>{t("Swap Out")} <Tip label={t("Swap out")} text={t("Products in your showcase with no orders from you in the last 30 days. Swap them for picks above. Low-rated products are in Risk Check.")} /></h3>
                  <p className="v2-small" style={{ margin: 0 }}>{real.swap.count === 1 ? t("{n} product in your showcase didn't sell in 30 days, for example:", { n: 1 }) : t("{n} products in your showcase didn't sell in 30 days, for example:", { n: real.swap.count })}</p>
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

          {/* No explanation of Match down here (owner, 3 Nov 2026): the score itself shows what makes it up. */}
          {live ? (
            <p className="ai-fine">{rich(t("**Earn**: the product's commission; on Rezekii campaign products, your Rezekii rate."))}</p>
          ) : (
            <p className="ai-fine">{rich(t("**Earn**: Techwide's rate, or your own rate if it's higher."))}</p>
          )}
        </>
      )}
    </section>
  );
}
