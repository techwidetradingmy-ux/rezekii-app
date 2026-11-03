"use client";

import { MyPosts } from "@/components/publish/my-posts";
import { Icon } from "@/components/icons";
import { Title, Loading } from "@/components/ui";
import { CREATOR_POSTS, CREATOR_SETUP } from "@/lib/mock-publish";
import { useLivePosts, useLiveSetup } from "@/lib/live-publish";
import "@/app/publish.css";
import { useT } from "@/lib/i18n/client";
import { NotYet, useCanConnect } from "@/components/not-yet";

/**
 * Content calendar for creators: every post with each app's live status; edit or cancel in place. Signed in, her real posts.
 * Locked until her TikTok account is linked (owner, 1 Nov 2026): the calendar is built around her TikTok posts.
 */
export default function PublishPosts() {
  const t = useT();
  const can = useCanConnect();
  const setup = useLiveSetup(CREATOR_SETUP, "creator");
  const posts = useLivePosts(CREATOR_POSTS);
  if (setup === "wait" || posts === "wait") return <div className="v2-stack v2-in"><Loading text={t("Loading your posts…")} /></div>;
  if (setup === "error" || posts === "error") return <div className="v2-stack v2-in"><p className="v2-muted">{t("Couldn't load your posts. Please refresh.")}</p></div>;
  if (setup.live && !setup.channels.some((c) => c.app === "tiktok" && c.status === "active")) {
    return (
      <div className="v2-stack v2-in" style={{ gap: 18 }}>
        <Title title={t("Content Calendar")} sub={t("Every post and its status · Malaysia time")} />
        <section className="v2-card sq-lock">
          <span className="badge badge-amber"><Icon name="lock" size={13} /> {t("Link TikTok First")}</span>
          <h2 className="v2-h2">{t("Sign In With Your TikTok Account")}</h2>
          <p className="v2-small">{t("Your calendar shows every video you post and its status, so it needs your TikTok account. Link it once and your posts show here.")}</p>
          {can("tiktok") ? <a href="/api/auth/tiktok/start?next=/app/publish/calendar" className="np-btn v2-btn-sm"><Icon name="link" size={15} /> {t("Link TikTok Account")}</a> : <NotYet app="tiktok" />}
        </section>
      </div>
    );
  }
  return <MyPosts key={setup.live ?? "sample"} setup={setup} posts={posts} newPost="/app/publish" />;
}
