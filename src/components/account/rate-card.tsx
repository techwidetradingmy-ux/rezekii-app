"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Portal, Qr, Seg, ShareSheet, Tip } from "@/components/ui";
import { PlatformIcon } from "@/components/creator2/bits";
import { CREATOR, SOCIALS } from "@/lib/mock";

type App = "TikTok" | "Instagram" | "Facebook" | "Threads" | "rights";
type Item = { key: string; app: App; label: string; unit: string };
type Rate = { on: boolean; price: string; days?: number };
type Pack = { id: number; name: string; qty: Record<string, number>; price: string };
type Show = "À la carte" | "Packages" | "Both";

/** What she can sell, per app, plus usage rights for ads (owner, 28 Oct 2026). */
const ITEMS: Item[] = [
  { key: "tt-video", app: "TikTok", label: "TikTok video", unit: "per video" },
  { key: "tt-live", app: "TikTok", label: "TikTok LIVE", unit: "per hour" },
  { key: "ig-reel", app: "Instagram", label: "Instagram Reel", unit: "per Reel" },
  { key: "ig-story", app: "Instagram", label: "Instagram Story", unit: "per Story" },
  { key: "fb-reel", app: "Facebook", label: "Facebook Reel", unit: "per Reel" },
  { key: "fb-post", app: "Facebook", label: "Facebook post", unit: "per post" },
  { key: "th-post", app: "Threads", label: "Threads post", unit: "per post" },
  { key: "rights", app: "rights", label: "Usage rights for ads", unit: "per 30 days" },
];
/** How long a seller may use her video in ads (owner, 29 Oct 2026: she picks the length). */
const DAYS = [7, 14, 30, 60, 90, 180, 365];
const MAX_PACKS = 3;
const SAMPLE: Record<string, string> = { "tt-video": "350", "tt-live": "250", "ig-reel": "300", "ig-story": "120", "fb-reel": "200", "fb-post": "150", "th-post": "80", rights: "400" };
/** TikTok sellers usually buy a paid review with at least 180 days of ad rights (owner, 29 Oct 2026), so that's the default. */
const RIGHTS_TIP = 180;
const rm = (n: number) => `RM ${n.toLocaleString("en-MY")}`;
/** The quote on a shared card holds for 7 days from today (owner, 29 Oct 2026). Preview date: 28 Oct 2026. */
const QUOTE = { from: "28 Oct 2026", until: "4 Nov 2026", days: 7 };
const ACCOUNTS = SOCIALS.filter((s) => s.linked) as { name: "TikTok" | "Instagram" | "Facebook" | "Threads"; handle: string }[];
const num = (s: string) => Math.round(Number(s) || 0);
// In a package, usage rights are counted in days; everything else in pieces.
const unitOf = (it: Item, q: number) => (it.key === "rights" ? `${q} days` : `${q} ${it.unit.replace("per ", "")}${q === 1 ? "" : "s"}`);
/**
 * Suggested packages (owner, 29 Oct 2026: always suggest packages, they're better value): each costs less than the same items
 * bought one by one. These are starting points she edits, not market rates.
 */
const SUGGEST: { name: string; qty: Record<string, number>; off: number }[] = [
  { name: "Growth", qty: { "tt-video": 2, "tt-live": 1, rights: RIGHTS_TIP }, off: 0.2 },
  { name: "TikTok review", qty: { "tt-video": 1, rights: RIGHTS_TIP }, off: 0.15 },
];

/**
 * The ad-rights length: a button like the RM box with a small dropdown under it (owner, 29 Oct 2026: not full screen). The list
 * sits on top of the page, so the card it's in can't clip it; it closes on a tap outside, Escape or scroll.
 */
