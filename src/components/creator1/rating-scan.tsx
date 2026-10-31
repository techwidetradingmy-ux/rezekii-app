"use client";

import Link from "next/link";
import { updatedWhen } from "@/components/data-note";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Count, Flow, Lock, RemoveWarn } from "@/components/ui";
import { removeFromShowcase } from "@/lib/live";
import { CREATOR, PRODUCTS } from "@/lib/mock";
import { productHref } from "@/lib/product-view";
import { NO_PHOTO, shortName } from "@/lib/live-perf";
import "@/app/creator1.css";

/**
 * Three levels of low rating (owner, 31 Oct 2026): heavily low under 3.0, low under 3.5, slightly low under 4.0.
 */
type Level = "heavy" | "low" | "slight";
const levelOf = (r: number): Level => (r < 3 ? "heavy" : r < 3.5 ? "low" : "slight");
const LEVELS: { key: Level; title: string; range: string; note: string; dot: string; badge: string }[] = [
  { key: "heavy", title: "Heavily low", range: "under 3.0★", note: "Most likely to hurt your account health. Consider removing them.", dot: "bad", badge: "badge-red" },
  { key: "low", title: "Low", range: "3.0 to 3.4★", note: "Buyers are often unhappy with these. Pick a 4★ product instead when you can.", dot: "mid", badge: "badge-amber" },
  { key: "slight", title: "Slightly low", range: "3.5 to 3.9★", note: "Keep an eye on these.", dot: "low", badge: "badge-gray" },
];
/** Her orders for each low-rated product in the showcase (last 30 days, from TikTok): how many, and how many were cancelled or returned. */
const SEEN: Record<string, { orders: number; cancel: number; returned: number }> = {
  p17: { orders: 70, cancel: 21.4, returned: 6 },
  p22: { orders: 96, cancel: 17.7, returned: 4 },
  p23: { orders: 12, cancel: 8.3, returned: 1 },
  p19: { orders: 9, cancel: 11.1, returned: 0 },
  p04: { orders: 18, cancel: 5.6, returned: 1 },
};
export const FLAGGED = PRODUCTS.filter((p) => p.rating < 4 && SEEN[p.id]).sort((a, b) => a.rating - b.rating);
const SCAN_MS = 2600;

type Video = { id: string; title: string | null; cover: string | null; url: string; orders: number; gmv: number };
type Flag = { id: string; name: string; img: string; rating: number; reviews?: number; orders: number; cancel: number; returned: number; videos?: Video[] };

/**
 * Showcase health check (owner, 31 Oct 2026): like a check-up for her TikTok Shop account. Every product in her showcase is
 * checked for its buyer rating and sorted into three levels; she removes them one by one, the ones she picks, or a whole level,
 * or keeps them. Her videos that sold these products are listed too, to open in TikTok. She decides, and confirms first.
 */
