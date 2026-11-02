"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { AiMark, AiTag, Count, Flow, Hidden, Sheet } from "@/components/ui";
import { CREATOR, LIVE_PRODUCTS, LIVE_STUBS, PRODUCTS, RAISES, SIMILAR, bestRate, product, type Raise, rateFor } from "@/lib/mock";
import { addRaises, loadScan, loadShowcaseCount } from "@/lib/live";
import { NEW_ON_RESCAN, SILVER_UNLOCKS } from "@/lib/mock-creator1";
import { LEVELS } from "@/lib/mock-creator2";
import { productHref } from "@/lib/product-view";
import { useKept } from "@/lib/keep";
import { useLang, useT } from "@/lib/i18n/client";
import { dateLocale, tx, type Lang } from "@/lib/i18n/lang";

type Tab = "same" | "similar" | "silver";
/**
 * Where her rate now comes from, as the cards label it (translated where shown). "Open plan", not "Open": that word is the
 * verb (Buka, 打开) everywhere else, so "Target plan" matches it.
 */
const FROM = { target: tx("Target plan"), open: tx("Open plan"), now: tx("Now") } as const;
/** One product the creator can move to a better rate: the same listing (raise) or a similar one in TAP. `until`: the raise's end date. */
type Item = { id: string; productId: string; kind: "same" | "similar"; from: number; fromLabel: string; to: number; until: string };
type Bulk = { phase: "working" | "done"; items: Item[]; doneIds: string[] };
type Pending = { id: string; productId: string; from: number; to: number; state: "checking" | "confirmed" };
/** Tap-and-swipe through the better rates, one card at a time (owner, 28 Oct 2026). */
type Deck = { ids: string[]; at: number; kept: string[]; fly: "left" | "right" | null };

