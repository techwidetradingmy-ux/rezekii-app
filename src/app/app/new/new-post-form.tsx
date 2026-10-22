"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CreatorInfo, PrivacyLevel } from "@/integrations/tiktok/posting.ts";
import { useLang, useT } from "@/lib/i18n/client.tsx";
import { dateLocale, tx, type Lang } from "@/lib/i18n/lang.ts";
import { CAPTION_MAX, consentLine, postProblems, type PostChoice } from "@/modules/posting/rules.ts";

type Info = CreatorInfo & { nextRecommended: string };
type When = "now" | "recommended" | "pick" | "draft";

const PRIVACY_LABEL: Record<PrivacyLevel, string> = {
  PUBLIC_TO_EVERYONE: tx("Everyone"),
  MUTUAL_FOLLOW_FRIENDS: tx("Friends (followers you follow back)"),
  FOLLOWER_OF_CREATOR: tx("Followers"),
  SELF_ONLY: tx("Only me"),
};
const myt = (iso: string, lang: Lang) => new Date(iso).toLocaleString(dateLocale(lang), { timeZone: "Asia/Kuala_Lumpur", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

export type PostAccount = { open_id: string; username: string | null };

/**
 * New post: TikTok's Content Sharing Guidelines, step by step, for the creator's own TikTok account. Admins with several
 * Techwide team accounts pick which one to post to first.
 */
export function NewPostForm({ accounts }: { accounts: PostAccount[] }) {
  const t = useT();
  const lang = useLang();
  const [account, setAccount] = useState(accounts[accounts.length - 1]?.open_id ?? "");
  const [info, setInfo] = useState<Info | null>(null);
  const [infoError, setInfoError] = useState("");
  const [mode, setMode] = useState<"direct" | "inbox">("direct");
  const [source, setSource] = useState<"upload" | "link">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [caption, setCaption] = useState("");
  const [privacy, setPrivacy] = useState<PrivacyLevel | "">("");
  const [allowComments, setAllowComments] = useState(false);
  const [allowDuet, setAllowDuet] = useState(false);
  const [allowStitch, setAllowStitch] = useState(false);
  const [promo, setPromo] = useState(false);
  const [brandOrganic, setBrandOrganic] = useState(false);
  const [brandedContent, setBrandedContent] = useState(false);
  const [isAigc, setIsAigc] = useState(false);
  const [when, setWhen] = useState<When>("now");
  const [pickAt, setPickAt] = useState("");
  const [busy, setBusy] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState<{ status: string; scheduledAt: string | null } | null>(null);

  // TikTok requires fresh creator info every time the posting screen opens.
  useEffect(() => {
    fetch(`/api/posts/creator-info${account ? `?account=${encodeURIComponent(account)}` : ""}`, { cache: "no-store" })
      .then(async (r) => ((await r.json()) as Info & { error?: string }))
      .then((d) => (d.error ? setInfoError(d.error) : setInfo(d)))
      .catch(() => setInfoError(tx("Couldn't reach TikTok. Check your connection and try again.")));
  }, [account]);
  function pickAccount(openId: string) {
    setAccount(openId);
    setInfo(null);
    setInfoError("");
    setPrivacy("");
  }

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const choice: PostChoice = { mode, caption, privacyLevel: privacy || null, allowComments, allowDuet, allowStitch, promo, brandOrganic, brandedContent, isAigc, durationSec };
  const problems = useMemo(() => {
    const out: string[] = [];
    if (source === "upload" ? !file : !/^https:\/\/\S+$/.test(linkUrl)) out.push(t("Add a video: upload one or paste an https link."));
    if (info && when !== "draft") out.push(...postProblems(choice, info, t));
    if (when === "pick" && !pickAt) out.push(t("Pick a date and time."));
    return out;
  }, [source, file, linkUrl, info, when, pickAt, mode, caption, privacy, promo, brandOrganic, brandedContent, durationSec, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const brandedPrivateClash = promo && brandedContent;
  const promoLabel = promo && brandedContent ? t("Your video will be labeled \"Paid partnership\".") : promo && brandOrganic ? t("Your video will be labeled \"Promotional content\".") : "";

  async function submit() {
    setErrors([]);
    if (problems.length) return setErrors(problems);
    try {
      let storagePath: string | undefined;
      if (source === "upload" && file) {
        setBusy(t("Uploading your video…"));
        const r = await fetch("/api/posts/upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: file.type, size: file.size }) });
        const u = (await r.json()) as { path?: string; uploadUrl?: string; error?: string };
        if (!r.ok || !u.uploadUrl || !u.path) throw new Error(t(u.error || tx("Upload couldn't start.")));
        const put = await fetch(u.uploadUrl, { method: "PUT", headers: { "content-type": file.type }, body: file });
        if (!put.ok) throw new Error(t("The upload didn't finish. Try again."));
        storagePath = u.path;
      }
      setBusy(when === "draft" ? t("Saving…") : t("Scheduling…"));
      const at = when === "pick" ? new Date(pickAt).toISOString() : when;
      const r = await fetch("/api/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...choice, source, storagePath, linkUrl: source === "link" ? linkUrl : undefined, when: at, consent: true, account: account || undefined }),
      });
      const d = (await r.json()) as { post?: { status: string; scheduled_at: string | null }; error?: string | string[] };
      if (!r.ok || !d.post) throw new Error(Array.isArray(d.error) ? d.error.map((x) => t(x)).join(" ") : t(d.error || tx("Something went wrong.")));
      setDone({ status: d.post.status, scheduledAt: d.post.scheduled_at });
    } catch (e) {
      setErrors([e instanceof Error ? e.message : t("Something went wrong.")]);
    } finally {
      setBusy("");
    }
  }

  if (done) {
    return (
      <section className="card np-done" role="status">
        <span className="np-done-ico" aria-hidden="true">✓</span>
        <h2>{done.status === "draft" ? t("Saved as a draft") : when === "now" ? (mode === "inbox" ? t("Sending to your TikTok drafts") : t("Sending to TikTok now")) : t("Scheduled")}</h2>
        <p>
          {done.status === "draft"
            ? t("It's saved in Rezekii. Schedule it from My posts whenever you're ready.")
            : done.scheduledAt && when !== "now"
              ? t("It will go out on {time} (Malaysia time).", { time: myt(done.scheduledAt, lang) })
              : t("Rezekii is uploading it to TikTok now.")}{" "}
          {done.status !== "draft" && (mode === "direct" ? t("After it's posted, TikTok can take a few minutes to process the video before it shows on your profile.") : t("It will land in your TikTok inbox, where you can finish and post it in the TikTok app."))}
        </p>
        <div className="np-row">
          <Link href="/app/posts" className="np-btn">{t("See it in My posts")}</Link>
          <button type="button" className="btn-outline" onClick={() => window.location.reload()}>{t("New post")}</button>
        </div>
      </section>
    );
  }

  return (
    <form className="np" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
      {accounts.length > 1 && (
        <label className="card np-account" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 6 }}>
          <small>{t("Post to")}</small>
          <select value={account} onChange={(e) => pickAccount(e.target.value)} className="np-input">
            {accounts.map((a) => <option key={a.open_id} value={a.open_id}>{a.username ? `@${a.username}` : t("TikTok account")}</option>)}
          </select>
        </label>
      )}
      <section className="card np-account" aria-label={t("TikTok account")}>
        {info ? (
          <>
            {info.creator_avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={info.creator_avatar_url} alt="" width={48} height={48} />
            ) : <span className="np-avatar" aria-hidden="true">{(info.creator_nickname || "?").slice(0, 1)}</span>}
            <span><small>{t("Posting to")}</small><strong>{info.creator_nickname}{info.creator_username ? ` · @${info.creator_username}` : ""}</strong></span>
          </>
        ) : infoError ? <p className="np-error" role="alert">{t(infoError)}</p> : <p className="np-muted">{t("Checking your TikTok account…")}</p>}
      </section>

      <section className="card np-sec">
        <h2>{t("Where should it go?")}</h2>
        <div className="np-seg" role="radiogroup" aria-label={t("Where to send it")}>
          <button type="button" role="radio" aria-checked={mode === "direct"} className={mode === "direct" ? "on" : ""} onClick={() => setMode("direct")}>{t("Post to TikTok")}</button>
          <button type="button" role="radio" aria-checked={mode === "inbox"} className={mode === "inbox" ? "on" : ""} onClick={() => setMode("inbox")}>{t("Send to TikTok drafts")}</button>
        </div>
        <p className="np-muted">{mode === "direct" ? t("Rezekii posts it to your profile with the settings below.") : t("It goes to your TikTok inbox. You finish the caption, sound and settings in the TikTok app, then post it there.")}</p>
      </section>

      <section className="card np-sec">
        <h2>{t("Video")}</h2>
        <div className="np-seg" role="radiogroup" aria-label={t("Video source")}>
          <button type="button" role="radio" aria-checked={source === "upload"} className={source === "upload" ? "on" : ""} onClick={() => setSource("upload")}>{t("Upload")}</button>
          <button type="button" role="radio" aria-checked={source === "link"} className={source === "link" ? "on" : ""} onClick={() => setSource("link")}>{t("Paste a link")}</button>
        </div>
        {source === "upload" ? (
          <label className="np-drop">
            <input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setDurationSec(null); }} />
            <span>{file ? `${file.name} · ${(file.size / 1048576).toFixed(1)} MB` : t("Choose an MP4, MOV or WebM video (up to 50 MB)")}</span>
          </label>
        ) : (
          <input className="np-input" type="url" inputMode="url" placeholder={t("https://… (Google Drive, Dropbox or a direct file link)")} value={linkUrl} onChange={(e) => setLinkUrl(e.target.value.trim())} aria-label={t("Video link")} />
        )}
        {(preview || (source === "link" && /^https:\/\//.test(linkUrl))) && (
          <video className="np-preview" src={source === "upload" ? preview : linkUrl} controls playsInline muted onLoadedMetadata={(e) => setDurationSec(Math.round(e.currentTarget.duration))} aria-label={t("Preview of your video")} />
        )}
        {durationSec !== null && info && <p className="np-muted">{t("Length {length} · TikTok allows up to {max} min for this account.", { length: `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, "0")}`, max: Math.floor(info.max_video_post_duration_sec / 60) })}</p>}
      </section>

      {mode === "direct" && (
        <>
          <section className="card np-sec">
            <label htmlFor="np-caption"><h2>{t("Caption")}</h2></label>
            <textarea id="np-caption" className="np-input" rows={4} maxLength={CAPTION_MAX} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder={t("Write your caption and hashtags")} />
            <span className="np-count">{caption.length.toLocaleString("en-US")} / {CAPTION_MAX.toLocaleString("en-US")}</span>
          </section>

          <section className="card np-sec">
            <label htmlFor="np-privacy"><h2>{t("Who can view this post")}</h2></label>
            <select id="np-privacy" className="np-input" value={privacy} onChange={(e) => setPrivacy(e.target.value as PrivacyLevel)} required>
              <option value="" disabled>{t("Choose who can view")}</option>
              {(info?.privacy_level_options ?? []).map((p) => (
                <option key={p} value={p} disabled={p === "SELF_ONLY" && brandedPrivateClash}>
                  {t(PRIVACY_LABEL[p])}{p === "SELF_ONLY" && brandedPrivateClash ? t(" (not allowed for branded content)") : ""}
                </option>
              ))}
            </select>
            <h3>{t("Allow viewers to")}</h3>
            <div className="np-checks">
              {([[tx("Comment"), allowComments, setAllowComments, info?.comment_disabled], [tx("Duet"), allowDuet, setAllowDuet, info?.duet_disabled], [tx("Stitch"), allowStitch, setAllowStitch, info?.stitch_disabled]] as const).map(([label, on, set, off]) => (
                <label key={label} className={off ? "np-check off" : "np-check"}>
                  <input type="checkbox" checked={on && !off} disabled={!!off} onChange={(e) => set(e.target.checked)} />
                  {t(label)}{off ? t(" (turned off in your TikTok settings)") : ""}
                </label>
              ))}
            </div>
          </section>

          <section className="card np-sec">
            <div className="np-switchrow">
              <span><h2>{t("Disclose promotional content")}</h2><small>{t("Turn on if this video promotes yourself, a brand, product or service.")}</small></span>
              <button type="button" role="switch" aria-checked={promo} className={promo ? "np-switch on" : "np-switch"} onClick={() => { setPromo(!promo); if (promo) { setBrandOrganic(false); setBrandedContent(false); } }} aria-label={t("Disclose promotional content")}><span /></button>
            </div>
            {promo && (
              <div className="np-checks">
                <label className="np-check"><input type="checkbox" checked={brandOrganic} onChange={(e) => setBrandOrganic(e.target.checked)} />{t("Your brand")}<small>{t("You are promoting yourself or your own business.")}</small></label>
                <label className="np-check"><input type="checkbox" checked={brandedContent} onChange={(e) => { setBrandedContent(e.target.checked); if (e.target.checked && privacy === "SELF_ONLY") setPrivacy(""); }} />{t("Branded content")}<small>{t("You are promoting another brand or a third party.")}</small></label>
                {promoLabel && <p className="np-note">{promoLabel}</p>}
              </div>
            )}
            <div className="np-switchrow">
              <span><h2>{t("AI-generated content")}</h2><small>{t("Turn on if the video was made or heavily edited with AI.")}</small></span>
              <button type="button" role="switch" aria-checked={isAigc} className={isAigc ? "np-switch on" : "np-switch"} onClick={() => setIsAigc(!isAigc)} aria-label={t("AI-generated content")}><span /></button>
            </div>
          </section>
        </>
      )}

      <section className="card np-sec">
        <h2>{t("When")}</h2>
        <div className="np-when" role="radiogroup" aria-label={t("When to post")}>
          {([["now", t("Post now")], ["recommended", info ? t("Recommended time · {time}", { time: myt(info.nextRecommended, lang) }) : t("Recommended time")], ["pick", t("Pick a time")], ["draft", t("Save as draft")]] as [When, string][]).map(([v, label]) => (
            <label key={v} className={when === v ? "np-radio on" : "np-radio"}>
              <input type="radio" name="when" value={v} checked={when === v} onChange={() => setWhen(v)} />
              {label}
            </label>
          ))}
        </div>
        {when === "pick" && <input className="np-input" type="datetime-local" value={pickAt} onChange={(e) => setPickAt(e.target.value)} aria-label={t("Date and time (your device's time)")} />}
        {when === "draft" && <p className="np-muted">{t("Saved in Rezekii only. Nothing is sent to TikTok until you schedule it.")}</p>}
      </section>

      {errors.length > 0 && <ul className="np-errors" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      {mode === "direct" && when !== "draft" && <p className="np-consent">{consentLine(choice, t)}</p>}
      <button type="submit" className="np-btn np-submit" disabled={!!busy || (!info && when !== "draft")}>
        {busy || (when === "draft" ? t("Save draft") : when === "now" ? (mode === "direct" ? t("Post now") : t("Send to TikTok drafts")) : t("Schedule"))}
      </button>
    </form>
  );
}
