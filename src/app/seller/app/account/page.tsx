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

const NOTIFY: [string, string, boolean][] = [
  ["Product status", "Approved, live or not approved", true],
  ["Late samples", "When a creator is overdue", true],
  ["Weekly results", "Every Monday morning", true],
  ["WhatsApp", "Important ones only", false],
  ["Email", "A copy of every alert", true],
];

/** Shop authorisation, contact, social accounts, notifications, security, help and billing. */
export default function SellerAccount() {
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
      .catch(() => toast("Couldn't load your contact. Please refresh."));
  }, [live]); // eslint-disable-line react-hooks/exhaustive-deps
  const [savingContact, setSavingContact] = useState(false);
  const saveContact = async (c: typeof contact) => {
    setSavingContact(true);
    try {
      await saveProfile("seller", { contact: c.name.trim(), phone: `+${c.dial}${tidyPhone(c.raw, c.dial).pretty.replace(/\D/g, "").slice(c.dial.length)}` });
      setContact(c); setEdit(null); setSaved(true); toast("Saved");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Didn't save. Please try again.");
    } finally {
      setSavingContact(false);
    }
  };

  const reconnect = () => {
    setReconnecting(true);
    window.setTimeout(() => { setReconnecting(false); setLinked(true); toast("Seller Center reconnected"); }, 1000);
  };

  return (
    <div className="v2-stack v2-in v2-narrow">
      <Title title="Account" sub={live ? me?.sellerShop ?? "No shop connected yet" : `${SELLER.shop} · ${SELLER.state}, ${SELLER.country}`} />
      <ConnBanner />

      {live ? <LiveShopAuth /> : (
      <section className="v2-card">
        <h2 className="v2-h2">Shop Authorisation</h2>
        <div className="sl-set">
          <span>
            <b>TikTok Shop Seller Center</b>
            <small>{linked ? "Connected since 12 Sep 2026" : "Expired on 27 Oct"}</small>
            <small>One account = one shop.</small>
          </span>
          <span className={`badge ${linked ? "" : "badge-red"}`}>{linked ? "Connected" : "Expired"}</span>
        </div>
        <button type="button" className="btn-outline" style={{ alignSelf: "flex-start" }} onClick={reconnect} disabled={reconnecting}>
          {reconnecting ? <span className="sl-spin" /> : <Icon name="refresh" size={18} />} Reconnect
        </button>
      </section>
      )}

      <section className="v2-card">
        <div className="v2-card-h"><h2 className="v2-h2">Contact &amp; Phone</h2><button type="button" className="v2-link" onClick={() => { setEdit(contact); setTried(false); }}>Edit</button></div>
        <div className="sl-set"><span><small>Contact name</small><b>{contact.name || "Not added yet"}</b></span></div>
        <div className="sl-set"><span><small>Phone</small><b>{phone.ok ? phone.pretty : contact.raw || "Not added yet"}</b></span>{!live && <span className="badge">Verified</span>}{live && !saved && <span className="badge badge-amber">Add it</span>}</div>
      </section>

      {live ? <LiveSellerSocials /> : (
      <section className="v2-card">
        <h2 className="v2-h2">Social Accounts</h2>
        <p className="v2-small" style={{ margin: 0 }}>For posting from Publish.</p>
        <div>
          {socials.map((s) => (
            <div key={s.name} className="sl-acct">
              <Plat p={s.name} />
              <span><b>{s.name}</b><small>{s.linked ? s.handle : "Not connected"}</small></span>
              {s.linked
                ? <button type="button" className="btn-outline" style={{ height: 36, fontSize: 13.5 }} onClick={() => { disconnect(s.name); toast(`${s.name} disconnected`); }}>Disconnect</button>
                : <button type="button" className="np-btn v2-btn-sm" onClick={() => setConnecting(s.name)}>Connect</button>}
            </div>
          ))}
        </div>
      </section>
      )}

      {live ? <LiveSellerNotify /> : (
      <section className="v2-card">
        <h2 className="v2-h2">Notifications</h2>
        <div>
          {NOTIFY.map(([label, line], i) => (
            <div key={label} className="sl-set np-switchrow">
              <span><b>{label}</b><small>{line}</small></span>
              <button type="button" className={`np-switch ${notify[i] ? "on" : ""}`} aria-pressed={notify[i]} aria-label={label} onClick={() => setNotify((n) => n.map((v, k) => (k === i ? !v : v)))}><span /></button>
            </div>
          ))}
        </div>
      </section>
      )}

      {live ? <LiveSellerSecurity /> : (
      <section className="v2-card">
        <h2 className="v2-h2">Login &amp; Security</h2>
        <div className="sl-set"><span><b>Signed in with Google</b><small>meiling@seriliving.my</small></span></div>
        <div className="sl-set"><span><b>This device</b><small>Chrome on Windows · Kuala Lumpur · now</small></span><span className="badge badge-gray">Current</span></div>
        <div className="sl-set"><span><b>iPhone</b><small>Rezekii in Safari · Kuala Lumpur · 2 days ago</small></span></div>
        <div className="v2-row">
          <button type="button" className="btn-outline" onClick={() => toast("Signed out of your other devices")}>Sign out other devices</button>
          <Link href="/seller" className="v2-link" style={{ color: "#d92d20" }} onClick={(e) => { if (!live) return; e.preventDefault(); fetch("/api/auth/signout", { method: "POST" }).finally(() => { window.location.href = "/seller"; }); }}>Sign out</Link>
        </div>
      </section>
      )}

      <section className="v2-card">
        <h2 className="v2-h2">Sample Allocation Terms</h2>
        <div className="sl-set"><span><b>{live ? "Sample terms for TAP products" : "You agreed on 12 Sep 2026"}</b><small>{TERMS_VERSION}.{live ? " They apply to every product you send to TAP." : " We'll ask again if they change."}</small></span><button type="button" className="v2-link" onClick={() => setTerms(true)}>Read</button></div>
      </section>

      {live ? <LiveSellerHelp /> : (
      <section className="v2-card">
        <h2 className="v2-h2">Help &amp; Feedback</h2>
        <div className="v2-chips">
          {["Question", "Something's wrong", "Idea"].map((k) => (
            <button key={k} type="button" className={`v2-chip ${kind === k ? "on" : ""}`} style={{ height: 36, fontSize: 13.5 }} onClick={() => setKind(k)}>{k}</button>
          ))}
        </div>
        <textarea className="np-input" rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={kind === "Idea" ? "What would make Rezekii better?" : "Tell us what happened"} aria-label="Message" />
        <div className="v2-row">
          <button type="button" className="np-btn" disabled={!msg.trim()} onClick={() => { setMsg(""); toast("Sent · we reply within 1 working day"); }}>Send</button>
          <span className="v2-small">Or WhatsApp +60 3-2789 4410</span>
        </div>
      </section>
      )}

      <section className="v2-card">
        <div className="v2-card-h"><h2 className="v2-h2">Billing</h2><span className="badge badge-gray">Later</span></div>
        <p className="v2-muted" style={{ margin: 0 }}>No monthly fee. Custom service invoices show here.</p>
      </section>

      {edit && (
        <Sheet title="Contact & Phone" onClose={() => setEdit(null)}>
          <label className="v2-field">Contact name
            <input className="np-input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoComplete="name" />
          </label>
          <PhoneField dial={edit.dial} raw={edit.raw} onChange={(dial, raw) => setEdit({ ...edit, dial, raw })} showError={tried} />
          <button type="button" className="np-btn" disabled={savingContact} onClick={() => {
            setTried(true);
            if (edit.name.trim().length < 2 || !tidyPhone(edit.raw, edit.dial).ok) return;
            if (live) return void saveContact(edit);
            setContact(edit); setEdit(null); toast("Saved");
          }}>{savingContact ? "Saving…" : "Save"}</button>
        </Sheet>
      )}
      {connecting && (
        <ConnectSocialSheet platform={connecting} onClose={() => setConnecting(null)} onDone={(h) => { connect(connecting, h); toast(`${connecting} connected`); setConnecting(null); }} />
      )}
      {terms && <TermsSheet onClose={() => setTerms(false)} />}
    </div>
  );
}
