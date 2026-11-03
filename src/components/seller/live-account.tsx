"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { PlatformIcon } from "@/components/creator2/bits";
import { notesChanged } from "@/lib/live-notes";
import { SUPPORT } from "@/lib/support";
import { useLang, useT } from "@/lib/i18n/client";
import { dateLocale, type Lang } from "@/lib/i18n/lang";
import { AccountSwitcher } from "@/components/account-switcher";
import { signOut } from "@/lib/sign-out";

const day = (iso: string, lang: Lang) => new Date(iso).toLocaleDateString(dateLocale(lang), { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" });

/** Seller Center shop on record (owner, 31 Oct 2026): when it was connected, and Reconnect to TikTok's sign-in. */
export function LiveShopAuth() {
  const t = useT();
  const lang = useLang();
  const [shop, setShop] = useState<{ shop_name: string; shop_code: string | null; region: string | null; connected_at: string } | null | undefined>(undefined);
  useEffect(() => {
    fetch("/api/v2/seller/shop", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => setShop(d?.shop ?? null)).catch(() => setShop(null));
  }, []);
  return (
    <section className="v2-card">
      <h2 className="v2-h2">{t("Shop Authorisation")}</h2>
      <div className="sl-set">
        <span>
          <b>{shop ? shop.shop_name : "TikTok Shop Seller Center"}</b>
          <small>{shop === undefined ? t("Checking…") : shop ? `${t("Connected since {date}", { date: day(shop.connected_at, lang) })}${shop.shop_code ? ` · ${shop.shop_code}` : ""}${shop.region ? ` · ${shop.region}` : ""}` : t("Not connected")}</small>
          <small>{t("One account = one shop.")}</small>
        </span>
        <span className={`badge ${shop ? "" : "badge-red"}`}>{shop ? t("Connected") : t("Not Connected")}</span>
      </div>
      <button type="button" className={shop ? "btn-outline" : "np-btn"} style={{ alignSelf: "flex-start" }} onClick={() => { window.location.href = "/api/auth/tiktokshop/start?as=seller"; }}>
        <Icon name="refresh" size={18} /> {shop ? t("Reconnect") : t("Connect Seller Center")}
      </button>
    </section>
  );
}

type Chan = { key: string; app: string; name: string; sub: string; status: "active" | "reconnect" };
const APPS = [["facebook", "Facebook"], ["instagram", "Instagram"], ["threads", "Threads"]] as const;
/** Facebook, Instagram and Threads for the shop's posts, connected for real. */
export function LiveSellerSocials() {
  const t = useT();
  const { toast } = useDemo();
  const [chans, setChans] = useState<Chan[] | null>(null);
  const load = () => fetch("/api/v2/publish?part=setup&side=seller", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d: { channels?: Chan[] } | null) => setChans(d?.channels ?? [])).catch(() => setChans([]));
  useEffect(() => {
    void load();
    const q = new URLSearchParams(window.location.search);
    const result = q.get("connect");
    if (result) {
      toast(result === "ok" ? t("Connected.") : result === "no_pages" ? t("No Facebook Pages were picked. Connect again and tick your Page.") : result === "personal" ? t("That Instagram account is personal. Switch it to Business or Creator, then connect again.") : t("It didn't connect. Please try again."));
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const disconnect = async (c: Chan) => {
    const r = await fetch(`/api/social/accounts/${c.key}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) return toast(t("Couldn't disconnect. Try again."));
    toast(t("{name} disconnected. Its scheduled posts were cancelled.", { name: c.name }));
    void load();
  };
  return (
    <section className="v2-card">
      <h2 className="v2-h2">{t("Social Accounts")}</h2>
      <p className="v2-small" style={{ margin: 0 }}>{t("For posting from Publish.")}</p>
      <div>
        {chans === null && <p className="v2-muted" style={{ margin: 0 }}>{t("Loading…")}</p>}
        {chans !== null && APPS.map(([app, label]) => {
          const mine = chans.filter((c) => c.app === app);
          return (
            <div key={app}>
              {mine.map((c) => (
                <div key={c.key} className="sl-acct">
                  <PlatformIcon name={label} size={30} />
                  <span><b>{c.name}</b><small>{c.status === "reconnect" ? t("{account} · needs reconnecting", { account: c.sub }) : c.sub}</small></span>
                  <button type="button" className="btn-outline" style={{ height: 36, fontSize: 13.5 }} onClick={() => void disconnect(c)}>{t("Disconnect")}</button>
                </div>
              ))}
              <div className="sl-acct">
                <PlatformIcon name={label} size={30} />
                <span><b>{mine.length ? t("Add another {app}", { app: label }) : label}</b><small>{mine.length ? t("Connect one more") : t("Not connected")}</small></span>
                <button type="button" className={mine.length ? "btn-outline" : "np-btn v2-btn-sm"} style={mine.length ? { height: 36, fontSize: 13.5 } : undefined} onClick={() => { window.location.href = `/api/auth/meta/${app}/start?from=seller-account`; }}>{t("Connect")}</button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const TOPICS = [["samples", "Product Status", "Approved, live or not approved"], ["posts", "Posts", "Posted or failed"], ["rewards", "Missions & Rewards", "Credits, invites, chests"]] as const;
/** In-app notification choices for the seller side, saved and applied to Notifications. */
export function LiveSellerNotify() {
  const t = useT();
  const { toast } = useDemo();
  const [prefs, setPrefs] = useState<Record<string, boolean> | null>(null);
  useEffect(() => {
    fetch("/api/v2/notifications?side=seller&part=prefs", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => setPrefs(d?.prefs ?? { samples: true, posts: true, rewards: true })).catch(() => setPrefs({ samples: true, posts: true, rewards: true }));
  }, []);
  const flip = (key: string) => {
    const on = !(prefs?.[key] ?? true);
    setPrefs((p) => ({ ...p, [key]: on }));
    fetch("/api/v2/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ side: "seller", prefs: { [key]: on } }) })
      .then((r) => { if (!r.ok) throw new Error(); notesChanged(); })
      .catch(() => { setPrefs((p) => ({ ...p, [key]: !on })); toast(t("Didn't save. Please try again.")); });
  };
  return (
    <section className="v2-card">
      <h2 className="v2-h2">{t("Notifications")}</h2>
      <div>
        {TOPICS.map(([key, label, line]) => (
          <div key={key} className="sl-set np-switchrow">
            <span><b>{t(label)}</b><small>{t(line)}</small></span>
            <button type="button" disabled={!prefs} className={`np-switch ${prefs?.[key] !== false ? "on" : ""}`} aria-pressed={prefs?.[key] !== false} aria-label={t(label)} onClick={() => flip(key)}><span /></button>
          </div>
        ))}
      </div>
      <p className="v2-small" style={{ margin: 0 }}>{t("In the app. Email alerts aren't on yet. Reminders to reconnect always show.")}</p>
    </section>
  );
}

/** How she signs in, from her account. */
export function LiveSellerSecurity() {
  const t = useT();
  const { me } = useDemo();
  const ways = me?.signIn;
  const [switcher, setSwitcher] = useState(false);
  return (
    <section className="v2-card">
      <h2 className="v2-h2">{t("Login & Security")}</h2>
      {ways?.google && <div className="sl-set"><span><b>{t("Signed in with Google")}</b><small>{ways.google}</small></span></div>}
      {ways?.tiktok && <div className="sl-set"><span><b>TikTok</b><small>{ways.tiktok}</small></span></div>}
      {ways?.password && <div className="sl-set"><span><b>{t("Email and password")}</b><small>{ways.email ?? me?.email ?? ""}</small></span></div>}
      {!ways?.google && !ways?.tiktok && !ways?.password && <div className="sl-set"><span><b>{t("Email")}</b><small>{me?.email ?? ""}</small></span></div>}
      {/* Switch Account next to Sign Out (owner, 4 Nov 2026); another account signed in here takes over after Sign Out. */}
      <div className="v2-row" style={{ gap: 18, flexWrap: "wrap" }}>
        <button type="button" className="btn-outline" onClick={() => setSwitcher(true)}><Icon name="users" size={16} /> {t("Switch Account")}</button>
        <button type="button" className="v2-link" style={{ color: "#d92d20" }} onClick={() => signOut({ home: "/seller/app", out: "/seller" })}>{t("Sign Out")}</button>
      </div>
      {switcher && <AccountSwitcher app="seller" onClose={() => setSwitcher(false)} />}
    </section>
  );
}

const KINDS: [string, string][] = [["Question", "Question"], ["Something's wrong", "Something's broken"], ["Idea", "Idea"]];
/** Help & Feedback for sellers, sent to the team's Feedback Inbox. */
export function LiveSellerHelp() {
  const t = useT();
  const { toast } = useDemo();
  const [kind, setKind] = useState(KINDS[0]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const send = () => {
    setBusy(true);
    fetch("/api/v2/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: kind[1], message: msg, reply: "WhatsApp", page: window.location.pathname }) })
      .then(async (r) => { if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error); setMsg(""); toast(t("Sent · we reply within 1 working day")); })
      .catch((e: Error) => toast(e.message || t("Didn't send. Please try again.")))
      .finally(() => setBusy(false));
  };
  return (
    <section className="v2-card">
      <h2 className="v2-h2">{t("Help & Feedback")}</h2>
      <div className="v2-chips">
        {KINDS.map((k) => <button key={k[0]} type="button" className={`v2-chip ${kind[0] === k[0] ? "on" : ""}`} style={{ height: 36, fontSize: 13.5 }} onClick={() => setKind(k)}>{t(k[0])}</button>)}
      </div>
      <textarea className="np-input" rows={3} maxLength={500} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={kind[0] === "Idea" ? t("What would make Rezekii better?") : t("Tell us what happened")} aria-label={t("Message")} />
      <div className="v2-row">
        <button type="button" className="np-btn" disabled={!msg.trim() || busy} onClick={send}>{busy ? <span className="sl-spin" /> : t("Send")}</button>
        <span className="v2-small">{t("Or WhatsApp {number}", { number: SUPPORT.wa })}</span>
      </div>
    </section>
  );
}
