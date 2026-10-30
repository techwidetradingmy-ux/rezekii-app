"use client";

import "@/app/seller.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet, Title } from "@/components/ui";
import { ConnBanner, ContactSheet, TermsSheet } from "@/components/seller/seller-ui";
import { rm, short } from "@/lib/mock";
import { SHOP_ITEMS, TAP_INVITE, TODAY, heat, listStatus, type ShopItem } from "@/lib/mock-seller";
import { HOT_RAISE, MIN_RAISE, hotFor } from "@/lib/mock-showcase";
import { sellerProductHref } from "@/lib/product-pages";
import { sellerCenterCampaign, loadShop, myDay, submitToTap } from "@/lib/live";

type Raise = "2" | "ai" | "8" | "custom";
type Presets = { end: string; extend: boolean; niche: string; subs: string[]; level: string; gmv: string; format: string; gender: string };

// Always the longest campaign TikTok allows, auto-extended; sellers don't choose dates (owner, 29 Oct 2026).
const DEFAULTS: Presets = { end: "30 Apr 2027", extend: true, niche: "Home & Kitchen", subs: [], level: "Any", gmv: "Any", format: "Any", gender: "Any" };
const OPTIONS = {
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
  const router = useRouter();
  const { toast, live } = useDemo();
  // Signed in (owner, 30 Oct 2026): the real products of the shop this account authorized; null while loading.
  const [real, setReal] = useState<ShopItem[] | null>(null);
  const [noShop, setNoShop] = useState(false);
  const [sending, setSending] = useState(false);
  const source = live ? real ?? [] : SHOP_ITEMS;
  // A real product can be picked once buyers can see it; one Techwide didn't approve can be sent again.
  const canPick = (p: ShopItem) => (p.stage === "Not submitted" || (!!p.real && p.stage === "Not approved")) && p.listing !== "PENDING";
  const open = source.filter(canPick);
  const taken = source.filter((p) => !canPick(p) && p.stage !== "Not submitted");
  const reviewing = source.filter((p) => p.listing === "PENDING" && p.stage === "Not submitted");
  const [picked, setPicked] = useState<string[]>(["x01", "x02"]);
  // Arriving from Wanted by Creators with ?p=<product> picks just that product.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("p");
    if (id && open.some((p) => p.id === id)) setPicked([id]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [raise, setRaise] = useState<Raise>("ai");
  const [custom, setCustom] = useState("6");
  const [samples, setSamples] = useState<"30" | "40" | "50" | "custom">("40");
  const [samplesCustom, setSamplesCustom] = useState("0");
  const [presets, setPresets] = useState<Presets>(DEFAULTS);
  // Creator conditions offer the shop's own categories.
  const niches = live ? Array.from(new Set(source.map((p) => p.category).filter(Boolean))) : OPTIONS.niche;
  const subsFor = (niche: string) => (live ? Array.from(new Set(source.filter((p) => p.category === niche).map((p) => p.sub ?? "").filter(Boolean))) : OPTIONS.subs);
  const loadReal = () => {
    setReal(null);
    loadShop()
      .then((s) => {
        setNoShop(!s);
        const items = s?.items ?? [];
        setReal(items);
        const id = new URLSearchParams(window.location.search).get("p");
        if (id && items.some((p) => p.id === id && canPick(p))) setPicked([id]);
        // Creator conditions start from the picked product's category (the first one ready to submit otherwise).
        const first = items.find((p) => p.id === id && canPick(p)) ?? items.find(canPick) ?? items[0];
        if (first) setPresets((x) => ({ ...x, niche: first.category, subs: [] }));
        setRaise(items.some((p) => p.ai) ? "ai" : "2");
      })
      .catch((e: Error) => { toast(e.message); setReal([]); });
  };
  useEffect(() => {
    if (!live) return;
    // No AI pick on real products: we can't read the shop's sales to base one on.
    setPicked([]);
    setRaise("2");
    loadReal();
  }, [live]); // eslint-disable-line react-hooks/exhaustive-deps
  const [draft, setDraft] = useState<Presets | null>(null);
  const [showTaken, setShowTaken] = useState(false);
  const [terms, setTerms] = useState(false);
  const [talk, setTalk] = useState(false);
  const [tried, setTried] = useState(false);
  const [done, setDone] = useState<{ item: ShopItem; plus: number }[] | null>(null);
  // Straight to Seller Center (owner, 31 Oct 2026): the campaign to register them in, or why it isn't ready yet.
  const [sent, setSent] = useState<{ campaignId?: string; handOff?: string }>({});

  const sel = open.filter((p) => picked.includes(p.id));
  const pickOf = (p: ShopItem) => (p.real ? p.ai : heat(p.sold));
  // Real products show the AI pick only when TikTok sent their sales.
  const aiOn = !live || open.some((p) => p.ai);
  // Products our creators want most start at +5%; everything else at +2%.
  const floorFor = (p: ShopItem) => (hotFor(p.id) ? HOT_RAISE : MIN_RAISE);
  const plusFor = (p: ShopItem) => Math.max(floorFor(p), raise === "ai" ? pickOf(p)?.raise ?? MIN_RAISE : raise === "custom" ? Number(custom) : Number(raise));
  const hot = sel.filter((p) => hotFor(p.id));
  const aiRaises = Array.from(new Set(sel.map((p) => pickOf(p)?.raise ?? MIN_RAISE)));
  const aiLabel = aiRaises.length === 1 ? `+${aiRaises[0]}%` : sel.length ? "Per product" : "+5%";
  const nSamples = samples === "custom" ? Number(samplesCustom) : Number(samples);

  const customBad = raise === "custom" && (!/^\d+(\.\d+)?$/.test(custom.trim()) || Number(custom) < MIN_RAISE);
  const samplesBad = !Number.isFinite(nSamples) || nSamples <= 0 || !Number.isInteger(nSamples);
  const errors = [
    sel.length === 0 && "Pick at least 1 product.",
    customBad && "Commission must be at least +2% above the public rate.",
    samplesBad && "Samples per SKU must be more than 0.",
  ].filter(Boolean) as string[];

  const toggle = (id: string) => setPicked((all) => (all.includes(id) ? all.filter((x) => x !== id) : [...all, id]));
  const result = (p: ShopItem) => (p.publicRate === null ? null : p.publicRate + plusFor(p));

  const submit = async () => {
    setTried(true);
    if (errors.length || sending) return;
    if (live) {
      setSending(true);
      const r = await submitToTap({ productIds: sel.map((p) => p.id), raise: plusFor(sel[0]), samples: nSamples, conditions: presets });
      setSending(false);
      if (r.error) return toast(r.error);
      if (r.skipped?.length) toast(`${r.skipped.length} not submitted: ${r.skipped[0].why}`);
      const ok = new Set((r.submitted ?? []).map((s) => s.id));
      if (!ok.size) return;
      setDone(sel.filter((p) => ok.has(p.id)).map((item) => ({ item, plus: plusFor(item) })));
      setSent({ campaignId: r.campaignId, handOff: r.handOff });
      loadReal();
    } else setDone(sel.map((item) => ({ item, plus: plusFor(item) })));
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
          <p className="v2-muted" style={{ margin: 0, maxWidth: 460, lineHeight: 1.55 }}>
            {!live ? <>We&apos;ll WhatsApp you when they&apos;re live.</> : sent.campaignId ? "Last step: register them in Techwide's campaign in Seller Center, with the commission and samples below. Techwide approves them there." : sent.handOff ? `Saved. Techwide will send you the Seller Center link shortly (${sent.handOff}).` : "Techwide reviews them next."}
          </p>
          {live && sent.campaignId && (
            <a href={sellerCenterCampaign(sent.campaignId)} target="_blank" rel="noreferrer" className="np-btn" style={{ height: 48 }}>Register in Seller Center <Icon name="arrow" size={18} /></a>
          )}
          <div className="sl-done-list v2-divide">
            {done.map(({ item, plus }) => (
              <div key={item.id} className="sl-prow">
                {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
                <img className="pv-open" src={item.img} alt="" onClick={() => router.push(sellerProductHref(item.id))} />
                <span className="sl-pinfo"><strong><Link href={sellerProductHref(item.id)} className="pv-open">{item.name}</Link></strong><small>{nSamples} samples per SKU · submitted {live ? myDay() : TODAY}</small></span>
                <span className="sl-pside">
                  <span className="sl-rate">{item.publicRate === null ? "Public ?" : `${item.publicRate}%`} <Icon name="arrow" size={12} /> <b>{item.publicRate === null ? `+${plus}%` : `${item.publicRate + plus}%`}</b></span>
                </span>
              </div>
            ))}
          </div>
          {live && sent.campaignId ? (
            <div className="sl-track" style={{ width: "100%", maxWidth: 520, marginTop: 6 }}>
              <div className="done"><i><Icon name="check" size={14} width={3} /></i><b>Picked on Rezekii</b><small>Now</small></div>
              <div className="now"><i /><b>Register in Seller Center</b><small>You, today</small></div>
              <div className="later"><i /><b>Techwide approves</b><small>On TikTok</small></div>
              <div className="later"><i /><b>Live</b><small>Creators can apply</small></div>
            </div>
          ) : (
            <div className="sl-track" style={{ width: "100%", maxWidth: 520, marginTop: 6 }}>
              <div className="done"><i><Icon name="check" size={14} width={3} /></i><b>Submitted</b><small>Now</small></div>
              <div className="now"><i /><b>Our review</b><small>Within 1 working day</small></div>
              <div className="later"><i /><b>With TikTok</b><small>1–3 working days</small></div>
              <div className="later"><i /><b>Live</b><small>Creators can apply</small></div>
            </div>
          )}
          <div className="v2-row" style={{ justifyContent: "center", marginTop: 6 }}>
            {live ? <Link href="/seller/app/products" className="np-btn">See in Shop Products</Link> : <Link href="/seller/app/progress" className="np-btn">See progress</Link>}
            <button type="button" className="btn-outline" style={{ height: 48 }} onClick={() => { setDone(null); setPicked([]); setTried(false); }}>Submit more</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="v2-stack v2-in">
      <Title title="Submit Products" sub="Pick products and submit. The rest is preset." />
      <ConnBanner shop={live ? !noShop : undefined} />
      {!live && <Link href="/seller/app/invite" className="si-banner">
        <span className="si-banner-ico"><Icon name="send" size={18} /></span>
        <span><b>{TAP_INVITE.from} invited you: {TAP_INVITE.name}</b><small>Public +{TAP_INVITE.raise}% · {TAP_INVITE.samples} samples · {TAP_INVITE.products.length} products · until {TAP_INVITE.expires}</small></span>
        <span className="si-banner-go">Review <Icon name="arrow" size={15} /></span>
      </Link>}

      <section className="v2-card">
        <div className="sl-step-h"><span className="n">1</span><h2>Pick Products</h2><span className="v2-small">{sel.length} selected</span></div>
        <div>
          {open.map((p) => {
            const on = picked.includes(p.id);
            const h = heat(p.sold);
            const r = result(p);
            return (
              <label key={p.id} className={`sl-pick ${on ? "on" : ""}`}>
                <input type="checkbox" checked={on} onChange={() => toggle(p.id)} />
                {/* The photo and name open the product; the rest of the row ticks it. */}
                {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
                <img className="pv-open" src={p.img} alt="" onClick={(e) => { e.preventDefault(); router.push(sellerProductHref(p.id)); }} />
                <span className="sl-pinfo">
                  <strong><Link href={sellerProductHref(p.id)} className="pv-open">{p.name}</Link></strong>
                  <small>{rm(p.price)}{p.real ? (p.soldLabel ? ` · ${p.soldLabel}` : "") : ` · ${h.label}`}</small>
                  {hotFor(p.id) && <span className="sl-hot"><Icon name="flame" size={12} /> {hotFor(p.id)!.creators} creators want it</span>}
                </span>
                <span className="sl-pick-rate">
                  <span className="sl-rate">{p.publicRate === null ? "Public ?" : `${p.publicRate}%`} <Icon name="arrow" size={12} /> <b>{r === null ? `+${plusFor(p) || 0}%` : `${Number.isFinite(r) ? r : "–"}%`}</b></span>
                  <small>{p.publicRate === null ? "Public rate unknown" : `Public ${p.publicRate}% now`}</small>
                </span>
              </label>
            );
          })}
          {live && real === null && <p className="v2-muted" style={{ margin: "8px 0" }}>Loading your products…</p>}
          {live && real !== null && open.length === 0 && <p className="v2-muted" style={{ margin: "8px 0" }}>{noShop ? "Connect Seller Center to see your products." : "No products ready to submit yet."}</p>}
        </div>
        {reviewing.length > 0 && (
          <p className="v2-small" style={{ margin: 0 }}>{reviewing.length} product{reviewing.length === 1 ? " is" : "s are"} in TikTok&apos;s listing review. You can submit {reviewing.length === 1 ? "it once it's" : "them once they're"} live.</p>
        )}
        {taken.length > 0 && <button type="button" className="v2-link" style={{ alignSelf: "flex-start", fontSize: 14 }} onClick={() => setShowTaken(!showTaken)}>
          {showTaken ? "Hide" : "Show"} {taken.length} already submitted
        </button>}
        {showTaken && (
          <div>
            {taken.map((p) => (
              <div key={p.id} className="sl-pick off" aria-disabled="true">
                <input type="checkbox" disabled checked={false} readOnly aria-label="Already submitted" />
                {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
                <img className="pv-open" src={p.img} alt="" onClick={() => router.push(sellerProductHref(p.id))} />
                <span className="sl-pinfo"><strong><Link href={sellerProductHref(p.id)} className="pv-open">{p.name}</Link></strong><small>{p.soldLabel ? `${p.soldLabel} · ` : p.salesUnknown ? "" : `${short(p.sold)} sold · `}already submitted</small></span>
                <span className="sl-pick-rate"><span className={`badge ${listStatus(p.stage) === "Live" ? "" : listStatus(p.stage) === "Not approved" ? "badge-red" : "badge-amber"}`}>{listStatus(p.stage)}</span></span>
              </div>
            ))}
          </div>
        )}
        {tried && sel.length === 0 && <p className="sl-err"><Icon name="alert" size={16} /> Pick at least 1 product.</p>}
      </section>

      <section className="v2-card">
        <div className="sl-step-h"><span className="n">2</span><h2>Extra Commission</h2><span className="v2-small">At least +{MIN_RAISE}%</span></div>
        <div className="v2-chips">
          <button type="button" className={`v2-chip ${raise === "2" ? "on" : ""}`} onClick={() => setRaise("2")}>+2% <small>minimum</small></button>
          {aiOn && <button type="button" className={`v2-chip ${raise === "ai" ? "on" : ""}`} onClick={() => setRaise("ai")}><Icon name="spark" size={15} /> {aiLabel} <small>AI pick</small></button>}
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
            {customBad && <p className="sl-err"><Icon name="alert" size={16} /> Must be at least +2% above the public rate.</p>}
          </div>
        )}
        {hot.length > 0 && (
          <p className="sl-hotnote"><Icon name="flame" size={16} /> {hot.map((p) => p.name).join(", ")} {hot.length === 1 ? "is" : "are"} wanted by our creators, so {hot.length === 1 ? "it starts" : "they start"} at +{HOT_RAISE}%.</p>
        )}
        {aiOn && sel.some((p) => pickOf(p)) && (
          <div className="sl-ai">
            <Icon name="spark" size={18} />
            <span>
              {sel.filter((p) => pickOf(p)).map((p, k) => {
                const h = pickOf(p)!;
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
        <div className="sl-step-h"><span className="n">3</span><h2>Samples per SKU</h2><span className="v2-small">Most shops pick 30–50</span></div>
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
            {samplesBad && <p className="sl-err"><Icon name="alert" size={16} /> Must be more than 0, or TikTok won&apos;t approve it.</p>}
          </div>
        )}
        <p className="v2-small" style={{ margin: 0 }}>1 sample = at least 1 video; most creators post more. You pay for samples, sent through TikTok.</p>
      </section>

      <section className="sl-preset">
        <span>
          <b>Preset for you</b>
          <span>Creators: {conditions}{allAny ? " · rest Any" : ""}</span>
        </span>
        <button type="button" className="btn-outline" onClick={() => setDraft(presets)}>Change</button>
      </section>

      <p className="v2-small" style={{ margin: 0 }}>
        By submitting you agree to the sample allocation terms (<button type="button" className="v2-link" style={{ fontSize: 13 }} onClick={() => setTerms(true)}>read</button>).
        {" "}Need help? <button type="button" className="v2-link" style={{ fontSize: 13 }} onClick={() => setTalk(true)}>Talk to us</button>
      </p>

      <div className="sl-sticky">
        <span>
          <b>{sel.length} product{sel.length === 1 ? "" : "s"} · {raise === "ai" ? "AI pick" : raise === "custom" ? `+${custom || 0}%` : `+${raise}%`} · {samplesBad ? "?" : nSamples} samples</b>
          {errors.length > 0 ? <span className="sl-err" style={{ fontSize: 12.5 }}>{errors[0]}</span> : <span>Goes to Techwide&apos;s TAP</span>}
        </span>
        <button type="button" className="np-btn" onClick={submit} disabled={errors.length > 0 || sending}>
          {sending ? "Submitting…" : <>Submit {sel.length || ""} product{sel.length === 1 ? "" : "s"}</>}
        </button>
      </div>

      {draft && (
        <Sheet title="Campaign Settings" onClose={() => setDraft(null)}>
          <h3 className="v2-h2" style={{ fontSize: 16 }}>Creator Conditions</h3>
          <p className="v2-small" style={{ margin: 0 }}>A guide only. Techwide decides who gets each sample.</p>
          <ChipRow label="Main niche" note="From your product's category" options={niches} value={draft.niche} onPick={(v) => setDraft({ ...draft, niche: v, subs: [] })} />
          {subsFor(draft.niche).length > 0 && (
            <ChipRow label="Sub-niches" note="Optional" multi options={subsFor(draft.niche)} value={draft.subs} onPick={(v) => setDraft({ ...draft, subs: draft.subs.includes(v) ? draft.subs.filter((s) => s !== v) : [...draft.subs, v] })} />
          )}
          <ChipRow label="TikTok level" options={OPTIONS.level} value={draft.level} onPick={(v) => setDraft({ ...draft, level: v })} />
          <ChipRow label="Monthly GMV" options={OPTIONS.gmv} value={draft.gmv} onPick={(v) => setDraft({ ...draft, gmv: v })} />
          <ChipRow label="Videos or LIVE" options={OPTIONS.format} value={draft.format} onPick={(v) => setDraft({ ...draft, format: v })} />
          <ChipRow label="Gender" options={OPTIONS.gender} value={draft.gender} onPick={(v) => setDraft({ ...draft, gender: v })} />
          <div className="v2-row">
            <button type="button" className="np-btn" style={{ flex: 1 }} onClick={() => { setPresets(draft); setDraft(null); toast("Saved for this submission"); }}>Save</button>
            <button type="button" className="btn-outline" style={{ height: 48 }} onClick={() => setDraft(live ? { ...DEFAULTS, niche: niches[0] ?? DEFAULTS.niche } : DEFAULTS)}>Reset</button>
          </div>
        </Sheet>
      )}
      {terms && <TermsSheet onClose={() => setTerms(false)} />}
      {talk && <ContactSheet onClose={() => setTalk(false)} />}
    </div>
  );
}
