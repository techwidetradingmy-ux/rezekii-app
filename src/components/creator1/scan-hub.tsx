"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Count, Flow, Hidden, Sheet } from "@/components/ui";
import { CREATOR, PRODUCTS, RAISES, SIMILAR, product, type Raise } from "@/lib/mock";
import { NEW_ON_RESCAN, SILVER_UNLOCKS } from "@/lib/mock-creator1";
import { LEVELS } from "@/lib/mock-creator2";
import { ScanStory } from "@/components/creator1/scan-story";

type Tab = "same" | "similar" | "silver";
/** One product the creator can move to a better rate: the same listing (raise) or a similar one in TAP. */
type Item = { id: string; productId: string; kind: "same" | "similar"; from: number; fromLabel: "Yours" | "Open"; to: number; note: string };
type Bulk = { phase: "working" | "done"; items: Item[]; doneIds: string[] };
type Pending = { id: string; productId: string; from: number; to: number; state: "checking" | "confirmed" };
/** Tap-and-swipe through the better rates, one card at a time (owner, 28 Oct 2026). */
type Deck = { ids: string[]; at: number; kept: string[]; fly: "left" | "right" | null };

/** Where each better rate sits on the radar: angle (deg, clockwise from the top) and distance from the centre (0–1). */
const BLIPS: [number, number][] = [[38, 0.78], [104, 0.68], [162, 0.86], [228, 0.7], [292, 0.84], [334, 0.7], [70, 0.9]];
const SWEEP_S = 4;
const SCAN_MS = 4200;
const HOLD_MS = 900;
const SWIPE_PX = 70;
/** Her showcase photos that fly into the radar while it scans. */
const FLY = PRODUCTS.slice(0, 13).map((p) => p.img);

const raiseItem = (r: Raise): Item => {
  const p = product(r.productId);
  return r.nowRate === null
    ? { id: r.id, productId: r.productId, kind: "same", from: p.publicRate, fromLabel: "Open", to: r.tapRate, note: `Same product · until ${r.until}` }
    : { id: r.id, productId: r.productId, kind: "same", from: r.nowRate, fromLabel: "Yours", to: r.tapRate, note: `Same product · until ${r.until}` };
};
const similarItem = (id: string): Item => {
  const p = product(id);
  return { id: `sim-${id}`, productId: id, kind: "similar", from: p.publicRate, fromLabel: "Open", to: p.tapRate, note: `Similar · ${p.category}` };
};

/**
 * Home's scanner (blueprint W4): how it works on top, the scan as a live radar, and one card holding every product that can
 * pay more (same listing or similar), folded into a list with a tick each and one button to add them all.
 * Motion (owner, 28 Oct 2026): hold to scan, her product photos fly into the radar, better rates pop back out, and a tap on
 * one opens a card deck to swipe through. Bronze creators also see a quiet "Unlock at Silver" tab.
 */
