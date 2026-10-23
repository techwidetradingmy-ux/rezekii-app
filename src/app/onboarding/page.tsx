import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LangProvider, LangSwitch } from "@/lib/i18n/client.tsx";
import { adminView } from "../view";
import { ViewSwitch } from "../view-switch";
import { tx } from "@/lib/i18n/lang.ts";
import { getLang, tFor } from "@/lib/i18n/server.ts";
import { wordsFor } from "@/lib/i18n/translate.ts";
import { onboardingState } from "@/modules/creator-accounts/onboarding.ts";
import { currentUser } from "../current-user";
import { TikTokShopLogo } from "../tiktok-logo";
import { WaitlistButton } from "./waitlist-button";
import "../app/marketplace/marketplace.css";
import "./onboarding.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = tFor(await getLang());
  return { title: t("Get started · Rezekii") };
}
export const dynamic = "force-dynamic";

/** What TikTok Shop's return (?result=) means for the creator, when it needs saying. */
const RESULT: Record<string, { text: string; tone: "red" | "amber" }> = {
  taken: { text: tx("That TikTok Shop account is already linked to another Rezekii account. Sign in to that account, or link a different TikTok Shop."), tone: "red" },
  denied: { text: tx("You didn't approve Rezekii in TikTok Shop, so nothing was linked."), tone: "amber" },
  expired: { text: tx("The link expired or was opened in a different browser. Try again."), tone: "amber" },
  error: { text: tx("TikTok Shop didn't finish linking. Try again."), tone: "red" },
};

