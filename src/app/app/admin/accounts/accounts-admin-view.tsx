"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AdminAccount } from "@/modules/admin/accounts.ts";
import { n } from "../../marketplace/format";
import { Hud, useToast } from "../../marketplace/use-tap-actions";
import "../../marketplace/marketplace.css";
import "../../today.css";
import "../../links/links.css";
import "../../accounts/accounts.css";
import "../admin.css";

const COLS = "minmax(210px, 2fr) minmax(170px, 1.6fr) 120px 160px 90px 120px 150px";
const COLORS = ["#00874f", "#7c3aed", "#0e7490", "#b45309", "#334155", "#e8005a", "#0369a1", "#be185d"];
const colorOf = (s: string) => COLORS[[...s].reduce((h, c) => h + c.charCodeAt(0), 0) % COLORS.length];

function Avatar({ a, size }: { a: AdminAccount; size: number }) {
  return a.avatar ? (
    // TikTok avatars come from many CDN hosts, so a plain img.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={a.avatar} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  ) : (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: "50%", background: colorOf(a.handle), color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: size / 2.6, flexShrink: 0 }}>{a.handle.replace("@", "").charAt(0).toUpperCase()}</span>
  );
}

const look = (a: AdminAccount) => ({
  shop: a.shop ? (["Linked", "b-green"] as const) : a.techwide ? (["Not needed", "b-gray"] as const) : (["Not linked", "b-gray"] as const),
  tt: a.tiktok === "expired" ? (["Reconnect needed", "b-blue"] as const) : (["Connected", "b-green"] as const),
  st: a.tiktok === "expired" ? (["Needs attention", "b-amber"] as const) : a.techwide ? (["OK", "b-green"] as const) : (["Active", "b-green"] as const),
});

