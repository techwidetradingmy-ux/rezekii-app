"use client";

import { MyPosts } from "@/components/publish/my-posts";
import { Icon } from "@/components/icons";
import { Title } from "@/components/ui";
import { CREATOR_POSTS, CREATOR_SETUP } from "@/lib/mock-publish";
import { useLivePosts, useLiveSetup } from "@/lib/live-publish";
import "@/app/publish.css";

/**
 * Content calendar for creators: every post with each app's live status; edit or cancel in place. Signed in, her real posts.
 * Locked until her TikTok account is linked (owner, 1 Nov 2026): the calendar is built around her TikTok posts.
 */
export default function PublishPosts() {
  const setup = useLiveSetup(CREATOR_SETUP, "creator");
  const posts = useLivePosts(CREATOR_POSTS);
  if (setup === "wait" || posts === "wait") return <div className="v2-stack v2-in"><p className="v2-muted">Loading your posts…</p></div>;
  if (setup === "error" || posts === "error") return <div className="v2-stack v2-in"><p className="v2-muted">Couldn&apos;t load your posts. Please refresh.</p></div>;
  if (setup.live && !setup.channels.some((c) => c.app === "tiktok" && c.status === "active")) {
    return (
      <div className="v2-stack v2-in" style={{ gap: 18 }}>
        <Title title="Content Calendar" sub="Every post and its status · Malaysia time" />
        <section className="v2-card sq-lock">
          <span className="badge badge-amber"><Icon name="lock" size={13} /> Link TikTok First</span>
          <h2 className="v2-h2">Sign In With Your TikTok Account</h2>
          <p className="v2-small">Your calendar shows every video you post and its status, so it needs your TikTok account. Link it once and your posts show here.</p>
          <a href="/api/auth/tiktok/start?next=/app/publish/calendar" className="np-btn v2-btn-sm"><Icon name="link" size={15} /> Link TikTok Account</a>
        </section>
      </div>
    );
  }
  return <MyPosts key={setup.live ?? "sample"} setup={setup} posts={posts} newPost="/app/publish" />;
}
