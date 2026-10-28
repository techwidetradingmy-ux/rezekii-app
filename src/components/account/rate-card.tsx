"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Seg } from "@/components/ui";
import { PlatformIcon } from "@/components/creator2/bits";

type App = "TikTok" | "Instagram" | "Facebook" | "Threads" | "rights";
type Item = { key: string; app: App; label: string; unit: string };
type Rate = { on: boolean; price: string };
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
const MAX_PACKS = 3;
const SAMPLE: Record<string, string> = { "tt-video": "350", "tt-live": "250", "ig-reel": "300", "ig-story": "120", "fb-reel": "200", "fb-post": "150", "th-post": "80", rights: "300" };
const rm = (n: number) => `RM ${n.toLocaleString("en-MY")}`;
const num = (s: string) => Math.round(Number(s) || 0);
const unitOf = (it: Item, q: number) => (it.key === "rights" ? `${q * 30} days` : `${q} ${it.unit.replace("per ", "")}${q === 1 ? "" : "s"}`);

function Icn({ app }: { app: App }) {
  return app === "rights" ? <span className="rc-rights" aria-hidden="true"><Icon name="shield" size={14} /></span> : <PlatformIcon name={app} size={26} />;
}

/**
 * Rate card (owner, 28 Oct 2026): her prices per app (à la carte), up to 3 packages that bundle apps and usage rights, and a
 * choice of what sellers see. Prices can change any time; sellers see the card when they invite her.
 */
export function RateCard() {
  const { toast } = useDemo();
  const [rates, setRates] = useState<Record<string, Rate>>(() => Object.fromEntries(ITEMS.map((it) => [it.key, { on: ["tt-video", "tt-live", "ig-reel", "fb-reel", "rights"].includes(it.key), price: "" }])));
  const [packs, setPacks] = useState<Pack[]>([]);
  const [show, setShow] = useState<Show>("Both");
  const [tried, setTried] = useState(false);

  const live = ITEMS.filter((it) => rates[it.key].on);
  const setRate = (key: string, patch: Partial<Rate>) => setRates((r) => ({ ...r, [key]: { ...r[key], ...patch } }));
  const setPack = (id: number, patch: Partial<Pack>) => setPacks((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const sumOf = (p: Pack) => live.reduce((a, it) => a + (p.qty[it.key] ?? 0) * num(rates[it.key].price), 0);
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
    setPacks((ps) => [...ps, { id, name: ps.length ? "" : "All-platform launch", qty: Object.fromEntries(live.map((it) => [it.key, it.key === "tt-live" ? 0 : 1])), price: "" }]);
  }
  function save() {
    setTried(true);
    if (problems.length) return;
    setTried(false);
    toast("Rate card saved. Sellers see it when they invite you.");
  }

  return (
    <div className="v2-stack rc-page" style={{ gap: 18 }}>
      <div className="acc-head">
        <span className="v2-small">Your prices for paid videos, by app or as a package. Sellers see them when they invite you. Change them any time.</span>
        <button type="button" className="btn-outline v2-btn-sm" onClick={() => { setRates((r) => Object.fromEntries(ITEMS.map((it) => [it.key, { ...r[it.key], price: SAMPLE[it.key] }]))); toast("Sample prices filled in. Change anything you like."); }}>✦ Fill in sample prices</button>
      </div>

      <section className="cr2-group">
        <h2>À la carte</h2>
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
                  <small>{it.unit}</small>
                </span>
                <button type="button" role="switch" aria-checked={r.on} aria-label={`Offer ${it.label}`} className={`np-switch ${r.on ? "on" : ""}`} onClick={() => setRate(it.key, { on: !r.on })}><span /></button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="cr2-group">
        <h2>Packages <span className="rc-count">{packs.length} of {MAX_PACKS}</span></h2>
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
                    <span className="rc-step" role="group" aria-label={`${it.label} in this package`}>
                      <button type="button" aria-label={`Fewer ${it.label}`} onClick={() => setPack(p.id, { qty: { ...p.qty, [it.key]: Math.max(0, q - 1) } })}>−</button>
                      <b>{q}</b>
                      <button type="button" aria-label={`More ${it.label}`} onClick={() => setPack(p.id, { qty: { ...p.qty, [it.key]: Math.min(10, q + 1) } })}>+</button>
                    </span>
                  </div>
                );
              })}
              <div className="cr2-cell rc-total">
                <span className="rc-lbl">Package price<small>{sum ? `À la carte it comes to ${rm(sum)}` : "Add prices above to compare"}</small></span>
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
            <Icon name="plus" size={16} /> {live.length < 2 ? "Switch on at least 2 things above to make a package" : "Add a package"}
          </button>
        )}
        <p>Bundle apps and usage rights into one price, like &ldquo;TikTok + Instagram + Facebook + 30 days of ads&rdquo;.</p>
      </section>

      <section className="cr2-group">
        <h2>What sellers see</h2>
        <div className="cr2-cells">
          <div className="cr2-cell stack">
            <Seg value={show} options={["À la carte", "Packages", "Both"] as const} onChange={setShow} />
          </div>
          <div className="cr2-cell stack rc-preview">
            <span className="rc-prev-h"><Icon name="eye" size={14} /> How sellers see it</span>
            {show !== "Packages" && live.filter((it) => num(rates[it.key].price) > 0).map((it) => (
              <span key={it.key} className="rc-prev-row"><Icn app={it.app} /><span>{it.label}</span><b>{rm(num(rates[it.key].price))}</b><small>{it.unit}</small></span>
            ))}
            {show !== "À la carte" && packs.filter((p) => p.name.trim() && num(p.price) > 0).map((p) => (
              <span key={p.id} className="rc-prev-pack">
                <b>{p.name}</b>
                <small>{inPack(p).map((it) => `${it.key === "rights" ? "" : `${p.qty[it.key]} × `}${it.key === "rights" ? `${p.qty[it.key] * 30} days of ad rights` : it.label}`).join(" · ")}</small>
                <span>{rm(num(p.price))}{sumOf(p) > num(p.price) && <em>Save {rm(sumOf(p) - num(p.price))}</em>}</span>
              </span>
            ))}
            {((show !== "Packages" && !live.some((it) => num(rates[it.key].price) > 0)) && (show !== "À la carte" ? !packs.some((p) => p.name.trim() && num(p.price) > 0) : true)) && (
              <span className="v2-small">Nothing to show yet. Add your prices above.</span>
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
      <button type="button" className="np-btn rc-save-btn" onClick={save}>Save rate card</button>
    </div>
  );
}