/** Every TikTok account connected to Rezekii, as designed in the mockup (Accounts). */
export function AccountsAdminView({ accounts }: { accounts: AdminAccount[] }) {
  const router = useRouter();
  const { toast, flash } = useToast();
  const [f, setF] = useState(0);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<AdminAccount | null>(null);
  const [closing, setClosing] = useState(false);
  const [alert, setAlert] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [sClosing, setSClosing] = useState(false);
  const [busy, setBusy] = useState(false);

  const attention = (a: AdminAccount) => a.tiktok === "expired";
  const counts = [accounts.length, accounts.filter((a) => a.techwide).length, accounts.filter((a) => !a.techwide).length, accounts.filter(attention).length];
  const s = q.trim().toLowerCase();
  const shown = accounts.filter((a) => (f === 0 || (f === 1 && a.techwide) || (f === 2 && !a.techwide) || (f === 3 && attention(a))) && (!s || `${a.handle} ${a.owner}`.toLowerCase().includes(s)));

  const closePanel = () => {
    setClosing(true);
    setTimeout(() => {
      setOpen(null);
      setClosing(false);
    }, 250);
  };
  const closeSheet = () => {
    setSClosing(true);
    setTimeout(() => {
      setSheet(false);
      setSClosing(false);
    }, 250);
  };
  useEffect(() => {
    if (!open && !sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (sheet) closeSheet();
      else closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function remove() {
    if (!open || busy) return;
    setBusy(true);
    const r = await fetch(`/api/admin/accounts/${encodeURIComponent(open.openId)}`, { method: "DELETE" });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    setAlert(false);
    if (!r.ok) return flash(j.error || "Could not remove the account.", false);
    flash(`${open.handle} removed`);
    closePanel();
    router.refresh();
  }

  const sp = open;
  const spl = open ? look(open) : null;
  return (
    <>
      <div className="ad-head">
        <div>
          <h1 className="nv-title">TikTok accounts</h1>
          <p className="nv-sub">Every account connected to Rezekii · Techwide&apos;s own and creators&apos;</p>
        </div>
        <button type="button" className="nv-btn nv-press" onClick={() => { setSClosing(false); setSheet(true); }} style={{ height: 42 }}>+ Connect Techwide account</button>
      </div>

      <section className="nv-up nv-card" aria-label="Filter accounts" style={{ boxShadow: "var(--shadow)", borderRadius: 26, padding: "16px 18px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
        <div className="nv-seg" role="group" aria-label="Show" style={{ width: 480, maxWidth: "100%" }}>
          <span className="nv-segthumb" aria-hidden="true" style={{ width: "calc(25% - 1px)", transform: `translateX(${f * 100}%)` }} />
          {["All", "Techwide", "Creators", "Needs attention"].map((label, i) => (
            <button key={label} type="button" className={f === i ? "on" : ""} aria-pressed={f === i} onClick={() => setF(i)}>{label} {counts[i]}</button>
          ))}
        </div>
        <label htmlFor="acq" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Search accounts</label>
        <input id="acq" type="text" className="nv-input" placeholder="Search handle or owner" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: "1 1 220px" }} />
      </section>

      <section className="nv-up nv-card nv-scrollx" aria-label="Accounts" style={{ animationDelay: "60ms", padding: 8 }}>
        <div role="table" aria-label="TikTok accounts" style={{ minWidth: 1000 }}>
          <div role="row" className="nv-tr nv-trh" style={{ gridTemplateColumns: COLS }}>
            <span role="columnheader">Account</span><span role="columnheader">Owner</span><span role="columnheader">TikTok Shop</span><span role="columnheader">TikTok</span><span role="columnheader">Queued</span><span role="columnheader">Links · 30 d</span><span role="columnheader">Status</span>
          </div>
          {shown.map((a) => {
            const l = look(a);
            return (
              <div key={a.openId} role="row" className="nv-tr nv-trow" style={{ gridTemplateColumns: COLS }}>
                <span role="cell">
                  <button type="button" onClick={() => { setClosing(false); setOpen(a); }} style={{ border: 0, background: "transparent", padding: 0, color: "var(--text)", display: "flex", alignItems: "center", gap: 10, textAlign: "left", cursor: "pointer" }}>
                    <Avatar a={a} size={36} />
                    <span style={{ fontWeight: 800 }}>{a.handle}</span>
                  </button>
                </span>
                <span role="cell" style={{ color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.owner}</span>
                <span role="cell"><span className={`nv-badge ${l.shop[1]}`}>{l.shop[0]}</span></span>
                <span role="cell"><span className={`nv-badge ${l.tt[1]}`}>{l.tt[0]}</span></span>
                <span role="cell">{a.tiktok === "expired" && a.queued ? `${a.queued} paused` : a.queued}</span>
                <span role="cell">{a.techwide ? "—" : n(a.links30)}</span>
                <span role="cell"><span className={`nv-badge ${l.st[1]}`}>{l.st[0]}</span></span>
              </div>
            );
          })}
        </div>
        {!shown.length && <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>{accounts.length ? "No accounts match." : "No TikTok accounts are connected yet."}</div>}
      </section>

      {sp && (
        <>
          <button type="button" aria-label="Close" className={`nv-dim ${closing ? "out" : ""}`} onClick={closePanel} />
          <div role="dialog" aria-modal="true" aria-labelledby="acpt" className={`nv-panel ${closing ? "out" : ""}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className={`nv-badge ${spl!.st[1]}`}>{spl!.st[0]}</span>
              <button type="button" className="nv-press" aria-label="Close" onClick={closePanel} style={{ width: 34, height: 34, borderRadius: "50%", border: 0, background: "var(--surface2)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Avatar a={sp} size={56} />
              <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <h3 id="acpt" style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{sp.handle}</h3>
                <span style={{ fontSize: 14, color: "var(--muted)" }}>{sp.owner} · connected {new Date(sp.connectedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" })}</span>
              </span>
            </div>
            <div style={{ borderRadius: 18, background: "var(--surface2)", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
                <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontWeight: 700 }}>TikTok Shop</span><span style={{ fontSize: 12, color: "var(--muted)" }}>Affiliate links, showcase, samples</span></span>
                <span className={`nv-badge ${spl!.shop[1]}`}>{spl!.shop[0]}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderTop: "1px solid var(--border)" }}>
                <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}><span style={{ fontWeight: 700 }}>TikTok</span><span style={{ fontSize: 12, color: "var(--muted)" }}>Posting and video stats</span></span>
                {sp.tiktok === "expired" && sp.techwide ? (
                  <a href="/api/auth/tiktok/start" className="nv-btn3 nv-sm nv-press">Reconnect now</a>
                ) : sp.tiktok === "expired" ? (
                  <span style={{ fontSize: 12, color: "var(--muted)", textAlign: "right" }}>The owner reconnects on My accounts</span>
                ) : (
                  <span className={`nv-badge ${spl!.tt[1]}`}>{spl!.tt[0]}</span>
                )}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
              <div style={{ background: "var(--surface2)", borderRadius: 16, padding: 14 }}><div style={{ fontSize: 24, fontWeight: 800 }}>{sp.queued}</div><div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Posts queued</div></div>
              <div style={{ background: "var(--surface2)", borderRadius: 16, padding: 14 }}><div style={{ fontSize: 24, fontWeight: 800 }}>{sp.techwide ? "—" : n(sp.links30)}</div><div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Links in 30 days</div></div>
            </div>
            <Link href={`/app/admin/calendar?account=${encodeURIComponent(sp.openId)}`} className="nv-btn2 nv-press" style={{ textDecoration: "none" }}>See this account&apos;s posts</Link>
            {sp.techwide ? (
              <button type="button" className="nv-link" onClick={() => setAlert(true)} style={{ color: "var(--red)", alignSelf: "flex-start" }}>Remove account from Rezekii</button>
            ) : (
              <Link href="/app/admin/creators" className="nv-link" style={{ alignSelf: "flex-start" }}>Manage this creator in Creators</Link>
            )}
          </div>
        </>
      )}

      {alert && sp && (
        <>
          <button type="button" className="nv-dimalert" aria-label="Cancel" onClick={() => setAlert(false)} />
          <div className="nv-alert" role="alertdialog" aria-modal="true" aria-labelledby="acat">
            <div style={{ padding: "20px 18px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
              <span id="acat" style={{ fontSize: 17, fontWeight: 700 }}>Remove {sp.handle}?</span>
              <span style={{ fontSize: 13, lineHeight: 1.45 }}>Rezekii can no longer post for it and its queued posts are cancelled. Its posted videos and link history are kept as business records.</span>
            </div>
            <div className="nv-alert-b">
              <button type="button" onClick={() => setAlert(false)}>Cancel</button>
              <button type="button" className="danger" onClick={remove} disabled={busy} style={{ opacity: busy ? 0.4 : 1 }}>Remove</button>
            </div>
          </div>
        </>
      )}

      {sheet && (
        <>
          <button type="button" aria-label="Close" className={`nv-dim ${sClosing ? "out" : ""}`} onClick={closeSheet} />
          <div role="dialog" aria-modal="true" aria-labelledby="acst" className={`nv-sheet ${sClosing ? "out" : ""}`}>
            <span className="nv-grab" aria-hidden="true" />
            <h3 id="acst" style={{ margin: 0, fontSize: 21, fontWeight: 800 }}>Connect a Techwide TikTok account</h3>
            <span style={{ fontSize: 15, color: "var(--body)", lineHeight: 1.5 }}>
              You&apos;ll sign in to TikTok with the account and allow Rezekii to read its profile and videos and to post for it. It is added to your admin account as a Techwide account. Techwide accounts don&apos;t need approval.
            </span>
            <span style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>Sign out of TikTok in this browser first if it is signed in to a different account.</span>
            <a href="/api/auth/tiktok/start" className="nv-btn nv-press nv-cta" style={{ height: 54, fontSize: 16, textDecoration: "none" }}>Continue to TikTok</a>
          </div>
        </>
      )}
      <Hud toast={toast} />
    </>
  );
}
