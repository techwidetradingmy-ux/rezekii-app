"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { AiMark, Hidden } from "@/components/ui";
import { PoolTag } from "@/components/creator1/brand";
import { product } from "@/lib/mock";
import { SAMPLE_LEFT, type Pool } from "@/lib/mock-creator1";
import { TRY_TODAY, VIRAL } from "@/lib/mock-creator2";

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

/**
 * Today's plan on Home: three products from the creator's showcase whose videos are taking off right now (selling and rated 4★+),
 * and three new products from the marketplace with a free sample she can get. A rising video on a low-rated product is skipped,
 * with the reason.
 */
export function ShootToday({ bare = false }: { bare?: boolean }) {
  const { linked, setLinked, toast, requireWa } = useDemo();
  const [asked, setAsked] = useState<string[]>([]);
  const [added, setAdded] = useState<string[]>([]);
  const mine = VIRAL.filter((v) => product(v.productId).rating >= 4).slice(0, 3);
  const skip = VIRAL.filter((v) => product(v.productId).rating < 4);

  return (
    <section className="v2-aicard st-box" aria-label="Today's plan">
      {!bare && <div className="ai-head">
        <AiMark size={44} />
        <span>
          <span className="v2-ailabel">Today&apos;s plan</span>
          <h2>Today&apos;s Ideas</h2>
          <small>Worked out this morning from your videos, your sales, ratings and the marketplace</small>
        </span>
      </div>}

      <h3 className="st-h">
        <Icon name="flame" size={16} /> From your showcase <em>taking off right now</em>
      </h3>
      <div className="st-grid">
        {mine.map((v) => {
          const p = product(v.productId);
          return (
            <article key={v.id} className="st-item">
              <span className="st-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt="" />
                <span className="st-hot"><Icon name="flame" size={11} /> {v.times}×</span>
              </span>
              <span className="st-body">
                <b>{p.name}</b>
                <span className="st-views">+{(v.views24 / 1000).toFixed(1)}K views in 24h on &ldquo;{v.title}&rdquo;</span>
                <Spark points={v.week} />
                <span className="st-chips">
                  <span className="ok"><Icon name="star" size={11} width={2.4} /> {p.rating.toFixed(1)}</span>
                  <span>{v.ordersToday} sold today</span>
                </span>
                <span className="st-idea"><Icon name="video" size={12} /> {v.ideas[0]}</span>
              </span>
              <Link href="/app/publish" className="np-btn v2-btn-sm st-cta">Plan video</Link>
            </article>
          );
        })}
      </div>

      <h3 className="st-h">
        <Icon name="gift" size={16} /> New from the marketplace <em>free sample, rated 4★+</em>
      </h3>
      <div className="st-grid">
        {TRY_TODAY.map((t) => {
          const p = product(t.productId);
          const isAsked = asked.includes(p.id);
          const isAdded = added.includes(p.id);
          return (
            <article key={p.id} className="st-item">
              <span className="st-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt="" />
                <PoolTag pool={p.samples as Pool} label={false} />
              </span>
              <span className="st-body">
                <b>{p.name}</b>
                <span className="st-why">{t.why}</span>
                <span className="st-chips">
                  <span className="ok"><Icon name="star" size={11} width={2.4} /> {p.rating.toFixed(1)}</span>
                  <span>Earn <Hidden>{p.tapRate}%</Hidden></span>
                  <span>{SAMPLE_LEFT[p.id] ?? 10} samples left</span>
                </span>
              </span>
              <span className="st-two">
                <button
                  type="button"
                  className={isAsked ? "ai-btn done" : "ai-btn"}
                  disabled={isAsked}
                  onClick={() => { if (!linked) return setLinked(true); requireWa(() => { setAsked((a) => [...a, p.id]); toast("Sample requested. The Techwide team approves it, usually within 2 working days."); }); }}
                >
                  <Icon name={isAsked ? "check" : "gift"} size={14} /> {isAsked ? "Requested" : "Free sample"}
                </button>
                <button
                  type="button"
                  className={isAdded ? "ai-btn ghost asked" : "ai-btn ghost"}
                  disabled={isAdded}
                  onClick={() => { if (!linked) return setLinked(true); setAdded((a) => [...a, p.id]); toast(`Added to your showcase at ${p.tapRate}%`); }}
                >
                  <Icon name={isAdded ? "check" : "plus"} size={14} /> {isAdded ? "Added" : "Showcase"}
                </button>
              </span>
            </article>
          );
        })}
      </div>

      {skip.map((v) => (
        <p key={v.id} className="st-skip">
          <Icon name="alert" size={15} /> &ldquo;{v.title}&rdquo; is rising too (+{(v.views24 / 1000).toFixed(1)}K), but we don&apos;t suggest more: the product is rated {product(v.productId).rating.toFixed(1)}★.
        </p>
      ))}
    </section>
  );
}
