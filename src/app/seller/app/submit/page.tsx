"use client";

import "@/app/seller.css";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet, Title } from "@/components/ui";
import { ConnBanner, ContactSheet, TermsSheet } from "@/components/seller/seller-ui";
import { rm, short } from "@/lib/mock";
import { SHOP_ITEMS, TODAY, heat, listStatus, type ShopItem } from "@/lib/mock-seller";

type Raise = "2" | "ai" | "8" | "custom";
type Presets = { end: string; extend: boolean; niche: string; subs: string[]; level: string; gmv: string; format: string; gender: string };

const DEFAULTS: Presets = { end: "31 Jan 2027", extend: true, niche: "Home & Kitchen", subs: [], level: "Any", gmv: "Any", format: "Any", gender: "Any" };
const OPTIONS = {
  end: ["31 Dec 2026", "31 Jan 2027", "30 Apr 2027"],
  niche: ["Home & Kitchen", "Home & Living", "Food & Drink", "Mum & Baby"],
  subs: ["Cookware", "Drinkware", "Kitchen tools", "Cleaning", "Storage"],
  level: ["Any", "Lv.2+", "Lv.3+", "Lv.4+"],
  gmv: ["Any", "RM 1K+", "RM 5K+", "RM 10K+"],
  format: ["Any", "Videos", "LIVE"],
  gender: ["Any", "Women", "Men"],
};

function ChipRow({ label, note, options, value, onPick, multi }: { label: string; note?: string; options: string[]; value: string | string[]; onPick: (v: string) => void; multi?: boolean }) {
  const on = (o: string) => (multi ? (value as string[]).includes(o) : value === o);
  return (
    <div className="v2-field">
      {label} {note && <small>{note}</small>}
      <div className="v2-chips">
        {options.map((o) => (
          <button key={o} type="button" className={`v2-chip ${on(o) ? "on" : ""}`} style={{ height: 36, fontSize: 13.5 }} aria-pressed={on(o)} onClick={() => onPick(o)}>{o}</button>
        ))}
      </div>
    </div>
  );
}

