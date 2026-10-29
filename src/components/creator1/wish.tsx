"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet, Stepper } from "@/components/ui";
import { rm } from "@/lib/mock";
import "@/app/creator1.css";
import "@/app/creator2.css";
import { MY_WISHES, commitText, lookupLink, type Commit, type Lookup, type Wanted, type Wish, type WishItem } from "@/lib/mock-showcase";

/**
 * Her wish list, shared by Home and Most Wanted. The preview has no server, so new wishes live in this browser tab on top of the
 * sample ones.
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
export function useWishes() {
  const [wishes, setWishes] = useState<Wish[]>(MY_WISHES);
  useEffect(() => {
    const sync = () => setWishes(readWishes());
    sync();
    window.addEventListener(EVT, sync);
    return () => window.removeEventListener(EVT, sync);
  }, []);
  const add = (w: Wish) => {
    const next = [w, ...readWishes().filter((x) => x.id !== w.id)];
    try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    setWishes(next);
    window.dispatchEvent(new Event(EVT));
  };
  return { wishes, add, mine: (id: string) => wishes.find((w) => w.id === id) };
}

const STEPS = ["On wish list", "Seller contacted", "On Rezekii"] as const;
/** Where one of her wishes is, as 3 small bars plus a line. */
export function WishSteps({ w }: { w: Wish }) {
  const step = w.status === "Seller said no" ? 1 : STEPS.indexOf(w.status as (typeof STEPS)[number]);
  return (
    <>
      <span className={`sc-steps${w.status === "Seller said no" ? " no" : ""}`} aria-label={`Status: ${w.status}`}>{STEPS.map((x, k) => <i key={x} className={k <= step ? "on" : undefined} />)}</span>
      <small>{w.status === "On Rezekii" ? `On Rezekii · +${w.raise ?? 1}% for you` : w.status} · {w.when}</small>
    </>
  );
}

const RIGHTS: Commit["rights"][] = [0, 90, 180];
const MONTHS: Commit["months"][] = [1, 3, 6];

/**
 * Add to wish list (owner, 29 Oct 2026): not a one-tap wish. She says what she'll give each month if the product launches on
 * Rezekii; that's what we take to the seller. No rate to ask for: none is guaranteed, and if the seller agrees it's at least +1%.
 * `start` opens on the product (from her showcase or a pasted link) or straight on the form (Join on Most Wanted).
 */
export function WishSheet({ item, sold, wanted, kind = "new", start = "detail", onClose }: { item: WishItem; sold?: number; wanted?: Wanted; kind?: Lookup["kind"]; start?: "detail" | "commit"; onClose: () => void }) {
  const { linked, setLinked } = useDemo();
  const { add, mine } = useWishes();
  const had = mine(item.id);
  const [step, setStep] = useState<"detail" | "commit" | "done">(start);
  const [videos, setVideos] = useState(4);
  const [lives, setLives] = useState(0);
  const [rights, setRights] = useState<Commit["rights"]>(0);
  const [months, setMonths] = useState<Commit["months"]>(3);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const avg = wanted ? Math.round(wanted.videos / wanted.creators) : 0;

  const go = () => (linked ? setStep("commit") : setLinked(true));
  const send = () => {
    if (!linked) return setLinked(true);
    if (videos + lives === 0) return setErr("Commit at least 1 video or LIVE a month.");
    add({ ...item, status: "On wish list", when: "Just now", commit: { videos, lives, rights, months, note: note.trim() || undefined } });
    setStep("done");
  };

  return (
    <Sheet title={step === "done" ? "On Your Wish List" : step === "commit" ? (wanted ? "Join This Wish" : "Add to Wish List") : "Product"} onClose={onClose}>
      <div className="cr1-sheetprod">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.img} alt="" />
        <span>
          <b>{item.name}</b>
          <small>{item.shop} · {rm(item.price)}{item.rate !== null ? ` · open plan ${item.rate}%` : ""}</small>
        </span>
      </div>

      {step === "detail" && (
        <>
          <div className="cr2-mini">
            <span><small>Price</small><b>{rm(item.price)}</b></span>
            {sold !== undefined ? <span><small>Your sales, 30 days</small><b>{sold}</b></span> : wanted && <span><small>Creators want it</small><b>{wanted.creators}</b></span>}
            <span><small>Open plan</small><b>{item.rate === null ? "—" : `${item.rate}%`}</b></span>
          </div>
          {kind === "onRezekii" ? (
            <>
              <p className="wf-note"><Icon name="check" size={16} width={2.6} /> Already on Rezekii. Add it from the marketplace.</p>
              <Link href="/app/market" className="np-btn">Open Marketplace</Link>
            </>
          ) : had ? (
            <div className="wf-had"><WishSteps w={had} /><small>{commitText(had.commit)}</small></div>
          ) : (
            <>
              <p className="v2-muted" style={{ margin: 0 }}>
                Not on Rezekii yet.{wanted ? ` ${wanted.creators} creators already want it, ${avg} videos a month each on average.` : ""}
              </p>
              {kind === "new" && sold !== undefined ? (
                <button type="button" className="wf-quiet" onClick={go}>Want this on Rezekii? <b>Add to wish list</b></button>
              ) : (
                <button type="button" className="np-btn" onClick={go}>{wanted ? "Join with your commitment" : "Add to wish list"}</button>
              )}
            </>
          )}
        </>
      )}

      {step === "commit" && (
        <>
          <p className="v2-muted" style={{ margin: 0 }}>If it launches on Rezekii, what will you give each month?</p>
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
          <p className="wf-fine">
            If the seller agrees, you get at least +1%. Not guaranteed. The seller sees what you commit and sell.
          </p>
          <button type="button" className="np-btn" onClick={send}>{wanted ? "Join" : "Add to wish list"}</button>
        </>
      )}

      {step === "done" && (
        <div className="cr1-sent">
          <span className="v2-medal green" style={{ width: 84, height: 84 }}><Icon name="check" size={34} width={2.6} /></span>
          <b>{wanted ? "You've joined" : "Added to your wish list"}</b>
          <p className="v2-muted" style={{ margin: 0 }}>{commitText({ videos, lives, rights, months })}. We&apos;ll tell you when the seller replies.</p>
          <button type="button" className="np-btn v2-btn-sm" onClick={onClose}>Done</button>
        </div>
      )}
    </Sheet>
  );
}

/** Paste a TikTok Shop link and we find the product (owner, 29 Oct 2026). Short links like vt.tiktok.com work too. */
export function LinkFinder({ onFound }: { onFound: (r: Lookup) => void }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const find = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return setErr("Paste a TikTok Shop product link first.");
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      const r = lookupLink(url);
      if (!r) return setErr("Couldn't find this product. Check the link.");
      setUrl("");
      onFound(r);
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
