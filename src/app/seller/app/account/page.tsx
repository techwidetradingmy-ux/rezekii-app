"use client";

import "@/app/seller.css";
import { dialOfNumber } from "@/lib/countries";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet, Title } from "@/components/ui";
import { ConnBanner, Plat, PhoneField, TermsSheet } from "@/components/seller/seller-ui";
import { ConnectSocialSheet, useSellerSocials } from "@/components/seller/connect-social";
import { SELLER } from "@/lib/mock";
import { TERMS_VERSION, tidyPhone, type Platform } from "@/lib/mock-seller";
import { loadProfile, saveProfile } from "@/lib/live-rewards";
import { LiveSellerHelp, LiveSellerNotify, LiveSellerSecurity, LiveSellerSocials, LiveShopAuth } from "@/components/seller/live-account";
import { PushSwitch } from "@/components/account/push-switch";
import { useT } from "@/lib/i18n/client";
import { tx } from "@/lib/i18n/lang";

const NOTIFY: [string, string, boolean][] = [
  [tx("Product status"), tx("Approved, live or not approved"), true],
  [tx("Late samples"), tx("When a creator is overdue"), true],
  [tx("Weekly results"), tx("Every Monday morning"), true],
  ["WhatsApp", tx("Important ones only"), false],
  [tx("Email"), tx("A copy of every alert"), true],
];

