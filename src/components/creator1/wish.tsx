"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Stepper } from "@/components/ui";
import "@/app/creator1.css";
import { MY_WISHES, commitText, lookupLink, type Commit, type Lookup, type Wanted, type Wish, type WishItem } from "@/lib/mock-showcase";
import { productHref } from "@/lib/product-view";
import { findWishLink, loadMyWishes, saveWishLive, type LiveWish } from "@/lib/live-wishes";
import { noteWhen } from "@/lib/live-notes";

/**
 * Her wish list, shared by Home, Most Wanted and the Product page. The preview has no server, so new wishes live in this browser
 * tab on top of the sample ones.
 */
const KEY = "rz2_wishes";
const EVT = "rz2-wishes";
function readWishes(): Wish[] {
  try {
    const saved = sessionStorage.getItem(KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return MY_WISHES;
}
/** Signed in (owner, 31 Oct 2026): her real wishes, loaded once per page visit and again after she adds one. */
let liveWishes: Wish[] | null = null;
const fromLive = (w: LiveWish): Wish => ({
  id: w.id, name: w.name, shop: w.shop, img: w.img ?? "/avatars/blank.svg", price: w.price, rate: w.rate, status: w.status, when: noteWhen(w.at), commit: w.commit,
  ...(w.raise !== null ? { raise: w.raise } : {}),
});
export async function refreshWishes() {
  const d = await loadMyWishes();
  if (!d) return;
  liveWishes = d.map(fromLive);
  window.dispatchEvent(new Event(EVT));
}

export function useWishes() {
  const { live } = useDemo();
  const [wishes, setWishes] = useState<Wish[]>(live ? liveWishes ?? [] : MY_WISHES);
  useEffect(() => {
    const sync = () => setWishes(live ? liveWishes ?? [] : readWishes());
    sync();
    if (live && !liveWishes) void refreshWishes();
    window.addEventListener(EVT, sync);
    return () => window.removeEventListener(EVT, sync);
  }, [live]);
  const add = (w: Wish) => {
    const next = [w, ...readWishes().filter((x) => x.id !== w.id)];
    try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    setWishes(next);
    window.dispatchEvent(new Event(EVT));
  };
  return { wishes, add, mine: (id: string) => wishes.find((w) => w.id === id) };
}

/**
 * Where one of her wishes is: on her wish list, on Rezekii, or the seller said no. Our talks with the seller stay behind the
 * scenes (owner, 29 Oct 2026: no "Seller contacted" for creators).
 */
export function WishSteps({ w }: { w: Wish }) {
  const live = w.status === "On Rezekii";
  return <small className={`wf-st${live ? " live" : w.status === "Seller said no" ? " no" : ""}`}>{live ? `On Rezekii · +${w.raise ?? 1}% for you` : w.status} · {w.when}</small>;
}

const RIGHTS: Commit["rights"][] = [0, 90, 180];
const MONTHS: Commit["months"][] = [1, 3, 6];

/**
 * Add to wish list (owner, 29 Oct 2026), on the Product page: not a one-tap wish. She says what she'll give each month if the
 * product launches on Rezekii; that's what we take to the seller. No rate to ask for: none is guaranteed, at least +1% if agreed.
 */
export function WishForm({ item, wanted, onCancel }: { item: WishItem; wanted?: Wanted | null; onCancel: () => void }) {
  const { linked, setLinked, live } = useDemo();
  const { add } = useWishes();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [videos, setVideos] = useState(4);
  const [lives, setLives] = useState(0);
  const [rights, setRights] = useState<Commit["rights"]>(0);
  const [months, setMonths] = useState<Commit["months"]>(3);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const avg = wanted ? Math.round(wanted.videos / wanted.creators) : 0;

  const send = () => {
    if (!linked) return setLinked(true);
    if (videos + lives === 0) return setErr("Commit at least 1 video or LIVE a month.");
    const commit = { videos, lives, rights, months, note: note.trim() || undefined };
    if (live) {
      setBusy(true);
      saveWishLive(item.id, commit).then((r) => {
        setBusy(false);
        if (!r.ok) return setErr(r.error ?? "Didn't save. Please try again.");
        void refreshWishes();
        setDone(true);
      });
      return;
    }
    add({ ...item, status: "On wish list", when: "Just now", commit });
    setDone(true);
  };

  if (done) {
    return (
      <section className="v2-card wf-card wf-done" aria-live="polite">
        <span className="v2-medal green" style={{ width: 64, height: 64 }}><Icon name="check" size={28} width={2.6} /></span>
        <b>{wanted ? "You've Joined" : "Added to Your Wish List"}</b>
        <p className="v2-muted" style={{ margin: 0 }}>{commitText({ videos, lives, rights, months })}. {live ? "You'll see it in your notifications if it launches on Rezekii." : "We'll tell you when the seller replies."}</p>
      </section>
    );
  }
  return (
    <section className="v2-card wf-card" id="wish">
      <h2 className="v2-h2">{wanted ? "Join This Wish" : "Add to Wish List"}</h2>
      <p className="v2-muted" style={{ margin: 0 }}>If the seller agrees, what will you give each month?{wanted ? ` Others give ${avg} videos on average.` : ""}</p>
      <div className="wf-rows">
        <div className="wf-row"><span>Videos a month</span><Stepper label="Videos a month" value={videos} max={60} onChange={(v) => { setVideos(v); setErr(""); }} /></div>
        <div className="wf-row"><span>LIVE sessions a month</span><Stepper label="LIVE sessions a month" value={lives} max={30} onChange={(v) => { setLives(v); setErr(""); }} /></div>
        <div className="wf-row col">
          <span>Ad rights for the seller</span>
          <div className="v2-chips">{RIGHTS.map((r) => <button key={r} type="button" className={`v2-chip ${rights === r ? "on" : ""}`} onClick={() => setRights(r)}>{r ? `${r} days` : "None"}</button>)}</div>
        </div>
        <div className="wf-row col">
          <span>For how long</span>
          <div className="v2-chips">{MONTHS.map((m) => <button key={m} type="button" className={`v2-chip ${months === m ? "on" : ""}`} onClick={() => setMonths(m)}>{m} month{m === 1 ? "" : "s"}</button>)}</div>
        </div>
      </div>
      <textarea className="np-input wf-note-in" rows={2} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="A free sample would help me film faster" aria-label="Note for the seller (optional)" />
      {err && <p className="wf-err" role="alert">{err}</p>}
      <p className="wf-fine">If the seller agrees, you get at least +1%. Not guaranteed. The seller sees what you commit and sell.</p>
      <div className="pp-stack">
        <button type="button" className="np-btn" disabled={busy} onClick={send}>{busy ? <span className="sl-spin" /> : wanted ? "Join" : "Add to Wish List"}</button>
        <button type="button" className="btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}

/**
 * Paste a TikTok Shop link and we find the product (owner, 29 Oct 2026). Short links like vt.tiktok.com work too. Found products
 * open on the Product page unless `onFound` says otherwise.
 */
export function LinkFinder({ onFound }: { onFound?: (r: Lookup) => void }) {
  const router = useRouter();
  const { live } = useDemo();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const find = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return setErr("Paste a TikTok Shop product link first.");
    setBusy(true);
    if (live) {
      // For real: TikTok Shop's own facts for the link; the Product page then shows it, on Rezekii or not.
      findWishLink(url).then((r) => {
        setBusy(false);
        if ("error" in r) return setErr(r.error);
        setUrl("");
        router.push(productHref(r.product.id));
      });
      return;
    }
    window.setTimeout(() => {
      setBusy(false);
      const r = lookupLink(url);
      if (!r) return setErr("Couldn't find this product. Check the link.");
      setUrl("");
      if (onFound) onFound(r);
      else router.push(productHref(r.item.id));
    }, 700);
  };
  return (
    <form className="wf-link" onSubmit={find} noValidate>
      <label className="sc-search">
        <Icon name="link" size={17} />
        <input type="url" inputMode="url" value={url} onChange={(e) => { setUrl(e.target.value); setErr(""); }} placeholder="Paste a TikTok Shop product link" aria-label="TikTok Shop product link" aria-invalid={!!err} />
      </label>
      <button type="submit" className="np-btn v2-btn-sm" disabled={busy}>{busy ? <span className="sl-spin" /> : "Find"}</button>
      {err && <p className="wf-err" role="alert">{err}</p>}
    </form>
  );
}
