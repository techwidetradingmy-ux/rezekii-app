"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { AiMark, Hidden, Seg, Tip } from "@/components/ui";
import { ProductSheet } from "@/components/creator2/view-sheets";
import { product, short } from "@/lib/mock";
import { SAMPLE_LEFT } from "@/lib/mock-creator1";
import { NICHE_BEST, TRY_TODAY, VIRAL } from "@/lib/mock-creator2";

/** Drafts made from Today's Ideas wait here until the Content Calendar picks them up (preview only: this browser tab). */
export const IDEA_DRAFTS = "rz-idea-drafts";
export type IdeaDraft = { id: string; productId: string; idea: string };
const MAX = 5;

/** A tiny rising line from the last 7 days of views (oldest first). */
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
type Idea = { id: string; productId: string; kind: Kind; reason: string; stat: string; idea: string; week?: number[] };
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
export function ShootToday({ bare = false }: { bare?: boolean }) {
  const router = useRouter();
  const { linked, setLinked, toast, requireWa } = useDemo();
  const [pick, setPick] = useState<string[]>([]);
  const [asked, setAsked] = useState<string[]>([]);
  // 2 rising in her showcase, 2 of today's best sellers in her niche, 1 free sample (owner, 29 Oct 2026). All rated 4★+.
  const ok = (id: string) => product(id).rating >= 4;
  const ideas: Idea[] = [
    ...VIRAL.filter((v) => ok(v.productId)).slice(0, 2).map((v) => ({
      id: v.id, productId: v.productId, kind: "rising" as const, idea: v.ideas[0], week: v.week, stat: `+${(v.views24 / 1000).toFixed(1)}K views today`,
      reason: `+${(v.views24 / 1000).toFixed(1)}K views in 24h on “${v.title}” · ${v.ordersToday} sold today`,
    })),
    ...NICHE_BEST.filter((b) => ok(b.productId) && b.idea).slice(0, 2).map((b) => ({
      id: `b-${b.productId}`, productId: b.productId, kind: "best" as const, idea: b.idea!, stat: `${short(b.weekSold)} sold this week`,
      reason: `Top seller in ${product(b.productId).category} this week · ${short(b.weekSold)} sold`,
    })),
    ...TRY_TODAY.filter((t) => ok(t.productId)).slice(0, 1).map((t) => ({ id: `t-${t.productId}`, productId: t.productId, kind: "sample" as const, idea: t.idea, reason: t.why, stat: `${SAMPLE_LEFT[t.productId] ?? 10} left` })),
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
    <section className="v2-aicard st-box" aria-label="Today's Ideas">
      {!bare && <h2 className="v2-h2">Today&apos;s Ideas</h2>}
      <p className="td-lead">
        <b>{ideas.length} products to film today</b>
        <span className="td-ai">Updated daily by Rezekii AI <Tip label="How these are picked" text="Picked for you from your showcase, your sales and your niche. Best sellers come from TikTok Shop's public products and change every day. Each pick becomes a draft." /></span>
      </p>

      <div className="td-grid">
        {ideas.map((it, n) => {
          const p = product(it.productId);
          const on = pick.includes(it.id);
          const isAsked = asked.includes(p.id);
          return (
            <article key={it.id} className={`td-card${on ? " on" : ""}`}>
              <button type="button" className="td-hit" aria-pressed={on} aria-label={`${on ? "Unpick" : "Pick"} ${p.name}`} onClick={() => flip(it.id)} />
              <span className="td-rank">{n + 1}</span>
              <i className="td-tick" aria-hidden="true">{on && <Icon name="check" size={14} width={3.4} />}</i>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="td-img" src={p.img} alt="" />
              <span className={`td-from${FROM[it.kind].cls}`}>
                <Icon name={FROM[it.kind].icon} size={12} />
                <span className="td-long">{it.kind === "rising" ? "Rising in your showcase" : it.kind === "best" ? `Best seller in ${p.category}` : "New · free sample"}</span>
                <span className="td-short">{FROM[it.kind].short} · {it.stat}</span>
              </span>
              <b className="td-name">{p.name}</b>
              <span className="td-why">{it.reason}</span>
              {it.week && <Spark points={it.week} />}
              <span className="td-idea"><Icon name="video" size={13} /> {it.idea}</span>
              <span className="td-chips">
                <span className="ok"><Icon name="star" size={11} width={2.4} /> {p.rating.toFixed(1)}</span>
                {it.kind === "sample" && <span>Earn <Hidden>{p.tapRate}%</Hidden></span>}
                {it.kind === "best" && <span>Earn <Hidden>{p.publicRate}%</Hidden></span>}
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

      <div className="td-bar" role="status">
        <span><b>{pick.length}</b> of {ideas.length} picked</span>
        <button type="button" className="np-btn" disabled={!pick.length} onClick={plan}>
          <Icon name="video" size={16} /> {pick.length ? `Plan ${pick.length} video${pick.length === 1 ? "" : "s"}` : "Pick a product"}
        </button>
      </div>
    </section>
  );
}

/**
 * Best sellers in her niche (owner, 29 Oct 2026): public TikTok Shop products in her top categories, ranked by units sold this
 * week, rated 4★+ and not in her showcase yet. Changes daily. Tap a product to see it on Rezekii; + adds it to her showcase.
 */
export function NicheBest() {
  const { linked, setLinked, toast } = useDemo();
  const rows = NICHE_BEST.filter((b) => product(b.productId).rating >= 4).sort((a, b) => b.weekSold - a.weekSold);
  const cats = ["All", ...Array.from(new Set(rows.map((b) => product(b.productId).category)))];
  const [cat, setCat] = useState("All");
  const [added, setAdded] = useState<string[]>([]);
  const [view, setView] = useState<string | null>(null);
  const shown = rows.filter((b) => cat === "All" || product(b.productId).category === cat);
  return (
    <section className="v2-card nb-box" aria-label="Best sellers in your niche">
      <div className="nb-head">
        <AiMark size={34} />
        <span>
          <h2 className="v2-h2">Best sellers in your niche</h2>
          <span className="td-ai">Updated daily by Rezekii AI <Tip label="How this list is made" text="Public TikTok Shop products in your top categories, ranked by units sold this week. Rated 4★ and up, and not in your showcase yet." /></span>
        </span>
      </div>
      <Seg value={cat} options={cats} onChange={setCat} />
      <ol className="nb-list">
        {shown.map((b) => {
          const p = product(b.productId);
          const on = added.includes(p.id);
          return (
            <li key={p.id}>
              <span className="nb-rank">{rows.indexOf(b) + 1}</span>
              <button type="button" className="nb-view" onClick={() => setView(p.id)} aria-label={`View ${p.name}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt="" />
                <span className="nb-main">
                  <b>{p.name}</b>
                  <small>{short(b.weekSold)} sold this week · {p.rating.toFixed(1)}★ · Earn <Hidden>{p.publicRate}%</Hidden></small>
                </span>
              </button>
              <button type="button" className={`nb-add${on ? " on" : ""}`} disabled={on} aria-label={on ? `${p.name} is in your showcase` : `Add ${p.name} to your showcase`} onClick={() => { if (!linked) return setLinked(true); setAdded((a) => [...a, p.id]); toast("Added to your showcase"); }}>
                <Icon name={on ? "check" : "plus"} size={18} />
              </button>
            </li>
          );
        })}
      </ol>
      {view && <ProductSheet productId={view} onClose={() => setView(null)} />}
    </section>
  );
}
