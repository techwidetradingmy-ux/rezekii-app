"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLang, useT } from "@/lib/i18n/client.tsx";
import { dateLocale, tx } from "@/lib/i18n/lang.ts";
import { shortCount, type AccountStats } from "@/integrations/tiktok/stats.ts";
import type { AccountPageData } from "@/modules/accounts/account-page.ts";
import { sampleLook, statusLook } from "@/modules/tap/stages.ts";
import { Emblem } from "../../emblems";
import { TikTokShopLogo, TikTokTile } from "../../tiktok-logo";
import { LevelFace, LevelIcon } from "../../tts-ring";
import { GmvChart } from "../gmv-chart";
import { SignInSecurity } from "./sign-in-security";
import { Hud, useToast } from "../marketplace/use-tap-actions";
import { saveTheme, useTheme } from "../use-theme";
import "../marketplace/marketplace.css";
import "../today.css";
import "./accounts.css";

type Me = { name: string; avatar: string | null; initial: string; role: "admin" | "creator"; tiktokUsername: string | null };
type Alert = "disconnect" | "unlink" | "delete" | null;

const LEVEL_NAME = { bronze: tx("Bronze"), silver: tx("Silver"), gold: tx("Gold") };
const LEVEL_RATE = { bronze: tx("Open Plan rate on Techwide campaign links"), silver: tx("Open Plan + 1% on Techwide campaign links"), gold: tx("Special rate for you on Techwide campaign links") };
const rm = (v: number) => `RM ${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const rm0 = (v: number) => `RM ${Math.round(v).toLocaleString("en-US")}`;

/**
 * Account, as chosen from the mockup (direction A): the TikTok Shop profile with its 30-day numbers and GMV chart,
 * connections, level, samples, settings and account deletion.
 */
export function AccountsView({ me, d, now, justConnected }: { me: Me; d: AccountPageData; now: number; justConnected: boolean }) {
  const t = useT();
  const lang = useLang();
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
    const timer = setTimeout(() => {
      setWelcomed(true);
      flash(t("TikTok connected"));
      router.replace("/app/accounts");
    }, 0);
    return () => clearTimeout(timer);
  });

  // The latest orders from TikTok when the page opens (at most every 15 minutes), so the numbers are current without a button.
  const linked = !!d.shop && me.role !== "admin";
  useEffect(() => {
    if (!linked) return;
    let stop = false;
    (async () => {
      for (let i = 0; i < 6 && !stop; i++) {
        const x = (await fetch("/api/sales/refresh", { method: "POST" }).then((r) => r.json()).catch(() => ({}))) as { synced?: boolean; done?: boolean };
        if (x.synced) router.refresh();
        if (!x.synced || x.done !== false) break;
      }
    })();
    return () => { stop = true; };
  }, [linked, router]);

  async function confirm() {
    if (busy || (alert === "delete" && typed.trim() !== "DELETE")) return;
    setBusy(true);
    try {
      const url = alert === "delete" ? "/api/account/delete" : alert === "unlink" ? "/api/account/tiktokshop/unlink" : "/api/account/tiktok/disconnect";
      const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(alert === "delete" ? { confirm: typed.trim() } : {}) });
      const x = (await r.json().catch(() => ({}))) as { error?: string; drafts?: number };
      if (!r.ok) throw new Error(x.error || tx("Something went wrong. Please try again."));
      if (alert === "delete") setDeleted(true);
      else if (alert === "unlink") router.push("/onboarding");
      else {
        flash(x.drafts ? (x.drafts === 1 ? t("TikTok disconnected. {n} scheduled post moved to drafts.", { n: 1 }) : t("TikTok disconnected. {n} scheduled posts moved to drafts.", { n: x.drafts })) : t("TikTok disconnected"));
        router.refresh();
      }
      setAlert(null);
    } catch (err) {
      flash(t(err instanceof Error ? err.message : String(err)), false);
    } finally {
      setBusy(false);
    }
  }

  if (deleted)
    return (
      <section className="nv-up nv-card" style={{ boxShadow: "var(--shadow)", padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
        <span style={{ fontSize: 22, fontWeight: 800 }}>{t("Your Rezekii account is deleted")}</span>
        <span style={{ fontSize: 15, color: "var(--muted)", maxWidth: 460, lineHeight: 1.5 }}>{t("Your TikTok Shop link and TikTok connection were removed, scheduled posts cancelled, and your link history, stats and profile deleted.")}</span>
        <a href="/signin" className="nv-btn nv-press" style={{ textDecoration: "none" }}>{t("Back to sign in")}</a>
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
    ? [t("Connected"), stats?.follower_count !== undefined ? t("{n} followers", { n: shortCount(stats.follower_count) }) : null, stats?.likes_count !== undefined ? t("{n} likes", { n: shortCount(stats.likes_count) }) : null, stats?.video_count !== undefined ? t("{n} videos", { n: shortCount(stats.video_count) }) : null, t("posting and video stats on")].filter(Boolean).join(" · ")
    : t("Connect to schedule posts and see views and likes");
  const tiles = s
    ? [
        [t("GMV · 30 days"), rm(s.gmv), change === null ? t("Your affiliate sales, all shops") : `${change >= 0 ? "▲" : "▼"} ${t("{p}% vs the 30 days before", { p: Math.abs(change) })}`, change !== null && change < 0 ? "var(--red)" : "var(--gink)"],
        s.partnerShare > 0 && s.commission < 0.005
          ? [t("Commission earned · 30 days"), rm(s.earned), t("TikTok pays this to your agency"), "var(--muted)"]
          : s.partnerShare > 0
          ? [t("Commission earned · 30 days"), rm(s.earned), t("{a} to your partner · you keep {b}", { a: rm(s.partnerShare), b: rm(s.commission) }), "var(--muted)"]
          : [t("Commission · 30 days"), rm(s.commission), s.toSettle ? t("{x} still to settle", { x: rm(s.toSettle) }) : t("All settled"), "var(--muted)"],
        [t("Orders"), s.orders.toLocaleString("en-US"), s.items === 1 ? t("{n} item sold", { n: 1 }) : t("{n} items sold", { n: s.items.toLocaleString("en-US") }), "var(--muted)"],
        [t("Top product"), s.products[0]?.name ?? t("No sales yet"), s.products[0] ? (s.products[0].orders === 1 ? t("{x} GMV · {n} order", { x: rm0(s.products[0].gmv), n: 1 }) : t("{x} GMV · {n} orders", { x: rm0(s.products[0].gmv), n: s.products[0].orders })) : t("Your best seller shows here"), "var(--muted)"],
      ]
    : [];
  const sampleCounts: [string, number, number][] = [[t("Pending approval"), d.samples.requested, 1], [t("Approved"), d.samples.approved, 2], [t("Shipped"), d.samples.shipping, 3], [t("Delivered"), d.samples.toPost, 4], [t("Post criteria met"), d.samples.posted, 5]];
  const levelName = t(LEVEL_NAME[d.level.level]);

  return (
    <>
      <section className="nv-up nv-card ac-banner" aria-labelledby="acname">
        <div className="ac-top">
          <span className={`ac-av ${typeof shop?.ttLevel === "number" ? "ac-av-lv" : ""}`}>
            {typeof shop?.ttLevel === "number" ? (
              <LevelFace lv={shop.ttLevel} size={92} img={avatar} name={me.name} />
            ) : avatar ? (
              // TikTok's avatar CDN hosts vary, so a plain img (as elsewhere for avatars).
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" width={92} height={92} />
            ) : (
              <span className="ac-ini" aria-hidden="true">{me.initial}</span>
            )}
            {shop && (
              <span className="ac-ok" title={t("TikTok Shop account linked and approved")}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#25f4ee" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>
                <span className="ac-sr">{t("Verified TikTok Shop account")}</span>
              </span>
            )}
          </span>
          <span className="ac-who">
            {/* The name and handle open the creator's TikTok profile. */}
            {shop ? (
              <a href={`https://www.tiktok.com/@${shop.username}`} target="_blank" rel="noopener" className="ac-tt" aria-label={t("{name}, {handle} on TikTok", { name: me.name, handle })}>
                <h2 id="acname">{me.name}</h2>
                <span className="ac-sub">{handle} · TikTok Shop{shop.region ? ` ${t(shop.region)}` : ""}</span>
              </a>
            ) : (
              <>
                <h2 id="acname">{me.name}</h2>
                <span className="ac-sub">{handle}</span>
              </>
            )}
            <span className="ac-chips">
              {shop && <span className="nv-badge b-green" style={{ paddingLeft: 4 }}><TikTokShopLogo size={18} />{t("TikTok Shop linked")}</span>}
              {shop?.approvedAt && <span className="nv-badge b-green">{t("Approved by Techwide")}</span>}
              {typeof shop?.ttLevel === "number" && <span className="nv-badge ac-tts"><LevelIcon lv={shop.ttLevel} size={15} />TikTok Shop Lv{shop.ttLevel}</span>}
              {shop?.agency === "managed" && <span className="nv-badge b-gray" title={t("TikTok's Creator Marketplace lists you as managed by an agency")}>{t("Agency managed")}</span>}
              {me.role === "admin" ? <span className="nv-badge b-blue">{t("Techwide admin")}</span> : <span className={`ac-lvl ac-lvl-${d.level.level}`}><Emblem level={d.level.level} size={18} />{t("{level} level", { level: levelName })}</span>}
            </span>
          </span>
        </div>
        {s && (
          <div className="ac-stats" role="list" aria-label={t("Your TikTok Shop affiliate numbers, last 30 days")}>
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
            <h2 id="acchart" className="nv-h2">{t("GMV · last 30 days")}</h2>
            <Link href="/app/sales" className="nv-link" style={{ fontSize: 14, fontWeight: 700 }}>{t("See your sales")}</Link>
          </div>
          <GmvChart values={s.daily} labels={s.daily.map((_, i) => (i === s.daily.length - 1 ? t("Today") : new Date(now - (s.daily.length - 1 - i) * 86400_000).toLocaleDateString(dateLocale(lang), { day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" })))} height={160} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)" }}>
            <span>{new Date(now - 29 * 86400_000).toLocaleDateString(dateLocale(lang), { day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" })}</span>
            <span>{t("Through Rezekii {a} · other shops {b}", { a: rm0(s.techwideGmv), b: rm0(s.otherGmv) })}</span>
            <span>{t("Today")}</span>
          </div>
        </section>
      )}

      <div className="ac-row">
        <section className="nv-up nv-card" aria-labelledby="accon" style={{ flex: "1 1 520px", overflow: "hidden", minWidth: 0, animationDelay: "100ms" }}>
          <div style={{ padding: "20px 22px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
            <h2 id="accon" className="nv-h2">{t("Connections")}</h2>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{t("TikTok Shop is required to use Rezekii. TikTok is needed only to post and see video stats.")}</span>
          </div>
          <div className="ac-line" style={{ alignItems: "flex-start" }}>
            <TikTokShopLogo />
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
              <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}><strong>TikTok Shop</strong><span className={`nv-badge ${shop?.cancelled ? "b-red" : shop ? "b-green" : "b-amber"}`}>{shop?.cancelled ? t("Cancelled by TikTok") : shop ? t("Linked") : t("Not linked")}</span></span>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{shop ? `${handle}${shop.linkedAt ? t(" · linked {date}", { date: shop.linkedAt }) : ""}${shop.approvedAt ? t(" · approved {date}", { date: shop.approvedAt }) : ""}` : t("Link it to use Rezekii")}</span>
              {shop?.cancelled && <span style={{ fontSize: 13, color: "var(--red)", lineHeight: 1.45 }}>{t("TikTok has cancelled Rezekii's link to this TikTok Shop, so your products, samples and sales can't update. Link it again to carry on.")}</span>}
              {shop && (
                <span style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                  {[...shop.permissions.map((p) => t(p)), ...(d.showcase !== null ? [t("{n} products in showcase", { n: d.showcase.toLocaleString("en-US") })] : [])].map((p) => (
                    <span key={p} className="ac-perm"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00c073" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>{p}</span>
                  ))}
                </span>
              )}
            </span>
            {shop?.cancelled ? (
              <a href="/api/auth/tiktokshop/start" className="nv-btn nv-sm nv-press" style={{ flexShrink: 0 }}>{t("Link again")}</a>
            ) : shop ? (
              <button type="button" className="nv-link" onClick={() => setAlert("unlink")} style={{ color: "var(--red)", flexShrink: 0 }}>{t("Unlink")}</button>
            ) : (
              <a href="/api/auth/tiktokshop/start" className="nv-btn3 nv-sm nv-press">{t("Link TikTok Shop")}</a>
            )}
          </div>
          <div className="ac-line">
            <TikTokTile />
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
              <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}><strong>TikTok</strong><span className={`nv-badge ${o.tiktok ? "b-green" : "b-amber"}`}>{o.tiktok ? t("Connected") : t("Not connected")}</span></span>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>{ttNote}</span>
            </span>
            {o.tiktok ? (
              <button type="button" className="nv-link" onClick={() => setAlert("disconnect")} style={{ color: "var(--red)" }}>{t("Disconnect")}</button>
            ) : (
              <a href="/api/auth/tiktok/start" className="nv-btn3 nv-sm nv-press" onClick={() => setConnecting(true)}>
                {connecting && <span className="nv-sping" aria-hidden="true" />}
                {connecting ? t("Connecting…") : t("Connect TikTok")}
              </a>
            )}
          </div>
        </section>

        {me.role === "creator" && (
          <section className="nv-up nv-card ac-level" aria-labelledby="aclvl" style={{ animationDelay: "140ms" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Emblem level={d.level.level} size={56} animate />
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><h2 id="aclvl" className="nv-h2">{t("{level} level", { level: levelName })}</h2><span style={{ fontSize: 13, color: "var(--muted)" }}>{t(LEVEL_RATE[d.level.level])}</span></span>
            </div>
            {d.level.level !== "bronze" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}><span>{t("Keep {level} next month", { level: levelName })}</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{rm0(d.level.monthSales)} / {rm0(d.level.keep)}</span></span>
                <span className="ac-bar" role="progressbar" aria-label={t("Sales through Rezekii towards keeping {level}", { level: levelName })} aria-valuemin={0} aria-valuemax={d.level.keep} aria-valuenow={Math.round(d.level.monthSales)}><span style={{ width: `${keepPct}%` }} /></span>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>{keepPct >= 100 ? t("You keep {level} next month.", { level: levelName }) : t("{x} more in sales through Rezekii this month keeps your rate next month.", { x: rm0(d.level.keep - d.level.monthSales) })}</span>
              </div>
            ) : (
              <span style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>{t("Sales through Rezekii this month {x}. Reach Silver next month with 10 sample videos and RM1,000 in sales through Rezekii this month.", { x: rm0(d.level.monthSales) })}</span>
            )}
            <Link href="/app/levels" className="nv-btn2 nv-sm nv-press" style={{ alignSelf: "flex-start", textDecoration: "none" }}>{t("Levels and benefits")}</Link>
          </section>
        )}
      </div>

      {me.role === "creator" && (
        <section className="nv-up nv-card" aria-labelledby="acsmp" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14, animationDelay: "160ms" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ display: "flex", flexDirection: "column", gap: 2 }}><h2 id="acsmp" className="nv-h2">{t("Samples")}</h2><span style={{ fontSize: 13, color: "var(--muted)" }}>{t("Free samples through Rezekii, with TikTok's status")}</span></span>
            <Link href="/app/my-tap" className="nv-link" style={{ fontSize: 14, fontWeight: 700 }}>{t("All samples in My Samples")}</Link>
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
                const [label, bg, fg] = r.status ? statusLook(r.status) : sampleLook(r.stage);
                return (
                  <div key={i} className="ac-line" style={{ padding: "10px 0" }}>
                    {r.image ? <span className="ac-thumb" style={{ backgroundImage: `url("${r.image}")` }} aria-hidden="true" /> : <span className="ac-thumb" aria-hidden="true" />}
                    <span style={{ flex: 1, minWidth: 0, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                    <span className="nv-badge" style={{ background: bg, color: fg }}>{t(label)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {me.role === "creator" && (
        <SignInSecurity email={o.emailLogin.email} has={o.emailLogin.has} googleEmail={o.emailLogin.googleEmail} tiktok={o.emailLogin.tiktok} onDone={(m) => { flash(m); router.refresh(); }} />
      )}

      <div className="ac-row">
        <section className="nv-up nv-card" aria-labelledby="acset" style={{ flex: "1 1 520px", overflow: "hidden", minWidth: 0, animationDelay: "180ms" }}>
          <h2 id="acset" className="nv-h2" style={{ padding: "20px 22px 12px" }}>{t("Settings")}</h2>
          <div className="ac-line">
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontWeight: 700 }}>{t("Sign-in")}</span>
              <span style={{ fontSize: 13, color: "var(--muted)", overflowWrap: "anywhere" }}>{o.signIn.join(t(" or ")) || me.name}{t(" · joined {date}", { date: o.joined })}</span>
            </span>
            <form action="/api/auth/signout" method="post">
              <button type="submit" className="nv-btn2 nv-sm nv-press">{t("Sign out")}</button>
            </form>
          </div>
          <div className="ac-line" style={{ flexWrap: "wrap" }}>
            <span style={{ flex: 1, fontWeight: 700 }}>{t("Appearance")}</span>
            <div className="nv-seg" role="group" aria-label={t("Appearance")} style={{ width: 270, maxWidth: "100%" }}>
              <span className="nv-segthumb" aria-hidden="true" style={{ width: "calc(33.333% - 1.4px)", transform: `translateX(${themeIdx * 100}%)` }} />
              {(["Light", "Dark", "Device"] as const).map((label, i) => (
                <button key={label} type="button" className={themeIdx === i ? "on" : ""} aria-pressed={themeIdx === i} onClick={() => saveTheme(i === 0 ? "light" : i === 1 ? "dark" : "device")}>{t(label)}</button>
              ))}
            </div>
          </div>
        </section>
        {me.role === "creator" && (
          <section className="nv-up nv-card" aria-labelledby="acdel" style={{ flex: "1 1 380px", padding: 22, display: "flex", flexDirection: "column", gap: 10, minWidth: 0, animationDelay: "220ms" }}>
            <h2 id="acdel" className="nv-h2" style={{ fontSize: 18, color: "var(--red)" }}>{t("Delete Rezekii account")}</h2>
            <span style={{ fontSize: 14, color: "var(--body)", lineHeight: 1.5 }}>{t("Unlinks TikTok Shop, cancels scheduled posts and deletes your link history, stats and profile. This can't be undone.")}</span>
            <button type="button" className="nv-btnd nv-press" onClick={() => { setTyped(""); setAlert("delete"); }} style={{ alignSelf: "flex-start" }}>{t("Delete my account")}</button>
          </section>
        )}
      </div>

      {alert && (
        <>
          <button type="button" className="nv-dimalert" aria-label={t("Cancel")} onClick={() => setAlert(null)} />
          <div className="nv-alert" role="alertdialog" aria-modal="true" aria-labelledby="acat">
            <div style={{ padding: "20px 18px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
              <span id="acat" style={{ fontSize: 17, fontWeight: 700 }}>{alert === "delete" ? t("Delete your Rezekii account?") : alert === "unlink" ? t("Unlink TikTok Shop?") : t("Disconnect TikTok?")}</span>
              <span style={{ fontSize: 13, lineHeight: 1.45 }}>
                {alert === "delete"
                  ? t("Everything is deleted and can't be undone. Type DELETE to confirm.")
                  : alert === "unlink"
                    ? t("Rezekii needs TikTok Shop to work. You'll be back on Getting set up until you link it again, and Techwide approves it again.")
                    : t("Rezekii can no longer post for {handle}. Scheduled posts move to drafts until you connect again.", { handle })}
              </span>
              {alert === "delete" && (
                <>
                  <label htmlFor="actype" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{t("Type DELETE to confirm")}</label>
                  <input id="actype" type="text" className="nv-input" placeholder={t("Type DELETE")} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" style={{ height: 38, marginTop: 8, textAlign: "center", background: "var(--surface)" }} />
                </>
              )}
            </div>
            <div className="nv-alert-b">
              <button type="button" onClick={() => setAlert(null)}>{t("Cancel")}</button>
              <button type="button" className="danger" onClick={confirm} disabled={blocked || busy} style={{ opacity: blocked || busy ? 0.4 : 1 }}>
                {busy ? "…" : alert === "delete" ? t("Delete") : alert === "unlink" ? t("Unlink") : t("Disconnect")}
              </button>
            </div>
          </div>
        </>
      )}
      <Hud toast={toast} />
    </>
  );
}