/** Shop authorisation, contact, social accounts, notifications, security, help and billing. */
export default function SellerAccount() {
  const t = useT();
  const { linked, setLinked, toast, live, me } = useDemo();
  const { socials, connect, disconnect } = useSellerSocials();
  const [contact, setContact] = useState({ name: SELLER.contact, dial: "60", raw: "0123456789" });
  const [edit, setEdit] = useState<typeof contact | null>(null);
  const [tried, setTried] = useState(false);
  const [notify, setNotify] = useState(NOTIFY.map((n) => n[2]));
  const [connecting, setConnecting] = useState<Platform | null>(null);
  const [terms, setTerms] = useState(false);
  const [kind, setKind] = useState("Question");
  const [msg, setMsg] = useState("");
  const [reconnecting, setReconnecting] = useState(false);
  const phone = tidyPhone(contact.raw, contact.dial);
  // Signed in (owner, 31 Oct 2026): the saved contact, or empty until it's added.
  const [saved, setSaved] = useState(!live);
  useEffect(() => {
    if (!live) return;
    loadProfile<{ contact: string; phone: string }>("seller")
      .then(({ profile }) => {
        if (!profile) return setContact({ name: "", dial: "60", raw: "" });
        const dial = dialOfNumber(profile.details.phone) ?? "60";
        setContact({ name: profile.details.contact, dial, raw: profile.details.phone.slice(dial.length + 1) });
        setSaved(true);
      })
      .catch(() => toast(t("Couldn't load your contact. Please refresh.")));
  }, [live]); // eslint-disable-line react-hooks/exhaustive-deps
  const [savingContact, setSavingContact] = useState(false);
  const saveContact = async (c: typeof contact) => {
    setSavingContact(true);
    try {
      await saveProfile("seller", { contact: c.name.trim(), phone: `+${c.dial}${tidyPhone(c.raw, c.dial).pretty.replace(/\D/g, "").slice(c.dial.length)}` });
      setContact(c); setEdit(null); setSaved(true); toast(t("Saved"));
    } catch (e) {
      toast(e instanceof Error ? e.message : t("Didn't save. Please try again."));
    } finally {
      setSavingContact(false);
    }
  };

  const reconnect = () => {
    setReconnecting(true);
    window.setTimeout(() => { setReconnecting(false); setLinked(true); toast(t("Seller Center reconnected")); }, 1000);
  };

  return (
    <div className="v2-stack v2-in v2-narrow">
      <Title title={t("Account")} sub={live ? me?.sellerShop ?? t("No shop connected yet") : `${SELLER.shop} · ${SELLER.state}, ${SELLER.country}`} />
      {/* Their user ID, as on the creator Account page (owner, 2 Nov 2026), to quote to support. */}
      {live && me && (
        <p className="acc-uid">
          <span>{t("User ID")}</span>
          <code>{me.id}</code>
          <button type="button" className="v2-iconbtn" aria-label={t("Copy user ID")} onClick={() => navigator.clipboard.writeText(me.id).then(() => toast(t("User ID copied")), () => toast(me.id))}><Icon name="doc" size={15} /></button>
        </p>
      )}
      <ConnBanner />

      {live ? <LiveShopAuth /> : (
      <section className="v2-card">
        <h2 className="v2-h2">{t("Shop Authorisation")}</h2>
        <div className="sl-set">
          <span>
            <b>TikTok Shop Seller Center</b>
            <small>{linked ? t("Connected since {date}", { date: "12 Sep 2026" }) : t("Expired on {date}", { date: "27 Oct" })}</small>
            <small>{t("One account = one shop.")}</small>
          </span>
          <span className={`badge ${linked ? "" : "badge-red"}`}>{linked ? t("Connected") : t("Expired")}</span>
        </div>
        <button type="button" className="btn-outline" style={{ alignSelf: "flex-start" }} onClick={reconnect} disabled={reconnecting}>
          {reconnecting ? <span className="sl-spin" /> : <Icon name="refresh" size={18} />} {t("Reconnect")}
        </button>
      </section>
      )}

      <section className="v2-card">
        <div className="v2-card-h"><h2 className="v2-h2">{t("Contact & Phone")}</h2><button type="button" className="v2-link" onClick={() => { setEdit(contact); setTried(false); }}>{t("Edit")}</button></div>
        <div className="sl-set"><span><small>{t("Contact name")}</small><b>{contact.name || t("Not added yet")}</b></span></div>
        <div className="sl-set"><span><small>{t("Phone")}</small><b>{phone.ok ? phone.pretty : contact.raw || t("Not added yet")}</b></span>{!live && <span className="badge">{t("Verified")}</span>}{live && !saved && <span className="badge badge-amber">{t("Add It")}</span>}</div>
      </section>

      {live ? <LiveSellerSocials /> : (
      <section className="v2-card">
        <h2 className="v2-h2">{t("Social Accounts")}</h2>
        <p className="v2-small" style={{ margin: 0 }}>{t("For posting from Publish.")}</p>
        <div>
          {socials.map((s) => (
            <div key={s.name} className="sl-acct">
              <Plat p={s.name} />
              <span><b>{s.name}</b><small>{s.linked ? s.handle : t("Not connected")}</small></span>
              {s.linked
                ? <button type="button" className="btn-outline" style={{ height: 36, fontSize: 13.5 }} onClick={() => { disconnect(s.name); toast(t("{name} disconnected", { name: s.name })); }}>{t("Disconnect")}</button>
                : <button type="button" className="np-btn v2-btn-sm" onClick={() => setConnecting(s.name)}>{t("Connect")}</button>}
            </div>
          ))}
        </div>
      </section>
      )}

      {live ? <LiveSellerNotify /> : (
      <section className="v2-card">
        <h2 className="v2-h2">{t("Notifications")}</h2>
        <div>
          {NOTIFY.map(([label, line], i) => (
            <div key={label} className="sl-set np-switchrow">
              <span><b>{t(label)}</b><small>{t(line)}</small></span>
              <button type="button" className={`np-switch ${notify[i] ? "on" : ""}`} aria-pressed={notify[i]} aria-label={t(label)} onClick={() => setNotify((n) => n.map((v, k) => (k === i ? !v : v)))}><span /></button>
            </div>
          ))}
        </div>
      </section>
      )}
      <PushSwitch side="seller" />

      {live ? <LiveSellerSecurity /> : (
      <section className="v2-card">
        <h2 className="v2-h2">{t("Login & Security")}</h2>
        <div className="sl-set"><span><b>{t("Signed in with Google")}</b><small>meiling@seriliving.my</small></span></div>
        <div className="sl-set"><span><b>{t("This Device")}</b><small>{t("{device} · {city} · now", { device: "Chrome on Windows", city: "Kuala Lumpur" })}</small></span><span className="badge badge-gray">{t("Current")}</span></div>
        <div className="sl-set"><span><b>iPhone</b><small>{t("{device} · {city} · {n} days ago", { device: "Rezekii in Safari", city: "Kuala Lumpur", n: 2 })}</small></span></div>
        <div className="v2-row">
          <button type="button" className="btn-outline" onClick={() => toast(t("Signed out of your other devices"))}>{t("Sign Out Other Devices")}</button>
          <Link href="/seller" className="v2-link" style={{ color: "#d92d20" }} onClick={(e) => { if (!live) return; e.preventDefault(); fetch("/api/auth/signout", { method: "POST" }).finally(() => { window.location.href = "/seller"; }); }}>{t("Sign Out")}</Link>
        </div>
      </section>
      )}

      <section className="v2-card">
        <h2 className="v2-h2">{t("Sample Allocation Terms")}</h2>
        <div className="sl-set"><span><b>{live ? t("Sample Terms for TAP Products") : t("You agreed on {date}", { date: "12 Sep 2026" })}</b><small>{t(TERMS_VERSION)}. {live ? t("They apply to every product you send to TAP.") : t("We'll ask again if they change.")}</small></span><button type="button" className="v2-link" onClick={() => setTerms(true)}>{t("Read")}</button></div>
      </section>

      {live ? <LiveSellerHelp /> : (
      <section className="v2-card">
        <h2 className="v2-h2">{t("Help & Feedback")}</h2>
        <div className="v2-chips">
          {[tx("Question"), tx("Something's wrong"), tx("Idea")].map((k) => (
            <button key={k} type="button" className={`v2-chip ${kind === k ? "on" : ""}`} style={{ height: 36, fontSize: 13.5 }} onClick={() => setKind(k)}>{t(k)}</button>
          ))}
        </div>
        <textarea className="np-input" rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={kind === "Idea" ? t("What would make Rezekii better?") : t("Tell us what happened")} aria-label={t("Message")} />
        <div className="v2-row">
          <button type="button" className="np-btn" disabled={!msg.trim()} onClick={() => { setMsg(""); toast(t("Sent · we reply within 1 working day")); }}>{t("Send")}</button>
          <span className="v2-small">{t("Or WhatsApp {number}", { number: "+60 3-2789 4410" })}</span>
        </div>
      </section>
      )}

      <section className="v2-card">
        <div className="v2-card-h"><h2 className="v2-h2">{t("Billing")}</h2><span className="badge badge-gray">{t("Later")}</span></div>
        <p className="v2-muted" style={{ margin: 0 }}>{t("No monthly fee. Custom service invoices show here.")}</p>
      </section>

      {edit && (
        <Sheet title={t("Contact & Phone")} onClose={() => setEdit(null)}>
          <label className="v2-field">{t("Contact name")}
            <input className="np-input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoComplete="name" />
          </label>
          <PhoneField dial={edit.dial} raw={edit.raw} onChange={(dial, raw) => setEdit({ ...edit, dial, raw })} showError={tried} />
          <button type="button" className="np-btn" disabled={savingContact} onClick={() => {
            setTried(true);
            if (edit.name.trim().length < 2 || !tidyPhone(edit.raw, edit.dial).ok) return;
            if (live) return void saveContact(edit);
            setContact(edit); setEdit(null); toast(t("Saved"));
          }}>{savingContact ? t("Saving…") : t("Save")}</button>
        </Sheet>
      )}
      {connecting && (
        <ConnectSocialSheet platform={connecting} onClose={() => setConnecting(null)} onDone={(h) => { connect(connecting, h); toast(t("{name} connected", { name: connecting })); setConnecting(null); }} />
      )}
      {terms && <TermsSheet onClose={() => setTerms(false)} />}
    </div>
  );
}
