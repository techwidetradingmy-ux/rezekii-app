"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { Lock } from "@/components/ui";
import { ANALYTICS, RAISES, product, rm } from "@/lib/mock";
import { PREV_ORDERS, VIDEOS } from "@/lib/mock-creator2";
import "@/app/creator2.css";

/** Performance by product: what it earned, how it's trending, its rating, and which video sold it most. */
export function ProductList() {
  const total = ANALYTICS.commissionEst;
  const rows = [...ANALYTICS.byProduct].sort((a, b) => b.commission - a.commission);
  const top = rows[0];
  const topShare = Math.round((top.commission / total) * 100);

  return (
    <div className="v2-stack" style={{ gap: 20 }}>

      {topShare >= 35 && (
        <div className="v2-alert">
          <span>
            {topShare}% of your commission comes from the {product(top.productId).name.toLowerCase()}. Add 1–2 strong products to
            spread the risk.
          </span>
          <Link href="/app/data/performance#ai">See AI picks</Link>
        </div>
      )}

      <Lock what="what each product earned">
        <div className="cr2-list">
          {rows.map((b, i) => {
            const p = product(b.productId);
            const share = Math.round((b.commission / total) * 100);
            const prev = PREV_ORDERS[b.productId] ?? b.orders;
            const change = Math.round(((b.orders - prev) / prev) * 100);
            const dropping = change <= -20;
            const lowRated = p.rating < 3;
            const highCancel = b.cancel > 15;
            const vids = VIDEOS.filter((v) => v.productId === b.productId).sort((x, y) => y.orders - x.orders);
            const raise = RAISES.find((r) => r.productId === b.productId && r.eligible);
            return (
              <article key={b.productId} className="v2-card" style={{ gap: 14 }}>
                <div className="cr2-vhead">
                  <span className="cr2-thumb sq">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.img} alt="" />
                  </span>
                  <span>
                    <strong>{p.name}</strong>
                    <small>{p.shop}</small>
                    <span className="cr2-tags">
                      {i === 0 && <span className="badge">Top earner</span>}
                      {dropping && <span className="badge badge-amber">Sales dropping · {change}% orders</span>}
                      {!dropping && change > 0 && <span className="badge badge-gray">Orders up {change}%</span>}
                      {lowRated && <span className="badge badge-red">Low rating</span>}
                      {highCancel && <span className="badge badge-red">High cancel rate</span>}
                    </span>
                  </span>
                  <span className="v2-num" style={{ fontWeight: 900, fontSize: 18 }}>{rm(b.commission)}</span>
                </div>

                <div className="cr2-share">
                  <span className="v2-meter"><i style={{ width: `${share}%`, animationDelay: `${i * 60}ms` }} /></span>
                  <b>{share}%</b>
                </div>
                <span className="v2-small" style={{ marginTop: -8 }}>Share of your income</span>

                <div className="cr2-mini">
                  <span><small>Orders</small><b>{b.orders}</b></span>
                  <span><small>Cancel rate</small><b className={highCancel ? "cr2-red" : undefined}>{b.cancel}%</b></span>
                  <span><small>Rating</small><b className={lowRated ? "cr2-red" : undefined}>{p.rating.toFixed(1)} / 5</b></span>
                </div>

                {vids[0] && (
                  <p className="cr2-note" style={{ color: "var(--body)" }}>
                    <Icon name="video" size={15} />
                    <span>Top video: <b>&ldquo;{vids[0].title}&rdquo;</b> ({vids[0].date}), {vids[0].orders} of {b.orders} orders.</span>
                  </p>
                )}
                {dropping && <p className="cr2-note"><Icon name="alert" size={15} /><span>{prev} orders the 30 days before, {b.orders} now. Try a fresh video.</span></p>}
                {lowRated && <p className="cr2-note"><Icon name="star" size={15} /><span>Rated below 3.0. This can hurt buyer trust.</span></p>}

                {raise && (
                  <Link href="/app#scan" className="cr2-uprate">
                    <span>Better rate available</span>
                    <b>{raise.nowRate === null ? "?" : `${raise.nowRate}%`} → {raise.tapRate}%</b>
                    <Icon name="arrow" size={16} />
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      </Lock>

      <p className="cr2-note">
        <Icon name="wallet" size={15} />
        <span>Commission is estimated until each order settles.</span>
      </p>
    </div>
  );
}