export function ScanHub() {
  const { linked, setLinked, toast, bronze } = useDemo();
  const [rows, setRows] = useState<Raise[]>(RAISES);
  const [similar, setSimilar] = useState<string[]>(SIMILAR);
  const [tab, setTab] = useState<Tab>("same");
  const [open, setOpen] = useState(false);
  // Desktop (owner, 28 Oct 2026: website first): the list sits open beside the scanner.
  useEffect(() => {
    if (window.matchMedia("(min-width: 1200px)").matches) setOpen(true);
  }, []);
  const [unticked, setUnticked] = useState<string[]>([]);
  const [fresh, setFresh] = useState<string[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanKey, setScanKey] = useState(0);
  const [last, setLast] = useState("today 09:12");
  const [bulk, setBulk] = useState<Bulk | null>(null);
  const [story, setStory] = useState(false);
  const [hold, setHold] = useState(0);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [drag, setDrag] = useState(0);
  const timers = useRef<number[]>([]);
  const holdRaf = useRef(0);
  const holdFrom = useRef(0);
  const dragFrom = useRef<number | null>(null);
  const deckOpen = useRef(false);

  useEffect(() => () => { timers.current.forEach((t) => window.clearTimeout(t)); cancelAnimationFrame(holdRaf.current); }, []);
  useEffect(() => { deckOpen.current = !!deck; }, [deck]);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const view: Tab = tab === "silver" && !bronze ? "same" : tab;
  const same = rows.filter((r) => r.eligible).map(raiseItem);
  const sims = similar.map(similarItem);
  const unlocks = SILVER_UNLOCKS.map(product);
  const list = view === "same" ? same : view === "similar" ? sims : [];
  const thumbs = view === "silver" ? unlocks.map((p) => p.img) : list.map((i) => product(i.productId).img);
  const picked = list.filter((i) => !unticked.includes(i.id));
  const allPicked = picked.length === list.length;
  const top = Math.max(0, ...same.map((i) => i.to - i.from));

  function add(items: Item[]) {
    if (!linked) return setLinked(true);
    if (!items.length) return;
    setBulk({ phase: "working", items, doneIds: [] });
    items.forEach((it, i) => later(() => setBulk((b) => (b ? { ...b, doneIds: [...b.doneIds, it.id] } : b)), 420 * (i + 1)));
    later(() => setBulk((b) => (b ? { ...b, phase: "done" } : b)), 420 * items.length + 300);
  }

  /** Added products leave the list and wait for TikTok to confirm they're under Techwide. */
  function closeBulk() {
    if (bulk) {
      const ids = bulk.items.map((i) => i.id);
      setRows((rs) => rs.filter((r) => !ids.includes(r.id)));
      setSimilar((s) => s.filter((id) => !ids.includes(`sim-${id}`)));
      setPending((p) => [...bulk.items.map((i) => ({ id: i.id, productId: i.productId, from: i.from, to: i.to, state: "checking" as const })), ...p]);
      later(() => setPending((p) => p.map((x) => (ids.includes(x.id) ? { ...x, state: "confirmed" } : x))), 3000);
      if (bulk.phase === "working") toast("Still adding in the background. We'll tell you when it's done.");
    }
    setBulk(null);
  }

  function scanAgain() {
    if (!linked) return setLinked(true);
    setDeck(null);
    setScanning(true);
    setScanKey((k) => k + 1);
    later(() => {
      setScanning(false);
      setLast("just now");
      const isNew = !rows.some((r) => r.id === NEW_ON_RESCAN.id) && !pending.some((p) => p.id === NEW_ON_RESCAN.id);
      if (isNew) {
        setRows((rs) => [NEW_ON_RESCAN, ...rs]);
        setFresh([NEW_ON_RESCAN.id]);
        setTab("same");
        setOpen(true);
        toast("Scan finished: 1 new better rate");
      } else toast("Scan finished: nothing new since your last scan");
      // The recap plays after every scan (owner, 28 Oct 2026: social media vibes, made to share), once the rates have popped out.
      later(() => { if (!deckOpen.current) setStory(true); }, 1800);
    }, SCAN_MS);
  }

  /* Hold to scan: the ring fills while she holds; letting go when it's full starts the scan. */
  function holdDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (scanning) return;
    if (!linked) return setLinked(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    holdFrom.current = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - holdFrom.current) / HOLD_MS);
      setHold(k);
      if (k < 1) holdRaf.current = requestAnimationFrame(tick);
      else navigator.vibrate?.(30);
    };
    holdRaf.current = requestAnimationFrame(tick);
  }
  function holdUp() {
    if (!holdFrom.current) return;
    // Timed from the press, not from the last frame drawn, so a slow or hidden tab still counts the hold.
    const full = performance.now() - holdFrom.current >= HOLD_MS;
    cancelAnimationFrame(holdRaf.current);
    holdFrom.current = 0;
    setHold(0);
    if (full) scanAgain();
    else toast("Keep holding until the ring is full");
  }

  /* Tap a product on the radar: swipe right to keep it, left to skip, then add what she kept. */
  function openDeck(id: string) {
    if (scanning) return;
    const ids = same.map((i) => i.id);
    const k = Math.max(0, ids.indexOf(id));
    setDrag(0);
    setDeck({ ids: [...ids.slice(k), ...ids.slice(0, k)], at: 0, kept: [], fly: null });
  }
  function decide(keep: boolean) {
    if (!deck || deck.fly || deck.at >= deck.ids.length) return;
    setDrag(0);
    setDeck({ ...deck, fly: keep ? "right" : "left" });
    later(() => setDeck((d) => (d ? { ...d, at: d.at + 1, kept: keep ? [...d.kept, d.ids[d.at]] : d.kept, fly: null } : d)), 280);
  }
  /** Closing the deck leaves the list ticked the way she swiped. */
  function closeDeck(addKept: boolean) {
    if (!deck) return;
    const seen = deck.ids.slice(0, deck.at);
    setUnticked(seen.filter((id) => !deck.kept.includes(id)));
    setTab("same");
    if (!addKept) setOpen(true);
    if (addKept) add(same.filter((it) => deck.kept.includes(it.id)));
    setDeck(null);
  }

  const card = deck && deck.at < deck.ids.length ? same.find((i) => i.id === deck.ids[deck.at]) : null;

  return (
    <div className="v2-stack" style={{ gap: 14 }} id="scan">
      <section className="v2-card tight sh-howcard">
        <span className="sh-howlbl">How the scan works</span>
        <Flow
          label="How the scan works"
          steps={[
            { icon: "scan", title: "We scan your showcase", note: "Every day, every product" },
            { icon: "tag", title: "Same product, better rate", note: "Higher commission" },
            { icon: "plus", title: "Add all in one tap", note: "You approve every change" },
            { icon: "check", title: "TikTok confirms", note: "Then it counts" },
          ]}
        />
      </section>

      <section className={`sh-hub ${scanning ? "busy" : ""}`} aria-label="Showcase scanner" style={{ "--hold": hold } as React.CSSProperties}>
        <span className="sh-grid" aria-hidden="true" />
        <div className="sh-top">
          <div className="sh-left">
            {linked && same.length > 0 && !scanning && (
              <button type="button" className="ss-entry" onClick={() => setStory(true)}>
                <span className="ss-ring">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={CREATOR.photo} alt="" /></span>
                <span><b>Your scan recap</b><small>{same.length} better rates found · watch</small></span>
                <Icon name="arrow" size={16} />
              </button>
            )}
            <span className="sh-kicker"><i />{scanning ? "Scanning your showcase…" : "Showcase scanner"}</span>
            <h2>
              <b><Count key={scanKey} value={linked ? CREATOR.showcaseSize : 0} ms={scanning ? SCAN_MS - 300 : 900} /></b> products checked
            </h2>
            <p>{linked ? `Last scan ${last}` : "Link TikTok Shop and we check every product you promote"}</p>
            <div className="sh-stats">
              <span><b>{linked ? same.length : "–"}</b><small>can pay more</small></span>
              <span><b>{linked && top ? `+${top}%` : "–"}</b><small>best increase</small></span>
              <span><b>{sims.length}</b><small>similar on Rezekii</small></span>
            </div>
            {linked && same.length > 0 && !scanning && !deck && <p className="sh-tip"><Icon name="spark" size={14} /> Tap a product on the radar to swipe through them</p>}
          </div>
          <div className="sh-radar" style={{ "--sweep": `${scanning ? 1.2 : SWEEP_S}s` } as React.CSSProperties}>
            <span className="sh-rings" aria-hidden="true" />
            <span className="sh-sweep" aria-hidden="true" />
            {/* The big button in the middle (owner, 28 Oct 2026): press and hold to scan. */}
            <button
              type="button"
              className={`sh-core${hold >= 1 ? " full" : ""}`}
              onPointerDown={holdDown}
              onPointerUp={holdUp}
              onPointerCancel={holdUp}
              onClick={(e) => { if (e.detail === 0) scanAgain(); }}
              onContextMenu={(e) => e.preventDefault()}
              disabled={scanning}
              aria-label={!linked ? "Link TikTok Shop" : scanning ? "Scanning" : "Scan your showcase. Press and hold"}
            >
              {hold > 0 && <svg className="sh-ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="47" pathLength={100} style={{ strokeDashoffset: 100 - hold * 100 }} /></svg>}
              <Icon name="scan" size={30} />
              <small>{!linked ? "Link to scan" : scanning ? "Scanning" : hold >= 1 ? "Let go" : "Hold to scan"}</small>
            </button>
            {scanning && <span key={`burst-${scanKey}`} className="sh-burst" aria-hidden="true" />}
            {scanning &&
              FLY.map((src, i) => {
                const a = (i * 137.5 * Math.PI) / 180;
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={`${scanKey}-${i}`} className="sh-fly" src={src} alt="" aria-hidden="true" style={{ "--x0": `${50 + Math.sin(a) * 64}%`, "--y0": `${50 - Math.cos(a) * 64}%`, animationDelay: `${i * 0.25}s` } as React.CSSProperties} />
                );
              })}
            {linked &&
              !scanning &&
              same.slice(0, BLIPS.length).map((it, i) => {
                const [deg, dist] = BLIPS[i];
                const rad = (deg * Math.PI) / 180;
                const p = product(it.productId);
                return (
                  <button
                    key={`${it.id}-${scanKey}`}
                    type="button"
                    className={`sh-blip${scanKey ? " pop" : ""}`}
                    style={{ left: `${50 + Math.sin(rad) * dist * 46}%`, top: `${50 - Math.cos(rad) * dist * 46}%`, animationDelay: `${(deg / 360) * SWEEP_S}s`, "--d": `${i * 0.22}s` } as React.CSSProperties}
                    onClick={() => openDeck(it.id)}
                    aria-label={`${p.name}, ${it.from}% to ${it.to}%. Swipe through better rates`}
                  >
                    <span className="sh-bin">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.img} alt="" />
                      <em>{it.from}→<Hidden>{it.to}%</Hidden></em>
                    </span>
                    {scanKey > 0 && <span className="sh-cf" aria-hidden="true">{Array.from({ length: 8 }, (_, k) => <i key={k} style={{ "--a": `${k * 45}deg` } as React.CSSProperties} />)}</span>}
                  </button>
                );
              })}

            {deck && (
              <div className="sh-deck" role="dialog" aria-label="Swipe through better rates" onKeyDown={(e) => { if (e.key === "ArrowRight") decide(true); if (e.key === "ArrowLeft") decide(false); if (e.key === "Escape") closeDeck(false); }}>
                <div className="sh-deckbar">
                  <span>{card ? `${deck.at + 1} of ${deck.ids.length}` : "All done"}</span>
                  <button type="button" className="sh-x" onClick={() => closeDeck(false)} aria-label="Close"><Icon name="x" size={16} /></button>
                </div>
                {card ? (
                  <>
                    <div
                      key={card.id}
                      className={`sh-card${deck.fly ? ` ${deck.fly}` : ""}${drag ? " drag" : ""}`}
                      style={drag ? { transform: `translateX(${drag}px) rotate(${drag / 14}deg)` } : undefined}
                      onPointerDown={(e) => { if ((e.target as HTMLElement).closest("button")) return; e.currentTarget.setPointerCapture(e.pointerId); dragFrom.current = e.clientX; setDrag(0.01); }}
                      onPointerMove={(e) => { if (dragFrom.current !== null) setDrag(e.clientX - dragFrom.current || 0.01); }}
                      onPointerUp={() => { const d = drag; dragFrom.current = null; if (Math.abs(d) > SWIPE_PX) decide(d > 0); else setDrag(0); }}
                      onPointerCancel={() => { dragFrom.current = null; setDrag(0); }}
                    >
                      <span className="sh-stamp keep" style={{ opacity: Math.max(0, Math.min(1, drag / SWIPE_PX)) }}>Add</span>
                      <span className="sh-stamp skip" style={{ opacity: Math.max(0, Math.min(1, -drag / SWIPE_PX)) }}>Skip</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={product(card.productId).img} alt="" draggable={false} />
                      <b>{product(card.productId).name}</b>
                      <small>{product(card.productId).shop} · {product(card.productId).rating.toFixed(1)}★</small>
                      <span className="sh-rate">
                        <span><small>{card.fromLabel}</small>{card.from}%</span>
                        <Icon name="arrow" size={13} />
                        <span className="to"><small>Rezekii</small><Hidden>{card.to}%</Hidden></span>
                      </span>
                    </div>
                    {deck.fly === "right" && <span key={`cf-${deck.at}`} className="sh-cf deck" aria-hidden="true">{Array.from({ length: 10 }, (_, k) => <i key={k} style={{ "--a": `${k * 36}deg` } as React.CSSProperties} />)}</span>}
                    <div className="sh-deckacts">
                      <button type="button" className="skip" onClick={() => decide(false)} aria-label="Skip"><Icon name="x" size={20} width={2.6} /></button>
                      <small>Swipe or tap</small>
                      <button type="button" className="keep" onClick={() => decide(true)} aria-label="Add"><Icon name="check" size={20} width={2.6} /></button>
                    </div>
                  </>
                ) : (
                  <div className="sh-deckend">
                    <b>{deck.kept.length ? `${deck.kept.length} picked` : "Nothing picked"}</b>
                    <small>{deck.kept.length ? "Add them now, or keep them ticked in your list." : "They stay in your list if you change your mind."}</small>
                    {deck.kept.length > 0 && <button type="button" className="sh-go" onClick={() => closeDeck(true)}><Icon name="plus" size={18} width={2.6} /> Add {deck.kept.length}</button>}
                    <button type="button" className="sh-again" onClick={() => closeDeck(false)}>Back to the list</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {linked && (
          <div className="sh-panel">
            <div className="sh-tabs" role="tablist" aria-label="Products that can pay more">
              <button type="button" role="tab" aria-selected={view === "same"} className={view === "same" ? "on" : undefined} onClick={() => { setTab("same"); setUnticked([]); }}>
                Same product <em>{same.length}</em>
              </button>
              <button type="button" role="tab" aria-selected={view === "similar"} className={view === "similar" ? "on" : undefined} onClick={() => { setTab("similar"); setUnticked([]); }}>
                Similar <em>{sims.length}</em>
              </button>
              {bronze && (
                <button type="button" role="tab" aria-selected={view === "silver"} className={`sh-tab-lock${view === "silver" ? " on" : ""}`} onClick={() => setTab("silver")}>
                  <Icon name="lock" size={13} /> Unlock at Silver <em>{unlocks.length}</em>
                </button>
              )}
              <button type="button" className="sh-drop" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
                <span className="sh-thumbs" aria-hidden="true">
                  {thumbs.slice(0, 4).map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={src} src={src} alt="" />
                  ))}
                </span>
                {open ? "Hide list" : `See ${thumbs.length} product${thumbs.length === 1 ? "" : "s"}`}
                <Icon name="arrow" size={15} />
              </button>
            </div>

            {open && view !== "silver" && (
              <ul className="sh-list">
                {list.map((it) => {
                  const p = product(it.productId);
                  const on = !unticked.includes(it.id);
                  return (
                    <li key={it.id} className={fresh.includes(it.id) ? "fresh" : undefined}>
                      <label>
                        <input type="checkbox" checked={on} onChange={() => setUnticked((u) => (on ? [...u, it.id] : u.filter((x) => x !== it.id)))} aria-label={`Add ${p.name}`} />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.img} alt="" />
                        <span className="sh-name">
                          <b>{fresh.includes(it.id) && <span className="badge badge-blue">New</span>} {p.name}</b>
                          <small>{p.rating < 4 && <span className={p.rating < 3 ? "sh-rt bad" : "sh-rt"}>{p.rating.toFixed(1)}★</span>}{p.shop} · {it.note}</small>
                        </span>
                        <span className="sh-rate" aria-label={`${it.fromLabel} ${it.from}%, through Techwide ${it.to}%`}>
                          <span><small>{it.fromLabel}</small>{it.from}%</span>
                          <Icon name="arrow" size={13} />
                          <span className="to"><small>Rezekii</small><Hidden>{it.to}%</Hidden></span>
                        </span>
                      </label>
                    </li>
                  );
                })}
                {list.length === 0 && <li className="sh-empty">All added. We re-check your showcase every day.</li>}
              </ul>
            )}

            {open && view === "silver" && (
              <ul className="sh-list sh-locked">
                {unlocks.map((p) => (
                  <li key={p.id}>
                    <div className="sh-lockrow">
                      <span className="sh-lockimg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.img} alt="" />
                        <i><Icon name="lock" size={13} width={2.6} /></i>
                      </span>
                      <span className="sh-name">
                        <b>{p.name}</b>
                        <small>{p.shop}{p.samples === "advanced" ? " · free sample at Silver" : ""}</small>
                      </span>
                      <span className="sh-rate" aria-label={`Now ${p.publicRate}%, at Silver ${p.tapRate}%`}>
                        <span><small>Now</small>{p.publicRate}%</span>
                        <Icon name="arrow" size={13} />
                        <span className="to"><small>At Silver</small><Hidden>{p.tapRate}%</Hidden></span>
                      </span>
                    </div>
                  </li>
                ))}
                <li className="sh-lockline">Reach Silver to unlock these: {LEVELS[1].how}. More sales this month moves you up.</li>
              </ul>
            )}

            {pending.length > 0 && (
              <div className="sh-added">
                <b>Added today</b>
                {pending.map((x) => (
                  <span key={x.id} className={x.state}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={product(x.productId).img} alt="" />
                    {x.state === "checking" ? <><span className="cr1-spin xs" aria-hidden="true" /> Checking with TikTok</> : <><Icon name="check" size={13} width={3} /> Live at {x.to}%</>}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="sh-acts">
          {!linked ? (
            <button type="button" className="sh-go" onClick={() => setLinked(true)}>Link TikTok Shop <Icon name="arrow" size={18} /></button>
          ) : view === "silver" ? (
            <Link href="/app/account#level" className="sh-go"><Icon name="medal" size={18} /> How to reach Silver</Link>
          ) : list.length > 0 ? (
            <button type="button" className="sh-go" onClick={() => add(picked)} disabled={scanning || picked.length === 0}>
              <Icon name="plus" size={18} width={2.6} /> {allPicked ? `Add all ${list.length}${view === "similar" ? " similar" : ""} in one tap` : `Add ${picked.length} selected`}
            </button>
          ) : (
            <span className="sh-clear"><Icon name="check" size={16} width={3} /> All added</span>
          )}
          {/* Two ways to scan (owner, 28 Oct 2026): hold the big button in the middle, or tap this one, no hold needed. */}
          {linked && (
            <button type="button" className="sh-again" onClick={scanAgain} disabled={scanning}>
              <Icon name="refresh" size={16} /> {scanning ? "Scanning…" : "Scan now"}
            </button>
          )}
        </div>
      </section>

      {bulk && (
        <Sheet title={bulk.phase === "done" ? "Done" : `Adding ${bulk.items.length} products`} onClose={closeBulk}>
          {bulk.phase === "done" && (
            <div className="cr1-bulksum">
              <span><b>{bulk.items.length}</b><small>added</small></span>
              <span><b>+{Math.max(...bulk.items.map((i) => i.to - i.from))}%</b><small>best increase</small></span>
            </div>
          )}
          <div className="v2-divide">
            {bulk.items.map((it) => {
              const p = product(it.productId);
              const ok = bulk.doneIds.includes(it.id);
              return (
                <div key={it.id} className="cr1-bulkrow">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt="" />
                  <span>
                    <strong>{p.name}</strong>
                    <small>{it.fromLabel} {it.from}% → Rezekii <Hidden>{it.to}%</Hidden></small>
                  </span>
                  {ok ? <span className="cr1-st ok cr1-pop"><Icon name="check" size={16} width={3} /></span> : <span className="cr1-spin" aria-label="Adding" />}
                </div>
              );
            })}
          </div>
          {bulk.phase === "done" ? (
            <>
              <p className="v2-small" style={{ margin: 0 }}>We&apos;re re-reading your showcase now. Each one counts once TikTok confirms it&apos;s under Techwide.</p>
              <button type="button" className="np-btn" onClick={closeBulk}>Done</button>
            </>
          ) : (
            <p className="v2-small" style={{ margin: 0 }}>Adding through Techwide, up to 5 at a time. Keep this open or close it; it carries on either way.</p>
          )}
        </Sheet>
      )}
      {story && (
        <ScanStory
          checked={CREATOR.showcaseSize}
          items={[
            ...same.map((it) => ({ id: it.id, productId: it.productId, from: it.from, to: it.to })),
            ...pending.filter((p) => !p.id.startsWith("sim-")).map((p) => ({ id: p.id, productId: p.productId, from: p.from, to: p.to, added: true })),
          ]}
          onAdd={(ids) => add(same.filter((it) => ids.includes(it.id)))}
          onClose={() => setStory(false)}
        />
      )}
    </div>
  );
}