/** After a scan, up to 6 better rates sit evenly on one ring (owner, 28 Oct 2026: tidy, not scattered). */
const RING_MAX = 6;
const RING_DIST = 0.8;
const SWEEP_S = 4;
const SCAN_MS = 4200;
/** About how long a real scan takes: TikTok gives 20 showcase products a page, about 1.1 seconds each (791 took ~47 s). */
const scanSeconds = (count: number | null) => Math.round(5 + Math.ceil((count || 400) / 20) * 1.1);
/** About how long adding takes: 5 products at a time, about 3 seconds a round. */
const addSeconds = (n: number) => 2 + Math.ceil(n / 5) * 3;
const scanTime = (t: number, lang: Lang) => new Date(t).toLocaleString(dateLocale(lang), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
/** A translated line whose {placeholders} are React elements (an animated count, a blurred rate). */
const fillEl = (line: string, els: Record<string, React.ReactNode>) => line.split(/\{(\w+)\}/).map((s, i) => (i % 2 ? <Fragment key={i}>{els[s]}</Fragment> : s));
const HOLD_MS = 900;
const SWIPE_PX = 70;
/** Her showcase photos that fly into the radar while it scans. */
const FLY = PRODUCTS.slice(0, 13).map((p) => p.img);

/** "From" is her highest rate now: her target plan if she has one, else the open plan (owner, 30 Oct 2026). */
const raiseItem = (r: Raise): Item => {
  const now = bestRate(product(r.productId));
  // A real scan gives her rate now from TikTok (target or open plan), so it's labelled "Now".
  const fromLabel = LIVE_STUBS.has(r.productId) || LIVE_PRODUCTS.has(r.productId) ? FROM.now : now.plan === "Target plan" ? FROM.target : FROM.open;
  return { id: r.id, productId: r.productId, kind: "same", from: r.nowRate ?? now.rate, fromLabel, to: r.tapRate, until: r.until };
};
const similarItem = (id: string): Item => {
  const p = product(id);
  const now = bestRate(p);
  return { id: `sim-${id}`, productId: id, kind: "similar", from: now.rate, fromLabel: now.plan === "Target plan" ? FROM.target : FROM.open, to: rateFor(p).rate, until: "" };
};

/**
 * Home's scanner (blueprint W4): how it works on top, the scan as a live radar, and one card holding every product that can
 * pay more (same listing or similar), folded into a list with a tick each and one button to add them all.
 * Motion (owner, 28 Oct 2026): hold to scan, her product photos fly into the radar, better rates pop back out, and a tap on
 * one opens a card deck to swipe through. Bronze creators also see a quiet "Unlock at Silver" tab.
 */
export function ScanHub() {
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const { linked, setLinked, toast, bronze, live } = useDemo();
  const [rows, setRows] = useState<Raise[]>(RAISES);
  // Signed in (owner, 30 Oct 2026): her real showcase scan replaces the sample.
  // Her exact showcase size, every page counted (owner, 1 Nov 2026); null while it's being checked.
  const [checked, setChecked] = useState<number | null>(CREATOR.showcaseSize);
  // When her last scan ran (owner, 2 Nov 2026: it scans only when she taps Scan): 0 before her first, null while loading.
  const [scannedAt, setScannedAt] = useState<number | null>(null);
  useEffect(() => {
    if (!live) return;
    // Signed in, no sample numbers ever: clear them while hers load. Not linked yet: nothing of hers to show.
    setRows([]);
    setSimilar([]);
    setChecked(null);
    if (!linked) return;
    loadScan().then((s) => {
      setScannedAt(s?.at ?? 0);
      if (!s) return;
      setRows(s.raises);
      setSimilar([]);
    });
    loadShowcaseCount().then((n) => setChecked(n ?? 0));
  }, [live, linked]);
  const [similar, setSimilar] = useState<string[]>(SIMILAR);
  const [tab, setTab] = useKept<Tab>("scan-tab", "same");
  const [open, setOpen] = useKept("scan-open", false);
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
  // How long this scan usually takes, in seconds, for the progress bar.
  const [scanFor, setScanFor] = useState(SCAN_MS / 1000);
  const [bulk, setBulk] = useState<Bulk | null>(null);
  const [hold, setHold] = useState(0);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [drag, setDrag] = useState(0);
  const timers = useRef<number[]>([]);
  const holdRaf = useRef(0);
  const holdFrom = useRef(0);
  const dragFrom = useRef<number | null>(null);

  useEffect(() => () => { timers.current.forEach((t) => window.clearTimeout(t)); cancelAnimationFrame(holdRaf.current); }, []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const view: Tab = tab === "silver" && !bronze ? "same" : tab;
  const same = rows.filter((r) => r.eligible).map(raiseItem);
  const sims = similar.map(similarItem).filter((i) => i.to > i.from);
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
    if (live) {
      // For real: TikTok Shop adds them through Techwide's TAP campaign.
      addRaises(items.map((i) => i.productId))
        .then((r) => {
          setBulk((b) => (b ? { ...b, phase: "done", doneIds: items.filter((i) => r.added.includes(i.productId)).map((i) => i.id) } : b));
          if (r.failed.length) toast(t("{n} not added: {error}", { n: r.failed.length, error: t(r.failed[0].error) }));
        })
        .catch(() => {
          setBulk(null);
          toast(t("Couldn't reach TikTok Shop. Please try again."));
        });
      return;
    }
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
      if (bulk.phase === "working") toast(t("Still adding in the background. We'll tell you when it's done."));
    }
    setBulk(null);
  }

  function scanAgain() {
    if (!linked) return setLinked(true);
    setDeck(null);
    setScanning(true);
    setScanKey((k) => k + 1);
    if (live) {
      // A real scan of her showcase; the radar runs at least as long as the scan. The same read gives her showcase size.
      const started = Date.now();
      setScanFor(scanSeconds(checked));
      loadScan(true).then((s) => {
        later(() => {
          setScanning(false);
          setLast("just now");
          if (!s) return toast(t("Couldn't reach TikTok Shop. Please try again."));
          setScannedAt(s.at ?? Date.now());
          if (s.count !== null) setChecked(s.count);
          setRows(s.raises);
          if (s.raises.length) {
            setTab("same");
            setOpen(true);
          }
          const n = s.raises.length;
          toast(n ? (n === 1 ? t("Scan finished: {n} better rate", { n }) : t("Scan finished: {n} better rates", { n })) : t("Scan finished: no better rates right now"));
        }, Math.max(0, SCAN_MS - (Date.now() - started)));
      });
      return;
    }
    later(() => {
      setScanning(false);
      setLast("just now");
      const isNew = !rows.some((r) => r.id === NEW_ON_RESCAN.id) && !pending.some((p) => p.id === NEW_ON_RESCAN.id);
      if (isNew) {
        setRows((rs) => [NEW_ON_RESCAN, ...rs]);
        setFresh([NEW_ON_RESCAN.id]);
        setTab("same");
        setOpen(true);
        toast(t("Scan finished: 1 new better rate"));
      } else toast(t("Scan finished: nothing new since your last scan"));
    }, SCAN_MS);
  }

  /* Hold to scan: the ring fills while she holds; letting go when it's full starts the scan. */
  function holdDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (scanning) return;
    if (!linked) return setLinked(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    navigator.vibrate?.(8);
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
    else toast(t("Keep holding until the ring is full"));
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
        <span className="sh-howlbl">{t("How the scan works")}</span>
        <Flow
          label={t("How the scan works")}
          steps={[
            { icon: "scan", title: t("We scan your showcase"), note: t("Every product, when you tap Scan") },
            { icon: "tag", title: t("Same product, better rate"), note: t("Higher commission") },
            { icon: "plus", title: t("Add all in one tap"), note: t("You approve every change") },
            { icon: "check", title: t("TikTok confirms"), note: t("Then it counts") },
          ]}
        />
      </section>

      <section className={`sh-hub ${scanning ? "busy" : ""}`} aria-label={t("Showcase scanner")} style={{ "--hold": hold } as React.CSSProperties}>
        <span className="sh-grid" aria-hidden="true" />
        <div className="sh-top">
          <div className="sh-left">
            <span className="sh-kicker"><AiMark size={22} busy={scanning} />{scanning ? t("Scanning Your Showcase…") : t("Showcase Scanner")} <AiTag label="Rezekii AI" bare /></span>
            {linked && checked === null ? (
              <h2 className="sh-checking"><span className="cr1-spin xs" aria-hidden="true" /> {t("Checking your showcase…")}</h2>
            ) : (
              <h2>
                {fillEl(t("{n} products checked"), { n: <b><Count key={scanKey} value={linked ? checked ?? 0 : 0} ms={scanning ? SCAN_MS - 300 : 900} /></b> })}
              </h2>
            )}
            {!linked && <p>{t("Link TikTok Shop and we check every product you promote")}</p>}
            <div className="sh-stats">
              <span><b>{linked ? same.length : "–"}</b><small>{t("can pay more")}</small></span>
              <span><b>{linked && top ? `+${top}%` : "–"}</b><small>{t("best increase")}</small></span>
              <span><b>{sims.length}</b><small>{t("similar on Rezekii")}</small></span>
            </div>
            {linked && scanKey > 0 && same.length > 0 && !scanning && !deck && <p className="sh-tip"><Icon name="spark" size={14} /> {t("Tap a product on the radar to swipe through them")}</p>}
            {/* The scan's progress and usual time (owner, 2 Nov 2026: long jobs show how long they take). */}
            {live && scanning && (
              <div className="sh-progress" role="status">
                <span className="sh-bar" aria-hidden="true"><i key={scanKey} style={{ animationDuration: `${scanFor}s` }} /></span>
                <small>
                  {scanFor < 60
                    ? checked
                      ? t("Reading every product from TikTok Shop. Usually about {n} seconds for {count} products.", { n: scanFor, count: checked.toLocaleString() })
                      : t("Reading every product from TikTok Shop. Usually about {n} seconds.", { n: scanFor })
                    : checked
                      ? t("Reading every product from TikTok Shop. Usually about {n} minutes for {count} products.", { n: Math.round(scanFor / 60), count: checked.toLocaleString() })
                      : t("Reading every product from TikTok Shop. Usually about {n} minutes.", { n: Math.round(scanFor / 60) })}
                </small>
              </div>
            )}
            {live && linked && !scanning && scannedAt !== null && <p className="sh-last">{scannedAt ? t("Last Scan: {when}", { when: scanTime(scannedAt, lang) }) : t("Not scanned yet. Hold the button to scan.")}</p>}
          </div>
          <div className="sh-radar" style={{ "--sweep": `${scanning ? 1.2 : SWEEP_S}s` } as React.CSSProperties}>
            <span className="sh-rings" aria-hidden="true" />
            <span className="sh-sweep" aria-hidden="true" />
            {/* The big button in the middle (owner, 28 Oct 2026): press and hold to scan. */}
            <button
              type="button"
              className={`sh-core${hold >= 1 ? " full" : hold > 0 ? " holding" : ""}`}
              onPointerDown={holdDown}
              onPointerUp={holdUp}
              onPointerCancel={holdUp}
              onClick={(e) => { if (e.detail === 0) scanAgain(); }}
              onContextMenu={(e) => e.preventDefault()}
              disabled={scanning}
              aria-label={!linked ? t("Link TikTok Shop") : scanning ? t("Scanning") : t("Scan your showcase. Press and hold")}
            >
              {/* Option A (owner, 29 Oct 2026): a ring that fills while she holds, like an Apple Watch activity ring. */}
              <svg className="sh-ring" viewBox="0 0 100 100" aria-hidden="true"><circle className="track" cx="50" cy="50" r="47" pathLength={100} /><circle cx="50" cy="50" r="47" pathLength={100} style={{ strokeDashoffset: 100 - hold * 100, opacity: hold > 0 ? 1 : 0 }} /></svg>
              <Icon name="scan" size={30} />
              <small>{!linked ? t("Link to scan") : scanning ? t("Scanning") : hold >= 1 ? t("Let go") : t("Hold to scan")}</small>
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
            {/* The radar stays empty until she scans (owner, 28 Oct 2026). */}
            {linked &&
              scanKey > 0 &&
              !scanning &&
              same.slice(0, RING_MAX).map((it, i, ring) => {
                const deg = (i * 360) / ring.length;
                const rad = (deg * Math.PI) / 180;
                const p = product(it.productId);
                return (
                  <button
                    key={`${it.id}-${scanKey}`}
                    type="button"
                    className="sh-blip pop"
                    style={{ left: `${50 + Math.sin(rad) * RING_DIST * 46}%`, top: `${50 - Math.cos(rad) * RING_DIST * 46}%`, animationDelay: `${(deg / 360) * SWEEP_S}s`, "--d": `${i * 0.22}s` } as React.CSSProperties}
                    onClick={() => openDeck(it.id)}
                    aria-label={t("{name}, {from}% to {to}%. Swipe through better rates", { name: p.name, from: it.from, to: it.to })}
                  >
                    <span className="sh-bin">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.img} alt="" />
                    </span>
                    {<span className="sh-cf" aria-hidden="true">{Array.from({ length: 8 }, (_, k) => <i key={k} style={{ "--a": `${k * 45}deg` } as React.CSSProperties} />)}</span>}
                  </button>
                );
              })}

            {deck && (
              <div className="sh-deck" role="dialog" aria-label={t("Swipe through better rates")} onKeyDown={(e) => { if (e.key === "ArrowRight") decide(true); if (e.key === "ArrowLeft") decide(false); if (e.key === "Escape") closeDeck(false); }}>
                <div className="sh-deckbar">
                  <span>{card ? t("{a} of {b}", { a: deck.at + 1, b: deck.ids.length }) : t("All done")}</span>
                  <button type="button" className="sh-x" onClick={() => closeDeck(false)} aria-label={t("Close")}><Icon name="x" size={16} /></button>
                </div>
                {card ? (
                  <>
                    <div
                      key={card.id}
                      className={`sh-card${deck.fly ? ` ${deck.fly}` : ""}${drag ? " drag" : ""}`}
                      style={drag ? { transform: `translateX(${drag}px) rotate(${drag / 14}deg)` } : undefined}
                      onPointerDown={(e) => { if ((e.target as HTMLElement).closest("button, a")) return; e.currentTarget.setPointerCapture(e.pointerId); dragFrom.current = e.clientX; setDrag(0.01); }}
                      onPointerMove={(e) => { if (dragFrom.current !== null) setDrag(e.clientX - dragFrom.current || 0.01); }}
                      onPointerUp={() => { const d = drag; dragFrom.current = null; if (Math.abs(d) > SWIPE_PX) decide(d > 0); else setDrag(0); }}
                      onPointerCancel={() => { dragFrom.current = null; setDrag(0); }}
                    >
                      <span className="sh-stamp keep" style={{ opacity: Math.max(0, Math.min(1, drag / SWIPE_PX)) }}>{t("Add")}</span>
                      <span className="sh-stamp skip" style={{ opacity: Math.max(0, Math.min(1, -drag / SWIPE_PX)) }}>{t("Skip")}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={product(card.productId).img} alt="" draggable={false} />
                      {/* The name opens the product; the rest of the card swipes. */}
                      <b><Link href={productHref(card.productId)} className="pv-open">{product(card.productId).name}</Link></b>
                      <span className="sh-rate">
                        <span><small>{t(card.fromLabel)}</small>{card.from}%</span>
                        <Icon name="arrow" size={13} />
                        <span className="to"><small>Rezekii</small><Hidden>{card.to}%</Hidden></span>
                      </span>
                    </div>
                    {deck.fly === "right" && <span key={`cf-${deck.at}`} className="sh-cf deck" aria-hidden="true">{Array.from({ length: 10 }, (_, k) => <i key={k} style={{ "--a": `${k * 36}deg` } as React.CSSProperties} />)}</span>}
                    <div className="sh-deckacts">
                      <button type="button" className="skip" onClick={() => decide(false)} aria-label={t("Skip")}><Icon name="x" size={20} width={2.6} /></button>
                      <small>{t("Swipe or tap")}</small>
                      <button type="button" className="keep" onClick={() => decide(true)} aria-label={t("Add")}><Icon name="check" size={20} width={2.6} /></button>
                    </div>
                  </>
                ) : (
                  <div className="sh-deckend">
                    <b>{deck.kept.length ? t("{n} picked", { n: deck.kept.length }) : t("Nothing picked")}</b>
                    <small>{deck.kept.length ? t("Add them now, or keep them ticked in your list.") : t("They stay in your list if you change your mind.")}</small>
                    {deck.kept.length > 0 && <button type="button" className="sh-go" onClick={() => closeDeck(true)}><Icon name="plus" size={18} width={2.6} /> {t("Add {n}", { n: deck.kept.length })}</button>}
                    <button type="button" className="sh-again" onClick={() => closeDeck(false)}>{t("Back to the List")}</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {linked && (
          <div className="sh-panel">
            <div className="sh-tabs" role="tablist" aria-label={t("Products that can pay more")}>
              <button type="button" role="tab" aria-selected={view === "same"} className={view === "same" ? "on" : undefined} onClick={() => { setTab("same"); setUnticked([]); }}>
                {t("Same product")} <em>{same.length}</em>
              </button>
              <button type="button" role="tab" aria-selected={view === "similar"} className={view === "similar" ? "on" : undefined} onClick={() => { setTab("similar"); setUnticked([]); }}>
                {t("Similar")} <em>{sims.length}</em>
              </button>
              {bronze && (
                <button type="button" role="tab" aria-selected={view === "silver"} className={`sh-tab-lock${view === "silver" ? " on" : ""}`} onClick={() => setTab("silver")}>
                  <Icon name="lock" size={13} /> {t("Unlock at Silver")} <em>{unlocks.length}</em>
                </button>
              )}
              <button type="button" className="sh-drop" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
                <span className="sh-thumbs" aria-hidden="true">
                  {thumbs.slice(0, 4).map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={src} src={src} alt="" />
                  ))}
                </span>
                {open ? t("Hide list") : thumbs.length === 1 ? t("See {n} product", { n: thumbs.length }) : t("See {n} products", { n: thumbs.length })}
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
                        <input type="checkbox" checked={on} onChange={() => setUnticked((u) => (on ? [...u, it.id] : u.filter((x) => x !== it.id)))} aria-label={t("Add {name}", { name: p.name })} />
                        {/* The photo and name open the product; the rest of the row ticks it. */}
                        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
                        <img className="pv-open" src={p.img} alt="" onClick={(e) => { e.preventDefault(); router.push(productHref(p.id)); }} />
                        <span className="sh-name">
                          <b>{fresh.includes(it.id) && <span className="badge badge-blue">{t("New")}</span>} <Link href={productHref(p.id)} className="pv-open">{p.name}</Link></b>
                          {it.until && <small>{t("Until {date}", { date: it.until })}</small>}
                        </span>
                        <span className="sh-rate" aria-label={t("{plan} {from}%, through Techwide {to}%", { plan: t(it.fromLabel), from: it.from, to: it.to })}>
                          <span><small>{t(it.fromLabel)}</small>{it.from}%</span>
                          <Icon name="arrow" size={13} />
                          <span className="to"><small>Rezekii</small><Hidden>{it.to}%</Hidden></span>
                        </span>
                      </label>
                    </li>
                  );
                })}
                {list.length === 0 && <li className="sh-empty">{t("All added. Scan again any time to check for new ones.")}</li>}
              </ul>
            )}

            {open && view === "silver" && (
              <ul className="sh-list sh-locked">
                {unlocks.map((p) => (
                  <li key={p.id}>
                    <div className="sh-lockrow">
                      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                      <span className="sh-lockimg pv-open" onClick={() => router.push(productHref(p.id))}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.img} alt="" />
                        <i><Icon name="lock" size={13} width={2.6} /></i>
                      </span>
                      <span className="sh-name">
                        <b><Link href={productHref(p.id)} className="pv-open">{p.name}</Link></b>
                        {p.samples !== null && p.samples > CREATOR.streak && <small>{t("Free sample at a {n}-day streak", { n: p.samples })}</small>}
                      </span>
                      <span className="sh-rate" aria-label={t("Now {now}%, on Rezekii {rate}%", { now: bestRate(p).rate, rate: rateFor(p).rate })}>
                        <span><small>{t("Now")}</small>{bestRate(p).rate}%</span>
                        <Icon name="arrow" size={13} />
                        <span className="to"><small>{t("On Rezekii")}</small><Hidden>{rateFor(p).rate}%</Hidden></span>
                      </span>
                    </div>
                  </li>
                ))}
                <li className="sh-lockline">{t("Reach Silver to unlock these: {how}. More sales this month moves you up.", { how: t(LEVELS[1].how) })}</li>
              </ul>
            )}

            {pending.length > 0 && (
              <div className="sh-added">
                <b>{t("Added today")}</b>
                {pending.map((x) => (
                  <span key={x.id} className={x.state}>
                    {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
                    <img className="pv-open" src={product(x.productId).img} alt="" onClick={() => router.push(productHref(x.productId))} />
                    {x.state === "checking" ? <><span className="cr1-spin xs" aria-hidden="true" /> {t("Checking with TikTok")}</> : <><Icon name="check" size={13} width={3} /> {t("Live at {n}%", { n: x.to })}</>}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="sh-acts">
          {!linked ? (
            <button type="button" className="sh-go" onClick={() => setLinked(true)}>{t("Link TikTok Shop")} <Icon name="arrow" size={18} /></button>
          ) : view === "silver" ? (
            <Link href="/app/account#level" className="sh-go"><Icon name="medal" size={18} /> {t("How to Reach Silver")}</Link>
          ) : list.length > 0 ? (
            <button type="button" className="sh-go" onClick={() => add(picked)} disabled={scanning || picked.length === 0}>
              <Icon name="plus" size={18} width={2.6} /> {allPicked ? (view === "similar" ? t("Add all {n} similar in one tap", { n: list.length }) : t("Add all {n} in one tap", { n: list.length })) : t("Add {n} selected", { n: picked.length })}
            </button>
          ) : (
            <span className="sh-clear"><Icon name="check" size={16} width={3} /> {t("All added")}</span>
          )}
          {/* Two ways to scan (owner, 28 Oct 2026): hold the big button in the middle, or tap this one, no hold needed. */}
          {linked && (
            <button type="button" className="sh-again" onClick={scanAgain} disabled={scanning}>
              <Icon name="refresh" size={16} /> {scanning ? t("Scanning…") : t("Scan now")}
            </button>
          )}
        </div>
      </section>

      {bulk && (
        <Sheet title={bulk.phase === "done" ? t("Done") : t("Adding {n} products", { n: bulk.items.length })} onClose={closeBulk}>
          {bulk.phase === "done" && (
            <div className="cr1-bulksum">
              <span><b>{bulk.items.length}</b><small>{t("added")}</small></span>
              <span><b>+{Math.max(...bulk.items.map((i) => i.to - i.from))}%</b><small>{t("best increase")}</small></span>
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
                    <small>{t(it.fromLabel)} {it.from}% → Rezekii <Hidden>{it.to}%</Hidden></small>
                  </span>
                  {ok ? <span className="cr1-st ok cr1-pop"><Icon name="check" size={16} width={3} /></span> : <span className="cr1-spin" aria-label={t("Adding")} />}
                </div>
              );
            })}
          </div>
          {bulk.phase === "done" ? (
            <>
              <p className="v2-small" style={{ margin: 0 }}>{t("Each one counts once TikTok confirms it's under Techwide.")}</p>
              <button type="button" className="np-btn" onClick={closeBulk}>{t("Done")}</button>
            </>
          ) : (
            <>
              {/* How long it usually takes (owner, 2 Nov 2026): TikTok adds 5 at a time, a few seconds each round. */}
              {live && <span className="sh-bar sh-bar-sheet" aria-hidden="true"><i style={{ animationDuration: `${addSeconds(bulk.items.length)}s` }} /></span>}
              <p className="v2-small" style={{ margin: 0 }}>
                {!live
                  ? t("Adding through Techwide, up to 5 at a time. Keep this open or close it; it carries on either way.")
                  : bulk.items.length === 1
                    ? t("Adding through Techwide, up to 5 at a time. Usually about {s} seconds for {n} product. Keep this open or close it; it carries on either way.", { s: addSeconds(1), n: 1 })
                    : t("Adding through Techwide, up to 5 at a time. Usually about {s} seconds for {n} products. Keep this open or close it; it carries on either way.", { s: addSeconds(bulk.items.length), n: bulk.items.length })}
              </p>
            </>
          )}
        </Sheet>
      )}
    </div>
  );
}
