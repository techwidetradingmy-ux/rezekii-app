"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang, useT } from "@/lib/i18n/client.tsx";
import { dateLocale, tx } from "@/lib/i18n/lang.ts";
import type { PostDetails as Details } from "@/modules/posting/edit.ts";
import { REPLY_CONTROLS } from "@/modules/social/settings.ts";
import { BrandIcon } from "../brand-icons";

const PRIVACY: Record<string, string> = { PUBLIC_TO_EVERYONE: tx("Everyone"), MUTUAL_FOLLOW_FRIENDS: tx("Friends (followers you follow back)"), FOLLOWER_OF_CREATOR: tx("Followers"), SELF_ONLY: tx("Only me") };
const REPLIES = Object.fromEntries(REPLY_CONTROLS);

/**
 * Details (owner, 23 Oct 2026): everything a post was scheduled with, for every channel, with Edit while it can still be
 * changed. Loads when opened.
 */
export function PostDetails({ postKey }: { postKey: string }) {
  const t = useT();
  const lang = useLang();
  const [d, setD] = useState<Details | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    fetch(`/api/posts/details?key=${encodeURIComponent(postKey)}`, { cache: "no-store" })
      .then(async (r) => ({ ok: r.ok, body: (await r.json()) as Details & { error?: string } }))
      .then(({ ok, body }) => live && (ok ? setD(body) : setError(body.error ?? tx("Couldn't load the details."))))
      .catch(() => live && setError(tx("Couldn't load the details.")));
    return () => { live = false; };
  }, [postKey]);
  if (error) return <p className="np-error" role="alert">{t(error)}</p>;
  if (!d) return <p className="np-muted">{t("Loading the details…")}</p>;

  const when = d.at ? new Date(d.at).toLocaleString(dateLocale(lang), { timeZone: "Asia/Kuala_Lumpur", weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }) : t("No time yet (draft)");
  const yes = (on: boolean) => (on ? t("Yes") : t("No"));
  const tt = d.tiktok;
  const allowed = tt ? [tt.allowComments && t("Comment"), tt.allowDuet && t("Duet"), tt.allowStitch && t("Stitch")].filter(Boolean).join(", ") || t("None") : "";
  const disclosure = tt ? [tt.brandOrganic && t("Your brand"), tt.brandedContent && t("Branded content")].filter(Boolean).join(", ") || t("None") : "";
  const settingsOf = (c: Details["channels"][number]): [string, string][] => {
    const s = c.settings as Record<string, unknown>;
    if (c.platform === "facebook") return s.draft ? [[t("Facebook"), t("Saved as a draft on the Page")]] : [];
    if (c.platform === "instagram")
      return [
        [t("Show in the feed"), yes(s.feed !== false)],
        ...(Array.isArray(s.collaborators) && s.collaborators.length ? [[t("Collaborators"), (s.collaborators as string[]).map((u) => `@${u}`).join(", ")] as [string, string]] : []),
        ...(Array.isArray(s.tags) && s.tags.length ? [[t("Tagged accounts"), (s.tags as string[]).map((u) => `@${u}`).join(", ")] as [string, string]] : []),
        ...(s.trial && s.trial !== "off" ? [[t("Trial reel"), s.trial === "auto" ? t("Share to followers if it does well") : t("Share to followers yourself")] as [string, string]] : []),
      ];
    return [[t("Who can reply"), t(REPLIES[String(s.replies)] ?? tx("Everyone"))], ...(s.topic ? [[t("Topic"), String(s.topic)] as [string, string]] : [])];
  };
  const line = (k: string, v: string) => <div key={k} className="pd-ln"><dt>{k}</dt><dd>{v}</dd></div>;

  return (
    <div className="pd">
      <div className="pd-top">
        {d.video.url ? <video className="pd-video" src={d.video.url} controls playsInline preload="metadata" aria-label={t("The post's video")} /> : <p className="np-muted">{t("The video isn't kept after it goes out.")}</p>}
        <dl className="pd-list">
          {line(t("When"), when)}
          {d.video.durationSec ? line(t("Length"), `${Math.floor(d.video.durationSec / 60)}:${String(d.video.durationSec % 60).padStart(2, "0")}`) : null}
        </dl>
      </div>
      {tt && (
        <section className="pd-ch">
          <h4><BrandIcon ch="tiktok" size={20} />TikTok {tt.account ?? ""}</h4>
          <dl className="pd-list">
            {line(t("Where"), tt.mode === "inbox" ? t("To TikTok drafts") : t("Post to TikTok"))}
            {tt.mode === "direct" && (
              <>
                {line(t("Caption"), tt.caption || t("No caption"))}
                {line(t("Who can view this post"), tt.privacy ? t(PRIVACY[tt.privacy] ?? tt.privacy) : t("privacy not set"))}
                {line(t("Allow viewers to"), allowed)}
                {line(t("Disclose promotional content"), disclosure)}
                {line(t("AI-generated content"), yes(tt.isAigc))}
              </>
            )}
          </dl>
        </section>
      )}
      {d.channels.map((c) => (
        <section key={c.id} className="pd-ch">
          <h4><BrandIcon ch={c.platform} size={20} />{c.name}</h4>
          <dl className="pd-list">
            {line(t("Caption"), c.caption || t("No caption"))}
            {c.firstComment ? line(t("First comment"), c.firstComment) : null}
            {settingsOf(c).map(([k, v]) => line(k, v))}
          </dl>
          {c.commentImage && (
            // A signed storage link, so a plain img.
            // eslint-disable-next-line @next/next/no-img-element
            <img className="pd-img" src={c.commentImage} alt={t("Image under the first comment")} />
          )}
        </section>
      ))}
      {d.editable ? (
        <div className="pd-acts"><Link href={`/app/new?edit=${encodeURIComponent(d.key)}`} className="np-btn">{t("Edit")}</Link><small className="np-muted">{t("Change anything until it starts sending.")}</small></div>
      ) : (
        <p className="np-muted">{t("It has started sending or has gone out, so it can't be edited here.")}</p>
      )}
    </div>
  );
}
