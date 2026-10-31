"use client";

import { useRouter } from "next/navigation";
import { Updated } from "@/components/data-note";
import { useEffect, useRef, useState } from "react";
import { useSideScroll } from "@/components/side-scroll";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { AiHead, Hidden, Tip } from "@/components/ui";
import Link from "next/link";
import { productHref } from "@/lib/product-view";
import { bestRate, product, short, rateFor } from "@/lib/mock";
import { SAMPLE_LEFT } from "@/lib/mock-creator1";
import { NICHE_BEST, TRY_TODAY, VIRAL, daily, type Trend } from "@/lib/mock-creator2";
import { ON_IDS, ON_SOLD30 } from "@/lib/mock-showcase";
import { useKept } from "@/lib/keep";
import { addOne } from "@/lib/live";
import { NO_PHOTO, shortName } from "@/lib/live-perf";

/** Drafts made from Today's Ideas wait here until the Content Calendar picks them up (preview only: this browser tab). */
export const IDEA_DRAFTS = "rz-idea-drafts";
export type IdeaDraft = { id: string; productId: string; idea: string };
const MAX = 5;

/**
 * Cards or list for the whole page (owner, 29 Oct 2026): one switch at the top drives both Best sellers and Today's Ideas, and
 * the choice is remembered on this device. Phones only; desktop keeps its grid and list.
 */
