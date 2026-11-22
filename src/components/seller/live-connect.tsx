"use client";

import Image from "next/image";
import Link from "next/link";
import { openConnect } from "@/lib/connect";
import { DemoStrip } from "@/components/shell";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { GoogleMark, TikTokMark } from "@/components/creator1/brand";
import { NotYet } from "@/components/not-yet";
import { OPEN } from "@/lib/platforms";
import { TERMS_VERSION } from "@/lib/mock-seller";
import { Tip } from "@/components/ui";
import { Rich } from "@/components/seller/seller-ui";
import { useT } from "@/lib/i18n/client";
import { AccountSwitcher } from "@/components/account-switcher";

/**
 * Seller onboarding for real (owner, 31 Oct 2026): sign in with TikTok or Google (back here after), agree to the sample terms,
 * then connect Seller Center on TikTok. A seller with a shop already goes straight to the seller app.
 */
export function LiveSellerConnect() {
  const t = useT();
  const { me } = useDemo();
  const [ready, setReady] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [switcher, setSwitcher] = useState(false);
  // useDemo learns who's signed in shortly after the page opens.
  useEffect(() => { const t = window.setTimeout(() => setReady(true), 1200); return () => window.clearTimeout(t); }, []);
  useEffect(() => { if (me?.sellerShop) window.location.href = "/seller/app"; }, [me?.sellerShop]);

  const connect = () => {
    setBusy(true);
    // The agreement is kept on record (Consent Log); keepalive lets it finish as TikTok's page opens.
    void fetch("/api/v2/consent", { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({ role: "seller", action: "agreed" }) }).catch(() => null);
    openConnect("/api/auth/tiktokshop/start?as=seller");
  };

  return (
    <div className="sl-ob">
      <DemoStrip />
      <header className="site-wrap sl-ob-top">
        <Link href="/seller" className="site-brand">
          <span><Image src="/master-logo-transparent.png" alt="" width={30} height={30} priority /></span>
          Rezekii
        </Link>
        <span className="sl-tag" style={{ marginLeft: 0 }}>{t("Sellers")}</span>
        <span className="site-spacer" />
        <Link href="/seller" className="v2-link" style={{ fontSize: 14 }}>{t("Exit")}</Link>
      </header>
      <main className="sl-ob-main">
        <section className="sl-ob-card">
          {!me ? (
            <>
              <h1>{t("Connect Your TikTok Shop")}</h1>
              <p>{t("Sign in first. It takes about 3 minutes in all.")}</p>
              <a className="btn-google sl-ob-btn" style={{ font: "inherit", fontWeight: 600 }} href="/api/auth/google/start?next=/seller/connect"><GoogleMark /> {t("Continue with Google")}</a>
              {OPEN.tiktok ? <a className="btn-tiktok sl-ob-btn" style={{ border: 0, font: "inherit", fontWeight: 800 }} href="/api/auth/tiktok/start?next=/seller/connect"><TikTokMark size={20} /> {t("Continue with TikTok")}</a>
                : <div className="sl-ob-btn auth-off"><TikTokMark size={20} /> {t("Continue with TikTok")} <NotYet app="tiktok" /></div>}
              {ready && <Link href="/signin?next=/seller/connect" className="btn-outline sl-ob-btn" style={{ font: "inherit", fontWeight: 700 }}><Icon name="inbox" size={18} /> {t("Continue with Email")}</Link>}
            </>
          ) : (
            <>
              {/* Owner, 31 Oct 2026: fewer words, one clear button. The sample terms sit in a tip. */}
              <h1>{t("Connect Your TikTok Shop")}</h1>
              <p style={{ margin: 0 }}>
                <Rich text={t("Signed in as <b>{name}</b>", { name: me.name ?? me.email ?? "" })} /> ·{" "}
                {/* The accounts signed in on this device, or Add Account (owner, 4 Nov 2026); this page stays open after. */}
                <button type="button" className="v2-link" onClick={() => setSwitcher(true)}>{t("Switch Account")}</button>
              </p>
              {switcher && <AccountSwitcher app="seller" home="/seller/connect" onClose={() => setSwitcher(false)} />}
              <ul className="sl-ob-list">
                <li><Icon name="check" size={16} width={2.6} /> {t("Your own campaign, opened for you")}</li>
                <li><Icon name="check" size={16} width={2.6} /> {t("Your products shown to creators")}</li>
                <li><Icon name="check" size={16} width={2.6} /> {t("Samples, videos and sales in one place")}</li>
              </ul>
              <label className="sl-agree" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <span>
                  {/* One whole sentence in every language; the two links sit where {terms} and {privacy} are. */}
                  {t("I Agree to the {terms}, {privacy} and sample terms").split(/(\{terms\}|\{privacy\})/).map((part, i) =>
                    part === "{terms}" ? <a key={i} href="https://rezekii.com/terms" target="_blank" rel="noreferrer" className="v2-link">{t("Terms")}</a>
                    : part === "{privacy}" ? <a key={i} href="https://rezekii.com/privacy" target="_blank" rel="noreferrer" className="v2-link">{t("Privacy Policy")}</a>
                    : part)}{" "}
                  <Tip label={t("Sample terms")} text={t("{version}: 1 sample = at least 1 video by the due date. Samples sent can't be taken back.", { version: t(TERMS_VERSION) })} />
                </span>
              </label>
              <button type="button" className="btn-tiktok sl-ob-btn" style={{ border: 0, font: "inherit", fontWeight: 800, cursor: "pointer" }} disabled={!agreed || busy} onClick={connect}>
                {busy ? <span className="sl-spin" /> : <TikTokMark size={20} />} {t("Connect TikTok Shop")}
              </button>
              <p className="v2-small" style={{ margin: 0, display: "flex", gap: 6, alignItems: "center" }}><Icon name="shield" size={15} /> {t("Secure sign-in by TikTok · Disconnect any time")}</p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

/** The result of connecting Seller Center, shown once when TikTok sends her back to the seller app. */
export function useConnectResult() {
  const t = useT();
  const { toast, refreshMe } = useDemo();
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const r = q.get("tts");
    if (!r) return;
    toast(r === "seller-connected" ? t("Seller Center connected.") : r.startsWith("seller-not-allowed") ? t("This shop can't join yet: Rezekii is open to a few shops while TikTok reviews it. We'll let you know.") : r === "denied" ? t("Connecting was cancelled.") : t("Seller Center didn't connect. Please try again."));
    refreshMe();
    window.history.replaceState(null, "", window.location.pathname);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
