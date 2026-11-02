"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { PlatformIcon } from "@/components/creator2/bits";
import { notesChanged } from "@/lib/live-notes";
import { SUPPORT } from "@/lib/support";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" });

/** Seller Center shop on record (owner, 31 Oct 2026): when it was connected, and Reconnect to TikTok's sign-in. */
export function LiveShopAuth() {
  const [shop, setShop] = useState<{ shop_name: string; shop_code: string | null; region: string | null; connected_at: string } | null | undefined>(undefined);
  useEffect(() => {
    fetch("/api/v2/seller/shop", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => setShop(d?.shop ?? null)).catch(() => setShop(null));
  }, []);
  return (
    <section className="v2-card">
      <h2 className="v2-h2">Shop Authorisation</h2>
      <div className="sl-set">
        <span>
          <b>{shop ? shop.shop_name : "TikTok Shop Seller Center"}</b>
          <small>{shop === undefined ? "Checking…" : shop ? `Connected since ${day(shop.connected_at)}${shop.shop_code ? ` · ${shop.shop_code}` : ""}${shop.region ? ` · ${shop.region}` : ""}` : "Not connected"}</small>
          <small>One account = one shop.</small>
        </span>
        <span className={`badge ${shop ? "" : "badge-red"}`}>{shop ? "Connected" : "Not Connected"}</span>
      </div>
      <button type="button" className={shop ? "btn-outline" : "np-btn"} style={{ alignSelf: "flex-start" }} onClick={() => { window.location.href = "/api/auth/tiktokshop/start?as=seller"; }}>
        <Icon name="refresh" size={18} /> {shop ? "Reconnect" : "Connect Seller Center"}
      </button>
    </section>
  );
}

