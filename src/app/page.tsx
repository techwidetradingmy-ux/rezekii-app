import Image from "next/image";
import Link from "next/link";
import { Emblem } from "./emblems";
import { COMPANY, SUPPORT_EMAIL, SiteFooter, SiteNav, TikTokLogo } from "./site";

export default function Home() {
  return (
    <>
      <header className="site-hero">
        <SiteNav variant="hero" />
        <div className="site-wrap hero-grid">
          <div className="hero-copy">
            <span className="hero-eyebrow">FOR TIKTOK SHOP CREATORS IN MALAYSIA</span>
            <h1>Post on schedule. See what sells. Level up.</h1>
            <p>
              Rezekii lets you upload a video, write the caption and pick a time. It posts to your own TikTok account when you choose, then
              shows you how your posts perform. Promote products from Techwide&apos;s TikTok Shop campaigns and grow from Bronze to Gold for
              better commission.
            </p>
            <div className="hero-ctas">
              <Link href="/signin" className="btn-tiktok">
                <TikTokLogo />
                Continue with TikTok
              </Link>
              <a href="#features" className="btn-ghost">
                See how it works
              </a>
            </div>
            <span className="hero-note">Free for creators. Run by {COMPANY}, a TikTok Shop partner agency in Malaysia.</span>
          </div>
          <div className="hero-card-wrap" aria-label="Example of a scheduled post">
            <div className="hero-card">
              <p className="cap">Next post · example</p>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Image src="/examples/kacip.webp" alt="" width={64} height={86} style={{ borderRadius: 12, objectFit: "cover" }} />
                <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
                  <strong>Kacip Fatimah: 3 tanda hormon wanita 40+</strong>
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>Posting as Tina Wellness</span>
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, borderRadius: 14, background: "var(--gsoft)" }}>
                <strong style={{ color: "var(--gink)" }}>Sun 15 Oct · 8:00 PM</strong>
                <span className="badge">Scheduled</span>
              </div>
              <div className="stat3">
                <span><b>12.4k</b><small>views</small></span>
                <span><b>38</b><small>orders</small></span>
                <span><b>RM1.2k</b><small>sales</small></span>
              </div>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Example figures for illustration.</span>
            </div>
          </div>
        </div>
      </header>

      <main className="site-wrap site-main">
        <section id="features" className="section" aria-labelledby="h-features">
          <div className="sec-head">
            <h2 id="h-features">Everything for your TikTok Shop content, in one place</h2>
            <p>Built for creators who post every day and want to know which videos actually sell.</p>
          </div>
          <ul className="grid3">
            <li className="card">
              <span className="ico" style={{ background: "var(--gsoft)", color: "var(--gink)" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
              </span>
              <h3>Schedule your posts</h3>
              <p>Upload a video or photos, write your caption, and choose when it goes live. Rezekii posts it to your TikTok account at that time, or sends it to your TikTok drafts so you can finish it in the app.</p>
            </li>
            <li className="card">
              <span className="ico" style={{ background: "var(--bsoft)", color: "var(--blue)" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
              </span>
              <h3>See how each post does</h3>
              <p>Views and likes for your videos, plus orders and sales from Techwide&apos;s TikTok Shop campaigns. Look back by day, week, month or any range.</p>
            </li>
            <li className="card">
              <span className="ico" style={{ background: "var(--asoft)", color: "var(--amber)" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>
              </span>
              <h3>Campaign products and samples</h3>
              <p>Browse products in Techwide&apos;s TikTok Shop campaigns, get your link at your level&apos;s commission, and request free samples.</p>
            </li>
          </ul>
        </section>

        <section className="section" aria-labelledby="h-how">
          <h2 id="h-how">How it works</h2>
          <ol className="grid3">
            <li className="card step"><span className="step-n">1</span><span><strong>Continue with TikTok</strong>Sign in with your TikTok account and allow Rezekii to post for you. You can remove access at any time.</span></li>
            <li className="card step"><span className="step-n">2</span><span><strong>Upload and schedule</strong>Add your video, caption and settings, check the preview, and pick a time or post now.</span></li>
            <li className="card step"><span className="step-n">3</span><span><strong>Track and level up</strong>Follow each post from processing to live, see your results, and move up the creator levels.</span></li>
          </ol>
        </section>

        <section id="levels" className="section" aria-labelledby="h-levels">
          <div className="sec-head">
            <h2 id="h-levels">Rezekii creator levels</h2>
            <p>Your level sets the commission you get on Techwide&apos;s TikTok Shop campaign links.</p>
          </div>
          <ul className="grid3">
            <li className="card"><Emblem level="bronze" /><h3>Bronze</h3><p>Every creator starts here. Get Open Plan commission on campaign links and request free samples.</p></li>
            <li className="card"><Emblem level="silver" /><h3>Silver</h3><p>Reach RM1,000 in sales and deliver videos for 10 samples to unlock Open Plan + 1%. Keep it with RM1,000 in sales each month.</p></li>
            <li className="card"><Emblem level="gold" /><h3>Gold</h3><p>By invitation for our top creators, with special commission rates.</p></li>
          </ul>
        </section>

        <section id="control" className="card control" aria-labelledby="h-control">
          <div>
            <h2 id="h-control">You stay in control of your TikTok</h2>
            <p style={{ margin: 0, color: "var(--body)", fontSize: 17, lineHeight: 1.6 }}>Rezekii only posts what you choose, when you choose.</p>
          </div>
          <ul>
            <li><span className="dot" />You see a preview and choose who can view each post before anything is sent to TikTok.</li>
            <li><span className="dot" />We never add watermarks, logos or text to your videos.</li>
            <li><span className="dot" />You can cancel a scheduled post any time before it goes out.</li>
            <li><span className="dot" />Disconnect TikTok in Settings, or in the TikTok app under Settings and privacy, Security, Manage app permissions.</li>
          </ul>
        </section>

        <section className="about" aria-labelledby="h-about">
          <h2 id="h-about">About Rezekii</h2>
          <p>
            Rezekii is built and run by {COMPANY}, a TikTok Shop partner agency in Malaysia that runs affiliate campaigns with sellers and
            creators. Questions? Email {SUPPORT_EMAIL}.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
