"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CreatorInfo, PrivacyLevel } from "@/integrations/tiktok/posting.ts";
import { CAPTION_MAX, consentLine, postProblems, type PostChoice } from "@/modules/posting/rules.ts";

type Info = CreatorInfo & { nextRecommended: string };
type When = "now" | "recommended" | "pick" | "draft";

const PRIVACY_LABEL: Record<PrivacyLevel, string> = {
  PUBLIC_TO_EVERYONE: "Everyone",
  MUTUAL_FOLLOW_FRIENDS: "Friends (followers you follow back)",
  FOLLOWER_OF_CREATOR: "Followers",
  SELF_ONLY: "Only me",
};
const myt = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Kuala_Lumpur", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

/** New post: TikTok's Content Sharing Guidelines, step by step, for the creator's own TikTok account. */
export function NewPostForm() {
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
    fetch("/api/posts/creator-info", { cache: "no-store" })
      .then(async (r) => ((await r.json()) as Info & { error?: string }))
      .then((d) => (d.error ? setInfoError(d.error) : setInfo(d)))
      .catch(() => setInfoError("Couldn't reach TikTok. Check your connection and try again."));
  }, []);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const choice: PostChoice = { mode, caption, privacyLevel: privacy || null, allowComments, allowDuet, allowStitch, promo, brandOrganic, brandedContent, isAigc, durationSec };
  const problems = useMemo(() => {
    const out: string[] = [];
    if (source === "upload" ? !file : !/^https:\/\/\S+$/.test(linkUrl)) out.push("Add a video: upload one or paste an https link.");
    if (info && when !== "draft") out.push(...postProblems(choice, info));
    if (when === "pick" && !pickAt) out.push("Pick a date and time.");
    return out;
  }, [source, file, linkUrl, info, when, pickAt, mode, caption, privacy, promo, brandOrganic, brandedContent, durationSec]); // eslint-disable-line react-hooks/exhaustive-deps

  const brandedPrivateClash = promo && brandedContent;
  const promoLabel = promo && brandedContent ? 'Your video will be labeled "Paid partnership".' : promo && brandOrganic ? 'Your video will be labeled "Promotional content".' : "";

  async function submit() {
    setErrors([]);
    if (problems.length) return setErrors(problems);
    try {
      let storagePath: string | undefined;
      if (source === "upload" && file) {
        setBusy("Uploading your video…");
        const r = await fetch("/api/posts/upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: file.type, size: file.size }) });
        const u = (await r.json()) as { path?: string; uploadUrl?: string; error?: string };
        if (!r.ok || !u.uploadUrl || !u.path) throw new Error(u.error || "Upload couldn't start.");
        const put = await fetch(u.uploadUrl, { method: "PUT", headers: { "content-type": file.type }, body: file });
        if (!put.ok) throw new Error("The upload didn't finish. Try again.");
        storagePath = u.path;
      }
      setBusy(when === "draft" ? "Saving…" : "Scheduling…");
      const at = when === "pick" ? new Date(pickAt).toISOString() : when;
      const r = await fetch("/api/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...choice, source, storagePath, linkUrl: source === "link" ? linkUrl : undefined, when: at, consent: true }),
      });
      const d = (await r.json()) as { post?: { status: string; scheduled_at: string | null }; error?: string | string[] };
      if (!r.ok || !d.post) throw new Error(Array.isArray(d.error) ? d.error.join(" ") : d.error || "Something went wrong.");
      setDone({ status: d.post.status, scheduledAt: d.post.scheduled_at });
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Something went wrong."]);
    } finally {
      setBusy("");
    }
  }

  if (done) {
    return (
      <section className="card np-done" role="status">
        <span className="np-done-ico" aria-hidden="true">✓</span>
        <h2>{done.status === "draft" ? "Saved as a draft" : when === "now" ? (mode === "inbox" ? "Sending to your TikTok drafts" : "Sending to TikTok now") : "Scheduled"}</h2>
        <p>
          {done.status === "draft"
            ? "It's saved in Rezekii. Schedule it from My posts whenever you're ready."
            : done.scheduledAt && when !== "now"
              ? `It will go out on ${myt(done.scheduledAt)} (Malaysia time).`
              : "Rezekii is uploading it to TikTok now."}{" "}
          {done.status !== "draft" && (mode === "direct" ? "After it's posted, TikTok can take a few minutes to process the video before it shows on your profile." : "It will land in your TikTok inbox, where you can finish and post it in the TikTok app.")}
        </p>
        <div className="np-row">
          <Link href="/app/posts" className="np-btn">See it in My posts</Link>
          <button type="button" className="btn-outline" onClick={() => window.location.reload()}>New post</button>
        </div>
      </section>
    );
  }

  return (
    <form className="np" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
      <section className="card np-account" aria-label="TikTok account">
        {info ? (
          <>
            {info.creator_avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={info.creator_avatar_url} alt="" width={48} height={48} />
            ) : <span className="np-avatar" aria-hidden="true">{(info.creator_nickname || "?").slice(0, 1)}</span>}
            <span><small>Posting to</small><strong>{info.creator_nickname}{info.creator_username ? ` · @${info.creator_username}` : ""}</strong></span>
          </>
        ) : infoError ? <p className="np-error" role="alert">{infoError}</p> : <p className="np-muted">Checking your TikTok account…</p>}
      </section>

      <section className="card np-sec">
        <h2>Where should it go?</h2>
        <div className="np-seg" role="radiogroup" aria-label="Where to send it">
          <button type="button" role="radio" aria-checked={mode === "direct"} className={mode === "direct" ? "on" : ""} onClick={() => setMode("direct")}>Post to TikTok</button>
          <button type="button" role="radio" aria-checked={mode === "inbox"} className={mode === "inbox" ? "on" : ""} onClick={() => setMode("inbox")}>Send to TikTok drafts</button>
        </div>
        <p className="np-muted">{mode === "direct" ? "Rezekii posts it to your profile with the settings below." : "It goes to your TikTok inbox. You finish the caption, sound and settings in the TikTok app, then post it there."}</p>
      </section>

      <section className="card np-sec">
        <h2>Video</h2>
        <div className="np-seg" role="radiogroup" aria-label="Video source">
          <button type="button" role="radio" aria-checked={source === "upload"} className={source === "upload" ? "on" : ""} onClick={() => setSource("upload")}>Upload</button>
          <button type="button" role="radio" aria-checked={source === "link"} className={source === "link" ? "on" : ""} onClick={() => setSource("link")}>Paste a link</button>
        </div>
        {source === "upload" ? (
          <label className="np-drop">
            <input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setDurationSec(null); }} />
            <span>{file ? `${file.name} · ${(file.size / 1048576).toFixed(1)} MB` : "Choose an MP4, MOV or WebM video (up to 50 MB)"}</span>
          </label>
        ) : (
          <input className="np-input" type="url" inputMode="url" placeholder="https://… (Google Drive, Dropbox or a direct file link)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value.trim())} aria-label="Video link" />
        )}
        {(preview || (source === "link" && /^https:\/\//.test(linkUrl))) && (
          <video className="np-preview" src={source === "upload" ? preview : linkUrl} controls playsInline muted onLoadedMetadata={(e) => setDurationSec(Math.round(e.currentTarget.duration))} aria-label="Preview of your video" />
        )}
        {durationSec !== null && info && <p className="np-muted">Length {Math.floor(durationSec / 60)}:{String(durationSec % 60).padStart(2, "0")} · TikTok allows up to {Math.floor(info.max_video_post_duration_sec / 60)} min for this account.</p>}
      </section>

      {mode === "direct" && (
        <>
          <section className="card np-sec">
            <label htmlFor="np-caption"><h2>Caption</h2></label>
            <textarea id="np-caption" className="np-input" rows={4} maxLength={CAPTION_MAX} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Write your caption and hashtags" />
            <span className="np-count">{caption.length.toLocaleString("en-US")} / {CAPTION_MAX.toLocaleString("en-US")}</span>
          </section>

          <section className="card np-sec">
            <label htmlFor="np-privacy"><h2>Who can view this post</h2></label>
            <select id="np-privacy" className="np-input" value={privacy} onChange={(e) => setPrivacy(e.target.value as PrivacyLevel)} required>
              <option value="" disabled>Choose who can view</option>
              {(info?.privacy_level_options ?? []).map((p) => (
                <option key={p} value={p} disabled={p === "SELF_ONLY" && brandedPrivateClash}>
                  {PRIVACY_LABEL[p]}{p === "SELF_ONLY" && brandedPrivateClash ? " (not allowed for branded content)" : ""}
                </option>
              ))}
            </select>
            <h3>Allow viewers to</h3>
            <div className="np-checks">
              {([["Comment", allowComments, setAllowComments, info?.comment_disabled], ["Duet", allowDuet, setAllowDuet, info?.duet_disabled], ["Stitch", allowStitch, setAllowStitch, info?.stitch_disabled]] as const).map(([label, on, set, off]) => (
                <label key={label} className={off ? "np-check off" : "np-check"}>
                  <input type="checkbox" checked={on && !off} disabled={!!off} onChange={(e) => set(e.target.checked)} />
                  {label}{off ? " (turned off in your TikTok settings)" : ""}
                </label>
              ))}
            </div>
          </section>

          <section className="card np-sec">
            <div className="np-switchrow">
              <span><h2>Disclose promotional content</h2><small>Turn on if this video promotes yourself, a brand, product or service.</small></span>
              <button type="button" role="switch" aria-checked={promo} className={promo ? "np-switch on" : "np-switch"} onClick={() => { setPromo(!promo); if (promo) { setBrandOrganic(false); setBrandedContent(false); } }} aria-label="Disclose promotional content"><span /></button>
            </div>
            {promo && (
              <div className="np-checks">
                <label className="np-check"><input type="checkbox" checked={brandOrganic} onChange={(e) => setBrandOrganic(e.target.checked)} />Your brand<small>You are promoting yourself or your own business.</small></label>
                <label className="np-check"><input type="checkbox" checked={brandedContent} onChange={(e) => { setBrandedContent(e.target.checked); if (e.target.checked && privacy === "SELF_ONLY") setPrivacy(""); }} />Branded content<small>You are promoting another brand or a third party.</small></label>
                {promoLabel && <p className="np-note">{promoLabel}</p>}
              </div>
            )}
            <div className="np-switchrow">
              <span><h2>AI-generated content</h2><small>Turn on if the video was made or heavily edited with AI.</small></span>
              <button type="button" role="switch" aria-checked={isAigc} className={isAigc ? "np-switch on" : "np-switch"} onClick={() => setIsAigc(!isAigc)} aria-label="AI-generated content"><span /></button>
            </div>
          </section>
        </>
      )}

      <section className="card np-sec">
        <h2>When</h2>
        <div className="np-when" role="radiogroup" aria-label="When to post">
          {([["now", "Post now"], ["recommended", info ? `Recommended time · ${myt(info.nextRecommended)}` : "Recommended time"], ["pick", "Pick a time"], ["draft", "Save as draft"]] as [When, string][]).map(([v, label]) => (
            <label key={v} className={when === v ? "np-radio on" : "np-radio"}>
              <input type="radio" name="when" value={v} checked={when === v} onChange={() => setWhen(v)} />
              {label}
            </label>
          ))}
        </div>
        {when === "pick" && <input className="np-input" type="datetime-local" value={pickAt} onChange={(e) => setPickAt(e.target.value)} aria-label="Date and time (your device's time)" />}
        {when === "draft" && <p className="np-muted">Saved in Rezekii only. Nothing is sent to TikTok until you schedule it.</p>}
      </section>

      {errors.length > 0 && <ul className="np-errors" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      {mode === "direct" && when !== "draft" && <p className="np-consent">{consentLine(choice)}</p>}
      <button type="submit" className="np-btn np-submit" disabled={!!busy || (!info && when !== "draft")}>
        {busy || (when === "draft" ? "Save draft" : when === "now" ? (mode === "direct" ? "Post now" : "Send to TikTok drafts") : "Schedule")}
      </button>
    </form>
  );
}
