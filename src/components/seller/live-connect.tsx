"use client";

import Image from "next/image";
import Link from "next/link";
import { DemoStrip } from "@/components/shell";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { GoogleMark, TikTokMark } from "@/components/creator1/brand";
import { TERMS_VERSION } from "@/lib/mock-seller";
import { Tip } from "@/components/ui";

/**
 * Seller onboarding for real (owner, 31 Oct 2026): sign in with TikTok or Google (back here after), agree to the sample terms,
 * then connect Seller Center on TikTok. A seller with a shop already goes straight to the seller app.
 */
export function LiveSellerConnect() {
  const { me } = useDemo();
  const [ready, setReady] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  // useDemo learns who's signed in shortly after the page opens.
  useEffect(() => { const t = window.setTimeout(() => setReady(true), 1200); return () => window.clearTimeout(t); }, []);
  useEffect(() => { if (me?.sellerShop) window.location.href = "/seller/app"; }, [me?.sellerShop]);

  const connect = () => {
    setBusy(true);
    // The agreement is kept on record (Consent Log); keepalive lets it finish as TikTok's page opens.
    void fetch("/api/v2/consent", { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({ role: "seller", action: "agreed" }) }).catch(() => null);
    window.location.href = "/api/auth/tiktokshop/start?as=seller";
  };

  return (
    <div className="sl-ob">
      <DemoStrip />
      <header className="site-wrap sl-ob-top">
        <Link href="/seller" className="site-brand">
          <span><Image src="/master-logo-transparent.png" alt="" width={30} height={30} priority /></span>
          Rezekii
        </Link>
        <span className="sl-tag" style={{ marginLeft: 0 }}>Sellers</span>
        <span className="site-spacer" />
        <Link href="/seller" className="v2-link" style={{ fontSize: 14 }}>Exit</Link>
      </header>
      <main className="sl-ob-main">
        <section className="sl-ob-card">
          {!me ? (
            <>
              <h1>Connect Your TikTok Shop</h1>
              <p>Sign in first. It takes about 3 minutes in all.</p>
              <a className="btn-google sl-ob-btn" style={{ font: "inherit", fontWeight: 600 }} href="/api/auth/google/start?next=/seller/connect"><GoogleMark /> Continue with Google</a>
              <a className="btn-tiktok sl-ob-btn" style={{ border: 0, font: "inherit", fontWeight: 800 }} href="/api/auth/tiktok/start?next=/seller/connect"><TikTokMark size={20} /> Continue with TikTok</a>
              {ready && <Link href="/signin?next=/seller/connect" className="btn-outline sl-ob-btn" style={{ font: "inherit", fontWeight: 700 }}><Icon name="inbox" size={18} /> Continue with email</Link>}
            </>
          ) : (
            <>
              {/* Owner, 31 Oct 2026: fewer words, one clear button. The sample terms sit in a tip. */}
              <h1>Connect Your TikTok Shop</h1>
              <p style={{ margin: 0 }}>
                Signed in as <b>{me.name ?? me.email}</b> ·{" "}
                <button type="button" className="v2-link" onClick={() => { fetch("/api/auth/signout", { method: "POST" }).finally(() => { window.location.href = "/seller/connect"; }); }}>Switch account</button>
              </p>
              <ul className="sl-ob-list">
                <li><Icon name="check" size={16} width={2.6} /> Your own campaign, opened for you</li>
                <li><Icon name="check" size={16} width={2.6} /> Your products shown to creators</li>
                <li><Icon name="check" size={16} width={2.6} /> Samples, videos and sales in one place</li>
              </ul>
              <label className="sl-agree" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <span>I agree to the <a href="https://rezekii.com/terms" target="_blank" rel="noreferrer" className="v2-link">Terms</a>, <a href="https://rezekii.com/privacy" target="_blank" rel="noreferrer" className="v2-link">Privacy Policy</a> and sample terms <Tip label="Sample terms" text={`${TERMS_VERSION}: 1 sample = at least 1 video by the due date. Samples sent can't be taken back.`} /></span>
              </label>
              <button type="button" className="btn-tiktok sl-ob-btn" style={{ border: 0, font: "inherit", fontWeight: 800, cursor: "pointer" }} disabled={!agreed || busy} onClick={connect}>
                {busy ? <span className="sl-spin" /> : <TikTokMark size={20} />} Connect TikTok Shop
              </button>
              <p className="v2-small" style={{ margin: 0, display: "flex", gap: 6, alignItems: "center" }}><Icon name="shield" size={15} /> Secure sign-in by TikTok · Disconnect any time</p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

/** The result of connecting Seller Center, shown once when TikTok sends her back to the seller app. */
export function useConnectResult() {
  const { toast, refreshMe } = useDemo();
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const r = q.get("tts");
    if (!r) return;
    toast(r === "seller-connected" ? "Seller Center connected." : r.startsWith("seller-not-allowed") ? "This shop can't join yet: Rezekii is open to a few shops while TikTok reviews it. We'll let you know." : r === "denied" ? "Connecting was cancelled." : "Seller Center didn't connect. Please try again.");
    refreshMe();
    window.history.replaceState(null, "", window.location.pathname);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
