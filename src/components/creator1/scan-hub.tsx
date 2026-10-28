"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Count, Hidden, Lock, Sheet } from "@/components/ui";
import { CREATOR, RAISES, SIMILAR, product, rm, type Raise } from "@/lib/mock";
import { NEW_ON_RESCAN, NOT_ELIGIBLE, REFUSED } from "@/lib/mock-creator1";

type Bulk = { phase: "working" | "done"; ids: string[]; doneIds: string[]; skipped: Raise[] };
type Pending = { id: string; productId: string; tapRate: number; state: "checking" | "confirmed" };

/** Where each better rate sits on the radar: angle (deg, clockwise from the top) and distance from the centre (0–1). */
const BLIPS: [number, number][] = [[38, 0.72], [104, 0.5], [162, 0.8], [228, 0.6], [292, 0.78], [334, 0.42], [70, 0.86]];
const SWEEP_S = 4;
const SCAN_MS = 4200;

/**
 * Home's scanner (blueprint W4): the showcase scan as a live radar, every better rate on the same products, one tap to add
 * them all, then similar products. Replaces the separate Scan results page.
 */
export function ScanHub() {
  const { linked, setLinked, toast } = useDemo();
  const [rows, setRows] = useState<Raise[]>(RAISES);
  const [leaving, setLeaving] = useState<string[]>([]);
  const [fresh, setFresh] = useState<string[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [simAdded, setSimAdded] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanKey, setScanKey] = useState(0);
  const [last, setLast] = useState("today 09:12");
  const [bulk, setBulk] = useState<Bulk | null>(null);
  const [asked, setAsked] = useState<string[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

  const eligible = rows.filter((r) => r.eligible && !leaving.includes(r.id));
  const better = rows.length;

  /** Animate rows out, then move them to "Added today", where TikTok confirms them a moment later. */
  function leave(ids: string[]) {
    setLeaving((l) => [...l, ...ids]);
    later(() => {
      setRows((rs) => rs.filter((r) => !ids.includes(r.id)));
      setPending((p) => [...rows.filter((r) => ids.includes(r.id)).map((r) => ({ id: r.id, productId: r.productId, tapRate: r.tapRate, state: "checking" as const })), ...p]);
    }, 430);
    later(() => setPending((p) => p.map((x) => (ids.includes(x.id) ? { ...x, state: "confirmed" } : x))), 3200);
  }

  function addAll() {
    if (!linked) return setLinked(true);
    const ids = eligible.map((r) => r.id);
    setBulk({ phase: "working", ids, doneIds: [], skipped: rows.filter((r) => !r.eligible) });
    ids.forEach((id, i) => later(() => setBulk((b) => (b ? { ...b, doneIds: [...b.doneIds, id] } : b)), 450 * (i + 1)));
    later(() => setBulk((b) => (b ? { ...b, phase: "done" } : b)), 450 * ids.length + 350);
  }

  function closeBulk() {
    if (bulk) {
      leave(bulk.ids);
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
        toast("Scan finished: 1 new better rate");
      } else toast("Scan finished: nothing new since your last scan");
    }, SCAN_MS);
  }

  const refused = product(REFUSED.productId);

  return (
    <div className="v2-stack" style={{ gap: 14 }} id="scan">
      <section className={`sh-hub ${scanning ? "busy" : ""}`} aria-label="Showcase scanner">
        <span className="sh-grid" aria-hidden="true" />
        <div className="sh-left">
          <span className="sh-kicker"><i />{scanning ? "Scanning your showcase…" : "Showcase scanner"}</span>
          <h2>
            <b><Count key={scanKey} value={linked ? CREATOR.showcaseSize : 0} ms={scanning ? SCAN_MS - 300 : 900} /></b> products checked
          </h2>
          <p>{linked ? `Last scan ${last} · rates for your level (${CREATOR.level})` : "Link TikTok Shop and we check every product you promote"}</p>
          <div className="sh-stats">
            <span><b>{linked ? better : "–"}</b><small>better rates</small></span>
            <span><b>{linked ? eligible.length : "–"}</b><small>ready to add</small></span>
            <span><b>{SIMILAR.length}</b><small>similar products</small></span>
          </div>
          <div className="sh-acts">
            {!linked ? (
              <button type="button" className="sh-go" onClick={() => setLinked(true)}>Link TikTok Shop <Icon name="arrow" size={18} /></button>
            ) : eligible.length > 0 ? (
              <button type="button" className="sh-go" onClick={addAll} disabled={scanning}><Icon name="plus" size={18} width={2.6} /> Add all {eligible.length} in one tap</button>
            ) : (
              <span className="sh-clear"><Icon name="check" size={16} width={3} /> All better rates added</span>
            )}
            <button type="button" className="sh-again" onClick={scanAgain} disabled={scanning}>
              <Icon name="refresh" size={16} /> {scanning ? "Scanning…" : "Scan again"}
            </button>
          </div>
        </div>

        <div className="sh-radar" aria-hidden="true" style={{ "--sweep": `${scanning ? 1.2 : SWEEP_S}s` } as React.CSSProperties}>
          <span className="sh-rings" />
          <span className="sh-sweep" />
          <span className="sh-core"><Icon name="scan" size={22} /></span>
          {linked &&
            rows.slice(0, BLIPS.length).map((r, i) => {
              const [deg, dist] = BLIPS[i];
              const rad = (deg * Math.PI) / 180;
              const p = product(r.productId);
              return (
                <span
                  key={r.id}
                  className={`sh-blip ${leaving.includes(r.id) ? "out" : ""}`}
                  style={{ left: `${50 + Math.sin(rad) * dist * 46}%`, top: `${50 - Math.cos(rad) * dist * 46}%`, animationDelay: `${(deg / 360) * SWEEP_S}s` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt="" />
                  <em>{r.nowRate === null ? "?" : `${r.nowRate}`}→<Hidden>{r.tapRate}%</Hidden></em>
                </span>
              );
            })}
        </div>
      </section>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">Same products, better commission <span className="badge">{better}</span></h2>
        </div>
        <p className="v2-small" style={{ margin: 0 }}>
          Products already in your showcase, paying more through Techwide&apos;s TAP campaigns. <b>Your rate</b>{" "}is what TikTok gives you today;
          when we can&apos;t read it, we say so. How much more depends on the product, your level and your sales: often +1%, sometimes more.
        </p>
        <Lock what="your scan results">
          <div className="v2-divide">
            {rows.map((r) => {
              const p = product(r.productId);
              const out = leaving.includes(r.id);
              return (
                <div key={r.id} className={`cr1-raise ${out ? "cr1-out" : ""} ${fresh.includes(r.id) ? "cr1-fresh" : ""}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt="" />
                  <div className="cr1-raise-main">
                    <strong>
                      {fresh.includes(r.id) && <span className="badge badge-blue" style={{ marginRight: 6 }}>New</span>}
                      {p.name}
                    </strong>
                    <small>{p.shop} · {rm(p.price)} · valid until {r.until}</small>
                    <div className="cr1-rates">
                      <span className="cr1-rate"><small>Your rate</small><b className="was">{r.nowRate === null ? "Unknown" : `${r.nowRate}%`}</b></span>
                      <Icon name="arrow" size={16} />
                      <span className="cr1-rate"><small>Through Techwide</small><b className="now"><Hidden>{r.tapRate}%</Hidden></b></span>
                      {r.nowRate === null && <span className="badge badge-gray">Can&apos;t compare</span>}
                    </div>
                    {r.eligible ? (
                      <small className="cr1-elig"><Icon name="check" size={14} width={3} /> You&apos;re eligible</small>
                    ) : (
                      <small className="cr1-noelig"><Icon name="alert" size={14} /> {NOT_ELIGIBLE[r.id] ?? "You don't meet this campaign's conditions yet."}</small>
                    )}
                  </div>
                  <div className="cr1-raise-act">
                    {!r.eligible && (
                      <button
                        type="button"
                        className="btn-outline v2-btn-sm"
                        disabled={asked.includes(r.id)}
                        onClick={() => { setAsked((a) => [...a, r.id]); toast("Sent to the Techwide team. We'll reply in Notifications."); }}
                      >
                        {asked.includes(r.id) ? "Asked" : "Ask Techwide"}
                      </button>
                    )}
                    {r.eligible && out && <span className="badge cr1-inline"><Icon name="check" size={13} width={3} /> Added</span>}
                  </div>
                </div>
              );
            })}
            {rows.length === 0 && (
              <div className="cr1-allclear">
                <span className="v2-medal green" style={{ width: 64, height: 64 }}><Icon name="check" size={28} width={2.6} /></span>
                <b>All caught up</b>
                <span className="v2-muted">You&apos;ve added every better rate we found. We re-check your showcase every day and tell you about new ones.</span>
              </div>
            )}
            <div className="cr1-refused">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={refused.img} alt="" />
              <div className="cr1-raise-main">
                <strong>{refused.name}</strong>
                <small>{refused.shop} · tried 27 Oct</small>
                <span className="cr1-refnote">
                  <Icon name="x" size={14} width={2.6} /> TikTok didn&apos;t accept this product (&lsquo;{REFUSED.tiktok}&rsquo;) · hidden for 30 days
                </span>
              </div>
              <div className="cr1-raise-act">
                <button type="button" className="btn-outline v2-btn-sm" onClick={() => toast("The Techwide team will follow up with TikTok and tell you what they find")}>Ask Techwide to follow up</button>
              </div>
            </div>
          </div>
        </Lock>

        {pending.length > 0 && (
          <div className="cr1-pending">
            <h3 className="v2-h2" style={{ fontSize: 16 }}>Added today</h3>
            <div className="v2-divide">
              {pending.map((x) => {
                const p = product(x.productId);
                return (
                  <div key={x.id} className="v2-prow">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.img} alt="" />
                    <span>
                      <strong>{p.name}</strong>
                      <small>Now <Hidden>{x.tapRate}%</Hidden> through Techwide</small>
                    </span>
                    <span className="v2-acts">
                      {x.state === "checking" ? (
                        <span className="badge badge-amber cr1-inline"><span className="cr1-spin xs" aria-hidden="true" /> Checking with TikTok</span>
                      ) : (
                        <span className="badge cr1-inline cr1-pop"><Icon name="check" size={13} width={3} /> Live under Techwide</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="v2-card">
        <div className="v2-card-h">
          <h2 className="v2-h2">Similar products <span className="badge badge-gray">{SIMILAR.length}</span></h2>
          {simAdded.length < SIMILAR.length && (
            <button
              type="button"
              className="btn-outline v2-btn-sm"
              onClick={() => {
                if (!linked) return setLinked(true);
                setSimAdded([...SIMILAR]);
                toast(`Added ${SIMILAR.length} similar products to your showcase`);
              }}
            >
              <Icon name="plus" size={16} /> Add all {SIMILAR.length}
            </button>
          )}
        </div>
        <p className="v2-small" style={{ margin: 0 }}>A different listing in the same category at a similar price, in Techwide&apos;s campaigns. No rate to compare.</p>
        <div className="v2-divide">
          {SIMILAR.map((id) => {
            const p = product(id);
            const done = simAdded.includes(id);
            return (
              <div key={id} className="v2-prow">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt="" />
                <span>
                  <strong>{p.name}</strong>
                  <small>{p.shop} · {p.category} · {rm(p.price)}</small>
                </span>
                <span className="v2-acts">
                  <span className="badge">Earn <Hidden>{p.tapRate}%</Hidden></span>
                  {done && <span className="badge cr1-inline"><Icon name="check" size={13} width={3} /> Added</span>}
                </span>
              </div>
            );
          })}
        </div>
        <details className="sh-how">
          <summary>How the scan works</summary>
          <ul className="cr1-how">
            <li>We only compare the same product. Similar products are shown apart and never mixed into the comparison.</li>
            <li>Rates are for your level ({CREATOR.level}). After you add, we re-read your showcase; a product counts once TikTok confirms it&apos;s under Techwide.</li>
            <li>We re-scan every day and tell you when something new turns up. If TikTok turns a product down, we hide it for 30 days.</li>
          </ul>
        </details>
      </section>

      {bulk && (
        <Sheet title={bulk.phase === "done" ? "Done" : `Adding ${bulk.ids.length} products`} onClose={closeBulk}>
          {bulk.phase === "done" && (
            <div className="cr1-bulksum">
              <span><b>{bulk.ids.length}</b><small>added</small></span>
              <span className="no"><b>{bulk.skipped.length}</b><small>not eligible</small></span>
            </div>
          )}
          <div className="v2-divide">
            {bulk.ids.map((id) => {
              const r = rows.find((x) => x.id === id);
              if (!r) return null;
              const p = product(r.productId);
              const ok = bulk.doneIds.includes(id);
              return (
                <div key={id} className="cr1-bulkrow">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt="" />
                  <span>
                    <strong>{p.name}</strong>
                    <small>{r.nowRate === null ? "Unknown" : `${r.nowRate}%`} → <Hidden>{r.tapRate}%</Hidden></small>
                  </span>
                  {ok ? <span className="cr1-st ok cr1-pop"><Icon name="check" size={16} width={3} /></span> : <span className="cr1-spin" aria-label="Adding" />}
                </div>
              );
            })}
            {bulk.phase === "done" &&
              bulk.skipped.map((r) => {
                const p = product(r.productId);
                return (
                  <div key={r.id} className="cr1-bulkrow">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.img} alt="" />
                    <span>
                      <strong>{p.name}</strong>
                      <small className="cr1-noelig">Not added: {NOT_ELIGIBLE[r.id] ?? "you don't meet the conditions yet."}</small>
                    </span>
                    <span className="cr1-st no"><Icon name="x" size={14} width={3} /></span>
                  </div>
                );
              })}
          </div>
          {bulk.phase === "done" ? (
            <>
              <p className="v2-small" style={{ margin: 0 }}>We&apos;re re-reading your showcase now. Each one leaves your results once TikTok confirms it&apos;s under Techwide.</p>
              <button type="button" className="np-btn" onClick={closeBulk}>Done</button>
            </>
          ) : (
            <p className="v2-small" style={{ margin: 0 }}>Adding through Techwide, up to 5 at a time. Keep this open or close it; it carries on either way.</p>
          )}
        </Sheet>
      )}
    </div>
  );
}
