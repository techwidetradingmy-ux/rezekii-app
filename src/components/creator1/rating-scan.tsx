"use client";

import Link from "next/link";
import { updatedWhen } from "@/components/data-note";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Count, Flow, Lock, RemoveWarn, Tip } from "@/components/ui";
import { removeFromShowcase } from "@/lib/live";
import { CREATOR, PRODUCTS } from "@/lib/mock";
import { productHref } from "@/lib/product-view";
import { NO_PHOTO, shortName } from "@/lib/live-perf";
import { useT } from "@/lib/i18n/client";
import { tx } from "@/lib/i18n/lang";
import "@/app/creator1.css";

/** A translated line whose {placeholders} are React elements (the climbing count). */
const fillEl = (line: string, els: Record<string, React.ReactNode>) => line.split(/\{(\w+)\}/).map((s, i) => (i % 2 ? <Fragment key={i}>{els[s]}</Fragment> : s));

/**
 * Three levels of low rating (owner, 31 Oct 2026): heavily low under 3.0, low under 3.5, slightly low under 4.0. The English
 * here is translated where it's shown.
 */
type Level = "heavy" | "low" | "slight";
const levelOf = (r: number): Level => (r < 3 ? "heavy" : r < 3.5 ? "low" : "slight");
const LEVELS: { key: Level; title: string; range: string; note: string; dot: string; badge: string }[] = [
  { key: "heavy", title: tx("Heavily low"), range: tx("under 3.0★"), note: tx("Most likely to hurt your account health. Consider removing them."), dot: "bad", badge: "badge-red" },
  { key: "low", title: tx("Low"), range: tx("3.0 to 3.4★"), note: tx("Buyers are often unhappy with these. Pick a 4★ product instead when you can."), dot: "mid", badge: "badge-amber" },
  { key: "slight", title: tx("Slightly low"), range: tx("3.5 to 3.9★"), note: tx("Keep an eye on these."), dot: "low", badge: "badge-gray" },
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
/** Ratings that stream past while the check runs: a look, not her numbers. */
const RC_STREAM: [string, string][] = [["4.8", "ok"], ["3.2", "mid"], ["4.6", "ok"], ["3.7", "low"], ["4.9", "ok"], ["2.8", "bad"], ["4.4", "ok"], ["3.9", "low"], ["4.7", "ok"], ["3.1", "mid"], ["4.5", "ok"], ["2.6", "bad"], ["4.2", "ok"], ["3.6", "low"]];

export function RatingScan() {
  const t = useT();
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
        .catch(() => toast(t("Couldn't check your showcase. Please try again.")))
        .finally(() => setScanning(false));
      return;
    }
    const timer = window.setTimeout(() => setScanning(false), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : SCAN_MS);
    return () => window.clearTimeout(timer);
  }, [run, signedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const flagged: Flag[] = real
    ? real.flagged.map((f) => ({ ...f, img: f.img ?? NO_PHOTO }))
    : FLAGGED.map((p) => ({ id: p.id, name: p.name, img: p.img, rating: p.rating, ...(SEEN[p.id] ?? { orders: 0, cancel: 0, returned: 0 }) }));
  const left = flagged.filter((p) => !removed.includes(p.id));
  const by = (l: Level) => left.filter((p) => levelOf(p.rating) === l);
  const healthy = real ? Math.max(0, real.checked - real.flagged.length) : CREATOR.showcaseSize - FLAGGED.length;
  // Products TikTok has no rating for yet are in no level, so they're counted on their own and the numbers add up (owner, 2 Nov 2026).
  const unrated = real ? Math.max(0, real.total - real.checked) : 0;
  // Showcase Health (owner, 2 Nov 2026): Rezekii's estimate, the share of her rated products at 4★ or more. Not TikTok's score.
  const rated = healthy + left.length;
  const health = rated ? Math.round((healthy / rated) * 1000) / 10 : null;
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
    // Gone from the list at once (owner, 1 Nov 2026: faster); if TikTok says no, they come back with the reason.
    setRemoved((r) => [...r, ...ids]);
    setPicked((p) => p.filter((x) => !ids.includes(x)));
    toast(ids.length > 1 ? t("{n} products removed from your showcase", { n: ids.length }) : t("Removed from your showcase"));
    // Signed in, TikTok takes them out of her real showcase (up to 200 a call); Rezekii forgets them too, so a reload agrees.
    if (real) {
      for (let i = 0; i < ids.length; i += 200) {
        const part = ids.slice(i, i + 200);
        const r = await removeFromShowcase(part);
        if (!r.ok) {
          setRemoved((x) => x.filter((id) => !ids.slice(i).includes(id)));
          return toast(t(r.error));
        }
      }
    }
  };
  const flip = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const row = (p: Flag) => (
    <li key={p.id} className={levelOf(p.rating)}>
      <input type="checkbox" className="rc-pick" checked={picked.includes(p.id)} onChange={() => flip(p.id)} aria-label={t("Select {name}", { name: p.name })} />
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <img className="pv-open" src={p.img} alt="" onClick={() => router.push(productHref(p.id))} />
      <span className="rc-name">
        <b><Link href={productHref(p.id)} className="pv-open">{real ? shortName(p.name) : p.name}</Link></b>
        <small>
          {p.reviews ? `${t("{n} reviews", { n: p.reviews.toLocaleString("en-MY") })} · ` : ""}
          {p.orders ? <>{t("You sold {n} in 30 days", { n: p.orders })} · <span className={p.cancel > 10 ? "rc-bad" : undefined}>{t("{n}% cancelled", { n: p.cancel })}</span></> : t("No sales from you in 30 days")}
          {p.videos?.length ? ` · ${p.videos.length === 1 ? t("{n} video sold it", { n: 1 }) : t("{n} videos sold it", { n: p.videos.length })}` : ""}
        </small>
      </span>
      <span className="rc-stars" aria-label={t("{n} stars", { n: p.rating.toFixed(1) })}>
        <Icon name="star" size={14} width={2.4} /> {p.rating.toFixed(1)}
      </span>
      <button type="button" className={levelOf(p.rating) === "heavy" ? "np-btn v2-btn-sm" : "btn-outline v2-btn-sm"} onClick={() => remove([p.id])}>{t("Remove")}</button>
    </li>
  );
  // Videos only for products under 3.0★ (owner, 31 Oct 2026); the rest she decides on from the lists above.
  const withVideos = left.filter((p) => levelOf(p.rating) === "heavy" && p.videos?.length);

  return (
    <>
      <section className="v2-card tight sh-howcard">
        <span className="sh-howlbl">{t("How the health check works")}</span>
        <Flow
          label={t("How the health check works")}
          steps={[
            { icon: "scan", title: t("We scan your showcase") },
            { icon: "star", title: t("Under 4★: slightly low") },
            { icon: "alert", title: t("Under 3.5★: low") },
            { icon: "alert", title: t("Under 3★: heavily low"), tone: "red" },
          ]}
        />
      </section>

      <Lock what={t("your product ratings")}>
        <section className={`sh-hub rc-hub ${scanning ? "busy" : "done"}`} aria-label={t("Showcase health check")}>
          <span className="sh-grid" aria-hidden="true" />
          {/* While it checks (owner, 1 Nov 2026: more techy): a beam sweeps the card inside HUD corners, and ratings stream past. */}
          <span className="rc-hud" aria-hidden="true"><i /><i /><i /><i /></span>
          {scanning && (
            <span className="rc-fx" aria-hidden="true">
              <i className="rc-beam" />
              <span className="rc-stream">
                {RC_STREAM.map(([v, band], i) => <em key={i} className={band} style={{ left: `${(i * 37) % 92 + 4}%`, animationDelay: `${(i % 7) * 0.32}s` }}>★ {v}</em>)}
              </span>
            </span>
          )}
          <div className="sh-left">
            <span className="sh-kicker"><i />{scanning ? t("Checking your showcase…") : real ? t("Health check · Updated {when}", { when: checkedAt }) : t("Health check · today {time}", { time: checkedAt })}</span>
            <h2>{fillEl(t("{n} products checked"), { n: <b><Count key={`${run}-${real?.total ?? 0}`} value={real ? real.total : CREATOR.showcaseSize} ms={SCAN_MS - 200} /></b> })}</h2>
            {real?.more && <small className="v2-small">{t("The first {n} in your showcase", { n: real.total })}</small>}
            {!scanning && unrated > 0 && <small className="v2-small">{t("Not Rated Yet")} <b>{unrated.toLocaleString("en-MY")}</b></small>}
            {!scanning && health !== null && (
              <span className="rc-health">
                {t("Showcase Health")} <b>{health}%</b> <small>{t("Rezekii's Estimate")}</small>
                <Tip label={t("About showcase health")} text={t("Rezekii's estimate: the share of your rated showcase products at 4★ or more. Not TikTok's account health score.")} />
              </span>
            )}
          </div>
          <div className="rc-bar" role="img" aria-label={t("{fine} fine, {slight} slightly low, {low} low, {heavy} heavily low", { fine: healthy, slight: by("slight").length, low: by("low").length, heavy: heavy.length })}>
            <i className="ok" style={{ flexGrow: healthy }} />
            <i className="low" style={{ flexGrow: Math.max(by("slight").length, 0.001) * 60 }} />
            <i className="mid" style={{ flexGrow: Math.max(by("low").length, 0.001) * 60 }} />
            <i className="bad" style={{ flexGrow: Math.max(heavy.length, 0.001) * 60 }} />
          </div>
          <div className={`rc-bands four${scanning ? "" : " rc-pop"}`}>
            <span className="ok"><b>{scanning ? "…" : healthy.toLocaleString("en-MY")}</b><small>{t("4★ and up · fine")}</small></span>
            <span className="low"><b>{scanning ? "…" : by("slight").length}</b><small>{t("3.5–3.9★ · slightly low")}</small></span>
            <span className="mid"><b>{scanning ? "…" : by("low").length}</b><small>{t("3.0–3.4★ · low")}</small></span>
            <span className="bad"><b>{scanning ? "…" : heavy.length}</b><small>{t("Under 3★ · heavily low")}</small></span>
          </div>
          <div className="sh-acts">
            {heavy.length > 0 ? (
              <button type="button" className="sh-go rc-go" disabled={scanning} onClick={() => remove(heavy.map((p) => p.id))}>
                <Icon name="x" size={17} width={2.6} /> {t("Remove {n} heavily low", { n: heavy.length })}
              </button>
            ) : (
              <span className="sh-clear"><Icon name="check" size={16} width={3} /> {t("Nothing heavily low")}</span>
            )}
            <button type="button" className="sh-again" disabled={scanning} onClick={() => setRun((r) => r + 1)}><Icon name="refresh" size={16} /> {t("Check Again")}</button>
          </div>
        </section>
      </Lock>

      {!scanning && left.length > 0 && (
        <p className="rc-note">
          <Icon name="info" size={15} /> {t("Removing a product from your showcase doesn't take down your videos: the yellow bag stays on them. In future, TikTok may remove it, and Rezekii can't guarantee it won't. You decide what to keep or remove.")}
        </p>
      )}
      {!scanning && picked.length > 0 && (
        <div className="rc-selbar">
          <b>{t("{n} selected", { n: picked.length })}</b>
          <button type="button" className="v2-link" onClick={() => setPicked([])}>{t("Clear")}</button>
          <button type="button" className="np-btn v2-btn-sm" onClick={() => remove(picked)}>{t("Remove {n} selected", { n: picked.length })}</button>
        </div>
      )}
      {!scanning && LEVELS.map((l) => {
        const list = by(l.key);
        if (!list.length) return null;
        const all = list.every((p) => picked.includes(p.id));
        return (
          <section key={l.key} className="v2-card rc-list">
            <div className="v2-card-h">
              <h2 className="v2-h2"><span className={`rc-dot ${l.dot}`} /> {t(l.title)} · {t(l.range)}</h2>
              <span className={`badge ${l.badge}`}>{list.length}</span>
            </div>
            <p className="v2-small" style={{ margin: 0 }}>{t(l.note)}</p>
            <div className="rc-tools">
              <button type="button" className="v2-link" onClick={() => setPicked((p) => (all ? p.filter((x) => !list.some((q) => q.id === x)) : [...new Set([...p, ...list.map((q) => q.id)])]))}>{all ? t("Unselect All") : t("Select All")}</button>
              <button type="button" className="btn-outline v2-btn-sm" onClick={() => remove(list.map((p) => p.id))}>{t("Remove all {n}", { n: list.length })}</button>
            </div>
            <ul>{list.map(row)}</ul>
          </section>
        );
      })}

      {/* Her videos that sold these products (owner, 31 Oct 2026): she opens each in TikTok and decides there. */}
      {!scanning && real && withVideos.length > 0 && (
        <section className="v2-card rc-list rc-videos">
          <div className="v2-card-h">
            <h2 className="v2-h2">{t("Your Videos With Heavily Low Products")}</h2>
            <span className="badge badge-gray">{withVideos.reduce((n, p) => n + (p.videos?.length ?? 0), 0)}</span>
          </div>
          <div className="rc-advice">
            <b>{t("Our advice")}</b>
            <p>{t("These products are rated under 3.0★. It's better to delete their videos, as they may affect your creator health rating.")}</p>
            <p>{t("If a video already has a violation, don't delete it: TikTok needs the video to review your appeal, and without it the appeal can fail.")}</p>
            <p>{t("This is advice only. Videos are deleted in the TikTok app, and a deleted video can't be recovered.")}</p>
          </div>
          <p className="v2-small" style={{ margin: 0 }}>
            {t("Only videos that sold the product at least once are found. TikTok doesn't tell apps which product a video carries, so videos with this product but no sales of it won't show here.")}
          </p>
          {withVideos.map((p) => (
            <div key={p.id} className="rc-vgroup">
              <span className="rc-vhead"><span className={`rc-dot ${LEVELS.find((l) => l.key === levelOf(p.rating))!.dot}`} /> <b>{shortName(p.name)}</b> <small>{p.rating.toFixed(1)}★</small><i className="rc-tag del">{t("Better to delete")}</i></span>
              <ul>
                {p.videos!.map((v) => (
                  <li key={v.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.cover ?? NO_PHOTO} alt="" referrerPolicy="no-referrer" />
                    <span className="rc-name"><b>{v.title?.trim() || t("Video")}</b><small>{v.orders === 1 ? t("{n} order of this product", { n: 1 }) : t("{n} orders of this product", { n: v.orders })} · RM {v.gmv.toLocaleString("en-MY")}</small></span>
                    <a className="btn-outline v2-btn-sm" href={v.url} target="_blank" rel="noreferrer">{t("Open in TikTok")}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {ask && <RemoveWarn items={ask.map((id) => flagged.find((p) => p.id === id)!).filter(Boolean).map((p) => ({ id: p.id, name: p.name, img: p.img }))} onConfirm={confirmRemove} onClose={() => setAsk(null)} />}
      {real && !real.linked && <p className="v2-muted" style={{ margin: 0 }}>{t("Link TikTok Shop to check your showcase.")}</p>}
    </>
  );
}
