"use client";

import Image from "next/image";
import Link from "next/link";
import { DemoStrip } from "@/components/shell";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { GoogleMark, TikTokMark } from "@/components/creator1/brand";
import { TERMS_VERSION } from "@/lib/mock-seller";

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
              <h1>Sign In</h1>
              <p>Sign in, then connect your TikTok Shop. About 3 minutes.</p>
              <a className="btn-tiktok sl-ob-btn" style={{ border: 0, font: "inherit", fontWeight: 800 }} href="/api/auth/tiktok/start?next=/seller/connect"><TikTokMark size={20} /> Continue with TikTok</a>
              <a className="btn-google sl-ob-btn" style={{ font: "inherit", fontWeight: 600 }} href="/api/auth/google/start?next=/seller/connect"><GoogleMark /> Continue with Google</a>
              {ready && <p className="v2-small" style={{ margin: 0 }}>Use email instead? <Link href="/signin" className="v2-link">Sign in with email</Link>, then come back to this page.</p>}
            </>
          ) : (
            <>
              <h1>Connect Seller Center</h1>
              <p>Signed in as <b>{me.name ?? me.email}</b>. Connect your TikTok Shop so Rezekii can read your products and send them to Techwide&apos;s TAP.</p>
              <label className="sl-agree" style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <span>I agree to the sample terms ({TERMS_VERSION}): 1 sample = at least 1 video by the due date, and samples sent can&apos;t be taken back. And to Rezekii&apos;s <a href="https://rezekii.com/terms" target="_blank" rel="noreferrer" className="v2-link">Terms</a> and <a href="https://rezekii.com/privacy" target="_blank" rel="noreferrer" className="v2-link">Privacy Policy</a>.</span>
              </label>
              <button type="button" className="btn-tiktok sl-ob-btn" style={{ border: 0, font: "inherit", fontWeight: 800, cursor: "pointer" }} disabled={!agreed || busy} onClick={connect}>
                {busy ? <span className="sl-spin" /> : <TikTokMark size={20} />} Connect Seller Center
              </button>
              <p className="v2-small" style={{ margin: 0, display: "flex", gap: 6 }}><Icon name="shield" size={15} /> TikTok asks you to approve Rezekii. You can disconnect any time in Account.</p>
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