function DaysPick({ value, onChange, none = false, disabled = false }: { value: number; onChange: (d: number) => void; none?: boolean; disabled?: boolean }) {
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  useEffect(() => {
    if (!at) return;
    const close = () => setAt(null);
    const away = (e: PointerEvent) => { if (!menu.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) close(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [at]);
  const open = () => {
    const r = btn.current!.getBoundingClientRect();
    const right = window.innerWidth - r.right;
    setAt(window.innerHeight - r.bottom > 320 ? { top: r.bottom + 6, right } : { bottom: window.innerHeight - r.top + 6, right });
  };
  return (
    <>
      <button ref={btn} type="button" className="rc-dayspick" disabled={disabled} aria-haspopup="listbox" aria-expanded={!!at} onClick={() => (at ? setAt(null) : open())}>
        <span>{value ? `${value} days` : "None"}</span><Icon name="updown" size={15} width={2.4} />
      </button>
      {at && (
        <Portal>
          <div ref={menu} className="rc-dpmenu" role="listbox" aria-label="Ad rights length" style={at}>
            {[...(none ? [0] : []), ...DAYS].map((d) => (
              <button key={d} type="button" role="option" aria-selected={value === d} className={value === d ? "on" : undefined} onClick={() => { onChange(d); setAt(null); }}>
                <span>{d ? `${d} days` : "None"}</span>{d === RIGHTS_TIP && <i className="rc-rec">Best</i>}{value === d && <Icon name="check" size={14} />}
              </button>
            ))}
          </div>
        </Portal>
      )}
    </>
  );
}

function Icn({ app }: { app: App }) {
  return app === "rights" ? <span className="rc-rights" aria-hidden="true"><Icon name="shield" size={14} /></span> : <PlatformIcon name={app} size={26} />;
}

/**
 * Rate card (owner, 28 Oct 2026): her prices per app (à la carte), up to 3 packages that bundle apps and usage rights, and a
 * choice of what sellers see. Prices can change any time; sellers see the card when they invite her.
 */
export function RateCard() {
  const { toast } = useDemo();
  const [rates, setRates] = useState<Record<string, Rate>>(() => Object.fromEntries(ITEMS.map((it) => [it.key, { on: ["tt-video", "tt-live", "ig-reel", "fb-reel", "rights"].includes(it.key), price: "", ...(it.key === "rights" ? { days: RIGHTS_TIP } : {}) }])));
  const [sharing, setSharing] = useState(false);
  const [showOn, setShowOn] = useState({ whatsapp: true, email: false, accounts: true });
  const [packs, setPacks] = useState<Pack[]>([]);
  const [show, setShow] = useState<Show>("Both");
  const [tried, setTried] = useState(false);

  const live = ITEMS.filter((it) => rates[it.key].on);
  const setRate = (key: string, patch: Partial<Rate>) => setRates((r) => ({ ...r, [key]: { ...r[key], ...patch } }));
  const setPack = (id: number, patch: Partial<Pack>) => setPacks((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  // Usage rights are priced for her chosen length, so a package's days are worked out from that.
  const worth = (key: string, q: number, r = rates) => (key === "rights" ? Math.round((q / (r.rights.days ?? 30)) * num(r.rights.price)) : q * num(r[key].price));
  const sumOf = (p: Pack) => live.reduce((a, it) => a + worth(it.key, p.qty[it.key] ?? 0), 0);
  const inPack = (p: Pack) => live.filter((it) => (p.qty[it.key] ?? 0) > 0);

  const problems = [
    ...live.filter((it) => num(rates[it.key].price) < 1).map((it) => `${it.label}: enter a price, or switch it off.`),
    ...packs.flatMap((p, n) => [
      ...(!p.name.trim() ? [`Package ${n + 1}: give it a name.`] : []),
      ...(inPack(p).length < 2 ? [`Package ${n + 1}: add at least 2 things.`] : []),
      ...(num(p.price) < 1 ? [`Package ${n + 1}: enter a price.`] : []),
    ]),
  ];
  const shown = tried ? problems : [];

  function addPack() {
    if (packs.length >= MAX_PACKS) return;
    const id = Date.now();
    // Starts with one of everything she sells, plus 30 days of usage rights if she sells them.
    setPacks((ps) => [...ps, { id, name: ps.length ? "" : "All-platform launch", qty: Object.fromEntries(live.map((it) => [it.key, it.key === "tt-live" ? 0 : it.key === "rights" ? RIGHTS_TIP : 1])), price: "" }]);
  }
  /** Fills in sample prices and two packages that each cost less than buying the items one by one. */
  function suggest() {
    const next = Object.fromEntries(ITEMS.map((it) => [it.key, { ...rates[it.key], price: SAMPLE[it.key], on: rates[it.key].on || SUGGEST.some((g) => (g.qty[it.key] ?? 0) > 0) }]));
    setRates(next);
    setPacks(SUGGEST.map((g, i) => {
      const sum = Object.entries(g.qty).reduce((a, [k, q]) => a + worth(k, q, next), 0);
      return { id: Date.now() + i, name: g.name, qty: g.qty, price: String(Math.round((sum * (1 - g.off)) / 10) * 10) };
    }));
    toast("Prices and 2 packages suggested. Change anything you like.");
  }
  const ready = packs.filter((p) => p.name.trim() && num(p.price) > 0);
  const priced = live.filter((it) => num(rates[it.key].price) > 0);
  // The package with the biggest saving gets "Best value".
  const best = ready.reduce<Pack | null>((b, p) => (!b || (sumOf(p) - num(p.price)) / Math.max(1, sumOf(p)) > (sumOf(b) - num(b.price)) / Math.max(1, sumOf(b)) ? p : b), null);
  // LIVE is sold by the hour (owner, 29 Oct 2026), so packages say "2 hours of TikTok LIVE".
  const packLine = (p: Pack) => inPack(p).map((it) => (it.key === "rights" ? `${p.qty.rights} days of ad rights` : it.key === "tt-live" ? `${p.qty[it.key]} hour${p.qty[it.key] === 1 ? "" : "s"} of TikTok LIVE` : `${p.qty[it.key]} × ${it.label}`)).join(" · ");
  const rightsFor = (it: Item) => (it.key === "rights" ? `for ${rates.rights.days ?? 30} days` : it.unit);
  function save() {
    setTried(true);
    if (problems.length) return;
    setTried(false);
    toast("Rate card saved");
  }

  return (
    <div className="v2-stack rc-page" style={{ gap: 18 }}>
      <div className="acc-head">
        <span className="v2-small">Your prices for paid videos. Sellers see them when inviting you.</span>
        <button type="button" className="btn-outline v2-btn-sm" onClick={suggest}>✦ Suggest prices</button>
      </div>

      <section className="cr2-group">
        <h2>À La Carte</h2>
        <div className="cr2-cells">
          {ITEMS.map((it) => {
            const r = rates[it.key];
            const bad = tried && r.on && num(r.price) < 1;
            return (
              <div key={it.key} className={`cr2-cell rc-row${r.on ? "" : " off"}`}>
                <Icn app={it.app} />
                <span className="rc-lbl">{it.label}</span>
                <span className="rc-price">
                  <span className={`rc-input${bad ? " bad" : ""}`}>
                    <i>RM</i>
                    <input inputMode="numeric" disabled={!r.on} value={r.price} placeholder="0" aria-label={`${it.label} price in RM`} onChange={(e) => setRate(it.key, { price: e.target.value.replace(/[^\d]/g, "").slice(0, 6) })} />
                  </span>
                  {it.key === "rights" ? (
                    <DaysPick value={r.days ?? RIGHTS_TIP} disabled={!r.on} onChange={(d) => setRate("rights", { days: d })} />
                  ) : <small>{it.unit}</small>}
                </span>
                <button type="button" role="switch" aria-checked={r.on} aria-label={`Offer ${it.label}`} className={`np-switch ${r.on ? "on" : ""}`} onClick={() => setRate(it.key, { on: !r.on })}><span /></button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="cr2-group">
        <h2>Packages <span className="rc-count">{packs.length} of {MAX_PACKS}</span> <Tip label="Why add ad rights" text={`TikTok sellers usually buy a video with at least ${RIGHTS_TIP} days of ad rights, so adding it gets you more deals. The seller may run ads on your video, and you still earn commission on every sale.`} /></h2>
        {packs.map((p, n) => {
          const sum = sumOf(p);
          const price = num(p.price);
          const save = sum - price;
          return (
            <div key={p.id} className="cr2-cells rc-pack">
              <div className="cr2-cell stack">
                <span className="rc-pack-h">
                  <input className="np-input" value={p.name} placeholder={`Package ${n + 1} name`} aria-label={`Package ${n + 1} name`} maxLength={40} onChange={(e) => setPack(p.id, { name: e.target.value })} />
                  <button type="button" className="sq-ghost v2-btn-sm" onClick={() => setPacks((ps) => ps.filter((x) => x.id !== p.id))}>Remove</button>
                </span>
              </div>
              {live.map((it) => {
                const q = p.qty[it.key] ?? 0;
                return (
                  <div key={it.key} className={`cr2-cell rc-row${q ? "" : " off"}`}>
                    <Icn app={it.app} />
                    <span className="rc-lbl">{it.label}<small>{q ? unitOf(it, q) : "Not included"}</small></span>
                    {it.key === "rights" ? (
                      <DaysPick value={q} none onChange={(d) => setPack(p.id, { qty: { ...p.qty, rights: d } })} />
                    ) : (
                      <span className="rc-step" role="group" aria-label={`${it.label} in this package`}>
                        <button type="button" aria-label={`Fewer ${it.label}`} onClick={() => setPack(p.id, { qty: { ...p.qty, [it.key]: Math.max(0, q - 1) } })}>−</button>
                        <b>{q}</b>
                        <button type="button" aria-label={`More ${it.label}`} onClick={() => setPack(p.id, { qty: { ...p.qty, [it.key]: Math.min(10, q + 1) } })}>+</button>
                      </span>
                    )}
                  </div>
                );
              })}
              <div className="cr2-cell rc-total">
                <span className="rc-lbl">Package price<small>{sum ? `À la carte: ${rm(sum)}` : "Add prices above"}</small></span>
                <span className="rc-price">
                  <span className={`rc-input${tried && price < 1 ? " bad" : ""}`}><i>RM</i><input inputMode="numeric" value={p.price} placeholder="0" aria-label={`Package ${n + 1} price in RM`} onChange={(e) => setPack(p.id, { price: e.target.value.replace(/[^\d]/g, "").slice(0, 6) })} /></span>
                </span>
                {price > 0 && sum > 0 && (save > 0 ? <span className="rc-save">Save {rm(save)}</span> : <span className="rc-save more">{save === 0 ? "Same as à la carte" : `${rm(-save)} more than à la carte`}</span>)}
              </div>
            </div>
          );
        })}
        {packs.length < MAX_PACKS && (
          <button type="button" className="rc-add" onClick={addPack} disabled={live.length < 2}>
            <Icon name="plus" size={16} /> {live.length < 2 ? "Turn on 2+ items to make a package" : "Add a package"}
          </button>
        )}
        <p>Bundle apps and ad rights into one price.</p>
      </section>

      <section className="cr2-group">
        <h2>What Sellers See</h2>
        <div className="cr2-cells">
          <div className="cr2-cell stack">
            <Seg value={show} options={["À la carte", "Packages", "Both"] as const} onChange={setShow} />
          </div>
          <div className="cr2-cell stack rc-preview">
            <span className="rc-prev-h"><Icon name="eye" size={14} /> Preview</span>
            {show !== "À la carte" && ready.map((p) => (
              <span key={p.id} className="rc-prev-pack">
                <b>{p.name}{p === best && sumOf(p) > num(p.price) && <i className="rc-best">Best value</i>}</b>
                <small>{packLine(p)}</small>
                <span>{rm(num(p.price))}{sumOf(p) > num(p.price) && <em>Save {rm(sumOf(p) - num(p.price))}</em>}</span>
              </span>
            ))}
            {show !== "Packages" && priced.map((it) => (
              <span key={it.key} className="rc-prev-row"><Icn app={it.app} /><span>{it.label}</span><b>{rm(num(rates[it.key].price))}</b><small>{rightsFor(it)}</small></span>
            ))}
            {((show !== "Packages" && !live.some((it) => num(rates[it.key].price) > 0)) && (show !== "À la carte" ? !packs.some((p) => p.name.trim() && num(p.price) > 0) : true)) && (
              <span className="v2-small">Add prices to preview.</span>
            )}
          </div>
        </div>
      </section>

      {shown.length > 0 && (
        <div className="rc-fix" role="alert">
          <b>{shown.length === 1 ? "1 thing to fix" : `${shown.length} things to fix`}</b>
          {shown.map((t) => <span key={t} className="rc-err">{t}</span>)}
        </div>
      )}
      <div className="rc-acts">
        <button type="button" className="np-btn rc-save-btn" onClick={save}>Save rate card</button>
        <button type="button" className="btn-outline rc-save-btn" onClick={() => (ready.length || priced.length ? setSharing(true) : toast("Add your prices first"))}><Icon name="share" size={17} /> Share rate card</button>
      </div>
      {sharing && (
        <ShareSheet
          title="Share your rate card"
          onClose={() => setSharing(false)}
          big=""
          label="Rate card"
          lines={[]}
          caption={`My rate card for TikTok, Instagram and Facebook videos. Book me on Rezekii: rezekii.com/c/${CREATOR.handle.replace(/^@/, "")}`}
          card={<RateShare packs={show === "À la carte" ? [] : ready} best={best} items={show === "Packages" ? [] : priced} line={packLine} price={(it) => rm(num(rates[it.key].price))} unit={rightsFor} showOn={showOn} />}
          extra={
            <div className="rcs-pick" role="group" aria-label="Show on the card">
              <b>Show on the card</b>
              {([["whatsapp", "WhatsApp", CREATOR.whatsapp], ["email", "Email", CREATOR.email], ["accounts", "Social accounts", ACCOUNTS.map((a) => a.name).join(", ")]] as const).map(([k, l, v]) => (
                <label key={k}><input type="checkbox" checked={showOn[k]} onChange={(e) => setShowOn((s) => ({ ...s, [k]: e.target.checked }))} /><span><b>{l}</b><small>{v}</small></span></label>
              ))}
            </div>
          }
        />
      )}
    </div>
  );
}

/**
 * Her rate card as a 9:16 image to send to clients (owner, 29 Oct 2026), with the Rezekii logo and her booking QR. Packages
 * come first; prices only, never sales.
 */
function RateShare({ packs, best, items, line, price, unit, showOn }: { packs: Pack[]; best: Pack | null; items: Item[]; line: (p: Pack) => string; price: (it: Item) => string; unit: (it: Item) => string; showOn: { whatsapp: boolean; email: boolean; accounts: boolean } }) {
  const contacts = (showOn.whatsapp ? 1 : 0) + (showOn.email ? 1 : 0);
  return (
    <div className="rcs" role="img" aria-label={`Rate card for ${CREATOR.handle}`}>
      <span className="rcs-band">
      <span className="rcs-head">
        <span className="rcs-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/master-logo-transparent.png" alt="" />Rezekii
        </span>
        <span className="rcs-tag">Rate card</span>
      </span>
      <span className="rcs-me">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={CREATOR.photo} alt="" />
        <span><b>{CREATOR.handle}</b><small>{CREATOR.level} creator on Rezekii</small></span>
      </span>
      {showOn.accounts && <span className="rcs-socials">{ACCOUNTS.map((a) => <PlatformIcon key={a.name} name={a.name} size={18} />)}</span>}
      </span>
      {packs.slice(0, 3).map((p) => (
        <span key={p.id} className={`rcs-pack${p === best ? " best" : ""}`}>
          {p === best && <i>Best value</i>}
          <span className="rcs-pack-h"><b>{p.name}</b><b>RM {Math.round(Number(p.price)).toLocaleString("en-MY")}</b></span>
          <small>{line(p)}</small>
        </span>
      ))}
      {items.length > 0 && (
        <span className="rcs-list">
          {items.slice(0, (packs.length ? 4 : 7) - contacts).map((it) => <span key={it.key}><span>{it.label}<small> {unit(it)}</small></span><b>{price(it)}</b></span>)}
        </span>
      )}
      {contacts > 0 && (
        <span className="rcs-contact">
          {showOn.whatsapp && <span><Icon name="whatsapp" size={12} />{CREATOR.whatsapp}</span>}
          {showOn.email && <span><Icon name="inbox" size={12} />{CREATOR.email}</span>}
        </span>
      )}
      <span className="rcs-valid">Quote valid {QUOTE.days} days · until {QUOTE.until}</span>
      <span className="rcs-foot">
        <span><b>Book me on Rezekii</b><small>rezekii.com/c/{CREATOR.handle.replace(/^@/, "")}</small></span>
        <Qr />
      </span>
    </div>
  );
}
