import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { onboardingState } from "@/modules/creator-accounts/onboarding.ts";
import { currentUser } from "../current-user";
import { TikTokShopLogo } from "../tiktok-logo";
import { WaitlistButton } from "./waitlist-button";
import "../app/marketplace/marketplace.css";
import "./onboarding.css";

export const metadata: Metadata = { title: "Get started · Rezekii" };
export const dynamic = "force-dynamic";

/** What TikTok Shop's return (?result=) means for the creator, when it needs saying. */
const RESULT: Record<string, { text: string; tone: "red" | "amber" }> = {
  taken: { text: "That TikTok Shop account is already linked to another Rezekii account. Sign in to that account, or link a different TikTok Shop.", tone: "red" },
  denied: { text: "You didn't approve Rezekii in TikTok Shop, so nothing was linked.", tone: "amber" },
  expired: { text: "The link expired or was opened in a different browser. Try again.", tone: "amber" },
  error: { text: "TikTok Shop didn't finish linking. Try again.", tone: "red" },
};

const Check = ({ size = 20, color = "#0d1117" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="nv-check" d="m5 12 5 5 9-10" /></svg>
);

/**
 * Getting set up, as designed in the mockup (Creator onboarding): signed in, link TikTok Shop (required), Techwide's approval.
 * Every creator page sends people here until their TikTok Shop is linked and approved.
 */
export default async function Onboarding({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/signin");
  if (user.role === "admin") redirect("/app/admin");
  const [s, { result }] = await Promise.all([onboardingState(user), searchParams]);
  const linked = !!s.shop;
  const approved = linked && s.status === "approved";
  const step = linked ? (approved ? 3 : 2) : 1;
  const note = result ? RESULT[result] : undefined;
  const invited = s.status === "invited" && !linked;
  const waitlist = s.status === "waitlist" && !linked;
  const handle = s.shop ? `@${s.shop.username}` : "";
  const badge = linked ? ["Linked", "b-green"] : waitlist ? ["Waitlist", "b-amber"] : invited ? ["Your place is ready", "b-green"] : ["Required", "b-solid"];

  return (
    <div className="nv nv-page" style={{ minHeight: "100vh" }}>
      <header className="ob-head">
        <div className="ob-wrap">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="ob-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/master-logo-transparent.png" alt="" width={30} height={30} />
            </span>
            <span style={{ fontSize: 20, fontWeight: 800, flex: 1 }}>Rezekii</span>
            <form action="/api/auth/signout" method="post">
              <button type="submit" className="ob-out">Sign out</button>
            </form>
          </div>
          <div>
            <h1 className="nv-title" style={{ margin: 0, fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em" }}>Let&apos;s get you set up</h1>
            <p style={{ margin: "6px 0 0", fontSize: 15, opacity: 0.92 }}>One required step: link your TikTok Shop. Then Techwide approves your account.</p>
          </div>
          <ol className="ob-steps" aria-label="Progress">
            {["Sign in", "Link TikTok Shop", "Approval"].map((label, i) => (
              <li key={label} className={step >= i + 1 ? "on" : ""} aria-current={step === i + 1 ? "step" : undefined}><span />{label}</li>
            ))}
          </ol>
        </div>
      </header>

      <main className="ob-main">
        <section className="nv-up nv-card ob-card" aria-labelledby="ob1" style={{ flexDirection: "row", alignItems: "center", padding: "20px 22px" }}>
          <span className="ob-ico" style={{ borderRadius: "50%", background: "#00c073" }}><Check /></span>
          <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <h2 id="ob1" style={{ fontSize: 17 }}>Signed in</h2>
            <span className="ob-sub">{s.signedIn}</span>
          </span>
        </section>

        <section className="nv-up nv-card ob-card" aria-labelledby="ob2" style={{ animationDelay: "80ms", border: `2px solid ${linked ? "transparent" : "#00c073"}` }}>
          <div className="ob-row">
            <span className="ob-ico"><TikTokShopLogo size={38} /></span>
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <h2 id="ob2">Link your TikTok Shop</h2>
              <span className="ob-sub">Required · makes your affiliate links and manages your showcase</span>
            </span>
            <span className={`nv-badge ${badge[1]}`}>{badge[0]}</span>
          </div>
          {note && <p role="alert" className="ob-note" style={{ margin: 0, background: note.tone === "red" ? "var(--rsoft)" : "var(--asoft)", color: note.tone === "red" ? "var(--red)" : "var(--amber)" }}>{note.text}</p>}
          {linked ? (
            <div className="ob-box" style={{ background: "var(--gsoft)" }}>
              {s.shop?.avatar ? (
                // TikTok's avatar CDN hosts vary, so a plain img (as elsewhere for avatars).
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.shop.avatar} alt="" className="ob-av" />
              ) : (
                <span className="ob-av" aria-hidden="true">{s.shop?.username.slice(0, 1).toUpperCase()}</span>
              )}
              <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span style={{ fontWeight: 800, fontSize: 17, color: "var(--gink)" }}>{handle}</span>
                <span style={{ fontSize: 13, color: "var(--gink)" }}>Name and photo from TikTok Shop</span>
              </span>
              <Check size={26} color="var(--gink)" />
            </div>
          ) : waitlist ? (
            <div className="ob-box" style={{ background: "var(--asoft)", color: "var(--amber)" }}>
              <span style={{ fontSize: 34, fontWeight: 900 }}>#{s.position ?? 1}</span>
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontWeight: 800 }}>You&apos;re on the waitlist</span>
                <span style={{ fontSize: 13 }}>We&apos;ll show a &quot;Link TikTok Shop&quot; button here as soon as a place frees up.</span>
              </span>
            </div>
          ) : (
            <>
              <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6, fontSize: 15, color: "var(--body)", lineHeight: 1.45 }}>
                <li>Turn any TikTok product link into your own affiliate link</li>
                <li>Add TAP products to your showcase in one tap</li>
                <li>Request free samples and track them</li>
              </ul>
              {invited && <p className="ob-note" style={{ margin: 0, background: "var(--gsoft)", color: "var(--gink)" }}>A place freed up and it&apos;s kept for you. Link your TikTok Shop to take it.</p>}
              {s.full ? (
                <>
                  <p className="ob-note" style={{ margin: 0, background: "var(--asoft)", color: "var(--amber)" }}>TikTok lets Rezekii link 25 accounts until it finishes reviewing Rezekii, and all 25 are taken. Join the waitlist and we&apos;ll invite you as soon as a place frees up.</p>
                  <WaitlistButton />
                </>
              ) : (
                <a href="/api/auth/tiktokshop/start" className="nv-btn nv-press nv-cta ob-big">Link TikTok Shop</a>
              )}
            </>
          )}
        </section>

        <section className="nv-up nv-card ob-card" aria-labelledby="ob3" style={{ animationDelay: "140ms", flexDirection: "row", alignItems: "center", flexWrap: "wrap", boxShadow: "var(--shadow2)" }}>
          <span className="ob-ico" style={{ background: "var(--seg)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="m10 8 6 4-6 4z" /><rect x="3" y="4" width="18" height="16" rx="4" /></svg>
          </span>
          <span style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 2 }}>
            <h2 id="ob3" style={{ fontSize: 17 }}>Connect TikTok <span style={{ fontWeight: 600, color: "var(--muted)" }}>· optional</span></h2>
            <span className="ob-sub">{s.tiktok ? "Connected · posting and video stats are on" : "Only needed to schedule posts and see video stats. Must be the same account as your TikTok Shop."}</span>
          </span>
          {s.tiktok ? <span className="nv-badge b-green">Connected</span> : <a href="/api/auth/tiktok/start" className="nv-btn2 nv-press" style={{ textDecoration: "none" }}>Connect TikTok</a>}
        </section>

        {(linked || s.status === "rejected") && (
          <section className="nv-up nv-card ob-card ob-result" aria-labelledby="ob4">
            {approved ? (
              <>
                <span style={{ width: 72, height: 72, borderRadius: "50%", background: "#00c073", display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={36} /></span>
                <h2 id="ob4" style={{ fontSize: 22 }}>You&apos;re approved</h2>
                <span className="ob-sub" style={{ fontSize: 15 }}>The Marketplace, link converter and Product Lookup are ready.</span>
                <a href="/app" className="nv-btn nv-press nv-cta" style={{ height: 52, padding: "0 28px", fontSize: 16, textDecoration: "none" }}>Go to Today</a>
              </>
            ) : s.status === "rejected" ? (
              <>
                <h2 id="ob4" style={{ fontSize: 20, color: "var(--red)" }}>Not approved this time</h2>
                <span style={{ fontSize: 15, color: "var(--body)", maxWidth: 460, lineHeight: 1.5 }}>
                  {s.reason ? <>Reason from Techwide: &quot;{s.reason}&quot; </> : null}Your TikTok Shop link was removed so the place can go to someone else. Link it again to re-apply.
                </span>
              </>
            ) : (
              <>
                <span style={{ width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}><span className="nv-dot" aria-hidden="true" style={{ width: 18, height: 18 }} /></span>
                <h2 id="ob4" style={{ fontSize: 20 }}>Waiting for Techwide to approve</h2>
                <span className="ob-sub" style={{ fontSize: 15, maxWidth: 460, lineHeight: 1.5 }}>We&apos;re checking {handle}. This usually takes about one working day. You&apos;ll see the result here.</span>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
