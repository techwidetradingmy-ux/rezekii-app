import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { userTikTokAccounts } from "@/modules/posting/store.ts";
import { listAccounts } from "@/modules/social/accounts.ts";
import { canUseSocial } from "@/modules/social/access.ts";
import { lastPostChannels, listBrands } from "@/modules/social/brands.ts";
import { recentMentions } from "@/modules/social/store.ts";
import { currentUser } from "../../current-user";
import { Composer } from "./composer";
import { NewPostForm } from "./new-post-form";

export const metadata: Metadata = { title: "New post · Rezekii" };
export const dynamic = "force-dynamic";

/** New post. Admins get Facebook, Instagram and Threads next to TikTok, picked by brand (?channel=&connect= reports a connection result). */
export default async function NewPostPage({ searchParams }: { searchParams: Promise<{ channel?: string; connect?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const tiktok = await userTikTokAccounts(user.id);
  const accounts = tiktok.map((a) => ({ open_id: a.open_id, username: a.username }));
  const social = canUseSocial(user);
  const q = await searchParams;
  const [channels, brands, last, mentioned] = social ? await Promise.all([listAccounts(user.id).catch(() => []), listBrands(user.id).catch(() => []), lastPostChannels(user.id).catch(() => []), recentMentions(user.id).catch(() => [])]) : [[], [], [], []];
  return (
    <>
      <main className={`site-wrap app-main ${social ? "" : "app-narrow"}`}>
        <nav className="app-crumbs" aria-label="Breadcrumb"><Link href={user.role === "admin" ? "/app/admin" : "/app"}>Today</Link><span aria-hidden="true">›</span><span>New post</span></nav>
        <h1>New post</h1>
        {social ? (
          <Composer tiktok={tiktok} social={channels} brands={brands} last={last} mentioned={mentioned} connect={q.channel && q.connect ? { channel: q.channel, result: q.connect } : null} />
        ) : accounts.length ? (
          <NewPostForm accounts={accounts} />
        ) : (
          <section className="card">
            <h2>Connect TikTok first</h2>
            <p>Rezekii posts to your own TikTok account. Sign in with TikTok to connect it.</p>
            <Link href="/api/auth/tiktok/start" className="np-btn">Continue with TikTok</Link>
          </section>
        )}
      </main>
    </>
  );
}
