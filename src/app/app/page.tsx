import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "../current-user";
import { Emblem } from "../emblems";
import { SiteFooter, SiteNav } from "../site";
import { TikTokStats } from "./tiktok-stats";

export const metadata: Metadata = { title: "Today · Rezekii" };
export const dynamic = "force-dynamic";

/** First signed-in page. Posting, calendar and the marketplace are added here next. */
export default async function AppHome() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const name = user.display_name || (user.tiktok_username ? `@${user.tiktok_username}` : user.email) || "there";
  return (
    <>
      <SiteNav variant="app" />
      <main className="site-wrap app-main">
        <section className="card app-hello">
          {user.avatar_url ? (
            // TikTok and Google avatars come from many CDN hosts, so a plain img is simpler than whitelisting them all.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt="" width={64} height={64} className="app-avatar" />
          ) : (
            <span className="app-avatar app-avatar-blank" aria-hidden="true">{name.replace("@", "").slice(0, 1).toUpperCase()}</span>
          )}
          <div className="app-who">
            <h1>Welcome, {name}</h1>
            <p>
              {user.role === "admin" ? "Techwide admin" : "Creator"}
              {user.tiktok_username && <> · TikTok @{user.tiktok_username} connected</>}
              {!user.tiktok_username && user.email && <> · {user.email}</>}
            </p>
            {user.tiktok_username && <TikTokStats />}
          </div>
          <form action="/api/auth/signout" method="post">
            <button type="submit" className="btn-outline">Sign out</button>
          </form>
        </section>
        {user.role === "creator" && (
          <section className="card app-level">
            <Emblem level="bronze" size={56} />
            <div>
              <h2>You&apos;re Bronze</h2>
              <p>Every creator starts here. Your sales and samples will show here once posting and campaign products are switched on.</p>
            </div>
          </section>
        )}
        <section className="app-actions" aria-label="What you can do">
          <Link href="/app/marketplace" className="card app-action">
            <span className="ico" style={{ background: "#b45309" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 8h14l-1.2 11H6.2zM9 8a3 3 0 0 1 6 0" /></svg></span>
            <span><strong>TAP Marketplace</strong><small>Techwide campaign products to add to your showcase, with free samples to ask for.</small></span>
          </Link>
          <Link href="/app/new" className="card app-action">
            <span className="ico" style={{ background: "#00874f" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></span>
            <span><strong>New post</strong><small>Upload a video, set the caption and privacy, and post now or pick a time.</small></span>
          </Link>
          <Link href="/app/posts" className="card app-action">
            <span className="ico" style={{ background: "#1d4ed8" }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" /></svg></span>
            <span><strong>My posts</strong><small>Everything scheduled, sending and posted, as a list or a week calendar.</small></span>
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