export function RatingScan() {
  const router = useRouter();
  const { linked, setLinked, toast, live: signedIn } = useDemo();
  const [run, setRun] = useState(0);
  const [scanning, setScanning] = useState(true);
  const [removed, setRemoved] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [real, setReal] = useState<{ linked: boolean; total: number; checked: number; more?: boolean; flagged: (Omit<Flag, "img"> & { img: string | null })[]; at: string } | null>(null);

  useEffect(() => {
    setScanning(true);
    if (signedIn) {
      fetch(`/api/v2/ratings${run ? "?fresh=1" : ""}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d) setReal(d); })
        .catch(() => toast("Couldn't check your showcase. Please try again."))
        .finally(() => setScanning(false));
      return;
    }
    const t = window.setTimeout(() => setScanning(false), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : SCAN_MS);
    return () => window.clearTimeout(t);
  }, [run, signedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const flagged: Flag[] = real
    ? real.flagged.map((f) => ({ ...f, img: f.img ?? NO_PHOTO }))
    : FLAGGED.map((p) => ({ id: p.id, name: p.name, img: p.img, rating: p.rating, ...(SEEN[p.id] ?? { orders: 0, cancel: 0, returned: 0 }) }));
  const left = flagged.filter((p) => !removed.includes(p.id));
  const by = (l: Level) => left.filter((p) => levelOf(p.rating) === l);
  const healthy = real ? Math.max(0, real.checked - real.flagged.length) : CREATOR.showcaseSize - FLAGGED.length;
  const checkedAt = real ? updatedWhen(real.at) : "09:12";
  const heavy = by("heavy");

  // Removing asks first: she sees what it means and confirms (owner, 28 and 31 Oct 2026).
  const [ask, setAsk] = useState<string[] | null>(null);
  const remove = (ids: string[]) => {
    if (!linked) return setLinked(true);
    if (ids.length) setAsk(ids);
  };
  const confirmRemove = async () => {
    if (!ask) return;
    const ids = ask;
    setAsk(null);
    // Signed in, TikTok takes them out of her real showcase (up to 200 a call).
    if (real) {
      toast("Removing from your TikTok showcase…");
      for (let i = 0; i < ids.length; i += 200) {
        const r = await removeFromShowcase(ids.slice(i, i + 200));
        if (!r.ok) return toast(r.error);
      }
    }
    setRemoved((r) => [...r, ...ids]);
    setPicked((p) => p.filter((x) => !ids.includes(x)));
    toast(ids.length > 1 ? `${ids.length} products removed from your showcase` : "Removed from your showcase");
  };
  const flip = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const row = (p: Flag) => (
    <li key={p.id} className={levelOf(p.rating)}>
      <input type="checkbox" className="rc-pick" checked={picked.includes(p.id)} onChange={() => flip(p.id)} aria-label={`Select ${p.name}`} />
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <img className="pv-open" src={p.img} alt="" onClick={() => router.push(productHref(p.id))} />
      <span className="rc-name">
        <b><Link href={productHref(p.id)} className="pv-open">{real ? shortName(p.name) : p.name}</Link></b>
        <small>
          {p.reviews ? `${p.reviews.toLocaleString("en-MY")} reviews · ` : ""}
          {p.orders ? <>You sold {p.orders} in 30 days · <span className={p.cancel > 10 ? "rc-bad" : undefined}>{p.cancel}% cancelled</span></> : "No sales from you in 30 days"}
          {p.videos?.length ? ` · ${p.videos.length} video${p.videos.length === 1 ? "" : "s"} sold it` : ""}
        </small>
      </span>
      <span className="rc-stars" aria-label={`${p.rating.toFixed(1)} stars`}>
        <Icon name="star" size={14} width={2.4} /> {p.rating.toFixed(1)}
      </span>
      <button type="button" className={levelOf(p.rating) === "heavy" ? "np-btn v2-btn-sm" : "btn-outline v2-btn-sm"} onClick={() => remove([p.id])}>Remove</button>
    </li>
  );
  // Videos only for products under 3.0★ (owner, 31 Oct 2026); the rest she decides on from the lists above.
  const withVideos = left.filter((p) => levelOf(p.rating) === "heavy" && p.videos?.length);

  return (
    <>
      <section className="v2-card tight sh-howcard">
        <span className="sh-howlbl">How the health check works</span>
        <Flow
          label="How the health check works"
          steps={[
            { icon: "scan", title: "We scan your showcase" },
            { icon: "star", title: "Under 4★: slightly low" },
            { icon: "alert", title: "Under 3.5★: low" },
            { icon: "alert", title: "Under 3★: heavily low", tone: "red" },
          ]}
        />
      </section>

      <Lock what="your product ratings">
        <section className={`sh-hub rc-hub ${scanning ? "busy" : ""}`} aria-label="Showcase health check">
          <span className="sh-grid" aria-hidden="true" />
          <div className="sh-left">
            <span className="sh-kicker"><i />{scanning ? "Checking your showcase…" : real ? `Health check · Updated ${checkedAt}` : `Health check · today ${checkedAt}`}</span>
            <h2><b><Count key={`${run}-${real?.total ?? 0}`} value={real ? real.total : CREATOR.showcaseSize} ms={SCAN_MS - 200} /></b> products checked</h2>
            {real?.more && <small className="v2-small">The first {real.total} in your showcase</small>}
          </div>
          <div className="rc-bar" role="img" aria-label={`${healthy} fine, ${by("slight").length} slightly low, ${by("low").length} low, ${heavy.length} heavily low`}>
            <i className="ok" style={{ flexGrow: healthy }} />
            <i className="low" style={{ flexGrow: Math.max(by("slight").length, 0.001) * 60 }} />
            <i className="mid" style={{ flexGrow: Math.max(by("low").length, 0.001) * 60 }} />
            <i className="bad" style={{ flexGrow: Math.max(heavy.length, 0.001) * 60 }} />
          </div>
          <div className="rc-bands four">
            <span className="ok"><b>{scanning ? "…" : healthy.toLocaleString("en-MY")}</b><small>4★ and up · fine</small></span>
            <span className="low"><b>{scanning ? "…" : by("slight").length}</b><small>3.5–3.9★ · slightly low</small></span>
            <span className="mid"><b>{scanning ? "…" : by("low").length}</b><small>3.0–3.4★ · low</small></span>
            <span className="bad"><b>{scanning ? "…" : heavy.length}</b><small>Under 3★ · heavily low</small></span>
          </div>
          <div className="sh-acts">
            {heavy.length > 0 ? (
              <button type="button" className="sh-go rc-go" disabled={scanning} onClick={() => remove(heavy.map((p) => p.id))}>
                <Icon name="x" size={17} width={2.6} /> Remove {heavy.length} heavily low
              </button>
            ) : (
              <span className="sh-clear"><Icon name="check" size={16} width={3} /> Nothing heavily low</span>
            )}
            <button type="button" className="sh-again" disabled={scanning} onClick={() => setRun((r) => r + 1)}><Icon name="refresh" size={16} /> Check again</button>
          </div>
        </section>
      </Lock>

      {!scanning && left.length > 0 && (
        <p className="rc-note">
          <Icon name="info" size={15} /> Removing a product from your showcase doesn&apos;t take down your videos: the yellow bag stays on them. In future, TikTok may
          remove it, and Rezekii can&apos;t guarantee it won&apos;t. You decide what to keep or remove.
        </p>
      )}
      {!scanning && picked.length > 0 && (
        <div className="rc-selbar">
          <b>{picked.length} selected</b>
          <button type="button" className="v2-link" onClick={() => setPicked([])}>Clear</button>
          <button type="button" className="np-btn v2-btn-sm" onClick={() => remove(picked)}>Remove {picked.length} selected</button>
        </div>
      )}
      {!scanning && LEVELS.map((l) => {
        const list = by(l.key);
        if (!list.length) return null;
        const all = list.every((p) => picked.includes(p.id));
        return (
          <section key={l.key} className="v2-card rc-list">
            <div className="v2-card-h">
              <h2 className="v2-h2"><span className={`rc-dot ${l.dot}`} /> {l.title} · {l.range}</h2>
              <span className={`badge ${l.badge}`}>{list.length}</span>
            </div>
            <p className="v2-small" style={{ margin: 0 }}>{l.note}</p>
            <div className="rc-tools">
              <button type="button" className="v2-link" onClick={() => setPicked((p) => (all ? p.filter((x) => !list.some((q) => q.id === x)) : [...new Set([...p, ...list.map((q) => q.id)])]))}>{all ? "Unselect all" : "Select all"}</button>
              <button type="button" className="btn-outline v2-btn-sm" onClick={() => remove(list.map((p) => p.id))}>Remove all {list.length}</button>
            </div>
            <ul>{list.map(row)}</ul>
          </section>
        );
      })}

      {/* Her videos that sold these products (owner, 31 Oct 2026): she opens each in TikTok and decides there. */}
      {!scanning && real && withVideos.length > 0 && (
        <section className="v2-card rc-list rc-videos">
          <div className="v2-card-h">
            <h2 className="v2-h2">Your Videos With Heavily Low Products</h2>
            <span className="badge badge-gray">{withVideos.reduce((n, p) => n + (p.videos?.length ?? 0), 0)}</span>
          </div>
          <div className="rc-advice">
            <b>Our advice</b>
            <p>These products are rated under 3.0★. It&apos;s better to delete their videos, as they may affect your creator health rating.</p>
            <p>If a video already has a violation, don&apos;t delete it: TikTok needs the video to review your appeal, and without it the appeal can fail.</p>
            <p>This is advice only. Videos are deleted in the TikTok app, and a deleted video can&apos;t be recovered.</p>
          </div>
          <p className="v2-small" style={{ margin: 0 }}>
            Only videos that sold the product at least once are found. TikTok doesn&apos;t tell apps which product a video carries, so videos with this product
            but no sales of it won&apos;t show here.
          </p>
          {withVideos.map((p) => (
            <div key={p.id} className="rc-vgroup">
              <span className="rc-vhead"><span className={`rc-dot ${LEVELS.find((l) => l.key === levelOf(p.rating))!.dot}`} /> <b>{shortName(p.name)}</b> <small>{p.rating.toFixed(1)}★</small><i className="rc-tag del">Better to delete</i></span>
              <ul>
                {p.videos!.map((v) => (
                  <li key={v.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.cover ?? NO_PHOTO} alt="" referrerPolicy="no-referrer" />
                    <span className="rc-name"><b>{v.title?.trim() || "Video"}</b><small>{v.orders} order{v.orders === 1 ? "" : "s"} of this product · RM {v.gmv.toLocaleString("en-MY")}</small></span>
                    <a className="btn-outline v2-btn-sm" href={v.url} target="_blank" rel="noreferrer">Open in TikTok</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {ask && <RemoveWarn items={ask.map((id) => flagged.find((p) => p.id === id)!).filter(Boolean).map((p) => ({ id: p.id, name: p.name, img: p.img }))} onConfirm={confirmRemove} onClose={() => setAsk(null)} />}
      {real && !real.linked && <p className="v2-muted" style={{ margin: 0 }}>Link TikTok Shop to check your showcase.</p>}
    </>
  );
}
