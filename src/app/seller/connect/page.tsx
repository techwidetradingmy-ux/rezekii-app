"use client";

import "@/app/seller.css";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { ConsentSheet } from "@/components/consent";
import { DemoStrip } from "@/components/shell";
import { Celebrate, Sheet } from "@/components/ui";
import { PhoneField, TermsSheet } from "@/components/seller/seller-ui";
import { SELLER, TERMS_VERSION, tidyPhone } from "@/lib/mock-seller";

const STEPS = ["Sign in", "Connect Seller Center", "Confirm your shop", "Contact details", "Sample terms"];

function TikTokGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.7 5.7 0 1 0 4.9 5.7V9.1a7.3 7.3 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.2-1.6z" fill="#ffffff" />
    </svg>
  );
}
function GoogleGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** Seller onboarding: sign in → Connect Seller Center (required) → confirm the shop → contact → sample terms → dashboard. */
export default function SellerConnect() {
  const router = useRouter();
  const { toast, setLinked, recordConsent } = useDemo();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [via, setVia] = useState("Google");
  // email code
  const [mail, setMail] = useState<"idle" | "email" | "code">("idle");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [mailErr, setMailErr] = useState<string | null>(null);
  // Seller Center
  const [auth, setAuth] = useState(false);
  const [consent, setConsent] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  // contact
  const [name, setName] = useState(SELLER.contact);
  const [phone, setPhone] = useState({ dial: "60", raw: "" });
  const [wa, setWa] = useState(true);
  const [tried, setTried] = useState(false);
  // terms
  const [agreed, setAgreed] = useState(false);
  const [terms, setTerms] = useState(false);
  const [done, setDone] = useState(false);

  const go = (n: number) => { setStep(n); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const wait = (key: string, then: () => void, ms = 900) => { setBusy(key); window.setTimeout(() => { setBusy(null); then(); }, ms); };

  const signIn = (provider: string) => wait(provider, () => { setVia(provider); go(1); });
  const sendCode = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setMailErr("Enter a valid email address");
    setMailErr(null);
    wait("send", () => { setMail("code"); toast(`Code sent to ${email.trim()}`); }, 700);
  };
  const verify = () => {
    if (!/^\d{6}$/.test(code)) return setMailErr("Enter the 6 digits from the email");
    setMailErr(null);
    wait("verify", () => { setVia("email"); go(1); }, 700);
  };
  const authorise = () => wait("auth", () => { setAuth(false); setCancelled(false); setLinked(true); go(2); }, 1100);
  const cancelAuth = () => { setAuth(false); setCancelled(true); };
  const ph = tidyPhone(phone.raw, phone.dial);
  const contactOk = name.trim().length > 1 && ph.ok;

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
        <div className="sl-ob-steps" aria-label="Progress">
          <div><span>Step {step + 1} of {STEPS.length} · {STEPS[step]}</span>{step > 0 && <span>Progress saved</span>}</div>
          <div className="v2-steps">{STEPS.map((s, k) => <i key={s} className={k <= step ? "on" : ""} />)}</div>
        </div>

        <section className="sl-ob-card" key={step}>
          {step > 0 && (
            <button type="button" className="v2-link" style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14 }} onClick={() => go(step - 1)}>
              <Icon name="back" size={16} /> Back
            </button>
          )}

          {step === 0 && (
            <>
              <h1>Create your seller account</h1>
              <p>Sign in first, then connect your TikTok Shop. About 3 minutes in all.</p>
              <div className="sl-from"><Icon name="qr" size={18} /> You came from: KL Seller Expo · Aina from Techwide</div>
              <button type="button" className="btn-tiktok sl-ob-btn" style={{ border: 0, font: "inherit", fontWeight: 800, cursor: "pointer" }} onClick={() => signIn("TikTok")} disabled={!!busy}>
                {busy === "TikTok" ? <span className="sl-spin" /> : <TikTokGlyph />} Continue with TikTok
              </button>
              <button type="button" className="btn-google sl-ob-btn" style={{ font: "inherit", fontWeight: 600, cursor: "pointer" }} onClick={() => signIn("Google")} disabled={!!busy}>
                {busy === "Google" ? <span className="sl-spin" /> : <GoogleGlyph />} Continue with Google
              </button>
              <div className="sl-ob-or">or</div>
              {mail === "idle" ? (
                <button type="button" className="btn-email sl-ob-btn" onClick={() => setMail("email")}><Icon name="inbox" size={20} /> Continue with email</button>
              ) : (
                <div className="email-signin">
                  {mail === "email" ? (
                    <>
                      <label>Work email
                        <input className="np-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourshop.com" onKeyDown={(e) => e.key === "Enter" && sendCode()} autoFocus />
                      </label>
                      <button type="button" className="np-btn" onClick={sendCode} disabled={!!busy}>{busy === "send" ? <span className="sl-spin" /> : null} Send 6-digit code</button>
                    </>
                  ) : (
                    <>
                      <label>Code from your email <small>Sent to {email.trim()} · any 6 digits work in this preview</small>
                        <input className="np-input sl-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" onKeyDown={(e) => e.key === "Enter" && verify()} autoFocus />
                      </label>
                      <button type="button" className="np-btn" onClick={verify} disabled={!!busy}>{busy === "verify" ? <span className="sl-spin" /> : null} Verify and continue</button>
                      <div className="v2-row" style={{ justifyContent: "space-between" }}>
                        <button type="button" className="v2-link" style={{ fontSize: 14 }} onClick={() => { setMail("email"); setCode(""); }}>Change email</button>
                        <button type="button" className="v2-link" style={{ fontSize: 14 }} onClick={() => toast("New code sent")}>Resend code</button>
                      </div>
                    </>
                  )}
                  {mailErr && <p className="sl-err"><Icon name="alert" size={16} /> {mailErr}</p>}
                </div>
              )}
              <p className="v2-small" style={{ margin: 0 }}>Already have an account? Sign in the same way and you&apos;ll come back to this step.</p>
            </>
          )}

          {step === 1 && (
            <>
              <span className="badge badge-amber" style={{ alignSelf: "flex-start" }}>Required</span>
              <h1>Connect your Seller Center</h1>
              <p>You need this to enter the seller dashboard. It lets us read your products, and it keeps Rezekii for real TikTok Shop sellers.</p>
              {cancelled && (
                <div className="v2-alert">
                  <span>You cancelled, so your shop isn&apos;t connected yet. Your progress is saved; try again when you&apos;re ready.</span>
                  <button type="button" onClick={() => setAuth(true)}>Try again</button>
                </div>
              )}
              <ul className="sl-list">
                <li><Icon name="check" size={18} width={2.6} stroke="#00a862" /> We read your shop, products, prices and sales, so you never type them in.</li>
                <li><Icon name="check" size={18} width={2.6} stroke="#00a862" /> We only add a product to TAP when you submit it.</li>
                <li><Icon name="shield" size={18} stroke="#00a862" /> We never change your prices or handle your orders.</li>
              </ul>
              <button type="button" className="btn-tiktok sl-ob-btn" style={{ border: 0, font: "inherit", fontWeight: 800, cursor: "pointer" }} onClick={() => setConsent(true)}>
                <TikTokGlyph /> Connect TikTok Shop Seller Center
              </button>
              <p className="v2-small" style={{ margin: 0 }}>Signed in with {via} · Malaysian TikTok Shops only</p>
            </>
          )}

          {step === 2 && (
            <>
              <h1>Is this your shop?</h1>
              <p>We found this shop on the Seller Center account you connected.</p>
              <div className="sl-shop">
                <span className="sl-shop-ico">SL</span>
                <span>
                  <b style={{ fontSize: 17 }}>{SELLER.shop}</b>
                  <small>{SELLER.country} · {SELLER.state} · Home &amp; Kitchen</small>
                  <small>11 products · connected just now</small>
                </span>
                <span className="v2-ok" style={{ width: 26, height: 26 }}><Icon name="check" size={15} width={3} /></span>
              </div>
              <p className="v2-small" style={{ margin: 0, display: "flex", gap: 8 }}><Icon name="lock" size={16} /> One account = one shop. To manage another shop, sign up again with a different login.</p>
              <button type="button" className="np-btn sl-ob-btn" onClick={() => go(3)}>Yes, this is my shop</button>
              <button type="button" className="btn-outline" style={{ height: 48 }} onClick={() => { go(1); toast("Sign in to the right Seller Center account, then connect again"); }}>No, connect a different shop</button>
            </>
          )}

          {step === 3 && (
            <>
              <h1>Who should we talk to?</h1>
              <p>Our team uses this to reach you about your products and samples. We never share it with creators.</p>
              <label className="v2-field">Contact name
                <input className="np-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="e.g. Mei Ling Tan" />
                {tried && name.trim().length < 2 && <span className="sl-err"><Icon name="alert" size={16} /> Enter a contact name</span>}
              </label>
              <PhoneField dial={phone.dial} raw={phone.raw} onChange={(dial, raw) => setPhone({ dial, raw })} showError={tried} />
              <div className="np-switchrow">
                <span><b>Updates on WhatsApp</b><small>Product approvals and late samples. You can change this later.</small></span>
                <button type="button" className={`np-switch ${wa ? "on" : ""}`} aria-pressed={wa} aria-label="Updates on WhatsApp" onClick={() => setWa(!wa)}><span /></button>
              </div>
              <button type="button" className="np-btn sl-ob-btn" onClick={() => { setTried(true); if (contactOk) go(4); }}>Continue</button>
            </>
          )}

          {step === 4 && (
            <>
              <h1>Last step: how samples work</h1>
              <p>Agree to the sample allocation terms once. If they ever change, we&apos;ll ask you again.</p>
              <ul className="sl-list sl-terms-sum">
                <li><Icon name="users" size={18} stroke="var(--gink)" /> Techwide decides who gets each sample. Your creator conditions are a reference.</li>
                <li><Icon name="box" size={18} stroke="var(--gink)" /> Samples can&apos;t be taken back once they&apos;re sent.</li>
                <li><Icon name="alert" size={18} stroke="var(--gink)" /> We don&apos;t control creators, so we can&apos;t promise posting dates, reach or sales.</li>
                <li><Icon name="shield" size={18} stroke="var(--gink)" /> Creators who don&apos;t deliver can be frozen or banned.</li>
              </ul>
              <button type="button" className="v2-link" style={{ alignSelf: "flex-start", display: "inline-flex", gap: 6, alignItems: "center" }} onClick={() => setTerms(true)}><Icon name="doc" size={18} /> Read the terms (11 points)</button>
              <label className="v2-check">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <span>I agree to the sample allocation terms ({TERMS_VERSION})</span>
              </label>
              <button type="button" className="np-btn sl-ob-btn" disabled={!agreed} onClick={() => setDone(true)}>Agree and open my dashboard</button>
            </>
          )}
        </section>

        <p className="v2-small" style={{ margin: 0, textAlign: "center" }}>
          Stuck? WhatsApp us at +60 3-2789 4410 · {step > 0 && <button type="button" className="v2-link" style={{ fontSize: 13 }} onClick={() => { go(0); setMail("idle"); setCancelled(false); setAgreed(false); }}>Start over</button>}
        </p>
      </main>

      {auth && (
        <Sheet title="Authorise on TikTok" onClose={cancelAuth}>
          <div className="sl-tt">
            <div className="sl-tt-h"><span className="sl-tt-logo"><TikTokGlyph size={16} /></span> TikTok Shop · Seller Center</div>
            <div className="sl-tt-b">
              <p><b style={{ color: "var(--text)" }}>Rezekii</b> (Techwide Marketing Sdn Bhd, TikTok Shop Partner) wants to connect to your shop.</p>
              <div className="sl-shop" style={{ borderWidth: 1.5, padding: 12 }}>
                <span className="sl-shop-ico" style={{ width: 40, height: 40, fontSize: 14, borderRadius: 12 }}>SL</span>
                <span><b>{SELLER.shop}</b><small>Malaysia · Seller ID 7493 0281 55</small></span>
              </div>
              <ul className="sl-list">
                <li><Icon name="eye" size={18} /> See your shop and product information</li>
                <li><Icon name="chart" size={18} /> See orders and sales for products in TAP</li>
                <li><Icon name="tag" size={18} /> Manage the affiliate campaigns you submit</li>
              </ul>
              <div className="sl-tt-acts">
                <button type="button" className="sl-tt-no" onClick={cancelAuth}>Cancel</button>
                <button type="button" className="sl-tt-ok" onClick={authorise} disabled={!!busy} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {busy === "auth" ? <><span className="sl-spin" /> Connecting…</> : "Authorise"}
                </button>
              </div>
              <small className="v2-small">You can remove access any time in Seller Center.</small>
            </div>
          </div>
        </Sheet>
      )}
      {consent && (
        <ConsentSheet role="seller" onClose={() => setConsent(false)} onAgree={() => { recordConsent("seller"); setConsent(false); setAuth(true); }} />
      )}
      {terms && <TermsSheet onClose={() => setTerms(false)} />}
      {done && (
        <Celebrate
          title="You're in"
          line={`${SELLER.shop} is connected`}
          cheer="Next: pick products and submit. It takes about a minute."
          icon="check"
          tone="green"
          onClose={() => router.push("/seller/app")}
        />
      )}
    </div>
  );
}
