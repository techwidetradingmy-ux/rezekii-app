"use client";

import { useRef, useState } from "react";
import type { CampaignForm } from "@/modules/admin/campaigns.ts";
import { firstEndDay, lastEndDay, longDay, startTime } from "@/modules/admin/campaign-dates.ts";

const EMPTY: CampaignForm = { name: "", description: "", regEnd: "", start: "", end: "", commission: 18, local: true, crossBorder: false, shopCodes: [], whatsapp: "", email: "", phone: "" };
const label = { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" } as const;
/** Marks a field TikTok requires. */
const Req = () => <span className="cp-req" aria-hidden="true"> *</span>;

/**
 * Create or edit a TAP campaign, with the fields TikTok accepts (mockup: Admin · TAP campaigns, create and edit).
 * `id` null = a new campaign, which stays hidden from shops until it is published.
 */
export function CampaignSheet({ id, initial, closing, onClose, onSaved }: {
  id: string | null;
  initial: CampaignForm | null;
  closing: boolean;
  onClose: () => void;
  onSaved: (id: string, published: boolean, name: string, form: CampaignForm) => void;
}) {
  const [f, setF] = useState<CampaignForm>(initial ?? EMPTY);
  const [busy, setBusy] = useState<"" | "save" | "publish">("");
  const [error, setError] = useState("");
  const [now] = useState(() => Date.now());
  const today = new Date(now + 8 * 3_600_000).toISOString().slice(0, 10);
  const form = useRef<HTMLFormElement>(null);
  const set = <K extends keyof CampaignForm>(k: K, v: CampaignForm[K]) => setF((x) => ({ ...x, [k]: v }));
  // TikTok's limits (campaign-dates.ts), from the real start: an existing campaign's saved start, else the day (10 minutes from
  // now when that's today). The latest dates fill in at once (owner, 16 Oct 2026: agencies keep both open as long as they can).
  const start = f.start || today;
  const at = startTime(start, now, id ? f.startAt : null);
  const firstEnd = firstEndDay(at), latestEnd = lastEndDay(at);
  const useLatest = () => setF((x) => ({ ...x, start, end: latestEnd, regEnd: latestEnd }));

  async function save(andPublish: boolean) {
    if (busy || !form.current?.reportValidity()) return;
    // What each box really shows: Chrome can autofill a box (e.g. the email) without telling the page.
    const fd = new FormData(form.current);
    const box = (k: string, was: string) => { const v = fd.get(k); return typeof v === "string" ? v : was; };
    const sent: CampaignForm = {
      ...f, name: box("name", f.name), description: box("description", f.description), shopCodes: box("shopCodes", f.shopCodes.join("\n")).split(/[\s,]+/),
      start: box("start", f.start), end: box("end", f.end), regEnd: box("regEnd", f.regEnd), commission: Number(box("commission", String(f.commission))),
      whatsapp: box("whatsapp", f.whatsapp), email: box("email", f.email),
    };
    setF(sent);
    setBusy(andPublish ? "publish" : "save");
    setError("");
    try {
      const r = await fetch(id ? `/api/admin/tap/campaigns/${id}` : "/api/admin/tap/campaigns", { method: id ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sent) });
      const d = (await r.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!r.ok || !d.id) throw new Error(d.error || "TikTok didn't save the campaign.");
      if (andPublish) {
        const p = await fetch(`/api/admin/tap/campaigns/${d.id}/publish`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: f.name }) });
        const pd = (await p.json().catch(() => ({}))) as { error?: string };
        if (!p.ok) throw new Error(`Saved, but not published: ${pd.error || "TikTok didn't publish it."}`);
      }
      onSaved(d.id, andPublish, sent.name, sent);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <button type="button" aria-label="Close" className={`nv-dim ${closing ? "out" : ""}`} onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="cpst" className={`nv-sheet cp-sheet ${closing ? "out" : ""}`}>
        <span className="nv-grab" aria-hidden="true" />
        <h3 id="cpst" style={{ margin: 0, fontSize: 21, fontWeight: 800 }}>{id ? `Edit ${initial?.name || "campaign"}` : "New TAP campaign"}</h3>
        <form ref={form} className="cp-form" onSubmit={(e) => { e.preventDefault(); save(false); }}>
          <span className="cp-help"><span className="cp-req">*</span> Required by TikTok</span>
          <div className="cp-field">
            <label htmlFor="cpname" className="nv-label">Campaign name<Req /></label>
            <input id="cpname" name="name" className="nv-input" maxLength={49} value={f.name} onChange={(e) => set("name", e.target.value)} required />
            <span className="cp-help">{49 - f.name.length} characters left · shops see this name</span>
          </div>
          <div className="cp-field">
            <label htmlFor="cpdesc" className="nv-label">Description for shops<Req /></label>
            <textarea id="cpdesc" name="description" className="nv-input" rows={3} maxLength={1000} value={f.description} onChange={(e) => set("description", e.target.value)} required />
            <span className="cp-help">What shops get by joining, e.g. &quot;Year-end wellness campaign for Malaysian shops&quot; · {1000 - f.description.length} characters left</span>
          </div>
          <fieldset className="cp-field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="nv-label">Which shops can register products<Req /></legend>
            <div className="cp-grid">
              <label className="cp-check"><input type="checkbox" checked={f.local} onChange={(e) => set("local", e.target.checked)} />Local Malaysian shops</label>
              <label className="cp-check"><input type="checkbox" checked={f.crossBorder} onChange={(e) => set("crossBorder", e.target.checked)} />Cross-border shops</label>
            </div>
            <span className="cp-help">Pick at least one, or invite specific shops by their shop code (Seller Center → profile), one per line.</span>
            <label htmlFor="cpcodes" style={label}>Shop codes</label>
            <textarea id="cpcodes" name="shopCodes" className="nv-input" rows={2} placeholder="MYLCXXXXXX" value={f.shopCodes.join("\n")} onChange={(e) => set("shopCodes", e.target.value.split(/[\s,]+/))} />
          </fieldset>
          <div className="cp-grid">
            <div className="cp-field"><label htmlFor="cpcs" className="nv-label">Campaign starts<Req /></label><input id="cpcs" name="start" type="date" className="nv-input" min={id ? undefined : today} value={f.start} onChange={(e) => set("start", e.target.value)} required /><span className="cp-help">Today or later; shops can register from this day. Today means about 10 minutes from now (TikTok needs a start time that hasn&apos;t passed).</span></div>
            <div className="cp-field"><label htmlFor="cpce" className="nv-label">Campaign ends<Req /></label><input id="cpce" name="end" type="date" className="nv-input" min={firstEnd} max={latestEnd} value={f.end} onChange={(e) => set("end", e.target.value)} required /><span className="cp-help">At least 1 day and at most 360 days from the start (TikTok&apos;s limits): {longDay(latestEnd)} at the latest.</span></div>
            <div className="cp-field"><label htmlFor="cpre" className="nv-label">Registration closes<Req /></label><input id="cpre" name="regEnd" type="date" className="nv-input" min={firstEnd} max={f.end || latestEnd} value={f.regEnd} onChange={(e) => set("regEnd", e.target.value)} required /><span className="cp-help">Open at least 1 day, closing by the end day; usually the end day, so shops can join all along.</span></div>
          </div>
          <div className="cp-latest">
            <button type="button" className="nv-btn2 nv-sm nv-press" onClick={useLatest}>Use the latest dates</button>
            <span className="cp-help">Runs and takes registrations for the full 360 days TikTok allows{f.start ? "" : ", from today"}: until {longDay(latestEnd)}.</span>
          </div>
          <div className="cp-field">
            <label htmlFor="cpcom" className="nv-label">Total commission shown to shops<Req /></label>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}><input id="cpcom" name="commission" type="number" min={1.01} max={79.99} step={0.01} className="nv-input" value={f.commission} onChange={(e) => set("commission", Number(e.target.value))} style={{ width: 140 }} required /><strong>%</strong></span>
            <span className="cp-help">More than 1% and less than 80%. Creators get the Open Plan rate plus their level&apos;s extra; Techwide keeps the rest.</span>
          </div>
          <div className="cp-grid">
            <div className="cp-field"><label htmlFor="cpwa" className="nv-label">WhatsApp<Req /></label><input id="cpwa" name="whatsapp" type="tel" className="nv-input" placeholder="012-345 6789" value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} required /><span className="cp-help">For shops to reach Techwide. Any usual format (012-345 6789 or +60 12-345 6789); sent to TikTok as +60…</span></div>
            <div className="cp-field"><label htmlFor="cpem" className="nv-label">Email<Req /></label><input id="cpem" name="email" type="email" className="nv-input" placeholder="partners@techwide.my" value={f.email} onChange={(e) => set("email", e.target.value)} required /><span className="cp-help">For shops to reach Techwide, e.g. partners@techwide.my.</span></div>
          </div>
          {error && <p role="alert" className="cp-error">{error}</p>}
          <div className="cp-acts">
            <button type="button" className="nv-btn2 nv-press" onClick={onClose}>Cancel</button>
            <button type="submit" className="nv-btn2 nv-press" disabled={!!busy}>{busy === "save" ? "Saving…" : id ? "Save changes" : "Save as draft"}</button>
            {!id && <button type="button" className="nv-btn nv-press nv-cta" disabled={!!busy} onClick={() => save(true)}>{busy === "publish" ? "Publishing…" : "Save and publish"}</button>}
          </div>
        </form>
      </div>
    </>
  );
}