type Chan = { key: string; app: string; name: string; sub: string; status: "active" | "reconnect" };
const APPS = [["facebook", "Facebook"], ["instagram", "Instagram"], ["threads", "Threads"]] as const;
/** Facebook, Instagram and Threads for the shop's posts, connected for real. */
export function LiveSellerSocials() {
  const { toast } = useDemo();
  const [chans, setChans] = useState<Chan[] | null>(null);
  const load = () => fetch("/api/v2/publish?part=setup&side=seller", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d: { channels?: Chan[] } | null) => setChans(d?.channels ?? [])).catch(() => setChans([]));
  useEffect(() => {
    void load();
    const q = new URLSearchParams(window.location.search);
    const result = q.get("connect");
    if (result) {
      toast(result === "ok" ? "Connected." : result === "no_pages" ? "No Facebook Pages were picked. Connect again and tick your Page." : result === "personal" ? "That Instagram account is personal. Switch it to Business or Creator, then connect again." : "It didn't connect. Please try again.");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const disconnect = async (c: Chan) => {
    const r = await fetch(`/api/social/accounts/${c.key}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) return toast("Couldn't disconnect. Try again.");
    toast(`${c.name} disconnected. Its scheduled posts were cancelled.`);
    void load();
  };
  return (
    <section className="v2-card">
      <h2 className="v2-h2">Social Accounts</h2>
      <p className="v2-small" style={{ margin: 0 }}>For posting from Publish.</p>
      <div>
        {chans === null && <p className="v2-muted" style={{ margin: 0 }}>Loading…</p>}
        {chans !== null && APPS.map(([app, label]) => {
          const mine = chans.filter((c) => c.app === app);
          return (
            <div key={app}>
              {mine.map((c) => (
                <div key={c.key} className="sl-acct">
                  <PlatformIcon name={label} size={30} />
                  <span><b>{c.name}</b><small>{c.sub}{c.status === "reconnect" ? " · needs reconnecting" : ""}</small></span>
                  <button type="button" className="btn-outline" style={{ height: 36, fontSize: 13.5 }} onClick={() => void disconnect(c)}>Disconnect</button>
                </div>
              ))}
              <div className="sl-acct">
                <PlatformIcon name={label} size={30} />
                <span><b>{mine.length ? `Add another ${label}` : label}</b><small>{mine.length ? "Connect one more" : "Not connected"}</small></span>
                <button type="button" className={mine.length ? "btn-outline" : "np-btn v2-btn-sm"} style={mine.length ? { height: 36, fontSize: 13.5 } : undefined} onClick={() => { window.location.href = `/api/auth/meta/${app}/start?from=seller-account`; }}>Connect</button>
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
      .catch(() => { setPrefs((p) => ({ ...p, [key]: !on })); toast("Didn't save. Please try again."); });
  };
  return (
    <section className="v2-card">
      <h2 className="v2-h2">Notifications</h2>
      <div>
        {TOPICS.map(([key, label, line]) => (
          <div key={key} className="sl-set np-switchrow">
            <span><b>{label}</b><small>{line}</small></span>
            <button type="button" disabled={!prefs} className={`np-switch ${prefs?.[key] !== false ? "on" : ""}`} aria-pressed={prefs?.[key] !== false} aria-label={label} onClick={() => flip(key)}><span /></button>
          </div>
        ))}
      </div>
      <p className="v2-small" style={{ margin: 0 }}>In the app. Email alerts aren&apos;t on yet. Reminders to reconnect always show.</p>
    </section>
  );
}

/** How she signs in, from her account. */
export function LiveSellerSecurity() {
  const { me } = useDemo();
  const ways = me?.signIn;
  return (
    <section className="v2-card">
      <h2 className="v2-h2">Login &Amp; Security</h2>
      {ways?.google && <div className="sl-set"><span><b>Signed in with Google</b><small>{ways.google}</small></span></div>}
      {ways?.tiktok && <div className="sl-set"><span><b>TikTok</b><small>{ways.tiktok}</small></span></div>}
      {ways?.password && <div className="sl-set"><span><b>Email and password</b><small>{ways.email ?? me?.email ?? ""}</small></span></div>}
      {!ways?.google && !ways?.tiktok && !ways?.password && <div className="sl-set"><span><b>Email</b><small>{me?.email ?? ""}</small></span></div>}
      <div className="v2-row">
        <button type="button" className="v2-link" style={{ color: "#d92d20" }} onClick={() => { fetch("/api/auth/signout", { method: "POST" }).finally(() => { window.location.href = "/seller"; }); }}>Sign Out</button>
      </div>
    </section>
  );
}

const KINDS: [string, string][] = [["Question", "Question"], ["Something's wrong", "Something's broken"], ["Idea", "Idea"]];
/** Help & Feedback for sellers, sent to the team's Feedback Inbox. */
export function LiveSellerHelp() {
  const { toast } = useDemo();
  const [kind, setKind] = useState(KINDS[0]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const send = () => {
    setBusy(true);
    fetch("/api/v2/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: kind[1], message: msg, reply: "WhatsApp", page: window.location.pathname }) })
      .then(async (r) => { if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error); setMsg(""); toast("Sent · we reply within 1 working day"); })
      .catch((e: Error) => toast(e.message || "Didn't send. Please try again."))
      .finally(() => setBusy(false));
  };
  return (
    <section className="v2-card">
      <h2 className="v2-h2">Help &Amp; Feedback</h2>
      <div className="v2-chips">
        {KINDS.map((k) => <button key={k[0]} type="button" className={`v2-chip ${kind[0] === k[0] ? "on" : ""}`} style={{ height: 36, fontSize: 13.5 }} onClick={() => setKind(k)}>{k[0]}</button>)}
      </div>
      <textarea className="np-input" rows={3} maxLength={500} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={kind[0] === "Idea" ? "What would make Rezekii better?" : "Tell us what happened"} aria-label="Message" />
      <div className="v2-row">
        <button type="button" className="np-btn" disabled={!msg.trim() || busy} onClick={send}>{busy ? <span className="sl-spin" /> : "Send"}</button>
        <span className="v2-small">Or WhatsApp {SUPPORT.wa}</span>
      </div>
    </section>
  );
}
