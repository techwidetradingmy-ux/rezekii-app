"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Count, Flow, Hidden, Sheet } from "@/components/ui";
import { CREATOR, RAISES, SIMILAR, product, type Raise } from "@/lib/mock";
import { NEW_ON_RESCAN } from "@/lib/mock-creator1";
import { ScanStory } from "@/components/creator1/scan-story";

type Tab = "same" | "similar";
/** One product the creator can move to a better rate: the same listing (raise) or a similar one in TAP. */
type Item = { id: string; productId: string; kind: Tab; from: number; fromLabel: "Yours" | "Open"; to: number; note: string };
type Bulk = { phase: "working" | "done"; items: Item[]; doneIds: string[] };
type Pending = { id: string; productId: string; from: number; to: number; state: "checking" | "confirmed" };

/** Where each better rate sits on the radar: angle (deg, clockwise from the top) and distance from the centre (0–1). */
const BLIPS: [number, number][] = [[38, 0.72], [104, 0.5], [162, 0.8], [228, 0.6], [292, 0.78], [334, 0.42], [70, 0.86]];
const SWEEP_S = 4;
const SCAN_MS = 4200;

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
 */
export function ScanHub() {
  const { linked, setLinked, toast } = useDemo();
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
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const same = rows.filter((r) => r.eligible).map(raiseItem);
  const sims = similar.map(similarItem);
  const list = tab === "same" ? same : sims;
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
      // The recap plays after every scan (owner, 28 Oct 2026: social media vibes, made to share).
      setStory(true);
    }, SCAN_MS);
  }


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

      <section className={`sh-hub ${scanning ? "busy" : ""}`} aria-label="Showcase scanner">
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
          </div>
          <div className="sh-radar" aria-hidden="true" style={{ "--sweep": `${scanning ? 1.2 : SWEEP_S}s` } as React.CSSProperties}>
            <span className="sh-rings" />
            <span className="sh-sweep" />
            <span className="sh-core"><Icon name="scan" size={22} /></span>
            {linked &&
              same.slice(0, BLIPS.length).map((it, i) => {
                const [deg, dist] = BLIPS[i];
                const rad = (deg * Math.PI) / 180;
                return (
                  <span key={it.id} className="sh-blip" style={{ left: `${50 + Math.sin(rad) * dist * 46}%`, top: `${50 - Math.cos(rad) * dist * 46}%`, animationDelay: `${(deg / 360) * SWEEP_S}s` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={product(it.productId).img} alt="" />
                    <em>{it.from}→<Hidden>{it.to}%</Hidden></em>
                  </span>
                );
              })}
          </div>
        </div>

        {linked && (
          <div className="sh-panel">
            <div className="sh-tabs" role="tablist" aria-label="Products that can pay more">
              <button type="button" role="tab" aria-selected={tab === "same"} className={tab === "same" ? "on" : undefined} onClick={() => { setTab("same"); setUnticked([]); }}>
                Same product <em>{same.length}</em>
              </button>
              <button type="button" role="tab" aria-selected={tab === "similar"} className={tab === "similar" ? "on" : undefined} onClick={() => { setTab("similar"); setUnticked([]); }}>
                Similar <em>{sims.length}</em>
              </button>
              <button type="button" className="sh-drop" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
                <span className="sh-thumbs" aria-hidden="true">
                  {list.slice(0, 4).map((i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i.id} src={product(i.productId).img} alt="" />
                  ))}
                </span>
                {open ? "Hide list" : `See ${list.length} product${list.length === 1 ? "" : "s"}`}
                <Icon name="arrow" size={15} />
              </button>
            </div>

            {open && (
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
          ) : list.length > 0 ? (
            <button type="button" className="sh-go" onClick={() => add(picked)} disabled={scanning || picked.length === 0}>
              <Icon name="plus" size={18} width={2.6} /> {allPicked ? `Add all ${list.length}${tab === "similar" ? " similar" : ""} in one tap` : `Add ${picked.length} selected`}
            </button>
          ) : (
            <span className="sh-clear"><Icon name="check" size={16} width={3} /> All added</span>
          )}
          <button type="button" className="sh-again" onClick={scanAgain} disabled={scanning}>
            <Icon name="refresh" size={16} /> {scanning ? "Scanning…" : "Scan again"}
          </button>
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