const Check = ({ size = 20, color = "#0d1117" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="nv-check" d="m5 12 5 5 9-10" /></svg>
);

/**
 * Getting set up, as designed in the mockup (Creator onboarding): signed in, link TikTok Shop, Techwide's approval. Linking
 * is recommended, not required (owner, 23 Oct 2026): the creator pages work without it and their banner leads here.
 */
export default async function Onboarding({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/signin");
  if (await adminView(user)) redirect("/app/admin");
  const lang = await getLang();
  const t = tFor(lang);
  const [s, { result }] = await Promise.all([onboardingState(user, lang), searchParams]);
  const linked = !!s.shop;
  const approved = linked && s.status === "approved";
  const step = linked ? (approved ? 3 : 2) : 1;
  const note = result ? RESULT[result] : undefined;
  const invited = s.status === "invited" && !linked;
  const waitlist = s.status === "waitlist" && !linked;
  const handle = s.shop ? `@${s.shop.username}` : "";
  const badge = linked ? [t("Linked"), "b-green"] : waitlist ? [t("Waitlist"), "b-amber"] : invited ? [t("Your place is ready"), "b-green"] : [t("Recommended"), "b-solid"];
  const reason = t("Reason from Techwide: \"{reason}\" ").split("{reason}");

  return (
    <LangProvider lang={lang} words={wordsFor(lang)}>
    <div className="nv nv-page" style={{ minHeight: "100vh" }}>
      <header className="ob-head">
        <div className="ob-wrap">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="ob-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/master-logo-transparent.png" alt="" width={30} height={30} />
            </span>
            <span style={{ fontSize: 20, fontWeight: 800, flex: 1 }}>Rezekii</span>
            {user.role === "admin" && <ViewSwitch to="admin" />}
            <LangSwitch />
            <form action="/api/auth/signout" method="post">
              <button type="submit" className="ob-out">{t("Sign out")}</button>
            </form>
          </div>
          <div>
            <h1 className="nv-title" style={{ margin: 0, fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em" }}>{t("Let's get you set up")}</h1>
            <p style={{ margin: "6px 0 0", fontSize: 15, opacity: 0.92 }}>{t("Link your TikTok Shop to make affiliate links, add products to your showcase and request free samples. Techwide then approves it.")}</p>
            {step < 3 && <a href="/app" className="ob-skip">{t("Explore Rezekii first")}</a>}
          </div>
          <ol className="ob-steps" aria-label={t("Progress")}>
            {[t("Sign in"), t("Link TikTok Shop"), t("Approval")].map((label, i) => (
              <li key={label} className={step >= i + 1 ? "on" : ""} aria-current={step === i + 1 ? "step" : undefined}><span />{label}</li>
            ))}
          </ol>
        </div>
      </header>

      <main className="ob-main">
        <section className="nv-up nv-card ob-card" aria-labelledby="ob1" style={{ flexDirection: "row", alignItems: "center", padding: "20px 22px" }}>
          <span className="ob-ico" style={{ borderRadius: "50%", background: "#00c073" }}><Check /></span>
          <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <h2 id="ob1" style={{ fontSize: 17 }}>{t("Signed in")}</h2>
            <span className="ob-sub">{s.signedIn}</span>
          </span>
        </section>

        <section className="nv-up nv-card ob-card" aria-labelledby="ob2" style={{ animationDelay: "80ms", border: `2px solid ${linked ? "transparent" : "#00c073"}` }}>
          <div className="ob-row">
            <span className="ob-ico"><TikTokShopLogo size={38} /></span>
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <h2 id="ob2">{t("Link your TikTok Shop")}</h2>
              <span className="ob-sub">{t("Recommended · makes your affiliate links and manages your showcase")}</span>
            </span>
            <span className={`nv-badge ${badge[1]}`}>{badge[0]}</span>
          </div>
          {note && <p role="alert" className="ob-note" style={{ margin: 0, background: note.tone === "red" ? "var(--rsoft)" : "var(--asoft)", color: note.tone === "red" ? "var(--red)" : "var(--amber)" }}>{t(note.text)}</p>}
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
                <span style={{ fontSize: 13, color: "var(--gink)" }}>{t("Name and photo from TikTok Shop")}</span>
              </span>
              <Check size={26} color="var(--gink)" />
            </div>
          ) : waitlist ? (
            <div className="ob-box" style={{ background: "var(--asoft)", color: "var(--amber)" }}>
              <span style={{ fontSize: 34, fontWeight: 900 }}>#{s.position ?? 1}</span>
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontWeight: 800 }}>{t("You're on the waitlist")}</span>
                <span style={{ fontSize: 13 }}>{t("We'll show a \"Link TikTok Shop\" button here as soon as a place frees up.")}</span>
              </span>
            </div>
          ) : (
            <>
              <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6, fontSize: 15, color: "var(--body)", lineHeight: 1.45 }}>
                <li>{t("Turn any TikTok product link into your own affiliate link")}</li>
                <li>{t("Add Marketplace products to your showcase in one tap")}</li>
                <li>{t("Request free samples and track them")}</li>
              </ul>
              {invited && <p className="ob-note" style={{ margin: 0, background: "var(--gsoft)", color: "var(--gink)" }}>{t("A place freed up and it's kept for you. Link your TikTok Shop to take it.")}</p>}
              {s.full ? (
                <>
                  <p className="ob-note" style={{ margin: 0, background: "var(--asoft)", color: "var(--amber)" }}>{t("TikTok lets Rezekii link 25 accounts until it finishes reviewing Rezekii, and all 25 are taken. Join the waitlist and we'll invite you as soon as a place frees up.")}</p>
                  <WaitlistButton />
                </>
              ) : (
                <a href="/api/auth/tiktokshop/start" className="nv-btn nv-press nv-cta ob-big">{t("Link TikTok Shop")}</a>
              )}
            </>
          )}
        </section>

        <section className="nv-up nv-card ob-card" aria-labelledby="ob3" style={{ animationDelay: "140ms", flexDirection: "row", alignItems: "center", flexWrap: "wrap", boxShadow: "var(--shadow2)" }}>
          <span className="ob-ico" style={{ background: "var(--seg)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="m10 8 6 4-6 4z" /><rect x="3" y="4" width="18" height="16" rx="4" /></svg>
          </span>
          <span style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 2 }}>
            <h2 id="ob3" style={{ fontSize: 17 }}>{t("Connect TikTok")} <span style={{ fontWeight: 600, color: "var(--muted)" }}>{t("· optional")}</span></h2>
            <span className="ob-sub">{s.tiktok ? t("Connected · posting and video stats are on") : t("Only needed to schedule posts and see video stats. Must be the same account as your TikTok Shop.")}</span>
          </span>
          {s.tiktok ? <span className="nv-badge b-green">{t("Connected")}</span> : <a href="/api/auth/tiktok/start" className="nv-btn2 nv-press" style={{ textDecoration: "none" }}>{t("Connect TikTok")}</a>}
        </section>

        {(linked || s.status === "rejected") && (
          <section className="nv-up nv-card ob-card ob-result" aria-labelledby="ob4">
            {approved ? (
              <>
                <span style={{ width: 72, height: 72, borderRadius: "50%", background: "#00c073", display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={36} /></span>
                <h2 id="ob4" style={{ fontSize: 22 }}>{t("You're approved")}</h2>
                <span className="ob-sub" style={{ fontSize: 15 }}>{t("The Marketplace, link converter and Product Lookup are ready.")}</span>
                <a href="/app" className="nv-btn nv-press nv-cta" style={{ height: 52, padding: "0 28px", fontSize: 16, textDecoration: "none" }}>{t("Go to Today")}</a>
              </>
            ) : s.status === "rejected" ? (
              <>
                <h2 id="ob4" style={{ fontSize: 20, color: "var(--red)" }}>{t("Not approved this time")}</h2>
                <span style={{ fontSize: 15, color: "var(--body)", maxWidth: 460, lineHeight: 1.5 }}>
                  {s.reason ? <>{reason[0]}{s.reason}{reason[1]}</> : null}{t("Your TikTok Shop link was removed so the place can go to someone else. Link it again to re-apply.")}
                </span>
              </>
            ) : (
              <>
                <span style={{ width: 64, height: 64, display: "flex", alignItems: "center", justifyContent: "center" }}><span className="nv-dot" aria-hidden="true" style={{ width: 18, height: 18 }} /></span>
                <h2 id="ob4" style={{ fontSize: 20 }}>{t("Waiting for Techwide to approve")}</h2>
                <span className="ob-sub" style={{ fontSize: 15, maxWidth: 460, lineHeight: 1.5 }}>{t("We're checking {handle}. This usually takes about one working day. You'll see the result here.", { handle })}</span>
              </>
            )}
          </section>
        )}
      </main>
    </div>
    </LangProvider>
  );
}
