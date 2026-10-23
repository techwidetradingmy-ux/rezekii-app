import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLang, tFor } from "@/lib/i18n/server.ts";
import { myPostsData } from "@/modules/posting/my-posts.ts";
import { listAccounts } from "@/modules/social/accounts.ts";
import { boardPosts } from "@/modules/social/board.ts";
import { listBrands } from "@/modules/social/brands.ts";
import { currentUser } from "../../current-user";
import { Board } from "./board";
import { PostsView } from "./posts-view";

export const metadata: Metadata = { title: "My posts · Rezekii" };
export const dynamic = "force-dynamic";

/**
 * My posts. Admins, and creators once they have connected Facebook, Instagram or Threads, see every channel together, each
 * with its own status; other creators keep the TikTok list with its views and likes.
 */
export default async function MyPostsPage() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const lang = await getLang();
  const t = tFor(lang);
  const admin = user.role === "admin";
  if (admin || (await listAccounts(user.id).catch(() => [])).length) {
    const [board, brands] = await Promise.all([boardPosts(user.id, lang), listBrands(user.id).catch(() => [])]);
    const title = admin ? t("All channels") : t("My posts");
    return (
      <main className="site-wrap app-main">
        <nav className="app-crumbs" aria-label={t("Breadcrumb")}><Link href={admin ? "/app/admin" : "/app"}>{t("Today")}</Link><span aria-hidden="true">›</span><span>{title}</span></nav>
        <h1>{title}</h1>
        <Board posts={board.posts} now={board.now} brands={brands} />
      </main>
    );
  }
  const data = await myPostsData(user.id);
  return (
    <>
      <main className="site-wrap app-main">
        <nav className="app-crumbs" aria-label={t("Breadcrumb")}><Link href="/app">{t("Today")}</Link><span aria-hidden="true">›</span><span>{t("My posts")}</span></nav>
        <h1>{t("My posts")}</h1>
        <PostsView initialPosts={data.posts} initialStats={data.stats} now={data.now} />
      </main>
    </>
  );
}
