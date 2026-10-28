"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Count, Flow, Lock, RemoveWarn } from "@/components/ui";
import { CREATOR, PRODUCTS, rm } from "@/lib/mock";
import "@/app/creator1.css";

/** Under 4 stars is low; under 3 is the danger zone. */
const LOW = 4;
const DANGER = 3;
/** Her orders for each low-rated product in the showcase (last 30 days, from TikTok): how many, and how many were cancelled or returned. */
const SEEN: Record<string, { orders: number; cancel: number; returned: number }> = {
  p17: { orders: 70, cancel: 21.4, returned: 6 },
  p22: { orders: 96, cancel: 17.7, returned: 4 },
  p23: { orders: 12, cancel: 8.3, returned: 1 },
  p19: { orders: 9, cancel: 11.1, returned: 0 },
  p04: { orders: 18, cancel: 5.6, returned: 1 },
};
export const FLAGGED = PRODUCTS.filter((p) => p.rating < LOW && SEEN[p.id]).sort((a, b) => a.rating - b.rating);
const SCAN_MS = 2600;

/**
 * Rating check: scans every product in the showcase for buyer ratings. Under 4 stars is low, under 3 is the danger zone that
 * costs account health; danger products can leave the showcase in one tap. Old videos stay as they are.
 */
export function RatingScan() {
  const { linked, setLinked, toast } = useDemo();
  const [run, setRun] = useState(0);
  const [scanning, setScanning] = useState(true);
  const [removed, setRemoved] = useState<string[]>([]);

  useEffect(() => {
    setScanning(true);
    const t = window.setTimeout(() => setScanning(false), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : SCAN_MS);
    return () => window.clearTimeout(t);
  }, [run]);

  const live = FLAGGED.filter((p) => !removed.includes(p.id));
  const danger = live.filter((p) => p.rating < DANGER);
  const low = live.filter((p) => p.rating >= DANGER);
  const healthy = CREATOR.showcaseSize - FLAGGED.length;
  // Removing asks first: she sees the risk and confirms (owner, 28 Oct 2026).
  const [ask, setAsk] = useState<string[] | null>(null);
  const remove = (ids: string[]) => {
    if (!linked) return setLinked(true);
    setAsk(ids);
  };
  const confirmRemove = () => {
    if (!ask) return;
    setRemoved((r) => [...r, ...ask]);
    toast(ask.length > 1 ? `${ask.length} products removed from your showcase` : "Removed from your showcase");
    setAsk(null);
  };

  const row = (p: (typeof PRODUCTS)[number]) => {
    const s = SEEN[p.id];
    const bad = p.rating < DANGER;
    return (
      <li key={p.id} className={bad ? "danger" : "low"}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.img} alt="" />
        <span className="rc-name">
          <b>{p.name}</b>
          <small className={s.cancel > 10 ? "rc-bad" : undefined}>{s.cancel}% cancelled</small>
        </span>
        <span className="rc-stars" aria-label={`${p.rating.toFixed(1)} stars`}>
          <Icon name="star" size={14} width={2.4} /> {p.rating.toFixed(1)}
        </span>
        <button type="button" className={bad ? "np-btn v2-btn-sm" : "btn-outline v2-btn-sm"} onClick={() => remove([p.id])}>Remove</button>
      </li>
    );
  };

  return (
    <>

      <section className="v2-card tight sh-howcard">
        <span className="sh-howlbl">How the rating check works</span>
        <Flow
          label="How the rating check works"
          steps={[
            { icon: "scan", title: "We scan ratings" },
            { icon: "star", title: "Under 4★: low" },
            { icon: "alert", title: "Under 3★: danger", tone: "red" },
            { icon: "check", title: "Avoid them" },
          ]}
        />
      </section>

      <Lock what="your product ratings">
        <section className={`sh-hub rc-hub ${scanning ? "busy" : ""}`} aria-label="Rating check">
          <span className="sh-grid" aria-hidden="true" />
          <div className="sh-left">
            <span className="sh-kicker"><i />{scanning ? "Checking ratings…" : "Rating check · today 09:12"}</span>
            <h2><b><Count key={run} value={CREATOR.showcaseSize} ms={SCAN_MS - 200} /></b> products checked</h2>
          </div>
          <div className="rc-bar" role="img" aria-label={`${healthy} healthy, ${low.length} low, ${danger.length} in the danger zone`}>
            <i className="ok" style={{ flexGrow: healthy }} />
            <i className="low" style={{ flexGrow: Math.max(low.length, 0.001) * 60 }} />
            <i className="bad" style={{ flexGrow: Math.max(danger.length, 0.001) * 60 }} />
          </div>
          <div className="rc-bands">
            <span className="ok"><b>{scanning ? "…" : healthy.toLocaleString("en-MY")}</b><small>4★ and up · fine</small></span>
            <span className="low"><b>{scanning ? "…" : low.length}</b><small>3–3.9★ · low</small></span>
            <span className="bad"><b>{scanning ? "…" : danger.length}</b><small>Under 3★ · danger zone</small></span>
          </div>
          <div className="sh-acts">
            {danger.length > 0 ? (
              <button type="button" className="sh-go rc-go" disabled={scanning} onClick={() => remove(danger.map((p) => p.id))}>
                <Icon name="x" size={17} width={2.6} /> Remove {danger.length} danger product{danger.length === 1 ? "" : "s"}
              </button>
            ) : (
              <span className="sh-clear"><Icon name="check" size={16} width={3} /> No danger products</span>
            )}
            <button type="button" className="sh-again" disabled={scanning} onClick={() => setRun((r) => r + 1)}><Icon name="refresh" size={16} /> Check again</button>
          </div>
        </section>
      </Lock>

      {!scanning && danger.length > 0 && (
        <section className="v2-card rc-list">
          <div className="v2-card-h">
            <h2 className="v2-h2"><span className="rc-dot bad" /> Danger zone · under 3★</h2>
            <span className="badge badge-red">{danger.length}</span>
          </div>
          <p className="v2-small" style={{ margin: 0 }}>Avoid these. They can lower your TikTok account health.</p>
          <ul>{danger.map(row)}</ul>
        </section>
      )}
      {!scanning && low.length > 0 && (
        <section className="v2-card rc-list">
          <div className="v2-card-h">
            <h2 className="v2-h2"><span className="rc-dot low" /> Low · 3 to 3.9★</h2>
            <span className="badge badge-amber">{low.length}</span>
          </div>
          <p className="v2-small" style={{ margin: 0 }}>Pick a 4★ product instead when you can.</p>
          <ul>{low.map(row)}</ul>
        </section>
      )}
      {ask && <RemoveWarn items={ask.map((id) => PRODUCTS.find((p) => p.id === id)!).map((p) => ({ id: p.id, name: p.name, img: p.img }))} onConfirm={confirmRemove} onClose={() => setAsk(null)} />}
    </>
  );
}
