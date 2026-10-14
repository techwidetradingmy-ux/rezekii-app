"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { shortCount, type AccountStats } from "@/integrations/tiktok/stats.ts";
import type { AccountPageData } from "@/modules/accounts/account-page.ts";
import { sampleLook } from "@/modules/tap/stages.ts";
import { Emblem } from "../../emblems";
import { TikTokShopLogo, TikTokTile } from "../../tiktok-logo";
import { GmvChart } from "../gmv-chart";
import { Hud, useToast } from "../marketplace/use-tap-actions";
import { saveTheme, useTheme } from "../use-theme";
import "../marketplace/marketplace.css";
import "../today.css";
import "./accounts.css";

type Me = { name: string; avatar: string | null; initial: string; role: "admin" | "creator"; tiktokUsername: string | null };
type Alert = "disconnect" | "unlink" | "delete" | null;

const LEVEL_NAME = { bronze: "Bronze", silver: "Silver", gold: "Gold" } as const;
const LEVEL_RATE = { bronze: "Open Plan rate on Techwide campaign links", silver: "Open Plan + 1% on Techwide campaign links", gold: "Special rate for you on Techwide campaign links" } as const;
const rm = (v: number) => `RM ${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const rm0 = (v: number) => `RM ${Math.round(v).toLocaleString("en-US")}`;
const ago = (iso: string | null, now: number) => {
  if (!iso) return "not yet";
  const m = Math.round((now - Date.parse(iso)) / 60_000);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

/**
 * Account, as chosen from the mockup (direction A): the TikTok Shop profile with its 30-day numbers and GMV chart,
 * connections, level, samples, settings and account deletion.
 */
export function AccountsView({ me, d, now, justConnected }: { me: Me; d: AccountPageData; now: number; justConnected: boolean }) {
  const router = useRouter();
  const { toast, flash } = useToast();
  const theme = useTheme();
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [alert, setAlert] = useState<Alert>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [welcomed, setWelcomed] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const o = d.overview;

  useEffect(() => {
    if (!o.tiktok) return;
    fetch("/api/tiktok/stats", { cache: "no-store" })
      .then((r) => r.json())
      .then((x: { account?: AccountStats | null }) => setStats(x.account ?? null))
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

  async function refresh() {
    if (syncing) return;
    setSyncing(true);
    const r = await fetch("/api/sales/refresh", { method: "POST" });
    const x = (await r.json().catch(() => ({}))) as { synced?: boolean; error?: string };
    setSyncing(false);
    if (!r.ok) return flash(x.error || "Couldn't update. Try again.", false);
    flash(x.synced ? "Numbers updated from TikTok Shop" : "Already up to date");
    router.refresh();
  }

  async function confirm() {
    if (busy || (alert === "delete" && typed.trim() !== "DELETE")) return;
    setBusy(true);
    try {
      const url = alert === "delete" ? "/api/account/delete" : alert === "unlink" ? "/api/account/tiktokshop/unlink" : "/api/account/tiktok/disconnect";
      const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(alert === "delete" ? { confirm: typed.trim() } : {}) });
      const x = (await r.json().catch(() => ({}))) as { error?: string; drafts?: number };
      if (!r.ok) throw new Error(x.error || "Something went wrong. Please try again.");
      if (alert === "delete") setDeleted(true);
      else if (alert === "unlink") router.push("/onboarding");
      else {
        flash(x.drafts ? `TikTok disconnected. ${x.drafts} scheduled ${x.drafts === 1 ? "post moved" : "posts moved"} to drafts.` : "TikTok disconnected");
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
        <span style={{ fontSize: 15, color: "var(--muted)", maxWidth: 460, lineHeight: 1.5 }}>Your TikTok Shop link and TikTok connection were removed, scheduled posts cancelled, and your link history, stats and profile deleted.</span>
        <a href="/signin" className="nv-btn nv-press" style={{ textDecoration: "none" }}>Back to sign in</a>
      </section>
    );

  const themeIdx = theme === "light" ? 0 : theme === "dark" ? 1 : 2;
  const blocked = alert === "delete" && typed.trim() !== "DELETE";
  const shop = d.shop;
  const handle = shop ? `@${shop.username}` : me.tiktokUsername ? `@${me.tiktokUsername}` : me.name;
  const avatar = shop?.avatar ?? me.avatar;
  const s = d.sales;
  const change = s && s.prevGmv > 0 ? Math.round(((s.gmv - s.prevGmv) / s.prevGmv) * 100) : null;
  const keepPct = Math.min(100, Math.round((d.level.monthSales / d.level.keep) * 100));
  const ttNote = o.tiktok
    ? `Connected${stats?.follower_count !== undefined ? ` · ${shortCount(stats.follower_count)} followers` : ""}${stats?.likes_count !== undefined ? ` · ${shortCount(stats.likes_count)} likes` : ""}${stats?.video_count !== undefined ? ` · ${shortCount(stats.video_count)} videos` : ""} · posting and video stats on`
    : "Connect to schedule posts and see views and likes";
  const tiles = s
    ? [
        ["GMV · 30 days", rm(s.gmv), change === null ? "Your affiliate sales, all shops" : `${change >= 0 ? "▲" : "▼"} ${Math.abs(change)}% vs the 30 days before`, change !== null && change < 0 ? "var(--red)" : "var(--gink)"],
        ["Commission · 30 days", rm(s.commission), s.toSettle ? `${rm(s.toSettle)} still to settle` : "All settled", "var(--muted)"],
        ["Orders", s.orders.toLocaleString("en-US"), `${s.items.toLocaleString("en-US")} ${s.items === 1 ? "item" : "items"} sold`, "var(--muted)"],
        ["Top product", s.products[0]?.name ?? "No sales yet", s.products[0] ? `${rm0(s.products[0].gmv)} GMV · ${s.products[0].orders} ${s.products[0].orders === 1 ? "order" : "orders"}` : "Your best seller shows here", "var(--muted)"],
      ]
    : [];
  const sampleCounts: [string, number, number][] = [["Requested", d.samples.requested, 1], ["On the way", d.samples.shipping, 2], ["To post", d.samples.toPost, 3], ["Posted", d.samples.posted, 4]];

  return (
    <>
      <section className="nv-up nv-card ac-banner" aria-labelledby="acname">
        <div className="ac-top">
          <span className="ac-av">
            {avatar ? (
              // TikTok's avatar CDN hosts vary, so a plain img (as elsewhere for avatars).
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" width={92} height={92} />
            ) : (
              <span className="ac-ini" aria-hidden="true">{me.initial}</span>
            )}
            {shop && (
              <span className="ac-ok" title="TikTok Shop account linked and approved">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#25f4ee" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
                <span className="ac-sr">Verified TikTok Shop account</span>
              </span>
            )}
          </span>
          <span className="ac-who">
            <h2 id="acname">{me.name}</h2>
            <span className="ac-sub">{handle}{shop ? ` · TikTok Shop${shop.region ? ` ${shop.region}` : ""}` : ""}</span>
            <span className="ac-chips">
              {shop && <span className="nv-badge b-green" style={{ paddingLeft: 4 }}><TikTokShopLogo size={18} />TikTok Shop linked</span>}
              {shop?.approvedAt && <span className="nv-badge b-green">Approved by Techwide</span>}
              {me.role === "admin" ? <span className="nv-badge b-blue">Techwide admin</span> : <span className={`ac-lvl ac-lvl-${d.level.level}`}><Emblem level={d.level.level} size={18} />{LEVEL_NAME[d.level.level]} level</span>}
            </span>
          </span>
          {shop && (
            <span className="ac-acts">
              <a href={`https://www.tiktok.com/@${shop.username}`} target="_blank" rel="noopener" className="nv-btn2 nv-sm nv-press">View on TikTok</a>
              <button type="button" className="nv-btn2 nv-sm nv-press" onClick={refresh} disabled={syncing}>
                {syncing && <span className="nv-sping" aria-hidden="true" />}
                {syncing ? "Updating…" : `Updated ${ago(s?.syncedAt ?? null, now)}`}
              </button>
            </span>
          )}
        </div>
        {s && (
          <div className="ac-stats" role="list" aria-label="Your TikTok Shop affiliate numbers, last 30 days">
            {tiles.map(([label, value, note, color], i) => (
              <div key={label} className="ac-stat" role="listitem" style={{ animationDelay: `${80 + i * 60}ms` }}>
                <span className="nv-cap">{label}</span>
                <b className={i === 3 ? "ac-ellip" : ""}>{value}</b>
                <span style={{ fontSize: 13, color, fontWeight: 600 }}>{note}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {s && (
        <section className="nv-up nv-card" aria-labelledby="acchart" style={{ padding: "20px 22px 14px", display: "flex", flexDirection: "column", gap: 10, animationDelay: "60ms" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "baseline" }}>
            <h2 id="acchart" className="nv-h2">GMV · last 30 days</h2>
            <Link href="/app/sales" className="nv-link" style={{ fontSize: 14, fontWeight: 700 }}>See your sales</Link>
          </div>
          <GmvChart daily={s.daily} now={now} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)" }}>
            <span>{new Date(now - 29 * 86400_000).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" })}</span>
            <span>Through Techwide TAP {rm0(s.techwideGmv)} · other shops {rm0(s.otherGmv)}</span>
            <span>Today</span>
          </div>
        </section>
      )}

      <div className="ac-row">
        <section className="nv-up nv-card" aria-labelledby="accon" style={{ flex: "1 1 520px", overflow: "hidden", minWidth: 0, animationDelay: "100ms" }}>
          <div style={{ padding: "20px 22px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
            <h2 id="accon" className="nv-h2">Connections</h2>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>TikTok Shop is required to use Rezekii. TikTok is needed only to post and see video stats.</span>
          </div>
          <div className="ac-line" style={{ alignItems: "flex-start" }}>
            <TikTokShopLogo />
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
              <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}><strong>TikTok Shop</strong><span className={`nv-badge ${shop ? "b-green" : "b-amber"}`}>{shop ? "Linked" : "Not linked"}</span></span>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{shop ? `${handle}${shop.linkedAt ? ` · linked ${shop.linkedAt}` : ""}${shop.approvedAt ? ` · approved ${shop.approvedAt}` : ""}` : "Link it to use Rezekii"}</span>
              {shop && (
                <span style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                  {[...shop.permissions, ...(d.showcase !== null ? [`${d.showcase.toLocaleString("en-US")} products in showcase`] : [])].map((t) => (
                    <span key={t} className="ac-perm"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00c073" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>{t}</span>
                  ))}
                </span>
              )}
            </span>
            {shop ? (
              <button type="button" className="nv-link" onClick={() => setAlert("unlink")} style={{ color: "var(--red)", flexShrink: 0 }}>Unlink</button>
            ) : (
              <a href="/api/auth/tiktokshop/start" className="nv-btn3 nv-sm nv-press">Link TikTok Shop</a>
            )}
          </div>
          <div className="ac-line">
            <TikTokTile />
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
              <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}><strong>TikTok</strong><span className={`nv-badge ${o.tiktok ? "b-green" : "b-amber"}`}>{o.tiktok ? "Connected" : "Not connected"}</span></span>
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
        </section>

        {me.role === "creator" && (
          <section className="nv-up nv-card ac-level" aria-labelledby="aclvl" style={{ animationDelay: "140ms" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Emblem level={d.level.level} size={56} animate />
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><h2 id="aclvl" className="nv-h2">{LEVEL_NAME[d.level.level]} level</h2><span style={{ fontSize: 13, color: "var(--muted)" }}>{LEVEL_RATE[d.level.level]}</span></span>
            </div>
            {d.level.level !== "bronze" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}><span>Keep {LEVEL_NAME[d.level.level]} this month</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{rm0(d.level.monthSales)} / {rm0(d.level.keep)}</span></span>
                <span className="ac-bar" role="progressbar" aria-label={`TAP sales towards keeping ${LEVEL_NAME[d.level.level]}`} aria-valuemin={0} aria-valuemax={d.level.keep} aria-valuenow={Math.round(d.level.monthSales)}><span style={{ width: `${keepPct}%` }} /></span>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>{keepPct >= 100 ? "You've kept your level this month." : `${rm0(d.level.keep - d.level.monthSales)} more in TAP sales this month keeps your rate.`}</span>
              </div>
            ) : (
              <span style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>Lifetime TAP sales {rm0(d.level.lifetime)}. Reach Silver with 10 sample videos and RM 1,000 in lifetime TAP sales.</span>
            )}
            <Link href="/app/levels" className="nv-btn2 nv-sm nv-press" style={{ alignSelf: "flex-start", textDecoration: "none" }}>Levels and benefits</Link>
          </section>
        )}
      </div>

      {me.role === "creator" && (
        <section className="nv-up nv-card" aria-labelledby="acsmp" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14, animationDelay: "160ms" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><h2 id="acsmp" className="nv-h2">Samples</h2><span style={{ fontSize: 13, color: "var(--muted)" }}>Free samples from Techwide&apos;s TAP campaigns, with TikTok&apos;s status</span></span>
            <Link href="/app/my-tap" className="nv-link" style={{ fontSize: 14, fontWeight: 700 }}>All samples in My TAP products</Link>
          </div>
          <div className="ac-smp" role="list">
            {sampleCounts.map(([label, n, stage]) => {
              const [, bg, fg] = sampleLook(stage);
              return (
                <div key={label} role="listitem" style={{ background: bg, color: fg }}>
                  <b>{n}</b>
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
          {d.samples.recent.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {d.samples.recent.map((r, i) => {
                const [label, bg, fg] = sampleLook(r.stage);
                return (
                  <div key={i} className="ac-line" style={{ padding: "10px 0" }}>
                    {r.image ? <span className="ac-thumb" style={{ backgroundImage: `url("${r.image}")` }} aria-hidden="true" /> : <span className="ac-thumb" aria-hidden="true" />}
                    <span style={{ flex: 1, minWidth: 0, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                    <span className="nv-badge" style={{ background: bg, color: fg }}>{label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <div className="ac-row">
        <section className="nv-up nv-card" aria-labelledby="acset" style={{ flex: "1 1 520px", overflow: "hidden", minWidth: 0, animationDelay: "180ms" }}>
          <h2 id="acset" className="nv-h2" style={{ padding: "20px 22px 12px" }}>Settings</h2>
          <div className="ac-line">
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontWeight: 700 }}>Sign-in</span>
              <span style={{ fontSize: 13, color: "var(--muted)", overflowWrap: "anywhere" }}>{o.signIn.join(" or ") || me.name} · joined {o.joined}</span>
            </span>
            <form action="/api/auth/signout" method="post">
              <button type="submit" className="nv-btn2 nv-sm nv-press">Sign out</button>
            </form>
          </div>
          <div className="ac-line" style={{ flexWrap: "wrap" }}>
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
          <section className="nv-up nv-card" aria-labelledby="acdel" style={{ flex: "1 1 380px", padding: 22, display: "flex", flexDirection: "column", gap: 10, minWidth: 0, animationDelay: "220ms" }}>
            <h2 id="acdel" className="nv-h2" style={{ fontSize: 18, color: "var(--red)" }}>Delete Rezekii account</h2>
            <span style={{ fontSize: 14, color: "var(--body)", lineHeight: 1.5 }}>Unlinks TikTok Shop, cancels scheduled posts and deletes your link history, stats and profile. This can&apos;t be undone.</span>
            <button type="button" className="nv-btnd nv-press" onClick={() => { setTyped(""); setAlert("delete"); }} style={{ alignSelf: "flex-start" }}>Delete my account</button>
          </section>
        )}
      </div>

      {alert && (
        <>
          <button type="button" className="nv-dimalert" aria-label="Cancel" onClick={() => setAlert(null)} />
          <div className="nv-alert" role="alertdialog" aria-modal="true" aria-labelledby="acat">
            <div style={{ padding: "20px 18px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
              <span id="acat" style={{ fontSize: 17, fontWeight: 700 }}>{alert === "delete" ? "Delete your Rezekii account?" : alert === "unlink" ? "Unlink TikTok Shop?" : "Disconnect TikTok?"}</span>
              <span style={{ fontSize: 13, lineHeight: 1.45 }}>
                {alert === "delete"
                  ? "Everything is deleted and can't be undone. Type DELETE to confirm."
                  : alert === "unlink"
                    ? "Rezekii needs TikTok Shop to work. You'll be back on Getting set up until you link it again, and Techwide approves it again."
                    : `Rezekii can no longer post for ${handle}. Scheduled posts move to drafts until you connect again.`}
              </span>
              {alert === "delete" && (
                <>
                  <label htmlFor="actype" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Type DELETE to confirm</label>
                  <input id="actype" type="text" className="nv-input" placeholder="Type DELETE" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" style={{ height: 38, marginTop: 8, textAlign: "center", background: "var(--surface)" }} />
                </>
              )}
            </div>
            <div className="nv-alert-b">
              <button type="button" onClick={() => setAlert(null)}>Cancel</button>
              <button type="button" className="danger" onClick={confirm} disabled={blocked || busy} style={{ opacity: blocked || busy ? 0.4 : 1 }}>
                {busy ? "…" : alert === "delete" ? "Delete" : alert === "unlink" ? "Unlink" : "Disconnect"}
              </button>
            </div>
          </div>
        </>
      )}
      <Hud toast={toast} />
    </>
  );
}
