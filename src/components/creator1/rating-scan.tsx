"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Count, Flow, Lock, RemoveWarn } from "@/components/ui";
import { CREATOR, PRODUCTS, rm } from "@/lib/mock";
import { productHref } from "@/lib/product-view";
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
  const router = useRouter();
  const { linked, setLinked, toast, live: signedIn } = useDemo();
  const [run, setRun] = useState(0);
  const [scanning, setScanning] = useState(true);
  const [removed, setRemoved] = useState<string[]>([]);
  // Signed in (owner, 31 Oct 2026): TikTok's buyer ratings for every product in her showcase, and her own orders for them.
  type Flag = { id: string; name: string; img: string | null; rating: number; orders: number; cancel: number; returned: number };
  const [real, setReal] = useState<{ linked: boolean; total: number; checked: number; more?: boolean; flagged: Flag[]; at: string } | null>(null);

  useEffect(() => {
    setScanning(true);
    if (signedIn) {
      fetch(`/api/v2/ratings${run ? "?fresh=1" : ""}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d) setReal(d); })
        .catch(() => toast("Couldn't check ratings. Please try again."))
        .finally(() => setScanning(false));
      return;
    }
    const t = window.setTimeout(() => setScanning(false), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : SCAN_MS);
    return () => window.clearTimeout(t);
  }, [run, signedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const realFlags = real?.flagged.map((f) => ({ ...f, img: f.img ?? "" })) ?? [];
  const seen = (id: string) => (real ? realFlags.find((f) => f.id === id) : SEEN[id]) ?? { orders: 0, cancel: 0, returned: 0 };
  const flagged: { id: string; name: string; img: string; rating: number }[] = real ? realFlags : FLAGGED;
  const live = flagged.filter((p) => !removed.includes(p.id));
  const danger = live.filter((p) => p.rating < DANGER);
  const low = live.filter((p) => p.rating >= DANGER);
  const healthy = real ? Math.max(0, real.checked - real.flagged.length) : CREATOR.showcaseSize - FLAGGED.length;
  const checkedAt = real ? new Date(real.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" }) : "09:12";
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

  const row = (p: { id: string; name: string; img: string; rating: number }) => {
    const s = seen(p.id);
    const bad = p.rating < DANGER;
    return (
      <li key={p.id} className={bad ? "danger" : "low"}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
        <img className="pv-open" src={p.img} alt="" onClick={() => router.push(productHref(p.id))} />
        <span className="rc-name">
          <b><Link href={productHref(p.id)} className="pv-open">{p.name}</Link></b>
          <small className={s.cancel > 10 ? "rc-bad" : undefined}>{s.cancel}% cancelled</small>
        </span>
        <span className="rc-stars" aria-label={`${p.rating.toFixed(1)} stars`}>
          <Icon name="star" size={14} width={2.4} /> {p.rating.toFixed(1)}
        </span>
        {/* TikTok has no way for apps to take a product out of a showcase, so real accounts do it in TikTok. */}
        {real ? <small className="v2-small">Remove in TikTok</small> : <button type="button" className={bad ? "np-btn v2-btn-sm" : "btn-outline v2-btn-sm"} onClick={() => remove([p.id])}>Remove</button>}
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
            <span className="sh-kicker"><i />{scanning ? "Checking ratings…" : `Rating check · today ${checkedAt}`}</span>
            <h2><b><Count key={`${run}-${real?.total ?? 0}`} value={real ? real.total : CREATOR.showcaseSize} ms={SCAN_MS - 200} /></b> products checked</h2>
            {real?.more && <small className="v2-small">The first {real.total} in your showcase</small>}
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
            {danger.length > 0 && real ? (
              <span className="sh-clear"><Icon name="alert" size={16} /> Remove {danger.length} danger product{danger.length === 1 ? "" : "s"} in the TikTok Shop app</span>
            ) : danger.length > 0 ? (
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
      {ask && <RemoveWarn items={ask.map((id) => flagged.find((p) => p.id === id)!).filter(Boolean).map((p) => ({ id: p.id, name: p.name, img: p.img }))} onConfirm={confirmRemove} onClose={() => setAsk(null)} />}
      {real && !real.linked && <p className="v2-muted" style={{ margin: 0 }}>Link TikTok Shop to check your showcase ratings.</p>}
    </>
  );
}
