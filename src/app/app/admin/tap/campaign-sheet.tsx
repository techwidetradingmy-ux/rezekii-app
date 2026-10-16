"use client";

import { useState } from "react";
import type { CampaignForm } from "@/modules/admin/campaigns.ts";

const EMPTY: CampaignForm = { name: "", description: "", regEnd: "", start: "", end: "", commission: 18, local: true, crossBorder: false, shopCodes: [], whatsapp: "", email: "", phone: "" };
const label = { position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" } as const;

/**
 * Create or edit a TAP campaign, with the fields TikTok accepts (mockup: Admin · TAP campaigns, create and edit).
 * `id` null = a new campaign, which stays hidden from shops until it is published.
 */
export function CampaignSheet({ id, initial, closing, onClose, onSaved }: {
  id: string | null;
  initial: CampaignForm | null;
  closing: boolean;
  onClose: () => void;
  onSaved: (id: string, published: boolean, name: string) => void;
}) {
  const [f, setF] = useState<CampaignForm>(initial ?? EMPTY);
  const [busy, setBusy] = useState<"" | "save" | "publish">("");
  const [error, setError] = useState("");
  const set = <K extends keyof CampaignForm>(k: K, v: CampaignForm[K]) => setF((x) => ({ ...x, [k]: v }));

  async function save(andPublish: boolean) {
    if (busy) return;
    setBusy(andPublish ? "publish" : "save");
    setError("");
    try {
      const r = await fetch(id ? `/api/admin/tap/campaigns/${id}` : "/api/admin/tap/campaigns", { method: id ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
      const d = (await r.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!r.ok || !d.id) throw new Error(d.error || "TikTok didn't save the campaign.");
      if (andPublish) {
        const p = await fetch(`/api/admin/tap/campaigns/${d.id}/publish`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: f.name }) });
        const pd = (await p.json().catch(() => ({}))) as { error?: string };
        if (!p.ok) throw new Error(`Saved, but not published: ${pd.error || "TikTok didn't publish it."}`);
      }
      onSaved(d.id, andPublish, f.name);
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
        <form className="cp-form" onSubmit={(e) => { e.preventDefault(); save(false); }}>
          <div className="cp-field">
            <label htmlFor="cpname" className="nv-label">Campaign name</label>
            <input id="cpname" className="nv-input" maxLength={49} value={f.name} onChange={(e) => set("name", e.target.value)} required />
            <span className="cp-help">{49 - f.name.length} characters left · shops see this name</span>
          </div>
          <div className="cp-field">
            <label htmlFor="cpdesc" className="nv-label">Description for shops</label>
            <textarea id="cpdesc" className="nv-input" rows={3} maxLength={1000} value={f.description} onChange={(e) => set("description", e.target.value)} required />
            <span className="cp-help">Required by TikTok · {1000 - f.description.length} characters left</span>
          </div>
          <fieldset className="cp-field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="nv-label">Which shops can register products</legend>
            <div className="cp-grid">
              <label className="cp-check"><input type="checkbox" checked={f.local} onChange={(e) => set("local", e.target.checked)} />Local Malaysian shops</label>
              <label className="cp-check"><input type="checkbox" checked={f.crossBorder} onChange={(e) => set("crossBorder", e.target.checked)} />Cross-border shops</label>
            </div>
            <span className="cp-help">Or invite specific shops by their shop code (Seller Center → profile), one per line.</span>
            <label htmlFor="cpcodes" style={label}>Shop codes</label>
            <textarea id="cpcodes" className="nv-input" rows={2} placeholder="MYLCXXXXXX" value={f.shopCodes.join("\n")} onChange={(e) => set("shopCodes", e.target.value.split(/[\s,]+/))} />
          </fieldset>
          <div className="cp-grid">
            <div className="cp-field"><label htmlFor="cpcs" className="nv-label">Campaign starts</label><input id="cpcs" type="date" className="nv-input" value={f.start} onChange={(e) => set("start", e.target.value)} required /><span className="cp-help">Shops can register from this day too.</span></div>
            <div className="cp-field"><label htmlFor="cpce" className="nv-label">Campaign ends</label><input id="cpce" type="date" className="nv-input" value={f.end} onChange={(e) => set("end", e.target.value)} required /><span className="cp-help">Up to 360 days after it starts. Set an earlier date to end it sooner.</span></div>
            <div className="cp-field"><label htmlFor="cpre" className="nv-label">Registration closes</label><input id="cpre" type="date" className="nv-input" value={f.regEnd} onChange={(e) => set("regEnd", e.target.value)} required /><span className="cp-help">Between the start and end days.</span></div>
          </div>
          <div className="cp-field">
            <label htmlFor="cpcom" className="nv-label">Total commission shown to shops</label>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}><input id="cpcom" type="number" min={1.01} max={79.99} step={0.01} className="nv-input" value={f.commission} onChange={(e) => set("commission", Number(e.target.value))} style={{ width: 140 }} required /><strong>%</strong></span>
            <span className="cp-help">More than 1% and less than 80%. Creators get the Open Plan rate plus their level&apos;s extra; Techwide keeps the rest.</span>
          </div>
          <div className="cp-grid">
            <div className="cp-field"><label htmlFor="cpwa" className="nv-label">WhatsApp (required in Malaysia)</label><input id="cpwa" type="tel" className="nv-input" placeholder="012-345 6789" value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} required /><span className="cp-help">Any usual format; sent to TikTok as +60…</span></div>
            <div className="cp-field"><label htmlFor="cpem" className="nv-label">Email</label><input id="cpem" type="email" className="nv-input" value={f.email} onChange={(e) => set("email", e.target.value)} /></div>
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