export type IdeasView = "cards" | "list";
export function useIdeasView(): [IdeasView, (v: IdeasView) => void] {
  const [view, setView] = useState<IdeasView>("cards");
  useEffect(() => {
    try { if (localStorage.getItem("rz2_ideas_view") === "list") setView("list"); } catch {}
  }, []);
  const pick = (v: IdeasView) => { setView(v); try { localStorage.setItem("rz2_ideas_view", v); } catch {} };
  return [view, pick];
}
export function ViewSwitch({ view, onChange }: { view: IdeasView; onChange: (v: IdeasView) => void }) {
  return (
    <span className="td-views master" role="group" aria-label="View">
      <button type="button" aria-label="Cards" aria-pressed={view === "cards"} className={view === "cards" ? "on" : undefined} onClick={() => onChange("cards")}><Icon name="grid" size={16} /></button>
      <button type="button" aria-label="List" aria-pressed={view === "list"} className={view === "list" ? "on" : undefined} onClick={() => onChange("list")}><Icon name="list" size={16} /></button>
    </span>
  );
}
/** Which card a swipe row is on, for the dots under it. */
function useRail<T extends HTMLElement>(view: IdeasView) {
  const rail = useRef<T>(null);
  useSideScroll(rail, view, ".none");
  const [at, setAt] = useState(0);
  useEffect(() => {
    const el = rail.current;
    if (!el || view !== "cards") return;
    const onScroll = () => {
      const first = el.firstElementChild as HTMLElement | null;
      if (first) setAt(Math.round(el.scrollLeft / (first.offsetWidth + 10)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [view]);
  return { rail, at };
}

/**
 * Why pick it (owner, 29 Oct 2026): the last 7 days of sales as a small line, with the change from the first half of the week to
 * the second. Views use the pink line, sales the green one.
 */
export function Trend({ points, label, sales = true }: { points: number[]; label: string; sales?: boolean }) {
  const early = points.slice(0, 3).reduce((a, b) => a + b, 0);
  const late = points.slice(-3).reduce((a, b) => a + b, 0);
  const change = early ? Math.round(((late - early) / early) * 100) : 0;
  return (
    <span className={`st-trend${sales ? " sales" : ""}`}>
      <small>{label}{change !== 0 && <em className={change > 0 ? "up" : "down"}>{change > 0 ? "+" : ""}{change}%</em>}</small>
      <Spark points={points} />
    </span>
  );
}

/** A tiny line from the last 7 days (oldest first). */
function Spark({ points }: { points: number[] }) {
  const max = Math.max(...points);
  const d = points.map((v, i) => `${i ? "L" : "M"}${(i / (points.length - 1)) * 100} ${30 - (v / max) * 28}`).join(" ");
  return (
    <svg className="st-spark" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
      <path d={`${d} L100 32 L0 32 Z`} className="fill" />
      <path d={d} className="line" />
    </svg>
  );
}

/** Where a pick comes from: her own rising videos, today's best sellers in her niche, or a free sample on Rezekii. */
type Kind = "rising" | "best" | "sample";
type Idea = { id: string; productId: string; kind: Kind; reason: string; stat: string; idea: string; week?: number[]; sales?: number[] };
const FROM: Record<Kind, { icon: "flame" | "trend" | "gift"; short: string; cls: string }> = {
  rising: { icon: "flame", short: "Rising", cls: "" },
  best: { icon: "trend", short: "Best seller", cls: " best" },
  sample: { icon: "gift", short: "Free sample", cls: " new" },
};

/**
 * Today's Ideas (owner, 28 Oct 2026): up to 5 products for her to film today, ranked from her own numbers. Showcase products
 * whose videos are taking off come first (rated 4★+ only), then new marketplace products with a free sample. She picks any of
 * them; each pick becomes a draft in the Content Calendar and the first one opens in New Post.
 */
export function ShootToday({ bare = false, view = "cards", inFrame = false }: { bare?: boolean; view?: IdeasView; inFrame?: boolean }) {
  const router = useRouter();
  const { linked, setLinked, toast, requireWa } = useDemo();
  const [pick, setPick] = useState<string[]>([]);
  // Phones: big swipe cards or a list, set by the page's switch.
  const { rail, at } = useRail<HTMLDivElement>(view);
  const [asked, setAsked] = useState<string[]>([]);
  // 2 rising in her showcase, 2 of today's best sellers in her niche, 1 free sample (owner, 29 Oct 2026). All rated 4★+.
  const ok = (id: string) => product(id).rating >= 4;
  const ideas: Idea[] = [
    ...VIRAL.filter((v) => ok(v.productId)).slice(0, 2).map((v) => ({
      id: v.id, productId: v.productId, kind: "rising" as const, idea: v.ideas[0], week: v.week, stat: `+${(v.views24 / 1000).toFixed(1)}K views today`,
      reason: `+${(v.views24 / 1000).toFixed(1)}K views in 24h on “${v.title}” · ${v.ordersToday} sold today`,
    })),
    ...NICHE_BEST.filter((b) => ok(b.productId) && b.idea).slice(0, 2).map((b) => ({
      id: `b-${b.productId}`, productId: b.productId, kind: "best" as const, idea: b.idea!, stat: `${short(b.weekSold)} sold this week`, sales: daily(b.weekSold, b.trend),
      reason: `Top seller in ${product(b.productId).category} this week · ${short(b.weekSold)} sold`,
    })),
    ...TRY_TODAY.filter((t) => ok(t.productId)).slice(0, 1).map((t) => ({ id: `t-${t.productId}`, productId: t.productId, kind: "sample" as const, idea: t.idea, reason: t.why, stat: `${SAMPLE_LEFT[t.productId] ?? 10} left`, sales: daily(t.weekSold, t.trend) })),
  ].slice(0, MAX);
  const flip = (id: string) => setPick((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  function plan() {
    if (!linked) return setLinked(true);
    const chosen = ideas.filter((i) => pick.includes(i.id));
    if (!chosen.length) return;
    const drafts: IdeaDraft[] = chosen.map((i) => ({ id: `idea-${i.productId}`, productId: i.productId, idea: i.idea }));
    try {
      const had: IdeaDraft[] = JSON.parse(sessionStorage.getItem(IDEA_DRAFTS) ?? "[]");
      sessionStorage.setItem(IDEA_DRAFTS, JSON.stringify([...drafts, ...had.filter((h) => !drafts.some((d) => d.id === h.id))]));
    } catch {}
    const added = chosen.filter((i) => i.kind !== "rising").length;
    toast(`${chosen.length} draft${chosen.length === 1 ? "" : "s"} saved${added ? `, ${added} product${added === 1 ? "" : "s"} added to showcase` : ""}`);
    router.push(`/app/publish?idea=${encodeURIComponent(chosen[0].idea)}`);
  }

  return (
    <section className={inFrame ? "st-box st-in" : "v2-aicard st-box"} aria-label="Today's Ideas">
      {!bare && <h2 className="v2-h2">Today&apos;s Ideas</h2>}
      <p className="td-lead">
        <b>{ideas.length} Products to Film Today</b>
        {/* Where the picks come from, one short line (owner, 29 Oct 2026); the rest is in the tip. */}
        <span className="td-mix">
          {[
            [ideas.filter((i) => i.kind === "rising").length, "your showcase"],
            [ideas.filter((i) => i.kind === "best").length, "best sellers"],
            [ideas.filter((i) => i.kind === "sample").length, "sample"],
          ].filter(([c]) => c).map(([c, what]) => `${c} ${what}`).join(" · ")}
          <Tip label="How these are picked" text="Updated daily by Rezekii AI from your showcase, your sales and your niche. Best sellers come from TikTok Shop's public products. Each pick becomes a draft." />
        </span>
      </p>

      <div ref={rail} className={`td-grid ${view}`}>
        {ideas.map((it, n) => {
          const p = product(it.productId);
          const on = pick.includes(it.id);
          const isAsked = asked.includes(p.id);
          return (
            <article key={it.id} className={`td-card${on ? " on" : ""}`}>
              <button type="button" className="td-hit" aria-pressed={on} aria-label={`${on ? "Unpick" : "Pick"} ${p.name}`} onClick={() => flip(it.id)} />
              <span className="td-rank">{n + 1}</span>
              <i className="td-tick" aria-hidden="true">{on && <Icon name="check" size={14} width={3.4} />}</i>
              {/* The photo and name open the product (owner, 29 Oct 2026); the rest of the card picks it. */}
              {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
              <img className="td-img td-open" src={p.img} alt="" onClick={() => router.push(productHref(p.id))} />
              <span className={`td-from${FROM[it.kind].cls}`}>
                <Icon name={FROM[it.kind].icon} size={12} />
                <span className="td-long">{it.kind === "rising" ? "Rising in your showcase" : it.kind === "best" ? `Best seller in ${p.category}` : "New · free sample"}</span>
                <span className="td-short">{FROM[it.kind].short} · {it.stat}</span>
              </span>
              <Link href={productHref(p.id)} className="td-name td-open">{p.name}</Link>
              <span className="td-why">{it.reason}</span>
              {it.week && <Trend points={it.week} label="Views, 7 days" sales={false} />}
              {it.sales && <Trend points={it.sales} label="Sales, 7 days" />}
              <span className="td-idea"><Icon name="video" size={13} /> {it.idea}</span>
              <span className="td-chips">
                <span className="ok"><Icon name="star" size={11} width={2.4} /> {p.rating.toFixed(1)}</span>
                {it.kind === "sample" && <span>Earn <Hidden>{rateFor(p).rate}%</Hidden></span>}
                {it.kind === "best" && <span>Earn <Hidden>{bestRate(p).rate}%</Hidden></span>}
                {it.kind === "sample" && <span>{SAMPLE_LEFT[p.id] ?? 10} samples left</span>}
              </span>
              {it.kind === "sample" && (
                <button
                  type="button"
                  className={isAsked ? "ai-btn ghost asked td-sample" : "ai-btn ghost td-sample"}
                  disabled={isAsked}
                  onClick={() => { if (!linked) return setLinked(true); requireWa(() => { setAsked((a) => [...a, p.id]); toast("Sample requested. Approval usually within 2 working days."); }); }}
                >
                  <Icon name={isAsked ? "check" : "gift"} size={14} /> {isAsked ? "Sample requested" : "Request sample"}
                </button>
              )}
            </article>
          );
        })}
      </div>

      {view === "cards" && <span className="td-dots" aria-hidden="true">{ideas.map((it, n) => <i key={it.id} className={n === at ? "on" : undefined} />)}</span>}

      <div className="td-bar" role="status">
        <span><b>{pick.length}</b> of {ideas.length} picked</span>
        <button type="button" className="np-btn" disabled={!pick.length} onClick={plan}>
          <Icon name="video" size={16} /> {pick.length ? `Plan ${pick.length} video${pick.length === 1 ? "" : "s"}` : "Pick a product"}
        </button>
      </div>
    </section>
  );
}

/** Where a best-seller list comes from (owner, 29 Oct 2026): the TikTok Shop market, or her own showcase. Same order for both. */
export type BestSource = "market" | "showcase";

/** One row of /api/v2/best (signed in). */
type LiveBest = {
  id: string; name: string; img: string | null; category: string | null; rating: number | null; sold: number; today: number | null;
  units7: number | null; units30: number | null; week: number[] | null; openRate: number | null; silverRate: number | null;
};
/** One best-seller row, the same for sample and real lists. */
type BestRow = { productId: string; name: string; img: string; category: string; rating: number | null; line: string; rate: number; points: number[] | null; pointsLabel: string };

/**
 * Best sellers (owner, 29 Oct 2026). Marketplace: public TikTok Shop products in her top categories that aren't in her showcase
 * yet, rated 4★+; + adds one to her showcase. Showcase: products already in her showcase; Plan a Video starts a post. Both are
 * ranked best-selling first (units sold this week). Tap a product to see it on Rezekii.
 */
export function NicheBest({ view: shape = "list", inFrame = false, source = "market" }: { view?: IdeasView; inFrame?: boolean; source?: BestSource }) {
  const { linked: demoLinked, setLinked, toast, live, me } = useDemo();
  const linked = live ? !!me?.shop : demoLinked;
  const mine = source === "showcase";
  const week = (id: string) => NICHE_BEST.find((b) => b.productId === id)?.weekSold ?? Math.round(product(id).sold / 26);

  // Signed in (owner, 31 Oct 2026): her real lists from /api/v2/best.
  const [real, setReal] = useState<{ linked: boolean; rows: LiveBest[]; at: string } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!live || !linked) return;
    let on = true;
    fetch(`/api/v2/best?source=${source}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (on) d ? setReal(d) : setFailed(true); })
      .catch(() => on && setFailed(true));
    return () => { on = false; };
  }, [live, linked, source]);

  const rows: BestRow[] = live
    ? (real?.rows ?? []).map((b) => ({
        productId: b.id, name: shortName(b.name), img: b.img ?? NO_PHOTO, category: b.category ?? "Other", rating: b.rating,
        line: mine
          ? `You sold ${b.units7 ?? 0} in 7 days${b.units30 ? ` · ${b.units30} in 30 days` : ""}`
          : `${short(b.sold)} sold${b.today ? ` · ${short(b.today)} today` : ""}`,
        rate: ((mine || me?.level === "bronze" ? b.openRate : b.silverRate ?? b.openRate) ?? 0) / 100,
        points: b.week, pointsLabel: "Your sales, 7 days",
      }))
    : (mine ? ON_IDS : NICHE_BEST.map((b) => b.productId).filter((id) => !ON_IDS.includes(id) && product(id).rating >= 4))
        .map((id) => ({ productId: id, weekSold: week(id), trend: NICHE_BEST.find((b) => b.productId === id)?.trend ?? ("flat" as Trend) }))
        .sort((x, y) => y.weekSold - x.weekSold)
        .map((b) => {
          const p = product(b.productId);
          return {
            productId: p.id, name: p.name, img: p.img, category: p.category, rating: p.rating,
            line: `${short(b.weekSold)} sold this week${mine && ON_SOLD30[p.id] ? ` · You sold ${ON_SOLD30[p.id]}` : ""}`,
            rate: Math.max(mine ? rateFor(p).rate : 0, bestRate(p).rate), points: daily(b.weekSold, b.trend), pointsLabel: "Sales, 7 days",
          };
        });
  // Short tab names so the row fits a phone: "Home & Kitchen" shows as "Home".
  const short1 = (c: string) => c.split(" & ")[0];
  const cats = ["All", ...Array.from(new Set(rows.map((b) => short1(b.category))))];
  const [cat, setCat] = useKept(`best-cat-${source}`, "All");
  const [added, setAdded] = useState<string[]>([]);
  const shown = rows.filter((b) => cat === "All" || short1(b.category) === cat);
  const { rail, at } = useRail<HTMLOListElement>(shape);
  const add = (b: BestRow) => {
    if (!linked) return setLinked(true);
    if (!live) {
      setAdded((a) => [...a, b.productId]);
      return toast("Added to your showcase");
    }
    // For real: straight into her TikTok Shop showcase, or a TAP link to open when TikTok asks for one.
    addOne(b.productId).then((r) => {
      if (r.added) {
        setAdded((a) => [...a, b.productId]);
        toast("Added to your showcase");
      } else if (r.link) window.open(r.link, "_blank", "noopener");
      else toast(r.error ?? "TikTok Shop didn't add it. Please try again.");
    });
  };
  return (
    <section className={inFrame ? "nb-box nb-in" : "v2-card nb-box"} aria-label={mine ? "Best sellers in your showcase" : "Best sellers in your niche"}>
      {/* The card's AI header sits above the tabs (owner, 29 Oct 2026: one AI label per card); each tab just says where it's from. */}
      {inFrame ? <p className="nb-src">{mine ? (live ? "Products in your showcase, by your sales this week" : "Products in your showcase") : live ? "Rezekii campaign products in your categories, not in your showcase yet" : "Live on TikTok Shop, not in your showcase yet"}</p> : <AiHead title={mine ? "Best Sellers in Your Showcase" : "Best Sellers on TikTok Shop"} sub="Best-selling first, updated daily" />}
      {live && real && <Updated at={real.at} />}
      {live && linked && !real && !failed && <p className="v2-muted" style={{ margin: 0 }}>Loading your list…</p>}
      {live && failed && <p className="v2-muted" style={{ margin: 0 }}>Couldn&apos;t load this list. Please try again later.</p>}
      {live && real && !real.rows.length && <p className="v2-muted" style={{ margin: 0 }}>{mine ? "Your showcase is empty. Add products from the Marketplace." : "No products in your categories right now. Check again tomorrow."}</p>}
      <div className="nb-cats" role="group" aria-label="Category">
        {cats.map((c) => <button key={c} type="button" className={`v2-chip${c === cat ? " on" : ""}`} aria-pressed={c === cat} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      <ol ref={rail} className={`nb-list ${shape}`} key={cat}>
        {shown.map((b) => {
          const on = added.includes(b.productId);
          return (
            <li key={b.productId}>
              <span className="nb-rank">{rows.indexOf(b) + 1}</span>
              <Link href={productHref(b.productId)} className="nb-view" aria-label={`View ${b.name}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.img} alt="" />
                <span className="nb-main">
                  <b>{b.name}</b>
                  <small>{b.line}{b.rate > 0 && <> · Earn <Hidden>{b.rate}%</Hidden></>}</small>
                  {b.rating !== null && <span className="nb-score"><Icon name="star" size={12} width={2.4} /> {b.rating.toFixed(1)}</span>}
                </span>
                {b.points && b.points.some((v) => v > 0) && <Trend points={b.points} label={b.pointsLabel} />}
              </Link>
              {mine ? (
                <Link href={`/app/publish?idea=${encodeURIComponent(`Show ${b.name}`)}`} className="nb-add" aria-label={`Plan a video for ${b.name}`}><Icon name="video" size={18} /></Link>
              ) : (
              <button type="button" className={`nb-add${on ? " on" : ""}`} disabled={on} aria-label={on ? `${b.name} is in your showcase` : `Add ${b.name} to your showcase`} onClick={() => add(b)}>
                <Icon name={on ? "check" : "plus"} size={18} />
              </button>
              )}
            </li>
          );
        })}
      </ol>
      {shape === "cards" && <span className="td-dots" aria-hidden="true">{shown.map((b, n) => <i key={b.productId} className={n === at ? "on" : undefined} />)}</span>}
    </section>
  );
}
