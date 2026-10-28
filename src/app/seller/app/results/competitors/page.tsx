"use client";

import "@/app/seller.css";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Seg, Title } from "@/components/ui";
import { Ava } from "@/components/seller/seller-ui";
import { COMP_AI, COMP_CATEGORIES, COMP_CREATORS, COMP_PRODUCTS, COMP_VIDEOS, PERIODS, type CompCategory, type Period } from "@/lib/mock-seller";

const SOON = "Creator invitations open when our creator pool is bigger";
/** Rough scale so the three periods don't show identical ranges. */
const TREND_K: Record<Period, number> = { "1 day": 0.4, "7 days": 1, "30 days": 1.6 };

/** AI competitor analysis from TikTok's public best-seller lists, for the categories this shop sells in. */
export default function Competitors() {
  const { toast } = useDemo();
  const [cat, setCat] = useState<CompCategory>("Home & Kitchen");
  const [period, setPeriod] = useState<Period>("7 days");
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    setScanning(true);
    const t = window.setTimeout(() => setScanning(false), 1100);
    return () => window.clearTimeout(t);
  }, [cat, period]);

  const prods = COMP_PRODUCTS[cat];
  const vids = COMP_VIDEOS[cat];
  const creators = COMP_CREATORS[cat];

  return (
    <div className="v2-stack v2-in">
      <Title title="AI Competitors" sub="What's selling in your categories on TikTok Shop Malaysia, and who's selling it." />

      <div className="v2-stack" style={{ gap: 10 }}>
        <div className="sl-chipline" role="group" aria-label="Category">
          {COMP_CATEGORIES.map((c) => (
            <button key={c} type="button" className={`v2-chip ${cat === c ? "on" : ""}`} onClick={() => setCat(c)}>{c}</button>
          ))}
        </div>
        <span className="v2-small">Categories picked from your shop&apos;s products.</span>
        <Seg value={period} options={PERIODS} onChange={setPeriod} />
      </div>

      {scanning ? (
        <section className="v2-card">
          <div className="sl-scanning">
            <div className="sl-radar">
              <i style={{ left: "28%", top: "30%", animationDelay: "0.3s" }} />
              <i style={{ left: "66%", top: "44%", animationDelay: "0.6s" }} />
              <i style={{ left: "44%", top: "70%", animationDelay: "0.85s" }} />
            </div>
            Reading TikTok&apos;s best-seller lists for {cat} · {period}…
          </div>
        </section>
      ) : (
        <div className="v2-stack sl-reveal" key={`${cat}-${period}`}>
          <section className="sl-ai">
            <Icon name="spark" size={20} />
            <span><b>What the AI sees · </b>{COMP_AI[cat]}</span>
          </section>

          <section className="v2-card">
            <div className="v2-card-h"><h2 className="v2-h2">Trending products</h2><span className="v2-small">{cat} · {period}</span></div>
            <div className="sl-reveal">
              {prods.map((p, i) => {
                const t = Math.round(p.trend * TREND_K[period]);
                return (
                  <div key={p.name} className="sl-rank">
                    <b>{i + 1}</b>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.img} alt="" />
                    <span className="sl-pinfo">
                      <strong>{p.name}</strong>
                      <small>{p.shop} · sold {p.sold} · GMV {p.gmv}</small>
                      {p.yours && <span className="v2-row"><span className="badge">Yours</span></span>}
                    </span>
                    <span className="sl-pside">
                      <span className={`sl-trend ${t >= 0 ? "up" : "down"}`}>{t >= 0 ? "+" : ""}{t}%</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="v2-card">
            <div className="v2-card-h"><h2 className="v2-h2">Top videos</h2><span className="v2-small">Most sales from one video</span></div>
            <div className="sl-vgrid sl-reveal">
              {vids.map((v) => (
                <button key={v.title} type="button" className="sl-vid" onClick={() => toast(`Opening ${v.handle}'s video on TikTok`)}>
                  <span className="sl-poster">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.img} alt="" />
                    <span className="sl-play"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor" /></svg></span>
                    <span><Icon name="eye" size={14} /> {v.views} views</span>
                  </span>
                  <b>{v.title}</b>
                  <small>{v.handle} · sold {v.sold}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="v2-card">
            <div className="v2-card-h">
              <h2 className="v2-h2">Top creators in {cat}</h2>
              <button type="button" className="np-btn v2-btn-sm" onClick={() => toast(SOON)}><Icon name="users" size={16} /> Invite these creators</button>
            </div>
            <div className="sl-reveal">
              {creators.map((c) => (
                <div key={c.handle} className="sl-dest">
                  <Ava name={c.handle} lg />
                  <span>
                    <b>{c.handle}</b>
                    <small>{c.note} · {c.followers} followers</small>
                    <small>Sold {c.sold} units in {cat} · {c.videos} videos</small>
                  </span>
                  <span className="sl-pside">
                    {c.note.startsWith("Already") ? <span className="badge">Sells for you</span> : <button type="button" className="btn-outline" style={{ height: 36, fontSize: 13.5 }} onClick={() => toast(SOON)}>Invite</button>}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <p className="v2-small" style={{ margin: 0 }}>From TikTok&apos;s public best-seller lists, updated daily, last at 06:00 today. TikTok only shows the top 100, and sales and GMV as ranges.</p>
        </div>
      )}
    </div>
  );
}
