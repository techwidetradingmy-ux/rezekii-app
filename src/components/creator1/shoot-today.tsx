"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Hidden } from "@/components/ui";
import { product } from "@/lib/mock";
import { SAMPLE_LEFT } from "@/lib/mock-creator1";
import { TRY_TODAY, VIRAL } from "@/lib/mock-creator2";

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

type Idea = { id: string; productId: string; market: boolean; reason: string; idea: string; week?: number[] };

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
  const ideas: Idea[] = [
    ...VIRAL.filter((v) => product(v.productId).rating >= 4).map((v) => ({
      id: v.id, productId: v.productId, market: false, idea: v.ideas[0], week: v.week,
      reason: `+${(v.views24 / 1000).toFixed(1)}K views in 24h on “${v.title}” · ${v.ordersToday} sold today`,
    })),
    ...TRY_TODAY.filter((t) => product(t.productId).rating >= 4).map((t) => ({ id: `t-${t.productId}`, productId: t.productId, market: true, idea: t.idea, reason: t.why })),
  ].slice(0, MAX);
  const skip = VIRAL.filter((v) => product(v.productId).rating < 4);
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
    const added = chosen.filter((i) => i.market).length;
    toast(`${chosen.length} draft${chosen.length === 1 ? "" : "s"} saved in your Content Calendar${added ? `, ${added} product${added === 1 ? "" : "s"} added to your showcase` : ""}. Opening the first one.`);
    router.push(`/app/publish?idea=${encodeURIComponent(chosen[0].idea)}`);
  }

  return (
    <section className="v2-aicard st-box" aria-label="Today's Ideas">
      {!bare && <h2 className="v2-h2">Today&apos;s Ideas</h2>}
      <p className="td-lead">
        <b>{ideas.length} products to film today</b>
        <span>Pick the ones you like. Each becomes a draft, ready for your video.</span>
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
              <span className={`td-from${it.market ? " new" : ""}`}>
                <Icon name={it.market ? "gift" : "flame"} size={12} /> {it.market ? "New · free sample" : "Taking off in your showcase"}
              </span>
              <b className="td-name">{p.name}</b>
              <span className="td-why">{it.reason}</span>
              {it.week && <Spark points={it.week} />}
              <span className="td-idea"><Icon name="video" size={13} /> {it.idea}</span>
              <span className="td-chips">
                <span className="ok"><Icon name="star" size={11} width={2.4} /> {p.rating.toFixed(1)}</span>
                {it.market && <span>Earn <Hidden>{p.tapRate}%</Hidden></span>}
                {it.market && <span>{SAMPLE_LEFT[p.id] ?? 10} samples left</span>}
              </span>
              {it.market && (
                <button
                  type="button"
                  className={isAsked ? "ai-btn ghost asked td-sample" : "ai-btn ghost td-sample"}
                  disabled={isAsked}
                  onClick={() => { if (!linked) return setLinked(true); requireWa(() => { setAsked((a) => [...a, p.id]); toast("Sample requested. The Techwide team approves it, usually within 2 working days."); }); }}
                >
                  <Icon name={isAsked ? "check" : "gift"} size={14} /> {isAsked ? "Sample requested" : "Get a free sample"}
                </button>
              )}
            </article>
          );
        })}
      </div>

      {skip.map((v) => (
        <p key={v.id} className="st-skip">
          <Icon name="alert" size={15} /> &ldquo;{v.title}&rdquo; is rising too (+{(v.views24 / 1000).toFixed(1)}K), but we don&apos;t suggest more: the product is rated {product(v.productId).rating.toFixed(1)}★.
        </p>
      ))}

      <div className="td-bar" role="status">
        <span><b>{pick.length}</b> of {ideas.length} picked</span>
        <button type="button" className="np-btn" disabled={!pick.length} onClick={plan}>
          <Icon name="video" size={16} /> {pick.length ? `Plan ${pick.length} video${pick.length === 1 ? "" : "s"}` : "Pick a product"}
        </button>
      </div>
    </section>
  );
}
