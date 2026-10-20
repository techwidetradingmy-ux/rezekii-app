import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { myPostsData } from "@/modules/posting/my-posts.ts";
import { canUseSocial } from "@/modules/social/access.ts";
import { boardPosts } from "@/modules/social/board.ts";
import { listBrands } from "@/modules/social/brands.ts";
import { currentUser } from "../../current-user";
import { Board } from "./board";
import { PostsView } from "./posts-view";

export const metadata: Metadata = { title: "My posts · Rezekii" };
export const dynamic = "force-dynamic";

/** My posts. Admins see All channels: TikTok, Facebook, Instagram and Threads together, each channel with its own status. */
export default async function MyPostsPage() {
  const user = await currentUser();
  if (!user) redirect("/signin");
  if (canUseSocial(user)) {
    const [board, brands] = await Promise.all([boardPosts(user.id), listBrands(user.id).catch(() => [])]);
    return (
      <main className="site-wrap app-main">
        <nav className="app-crumbs" aria-label="Breadcrumb"><Link href="/app/admin">Today</Link><span aria-hidden="true">›</span><span>All channels</span></nav>
        <h1>All channels</h1>
        <Board posts={board.posts} now={board.now} brands={brands} />
      </main>
    );
  }
  const data = await myPostsData(user.id);
  return (
    <>
      <main className="site-wrap app-main">
        <nav className="app-crumbs" aria-label="Breadcrumb"><Link href="/app">Today</Link><span aria-hidden="true">›</span><span>My posts</span></nav>
        <h1>My posts</h1>
        <PostsView initialPosts={data.posts} initialStats={data.stats} now={data.now} />
      </main>
    </>
  );
}
