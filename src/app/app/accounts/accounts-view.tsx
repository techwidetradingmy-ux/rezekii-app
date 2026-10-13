"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { shortCount, type AccountStats } from "@/integrations/tiktok/stats.ts";
import type { AccountOverview } from "@/modules/accounts/manage.ts";
import { Hud, useToast } from "../marketplace/use-tap-actions";
import { saveTheme, useTheme } from "../use-theme";
import "../marketplace/marketplace.css";
import "../today.css";
import "./accounts.css";

const SHOP_NOTE: Record<AccountOverview["shop"]["status"], (s: AccountOverview["shop"]) => string> = {
  none: () => "Affiliate links for any product, add to showcase, product facts",
  waiting: () => "Linked · Techwide approves each new creator account",
  approved: () => "Affiliate links, showcase and product facts are on",
  rejected: (s) => `Not approved${s.reason ? `: ${s.reason}` : ""} · you can link again to ask again`,
  waitlist: () => "All TikTok Shop places are taken · you'll be invited when one frees up",
  invited: () => "A place is free for you · link TikTok Shop now",
};

type Me = { handle: string; avatar: string | null; initial: string; role: "admin" | "creator"; tiktokUsername: string | null };
type Alert = "disconnect" | "delete" | null;

/** My accounts, as designed in the mockup: the TikTok account and its connections, My TAP products, settings and account deletion. */
export function AccountsView({ me, o, justConnected }: { me: Me; o: AccountOverview; justConnected: boolean }) {
  const router = useRouter();
  const { toast, flash } = useToast();
  const theme = useTheme();
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [linking, setLinking] = useState(false);
  const [alert, setAlert] = useState<Alert>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [welcomed, setWelcomed] = useState(false);

  useEffect(() => {
    if (!o.tiktok) return;
    fetch("/api/tiktok/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { account?: AccountStats | null }) => setStats(d.account ?? null))
      .catch(() => {});
  }, [o.tiktok]);
  useEffect(() => {
    if (!justConnected || welcomed) return;
    const t = setTimeout(() => {
      setWelcomed(true);
      flash("TikTok connected");
      router.replace("/app/accounts");
    }, 0);
    return () => clearTimeout(t);
  });

  async function confirm() {
    if (busy || (alert === "delete" && typed.trim() !== "DELETE")) return;
    setBusy(true);
    try {
      const r = await fetch(alert === "delete" ? "/api/account/delete" : "/api/account/tiktok/disconnect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(alert === "delete" ? { confirm: typed.trim() } : {}),
      });
      const d = (await r.json().catch(() => ({}))) as { error?: string; drafts?: number };
      if (!r.ok) throw new Error(d.error || "Something went wrong. Please try again.");
      if (alert === "delete") setDeleted(true);
      else {
        flash(d.drafts ? `TikTok disconnected. ${d.drafts} scheduled ${d.drafts === 1 ? "post moved" : "posts moved"} to drafts.` : "TikTok disconnected");
        router.refresh();
      }
      setAlert(null);
    } catch (err) {
      flash(err instanceof Error ? err.message : String(err), false);
    } finally {
      setBusy(false);
    }
  }

  if (deleted)
    return (
      <section className="nv-up nv-card" style={{ boxShadow: "var(--shadow)", padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
        <span style={{ fontSize: 22, fontWeight: 800 }}>Your Rezekii account is deleted</span>
        <span style={{ fontSize: 15, color: "var(--muted)", maxWidth: 460, lineHeight: 1.5 }}>Your connections were dropped, scheduled posts cancelled, and your link history, stats and profile removed.</span>
        <a href="/signin" className="nv-btn nv-press" style={{ textDecoration: "none" }}>Back to sign in</a>
      </section>
    );

  const themeIdx = theme === "light" ? 0 : theme === "dark" ? 1 : 2;
  const blocked = alert === "delete" && typed.trim() !== "DELETE";
  const handle = me.tiktokUsername ? `@${me.tiktokUsername}` : me.handle;
  const ttNote = o.tiktok
    ? `Connected${stats?.follower_count !== undefined ? ` · ${shortCount(stats.follower_count)} followers` : ""}${stats?.likes_count !== undefined ? ` · ${shortCount(stats.likes_count)} likes` : ""}${stats?.video_count !== undefined ? ` · ${shortCount(stats.video_count)} videos` : ""} · posting and stats on`
    : "For scheduling posts and video stats";

  return (
    <>
      <section className="nv-up" aria-labelledby="maacc" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, background: "var(--surface)", borderRadius: 26, padding: "18px 22px", boxShadow: "var(--shadow)" }}>
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <h2 id="maacc" className="nv-h2">TikTok accounts</h2>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>Each account is approved by Techwide. TikTok Shop linking is for affiliate links and showcase; TikTok is for posting and video stats.</span>
          </span>
        </div>
        <div className="nv-card nv-up" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
            {me.avatar ? (
              // TikTok and Google avatars come from many CDN hosts, so a plain img is simpler than whitelisting them all.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.avatar} alt="" width={52} height={52} style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <span aria-hidden="true" style={{ width: 52, height: 52, borderRadius: "50%", background: "#7c3aed", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 20 }}>{me.initial}</span>
            )}
            <span style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: 18, fontWeight: 800 }}>{handle}</span>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{o.tiktok ? `TikTok connected on ${o.tiktok.connectedAt}` : `Joined Rezekii on ${o.joined}`}</span>
            </span>
            <span className={`nv-badge ${me.role === "admin" ? "b-blue" : "b-green"}`}>{me.role === "admin" ? "Techwide admin" : "Active"}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            <div style={{ borderRadius: 18, background: "var(--surface2)", padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 36, height: 36, borderRadius: 10, background: "#0d1117", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#25f4ee" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" /><path d="M14 3c.5 2.8 2.4 4.6 5 5" /></svg>
              </span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontWeight: 700 }}>TikTok Shop{o.shop.handle ? ` · @${o.shop.handle}` : ""}</span>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>{SHOP_NOTE[o.shop.status](o.shop)}</span>
              </span>
              {o.shop.status === "approved" || o.shop.status === "waiting" ? (
                <span className={`nv-badge ${o.shop.status === "approved" ? "b-green" : "b-amber"}`}>{o.shop.status === "approved" ? "Approved" : "Waiting for approval"}</span>
              ) : o.shop.status === "waitlist" ? (
                <span className="nv-badge b-gray">Waitlist #{o.shop.position ?? "?"}</span>
              ) : (
                <a href="/api/auth/tiktokshop/start" className="nv-btn3 nv-sm nv-press" onClick={() => setLinking(true)}>
                  {linking && <span className="nv-sping" aria-hidden="true" />}
                  {linking ? "Opening TikTok Shop…" : o.shop.status === "rejected" ? "Link again" : "Link TikTok Shop"}
                </a>
              )}
            </div>
            <div style={{ borderRadius: 18, background: "var(--surface2)", padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 36, height: 36, borderRadius: 10, background: "var(--seg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="m10 8 6 4-6 4z" /><rect x="3" y="4" width="18" height="16" rx="4" /></svg>
              </span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontWeight: 700 }}>TikTok · optional</span>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>{ttNote}</span>
              </span>
              {o.tiktok ? (
                <button type="button" className="nv-link" onClick={() => setAlert("disconnect")} style={{ color: "var(--red)" }}>Disconnect</button>
              ) : (
                <a href="/api/auth/tiktok/start" className="nv-btn3 nv-sm nv-press" onClick={() => setConnecting(true)}>
                  {connecting && <span className="nv-sping" aria-hidden="true" />}
                  {connecting ? "Connecting…" : "Connect TikTok"}
                </a>
              )}
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center", fontSize: 13, color: "var(--muted)" }}>
            <span>
              {o.linksThisWeek || o.showcase
                ? `${o.linksThisWeek} ${o.linksThisWeek === 1 ? "link" : "links"} this week · ${o.showcase} ${o.showcase === 1 ? "product" : "products"} in showcase`
                : "No links yet"}
            </span>
          </div>
        </div>
      </section>

      <Link href="/app/my-tap" className="nv-up nv-card nv-hover" aria-labelledby="matap" style={{ animationDelay: "40ms", padding: 22, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 18, textDecoration: "none", color: "var(--text)" }}>
        <span aria-hidden="true" style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #00c073, #00874f)", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l3 8 4-16 3 8h4" /></svg>
        </span>
        <span style={{ flex: "1 1 280px", display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <strong id="matap" style={{ fontSize: 18 }}>My TAP products</strong>
          <span style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.5 }}>Every Rezekii product you promote: sample status from TikTok, the videos and LIVEs you posted, and your sales.</span>
        </span>
        <span className="nv-btn2 nv-sm" style={{ flexShrink: 0 }}>Open</span>
      </Link>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
        <section className="nv-up nv-card" aria-labelledby="maset" style={{ animationDelay: "80ms", flex: "1 1 420px", overflow: "hidden" }}>
          <h2 id="maset" className="nv-cap" style={{ padding: "18px 22px 8px" }}>Settings</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 22px" }}>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontWeight: 700 }}>Signed in</span>
              <span style={{ fontSize: 13, color: "var(--muted)", overflowWrap: "anywhere" }}>With {o.signIn.join(" or ") || me.handle}</span>
            </span>
            <form action="/api/auth/signout" method="post">
              <button type="submit" className="nv-btn2 nv-sm nv-press">Sign out</button>
            </form>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: "14px 22px", borderTop: "1px solid var(--line)" }}>
            <span style={{ flex: 1, fontWeight: 700 }}>Appearance</span>
            <div className="nv-seg" role="group" aria-label="Appearance" style={{ width: 270, maxWidth: "100%" }}>
              <span className="nv-segthumb" aria-hidden="true" style={{ width: "calc(33.333% - 1.4px)", transform: `translateX(${themeIdx * 100}%)` }} />
              {(["Light", "Dark", "Device"] as const).map((label, i) => (
                <button key={label} type="button" className={themeIdx === i ? "on" : ""} aria-pressed={themeIdx === i} onClick={() => saveTheme(i === 0 ? "light" : i === 1 ? "dark" : "device")}>{label}</button>
              ))}
            </div>
          </div>
        </section>
        {me.role === "creator" && (
          <section className="nv-up nv-card" aria-labelledby="madanger" style={{ animationDelay: "140ms", flex: "1 1 320px", padding: 22, display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 id="madanger" className="nv-h2" style={{ fontSize: 18, color: "var(--red)" }}>Delete Rezekii account</h2>
            <span style={{ fontSize: 14, color: "var(--body)", lineHeight: 1.5 }}>Deletes everything: your connections, scheduled posts, link history, stats and profile. This can&apos;t be undone.</span>
            <button type="button" className="nv-btnd nv-press" onClick={() => { setTyped(""); setAlert("delete"); }} style={{ alignSelf: "flex-start" }}>Delete my account</button>
          </section>
        )}
      </div>

      {alert && (
        <>
          <button type="button" className="nv-dimalert" aria-label="Cancel" onClick={() => setAlert(null)} />
          <div className="nv-alert" role="alertdialog" aria-modal="true" aria-labelledby="maat">
            <div style={{ padding: "20px 18px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
              <span id="maat" style={{ fontSize: 17, fontWeight: 700 }}>{alert === "delete" ? "Delete your Rezekii account?" : "Disconnect TikTok?"}</span>
              <span style={{ fontSize: 13, lineHeight: 1.45 }}>
                {alert === "delete"
                  ? "Everything is deleted and can't be undone. Type DELETE to confirm."
                  : `Rezekii can no longer post for ${handle}. Scheduled posts move to drafts until you connect again.`}
              </span>
              {alert === "delete" && (
                <>
                  <label htmlFor="matype" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Type DELETE to confirm</label>
                  <input id="matype" type="text" className="nv-input" placeholder="Type DELETE" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" style={{ height: 38, marginTop: 8, textAlign: "center", background: "var(--surface)" }} />
                </>
              )}
            </div>
            <div className="nv-alert-b">
              <button type="button" onClick={() => setAlert(null)}>Cancel</button>
              <button type="button" className="danger" onClick={confirm} disabled={blocked || busy} style={{ opacity: blocked || busy ? 0.4 : 1 }}>
                {busy ? "…" : alert === "delete" ? "Delete" : "Disconnect"}
              </button>
            </div>
          </div>
        </>
      )}
      <Hud toast={toast} />
    </>
  );
}
