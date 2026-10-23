import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLang, tFor } from "@/lib/i18n/server.ts";
import { userTikTokAccounts } from "@/modules/posting/store.ts";
import { listAccounts } from "@/modules/social/accounts.ts";
import { canUseSocial } from "@/modules/social/access.ts";
import { lastPostChannels, listBrands } from "@/modules/social/brands.ts";
import { loadRecipe } from "@/modules/social/recipes.ts";
import { currentUser } from "../../current-user";
import { loadEdit } from "@/modules/posting/edit.ts";
import { adminView } from "../../view";
import { Composer } from "./composer";
import { NewPostForm } from "./new-post-form";

export const metadata: Metadata = { title: "New post · Rezekii" };
export const dynamic = "force-dynamic";

/**
 * New post. Admins get Facebook, Instagram and Threads next to TikTok, picked by brand (?channel=&connect= reports a connection
 * result). ?edit=<post>: the scheduled post, filled in to change; saving replaces it.
 */
export default async function NewPostPage({ searchParams }: { searchParams: Promise<{ channel?: string; connect?: string; reuse?: string; edit?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const t = tFor(await getLang());
  const tiktok = await userTikTokAccounts(user.id);
  const accounts = tiktok.map((a) => ({ open_id: a.open_id, username: a.username }));
  const social = canUseSocial(user);
  const q = await searchParams;
  const [channels, brands, last] = social ? await Promise.all([listAccounts(user.id).catch(() => []), listBrands(user.id).catch(() => []), lastPostChannels(user.id).catch(() => [])]) : [[], [], []];
  // ?reuse=<post>: New post starts filled in from that post (M7).
  const reuse = social && q.reuse && !q.edit ? await loadRecipe(user.id, q.reuse).catch(() => null) : null;
  const edit = q.edit ? await loadEdit(user.id, q.edit).catch(() => null) : null;
  return (
    <>
      <main className={`site-wrap app-main ${social ? "" : "app-narrow"}`}>
        <nav className="app-crumbs" aria-label={t("Breadcrumb")}><Link href={(await adminView(user)) ? "/app/admin" : "/app"}>{t("Today")}</Link><span aria-hidden="true">›</span><span>{t("New post")}</span></nav>
        <h1>{q.edit ? t("Edit post") : t("New post")}</h1>
        {q.edit && !edit ? (
          <section className="card">
            <h2>{t("This post can't be edited any more")}</h2>
            <p>{t("It has started sending or has gone out. Posts already on TikTok can only be edited or deleted in the TikTok app.")}</p>
            <Link href="/app/posts" className="np-btn">{t("Back to my posts")}</Link>
          </section>
        ) : social ? (
          <Composer tiktok={tiktok} social={channels} brands={brands} last={last} reuse={edit?.recipe ? { recipe: edit.recipe, at: null } : reuse} edit={edit} connect={q.channel && q.connect ? { channel: q.channel, result: q.connect } : null} />
        ) : accounts.length ? (
          <NewPostForm accounts={accounts} edit={edit} />
        ) : (
          <section className="card">
            <h2>{t("Connect TikTok first")}</h2>
            <p>{t("Rezekii posts to your own TikTok account. Sign in with TikTok to connect it.")}</p>
            <Link href="/api/auth/tiktok/start" className="np-btn">{t("Continue with TikTok")}</Link>
          </section>
        )}
      </main>
    </>
  );
}