/** Submit products to Techwide's TAP: pick products, then Submit. Commission and samples are preset; everything else is pre-filled. */
export default function SubmitProducts() {
  const { toast } = useDemo();
  const open = SHOP_ITEMS.filter((p) => p.stage === "Not submitted");
  const taken = SHOP_ITEMS.filter((p) => p.stage !== "Not submitted");
  const [picked, setPicked] = useState<string[]>(["x01", "x02"]);
  const [raise, setRaise] = useState<Raise>("ai");
  const [custom, setCustom] = useState("6");
  const [samples, setSamples] = useState<"30" | "40" | "50" | "custom">("40");
  const [samplesCustom, setSamplesCustom] = useState("0");
  const [presets, setPresets] = useState<Presets>(DEFAULTS);
  const [draft, setDraft] = useState<Presets | null>(null);
  const [showTaken, setShowTaken] = useState(false);
  const [terms, setTerms] = useState(false);
  const [talk, setTalk] = useState(false);
  const [tried, setTried] = useState(false);
  const [done, setDone] = useState<{ item: ShopItem; plus: number }[] | null>(null);

  const sel = open.filter((p) => picked.includes(p.id));
  const plusFor = (p: ShopItem) => (raise === "ai" ? heat(p.sold).raise : raise === "custom" ? Number(custom) : Number(raise));
  const aiRaises = Array.from(new Set(sel.map((p) => heat(p.sold).raise)));
  const aiLabel = aiRaises.length === 1 ? `+${aiRaises[0]}%` : sel.length ? "Per product" : "+5%";
  const nSamples = samples === "custom" ? Number(samplesCustom) : Number(samples);

  const customBad = raise === "custom" && (!/^\d+(\.\d+)?$/.test(custom.trim()) || Number(custom) < 2);
  const samplesBad = !Number.isFinite(nSamples) || nSamples <= 0 || !Number.isInteger(nSamples);
  const errors = [
    sel.length === 0 && "Pick at least 1 product.",
    customBad && "Commission must be at least +2% above the public rate.",
    samplesBad && "Samples per SKU must be more than 0.",
  ].filter(Boolean) as string[];

  const toggle = (id: string) => setPicked((all) => (all.includes(id) ? all.filter((x) => x !== id) : [...all, id]));
  const result = (p: ShopItem) => (p.publicRate === null ? null : p.publicRate + plusFor(p));

  const submit = () => {
    setTried(true);
    if (errors.length) return;
    setDone(sel.map((item) => ({ item, plus: plusFor(item) })));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const conditions = [
    presets.niche + (presets.subs.length ? ` (${presets.subs.join(", ")})` : ""),
    presets.level !== "Any" && `TikTok ${presets.level}`,
    presets.gmv !== "Any" && `monthly GMV ${presets.gmv}`,
    presets.format !== "Any" && presets.format,
    presets.gender !== "Any" && presets.gender,
  ].filter(Boolean).join(" · ");
  const allAny = presets.level === "Any" && presets.gmv === "Any" && presets.format === "Any" && presets.gender === "Any";

  if (done) {
    return (
      <div className="v2-stack v2-in">
        <section className="v2-card sl-done">
          <span className="sl-check"><Icon name="check" size={38} width={2.8} /></span>
          <h2>{done.length} product{done.length > 1 ? "s" : ""} submitted</h2>
          <p className="v2-muted" style={{ margin: 0, maxWidth: 460, lineHeight: 1.55 }}>They&apos;re now in Techwide&apos;s TAP pipeline. Our team checks them within 1 working day, then submits them to TikTok. We&apos;ll tell you on WhatsApp and here when they&apos;re live.</p>
          <div className="sl-done-list v2-divide">
            {done.map(({ item, plus }) => (
              <div key={item.id} className="sl-prow">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.img} alt="" />
                <span className="sl-pinfo"><strong>{item.name}</strong><small>{nSamples} samples per SKU · submitted {TODAY}</small></span>
                <span className="sl-pside">
                  <span className="sl-rate">{item.publicRate === null ? "Public ?" : `${item.publicRate}%`} <Icon name="arrow" size={12} /> <b>{item.publicRate === null ? `+${plus}%` : `${item.publicRate + plus}%`}</b></span>
                </span>
              </div>
            ))}
          </div>
          <div className="sl-track" style={{ width: "100%", maxWidth: 520, marginTop: 6 }}>
            <div className="done"><i><Icon name="check" size={14} width={3} /></i><b>Submitted</b><small>Now</small></div>
            <div className="now"><i /><b>Our review</b><small>Within 1 working day</small></div>
            <div className="later"><i /><b>With TikTok</b><small>1–3 working days</small></div>
            <div className="later"><i /><b>Live</b><small>Creators can apply</small></div>
          </div>
          <div className="v2-row" style={{ justifyContent: "center", marginTop: 6 }}>
            <Link href="/seller/app/progress" className="np-btn">See progress</Link>
            <button type="button" className="btn-outline" style={{ height: 48 }} onClick={() => { setDone(null); setPicked([]); setTried(false); }}>Submit more</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="v2-stack v2-in">
      <Title title="Submit products" sub="Pick products and submit. We've set everything else for you." />
      <ConnBanner />

      <section className="v2-card">
        <div className="sl-step-h"><span className="n">1</span><h2>Pick products</h2><span className="v2-small">{sel.length} selected</span></div>
        <div>
          {open.map((p) => {
            const on = picked.includes(p.id);
            const h = heat(p.sold);
            const r = result(p);
            return (
              <label key={p.id} className={`sl-pick ${on ? "on" : ""}`}>
                <input type="checkbox" checked={on} onChange={() => toggle(p.id)} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt="" />
                <span className="sl-pinfo">
                  <strong>{p.name}</strong>
                  <small>{rm(p.price)} · {h.label}</small>
                </span>
                <span className="sl-pick-rate">
                  <span className="sl-rate">{p.publicRate === null ? "Public ?" : `${p.publicRate}%`} <Icon name="arrow" size={12} /> <b>{r === null ? `+${plusFor(p) || 0}%` : `${Number.isFinite(r) ? r : "–"}%`}</b></span>
                  <small>{p.publicRate === null ? "Public rate unknown, we'll check it" : `Public ${p.publicRate}% now`}</small>
                </span>
              </label>
            );
          })}
        </div>
        <button type="button" className="v2-link" style={{ alignSelf: "flex-start", fontSize: 14 }} onClick={() => setShowTaken(!showTaken)}>
          {showTaken ? "Hide" : "Show"} {taken.length} already submitted
        </button>
        {showTaken && (
          <div>
            {taken.map((p) => (
              <div key={p.id} className="sl-pick off" aria-disabled="true">
                <input type="checkbox" disabled checked={false} readOnly aria-label="Already submitted" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt="" />
                <span className="sl-pinfo"><strong>{p.name}</strong><small>{short(p.sold)} sold · can&apos;t submit twice</small></span>
                <span className="sl-pick-rate"><span className={`badge ${listStatus(p.stage) === "Live" ? "" : listStatus(p.stage) === "Not approved" ? "badge-red" : "badge-amber"}`}>{listStatus(p.stage)}</span></span>
              </div>
            ))}
          </div>
        )}
        {tried && sel.length === 0 && <p className="sl-err"><Icon name="alert" size={16} /> Pick at least 1 product.</p>}
      </section>

      <section className="v2-card">
        <div className="sl-step-h"><span className="n">2</span><h2>Commission above the public rate</h2><span className="v2-small">At least +2%</span></div>
        <div className="v2-chips">
          <button type="button" className={`v2-chip ${raise === "2" ? "on" : ""}`} onClick={() => setRaise("2")}>+2% <small>minimum</small></button>
          <button type="button" className={`v2-chip ${raise === "ai" ? "on" : ""}`} onClick={() => setRaise("ai")}><Icon name="spark" size={15} /> {aiLabel} <small>AI pick</small></button>
          <button type="button" className={`v2-chip ${raise === "8" ? "on" : ""}`} onClick={() => setRaise("8")}>+8%</button>
          <button type="button" className={`v2-chip ${raise === "custom" ? "on" : ""}`} onClick={() => setRaise("custom")}>Custom</button>
        </div>
        {raise === "custom" && (
          <div className="v2-stack" style={{ gap: 6 }}>
            <label className="sl-custom">
              <span style={{ fontWeight: 800 }}>+</span>
              <input className="np-input" inputMode="decimal" value={custom} onChange={(e) => setCustom(e.target.value)} aria-label="Custom raise above the public rate, percent" aria-invalid={customBad} />
              <span style={{ fontWeight: 800 }}>% above the public rate</span>
            </label>
            {customBad && <p className="sl-err"><Icon name="alert" size={16} /> Must be at least +2% above the public rate, or creators won&apos;t get a better deal through TAP.</p>}
          </div>
        )}
        {sel.length > 0 && (
          <div className="sl-ai">
            <Icon name="spark" size={18} />
            <span>
              {sel.map((p, k) => {
                const h = heat(p.sold);
                return (
                  <span key={p.id} style={{ display: "block", marginTop: k ? 4 : 0 }}>
                    AI suggests <b>+{h.raise}%</b> for {p.name} because {h.why}.
                  </span>
                );
              })}
              {raise !== "ai" && <button type="button" className="v2-link" style={{ fontSize: 14, marginTop: 4 }} onClick={() => setRaise("ai")}>Use the AI pick</button>}
            </span>
          </div>
        )}
      </section>

      <section className="v2-card">
        <div className="sl-step-h"><span className="n">3</span><h2>Samples per SKU</h2><span className="v2-small">Must be more than 0 · most shops pick 30–50</span></div>
        <div className="v2-chips">
          {(["30", "40", "50"] as const).map((n) => (
            <button key={n} type="button" className={`v2-chip ${samples === n ? "on" : ""}`} onClick={() => setSamples(n)}>{n}{n === "40" && <small>usual</small>}</button>
          ))}
          <button type="button" className={`v2-chip ${samples === "custom" ? "on" : ""}`} onClick={() => setSamples("custom")}>Custom</button>
        </div>
        {samples === "custom" && (
          <div className="v2-stack" style={{ gap: 6 }}>
            <label className="sl-custom">
              <input className="np-input" inputMode="numeric" value={samplesCustom} onChange={(e) => setSamplesCustom(e.target.value.replace(/[^\d]/g, ""))} aria-label="Samples per SKU" aria-invalid={samplesBad} />
              <span style={{ fontWeight: 800 }}>samples per SKU</span>
            </label>
            {samplesBad && <p className="sl-err"><Icon name="alert" size={16} /> Must be more than 0. With 0 samples, creators can&apos;t apply and TikTok won&apos;t approve it.</p>}
          </div>
        )}
        <p className="v2-small" style={{ margin: 0 }}>Each creator who gets a sample posts 3 videos. Samples are your own marketing cost, sent through TikTok.</p>
      </section>

      <section className="sl-preset">
        <span>
          <b>We&apos;ve set these for you</b>
          <span>Campaign: starts today, ends {presets.end}{presets.extend ? ", auto-extends before it ends" : ""}</span>
          <span>Creators: {conditions}{allAny ? " · everything else Any" : ""}</span>
        </span>
        <button type="button" className="btn-outline" onClick={() => setDraft(presets)}>Change</button>
      </section>

      <p className="v2-small" style={{ margin: 0 }}>
        By submitting you agree to the sample allocation terms (<button type="button" className="v2-link" style={{ fontSize: 13 }} onClick={() => setTerms(true)}>read</button>).
        {" "}Want our team to run it for you? <button type="button" className="v2-link" style={{ fontSize: 13 }} onClick={() => setTalk(true)}>Talk to us</button>
      </p>

      <div className="sl-sticky">
        <span>
          <b>{sel.length} product{sel.length === 1 ? "" : "s"} · {raise === "ai" ? "AI pick" : raise === "custom" ? `+${custom || 0}%` : `+${raise}%`} · {samplesBad ? "?" : nSamples} samples</b>
          {errors.length > 0 ? <span className="sl-err" style={{ fontSize: 12.5 }}>{errors[0]}</span> : <span>Goes to Techwide&apos;s TAP pipeline</span>}
        </span>
        <button type="button" className="np-btn" onClick={submit} disabled={errors.length > 0}>
          Submit {sel.length || ""} product{sel.length === 1 ? "" : "s"}
        </button>
      </div>

      {draft && (
        <Sheet title="We've set these for you" onClose={() => setDraft(null)}>
          <h3 className="v2-h2" style={{ fontSize: 16 }}>Campaign time</h3>
          <p className="v2-small" style={{ margin: 0 }}>Starts today ({TODAY}).</p>
          <ChipRow label="Ends" options={OPTIONS.end} value={draft.end} onPick={(v) => setDraft({ ...draft, end: v })} />
          <div className="np-switchrow">
            <span><b>Auto-extend before it ends</b><small>So creators can keep selling without a gap.</small></span>
            <button type="button" className={`np-switch ${draft.extend ? "on" : ""}`} aria-pressed={draft.extend} aria-label="Auto-extend" onClick={() => setDraft({ ...draft, extend: !draft.extend })}><span /></button>
          </div>
          <h3 className="v2-h2" style={{ fontSize: 16, marginTop: 6 }}>Creator conditions</h3>
          <p className="v2-small" style={{ margin: 0 }}>A reference for our team. Techwide decides who gets each sample, picking the creators most likely to sell.</p>
          <ChipRow label="Main niche" note="From your product's category" options={OPTIONS.niche} value={draft.niche} onPick={(v) => setDraft({ ...draft, niche: v })} />
          <ChipRow label="Sub-niches" note="Optional, pick any" multi options={OPTIONS.subs} value={draft.subs} onPick={(v) => setDraft({ ...draft, subs: draft.subs.includes(v) ? draft.subs.filter((s) => s !== v) : [...draft.subs, v] })} />
          <ChipRow label="TikTok level" options={OPTIONS.level} value={draft.level} onPick={(v) => setDraft({ ...draft, level: v })} />
          <ChipRow label="Monthly GMV" options={OPTIONS.gmv} value={draft.gmv} onPick={(v) => setDraft({ ...draft, gmv: v })} />
          <ChipRow label="Videos or LIVE" options={OPTIONS.format} value={draft.format} onPick={(v) => setDraft({ ...draft, format: v })} />
          <ChipRow label="Gender" options={OPTIONS.gender} value={draft.gender} onPick={(v) => setDraft({ ...draft, gender: v })} />
          <div className="v2-row">
            <button type="button" className="np-btn" style={{ flex: 1 }} onClick={() => { setPresets(draft); setDraft(null); toast("Saved for this submission"); }}>Save</button>
            <button type="button" className="btn-outline" style={{ height: 48 }} onClick={() => setDraft(DEFAULTS)}>Reset</button>
          </div>
        </Sheet>
      )}
      {terms && <TermsSheet onClose={() => setTerms(false)} />}
      {talk && <ContactSheet onClose={() => setTalk(false)} />}
    </div>
  );
}
