"use client";

import Link from "next/link";
import { useState } from "react";
import type { Benefit } from "@/modules/levels/store.ts";
import type { Level } from "../../../emblems";
import { Hud, useToast } from "../../marketplace/use-tap-actions";
import "../../marketplace/marketplace.css";
import "../levels.css";
import "./benefits.css";

const LEVELS = [
  { name: "Bronze", a: "#e7a875", b: "#b8743f", c: "#8a4b22", mark: "#fff4ea" },
  { name: "Silver", a: "#f4f7f8", b: "#b9c4ca", c: "#6f7f88", mark: "#ffffff" },
  { name: "Gold", a: "#fff1a8", b: "#f2c230", c: "#a86e00", mark: "#fffbe8" },
];
const RANK: Record<Level, number> = { bronze: 0, silver: 1, gold: 2 };
const copy = (list: Benefit[]) => list.map((r) => ({ ...r, v: [...r.v] as [string, string, string] }));

/** Level benefits from the mockup: one comparison table; Techwide admins edit it here for every creator. */
export function BenefitsView({ initial, updatedAt, level, isAdmin, next }: { initial: Benefit[]; updatedAt: string | null; level: Level; isAdmin: boolean; next: string | null }) {
  const [rows, setRows] = useState(initial);
  const [admin, setAdmin] = useState(false);
  const [draft, setDraft] = useState<Benefit[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState(updatedAt);
  const { toast, flash } = useToast();
  const you = RANK[level];
  const data = admin ? (draft ?? rows) : rows;
  const dirty = admin && draft !== null;
  const edit = (fn: (d: Benefit[]) => void) => {
    const d = copy(draft ?? rows);
    fn(d);
    setDraft(d);
  };

  async function save() {
    if (!draft) return flash("Nothing to save");
    setSaving(true);
    const r = await fetch("/api/admin/benefits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ list: draft }) });
    const d = (await r.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!r.ok) return flash(d.error || "Could not save. Please try again.", false);
    setRows(draft);
    setDraft(null);
    setEdited(new Date().toISOString());
    flash("Saved · Levels, Benefits and the level-up screen now show this");
  }

  const editedText = edited ? `Last edited by Techwide on ${new Date(edited).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" })}.` : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/app/levels" className="nv-link" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          Your level
        </Link>
        {isAdmin && (
          <div className="nv-seg" role="group" aria-label="View as" style={{ width: 340, maxWidth: "100%" }}>
            <span className="nv-segthumb" aria-hidden="true" style={{ width: "calc(50% - 2px)", transform: `translateX(${admin ? 100 : 0}%)` }} />
            {["Creator view", "Admin: edit"].map((label, i) => (
              <button key={label} type="button" className={(admin ? 1 : 0) === i ? "on" : ""} aria-pressed={(admin ? 1 : 0) === i} onClick={() => { setAdmin(i === 1); setDraft(null); }}>{label}</button>
            ))}
          </div>
        )}
      </div>

      <section className="nv-card" aria-labelledby="bfh" style={{ padding: "8px 8px 4px", overflow: "hidden" }}>
        <h2 id="bfh" className="nv-h2" style={{ padding: "16px 16px 6px" }}>Compare levels</h2>
        <div className="bf-grid" role="table" aria-label="Benefits by level">
          <div className="bf-cell bf-corner" role="columnheader" style={{ alignItems: "flex-end", color: "var(--muted)", fontSize: 13, fontWeight: 700 }}>{admin ? "Benefit" : "You get"}</div>
          {LEVELS.map((l, i) => {
            const badge = i === you ? ["You are here", "b-green"] : i < you ? ["Reached", "b-gray"] : i === 2 ? ["Invite only", "b-amber"] : ["Next", "b-blue"];
            return (
              <div key={l.name} className={`bf-cell ${i === you ? "bf-you" : ""}`} role="columnheader" style={{ justifyContent: "center", padding: 0, borderRadius: i === you ? "18px 18px 0 0" : 0 }}>
                <div className="bf-head">
                  <svg className="bf-emb" width="58" height="58" viewBox="0 0 80 80" aria-hidden="true" style={{ animationDelay: `${-i * 0.7}s` }}>
                    <defs>
                      <linearGradient id={`bfG${i}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={l.a} /><stop offset="0.5" stopColor={l.b} /><stop offset="1" stopColor={l.c} /></linearGradient>
                      <clipPath id={`bfC${i}`}><path d="M40 4 70 18v22c0 18-13 31-30 36C23 71 10 58 10 40V18z" /></clipPath>
                    </defs>
                    <path d="M40 4 70 18v22c0 18-13 31-30 36C23 71 10 58 10 40V18z" fill={`url(#bfG${i})`} />
                    <path d="m40 24 4.5 9.2 10.2 1.5-7.4 7.2 1.8 10.1L40 47.2l-9.1 4.8 1.8-10.1-7.4-7.2 10.2-1.5z" fill={l.mark} />
                    <g clipPath={`url(#bfC${i})`}><rect className="bf-sweep" x="0" y="-10" width="14" height="100" fill="#ffffff" opacity="0.45" style={{ animationDelay: `${-i * 0.7}s` }} /></g>
                  </svg>
                  <strong style={{ fontSize: 18 }}>{l.name}</strong>
                  <span className={`nv-badge ${badge[1]}`}>{badge[0]}</span>
                </div>
              </div>
            );
          })}
          {data.map((r, ri) => (
            <div key={ri} className="bf-row" role="row">
              <div className="bf-cell bf-lab" role="rowheader" style={{ animationDelay: `${120 + ri * 60}ms` }}>
                {admin ? (
                  <>
                    <button type="button" className="bf-del nv-press" aria-label={`Remove ${r.label}`} onClick={() => edit((d) => d.splice(ri, 1))}>×</button>
                    <input type="text" className="bf-edit" aria-label="Benefit name" value={r.label} onChange={(e) => { const v = e.target.value.slice(0, 80); edit((d) => { d[ri].label = v; }); }} />
                  </>
                ) : (
                  <span>{r.label}</span>
                )}
              </div>
              {r.v.map((raw, ci) => {
                const t = String(raw).trim().toLowerCase();
                return (
                  <div key={ci} className={`bf-cell ${ci === you ? "bf-you" : ""}`} role="cell" style={{ justifyContent: "center", textAlign: "center", animationDelay: `${120 + ri * 60}ms` }}>
                    {admin ? (
                      <input type="text" className="bf-edit" aria-label={`${r.label} for ${LEVELS[ci].name}`} value={raw} onChange={(e) => { const v = e.target.value.slice(0, 60); edit((d) => { d[ri].v[ci] = v; }); }} style={{ textAlign: "center" }} />
                    ) : t === "yes" ? (
                      <span className="bf-yes" aria-label="Included" style={{ animationDelay: `${300 + ri * 60 + ci * 70}ms` }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0d1117" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
                      </span>
                    ) : t === "no" || t === "" ? (
                      <span style={{ color: "var(--muted)" }} aria-label="Not included">—</span>
                    ) : (
                      <span className={r.key ? "bf-key" : ""}>{raw}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {admin ? (
          <div style={{ padding: "14px 16px", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <button type="button" className="nv-btn3 nv-sm nv-press" onClick={() => edit((d) => d.push({ label: "New benefit", v: ["no", "no", "yes"] }))}>+ Add benefit</button>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>Type &quot;yes&quot; for a tick, &quot;no&quot; for a dash, or any short text.</span>
          </div>
        ) : (
          <p style={{ margin: 0, padding: "14px 16px 16px", fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>Levels change automatically at month end, and Techwide may update these benefits. {editedText}</p>
        )}
      </section>

      {!admin && next && (
        <section className="nv-card" aria-labelledby="bfn" style={{ padding: 22, display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <h2 id="bfn" className="nv-h2">{level === "bronze" ? "Next: Silver" : "Keep Silver"}</h2>
            <span style={{ color: "var(--muted)" }}>{next}</span>
          </div>
          <Link href="/app/levels" className="nv-btn nv-press">See my progress</Link>
        </section>
      )}

      {admin && (
        <div className="bf-bar" role="region" aria-label="Save benefits">
          <span style={{ fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8 }}><span className={dirty ? "nv-dotr" : "nv-dot"} aria-hidden="true" />{dirty ? "Unsaved changes" : "Editing benefits · creators see the saved version"}</span>
          <span style={{ display: "flex", gap: 10 }}>
            <button type="button" className="nv-btn2 nv-sm nv-press" onClick={() => { setDraft(null); flash("Changes discarded"); }}>Discard</button>
            <button type="button" className="nv-btn nv-sm nv-press" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save for all creators"}</button>
          </span>
        </div>
      )}
      <Hud toast={toast} />
    </div>
  );
}
