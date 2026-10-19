"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { CreatorInfo, PrivacyLevel } from "@/integrations/tiktok/posting.ts";
import type { PublicAccount } from "@/modules/social/accounts.ts";
import { consentLine, postProblems, type PostChoice } from "@/modules/posting/rules.ts";
import { CAPTION_MAX, COMMENT_MAX, DEFAULT_PLACEMENT, NAMES, autoCaption, autoComment, channelProblems, channelWarnings, lengthFor, links, postedCaption, type Channel, type Placement, type Platform } from "@/modules/social/rules.ts";
import { BrandIcon } from "../brand-icons";
import { PhonePreview, type Who } from "./phone-previews";
import "./composer.css";

type Info = CreatorInfo & { nextRecommended: string };
type When = "now" | "recommended" | "pick" | "draft";
export type TikTokAccount = { open_id: string; username: string | null };
const TT = "tiktok";
const PRIVACY: Record<PrivacyLevel, string> = { PUBLIC_TO_EVERYONE: "Everyone", MUTUAL_FOLLOW_FRIENDS: "Friends (followers you follow back)", FOLLOWER_OF_CREATOR: "Followers", SELF_ONLY: "Only me" };
const myt = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Kuala_Lumpur", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
const CONNECT_MSG: Record<string, (p: string) => string> = {
  ok: (p) => `${p} connected.`,
  cancelled: (p) => `Not connected: ${p} sign-in was cancelled.`,
  expired: () => "That took too long. Try connecting again.",
  no_pages: () => "This Facebook account doesn't manage any Pages.",
  personal: () => "Switch to a Business or Creator account in Instagram, then connect again.",
  config: (p) => `${p} isn't set up on Rezekii yet (its app settings are missing).`,
  failed: (p) => `${p} didn't connect. Try again.`,
};

const Pic = ({ src }: { src: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" />
);

/**
 * New post for Admins with Facebook, Instagram and Threads next to TikTok (design C). One main caption; Rezekii writes each
 * channel's version (editable), places the product link where each channel works best, adds first comments, and shows
 * a phone preview per channel. TikTok keeps every setting its Content Sharing Guidelines require.
 */
export function Composer({ tiktok, social: initialSocial, connect }: { tiktok: TikTokAccount[]; social: PublicAccount[]; connect: { channel: string; result: string } | null }) {
  const [social, setSocial] = useState(initialSocial);
  const [ttAccount, setTtAccount] = useState(tiktok[tiktok.length - 1]?.open_id ?? "");
  const [picked, setPicked] = useState<Set<string>>(() => new Set([...(tiktok.length ? [TT] : []), ...initialSocial.filter((a) => a.status === "active").map((a) => a.id)]));
  const [main, setMain] = useState("");
  const [link, setLink] = useState("");
  const [remind, setRemind] = useState(true);
  const [capOver, setCapOver] = useState<Record<string, string>>({});
  const [comOver, setComOver] = useState<Record<string, string>>({});
  const [place, setPlace] = useState<Record<string, Placement>>({});
  const [tab, setTab] = useState("main");
  const [source, setSource] = useState<"upload" | "link">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [infoError, setInfoError] = useState("");
  const [mode, setMode] = useState<"direct" | "inbox">("direct");
  const [privacy, setPrivacy] = useState<PrivacyLevel | "">("");
  const [allow, setAllow] = useState({ comments: false, duet: false, stitch: false });
  const [promo, setPromo] = useState({ on: false, own: false, branded: false });
  const [isAigc, setIsAigc] = useState(false);
  const [when, setWhen] = useState<When>("recommended");
  const [pickAt, setPickAt] = useState("");
  const [preview, setPreview] = useState(TT);
  const [fbView, setFbView] = useState<"reels" | "feed">("reels");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [sheet, setSheet] = useState(false);
  // The preview measures text, so it renders in the browser only.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [busy, setBusy] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState<{ channels: string[]; at: string | null; draft: boolean } | null>(null);
  const [toast, setToast] = useState(() => (connect && CONNECT_MSG[connect.result] ? CONNECT_MSG[connect.result](NAMES[connect.channel as Platform] ?? "The channel") : ""));

  // TikTok requires fresh creator info every time the posting screen opens.
  useEffect(() => {
    if (!ttAccount) return;
    fetch(`/api/posts/creator-info?account=${encodeURIComponent(ttAccount)}`, { cache: "no-store" })
      .then(async (r) => (await r.json()) as Info & { error?: string })
      .then((d) => (d.error ? setInfoError(d.error) : (setInfo(d), setInfoError(""))))
      .catch(() => setInfoError("Couldn't reach TikTok. Check your connection and try again."));
  }, [ttAccount]);
  const videoUrl = useMemo(() => (source === "upload" ? (file ? URL.createObjectURL(file) : null) : /^https:\/\//.test(linkUrl) ? linkUrl : null), [source, file, linkUrl]);
  useEffect(() => () => { if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  const accountOf = (key: string) => social.find((a) => a.id === key);
  const chOf = (key: string): Channel => (key === TT ? "tiktok" : (accountOf(key)?.platform ?? "facebook"));
  const keys = [...(tiktok.length && picked.has(TT) ? [TT] : []), ...social.filter((a) => picked.has(a.id) && a.status === "active").map((a) => a.id)];
  const placeOf = (key: string) => place[key] ?? DEFAULT_PLACEMENT[chOf(key)];
  const textOf = (key: string) => capOver[key] ?? autoCaption(chOf(key), main, placeOf(key));
  const captionOf = (key: string) => postedCaption(chOf(key), textOf(key), link.trim(), placeOf(key));
  const commentOf = (key: string) => (key === TT ? "" : (comOver[key] ?? autoComment(chOf(key) as Platform, link.trim(), placeOf(key))));
  const nameOf = (key: string) => (key === TT ? `TikTok${info?.creator_username ? ` @${info.creator_username}` : ""}` : (accountOf(key)?.name ?? NAMES[chOf(key)]));
  const who = (key: string): Who => {
    if (key === TT) return { name: info?.creator_nickname || info?.creator_username || "TikTok", username: info?.creator_username || "", avatar: info?.creator_avatar_url ?? null };
    const a = accountOf(key);
    return { name: a?.name ?? "", username: a?.username ?? a?.name ?? "", avatar: a?.avatar_url ?? null };
  };
  const previewKey = keys.includes(preview) ? preview : keys[0];
  const activeTab = tab === "main" || keys.includes(tab) ? tab : "main";

  const choice: PostChoice = { mode, caption: captionOf(TT), privacyLevel: privacy || null, allowComments: allow.comments, allowDuet: allow.duet, allowStitch: allow.stitch, promo: promo.on, brandOrganic: promo.own, brandedContent: promo.branded, isAigc, durationSec };
  const problems = (() => {
    const out: string[] = [];
    if (!keys.length) out.push("Pick at least one channel.");
    if (source === "upload" ? !file : !/^https:\/\/\S+$/.test(linkUrl)) out.push("Add a video: upload one or paste an https link.");
    if (keys.includes(TT) && info && when !== "draft") out.push(...postProblems(choice, info));
    for (const k of keys) if (k !== TT) out.push(...channelProblems(chOf(k) as Platform, captionOf(k), commentOf(k), durationSec).map((p) => (social.filter((a) => a.platform === chOf(k)).length > 1 ? `${nameOf(k)}: ${p}` : p)));
    if (when === "pick" && !pickAt) out.push("Pick a date and time.");
    return out;
  })();
  const warnings = keys.flatMap((k) => channelWarnings(chOf(k), captionOf(k)));

  function toggle(key: string) {
    setPicked((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  }
  async function disconnect(a: PublicAccount) {
    const r = await fetch(`/api/social/accounts/${a.id}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) return setToast("Couldn't disconnect. Try again.");
    setSocial((s) => s.filter((x) => x.id !== a.id));
    setToast(`${a.name ?? NAMES[a.platform]} disconnected. Its scheduled posts were cancelled.`);
  }

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
      const video = { source, storagePath, linkUrl: source === "link" ? linkUrl : undefined };
      let tiktokPost: { id: string; scheduled_at: string | null; status: string } | null = null;
      if (keys.includes(TT)) {
        const r = await fetch("/api/posts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...choice, ...video, when: at, consent: true, account: ttAccount || undefined }) });
        const d = (await r.json()) as { post?: { id: string; scheduled_at: string | null; status: string }; error?: string | string[] };
        if (!r.ok || !d.post) throw new Error(Array.isArray(d.error) ? d.error.join(" ") : d.error || "TikTok post couldn't be saved.");
        tiktokPost = d.post;
      }
      const metaKeys = keys.filter((k) => k !== TT);
      let at2: string | null = tiktokPost?.scheduled_at ?? null;
      if (metaKeys.length) {
        const r = await fetch("/api/social/posts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...video, durationSec, when: at, tiktokPostId: tiktokPost?.id, channels: metaKeys.map((k) => ({ accountId: k, caption: captionOf(k), firstComment: commentOf(k), linkReminder: chOf(k) === "facebook" && remind && !!link.trim() })) }),
        });
        const d = (await r.json()) as { posts?: { scheduled_at: string | null }[]; error?: string | string[] };
        if (!r.ok || !d.posts) throw new Error(`${tiktokPost ? "The TikTok post was saved, but " : ""}${Array.isArray(d.error) ? d.error.join(" ") : d.error || "the other channels couldn't be saved."}`);
        at2 ??= d.posts[0]?.scheduled_at ?? null;
      }
      setDone({ channels: keys.map(nameOf), at: at2, draft: when === "draft" });
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
        <h2>{done.draft ? "Saved as a draft" : when === "now" ? "On its way" : "Scheduled"}</h2>
        <p>{done.draft ? `Saved in Rezekii for ${done.channels.join(", ")}.` : `${done.channels.join(", ")}${done.at && when !== "now" ? `: ${myt(done.at)} (Malaysia time)` : ": posting now"}.`} You&apos;ll see each channel&apos;s status in All channels.</p>
        <div className="np-row"><Link href="/app/posts" className="np-btn">See it in All channels</Link><button type="button" className="btn-outline" onClick={() => window.location.reload()}>New post</button></div>
      </section>
    );
  }

  const counts = keys.map((k) => { const n = lengthFor(chOf(k), captionOf(k)); const max = CAPTION_MAX[chOf(k)]; return <span key={k} className={n > max ? "over" : ""}><BrandIcon ch={chOf(k)} size={14} />{n.toLocaleString("en-US")} / {max.toLocaleString("en-US")}</span>; });
  const linkWhere = (k: string) => { const p = placeOf(k); return k === TT ? "not added (the product goes in the yellow basket)" : p.caption && p.comment ? "caption and first comment" : p.caption ? "caption" : p.comment ? "first comment" : "not added"; };
  const notes = previewKey ? previewNotes(chOf(previewKey), captionOf(previewKey), commentOf(previewKey), !!link.trim(), remind, fbView) : [];

  return (
    <>
      {toast && <p className="np-note" role="status" style={{ marginBottom: 12 }}>{toast} <button type="button" className="cx-link" onClick={() => setToast("")}>Close</button></p>}
      <form className="cx" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        <div className="cx-col">
          <section className="card">
            <div className="cx-bar"><h2>Post to</h2><button type="button" className="cx-link" onClick={() => setSheet(true)}>Channels · {social.length + (tiktok.length ? 1 : 0)} connected</button></div>
            <div className="cx-chips">
              {tiktok.length > 0 && <button type="button" className="cx-chip" aria-pressed={picked.has(TT)} onClick={() => toggle(TT)}><BrandIcon ch="tiktok" size={26} />TikTok</button>}
              {social.map((a) => (
                <button key={a.id} type="button" className={`cx-chip${a.status === "reconnect" ? " warn" : ""}`} aria-pressed={picked.has(a.id) && a.status === "active"} onClick={() => (a.status === "reconnect" ? setSheet(true) : toggle(a.id))} title={a.status === "reconnect" ? "Needs reconnecting" : undefined}>
                  <span className="cx-pi">{a.avatar_url ? <Pic src={a.avatar_url} /> : <BrandIcon ch={a.platform} size={26} />}{a.avatar_url && <span className="badge-pi"><BrandIcon ch={a.platform} size={12} /></span>}</span>
                  {a.name ?? NAMES[a.platform]}{a.status === "reconnect" ? " · Reconnect" : ""}
                </button>
              ))}
              {(["facebook", "instagram", "threads"] as Platform[]).filter((p) => !social.some((a) => a.platform === p)).map((p) => <button key={p} type="button" className="cx-chip add" onClick={() => setSheet(true)}>+ {NAMES[p]}</button>)}
            </div>
            {tiktok.length > 1 && picked.has(TT) && (
              <label className="cx-row" style={{ justifyContent: "flex-start" }}><small className="np-muted">TikTok account</small>
                <select className="np-input" style={{ width: "auto", minHeight: 38 }} value={ttAccount} onChange={(e) => { setTtAccount(e.target.value); setInfo(null); setPrivacy(""); }}>{tiktok.map((a) => <option key={a.open_id} value={a.open_id}>{a.username ? `@${a.username}` : "TikTok account"}</option>)}</select>
              </label>
            )}
            {picked.has(TT) && infoError && <p className="np-error" role="alert">{infoError}</p>}
          </section>

          <section className="card">
            <h2>Video</h2>
            <div className="np-seg" role="radiogroup" aria-label="Video source">
              <button type="button" role="radio" aria-checked={source === "upload"} className={source === "upload" ? "on" : ""} onClick={() => setSource("upload")}>Upload</button>
              <button type="button" role="radio" aria-checked={source === "link"} className={source === "link" ? "on" : ""} onClick={() => setSource("link")}>Paste a link</button>
            </div>
            {source === "upload" ? (
              <label className="np-drop"><input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setDurationSec(null); }} /><span>{file ? `${file.name} · ${(file.size / 1048576).toFixed(1)} MB` : "Choose an MP4, MOV or WebM video (up to 50 MB)"}</span></label>
            ) : (
              <input className="np-input" type="url" inputMode="url" placeholder="https://… (Google Drive, Dropbox or a direct file link)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value.trim())} aria-label="Video link" />
            )}
            {videoUrl && <video src={videoUrl} muted playsInline preload="metadata" hidden onLoadedMetadata={(e) => setDurationSec(Math.round(e.currentTarget.duration))} />}
            {durationSec !== null && <p className="np-muted">Length {Math.floor(durationSec / 60)}:{String(durationSec % 60).padStart(2, "0")}{keys.some((k) => chOf(k) === "facebook") ? ` · Facebook: ${durationSec >= 3 && durationSec <= 90 ? "goes out as a Reel" : "goes out as a Page video (Reels are 3–90 s)"}` : ""}</p>}
          </section>

          <section className="card">
            <h2>Caption</h2>
            {keys.length > 0 && (
              <div className="cx-tabs" role="tablist" aria-label="Caption for">
                {[["main", "Main"], ...keys.map((k) => [k, nameOf(k)])].map(([k, l]) => (
                  <button key={k} type="button" role="tab" aria-selected={activeTab === k} onClick={() => setTab(k)}>{k !== "main" && <BrandIcon ch={chOf(k)} size={16} />}{l}{k !== "main" && (capOver[k] !== undefined || comOver[k] !== undefined) && <i className="dot" title="Edited" />}</button>
                ))}
              </div>
            )}
            {activeTab === "main" ? (
              <>
                <textarea className="np-input" rows={5} value={main} onChange={(e) => setMain(e.target.value)} placeholder="Write your caption and hashtags. Rezekii writes each channel's version from it." aria-label="Main caption" />
                <p className="np-muted">Rezekii writes each channel&apos;s version from this: a short TikTok caption pointing to the yellow basket, Instagram pointing to the link in bio, at most 5 hashtags on both, one topic on Threads, and the link where each channel works best. Open a channel&apos;s tab to check or change its version.</p>
                {counts.length > 0 && <div className="cx-counts" aria-label="Characters per channel">{counts}</div>}
              </>
            ) : (
              <ChannelPane
                ch={chOf(activeTab)}
                name={nameOf(activeTab)}
                text={textOf(activeTab)}
                edited={capOver[activeTab] !== undefined}
                captionLength={lengthFor(chOf(activeTab), captionOf(activeTab))}
                linkAdded={!!link.trim() && placeOf(activeTab).caption && activeTab !== TT}
                place={placeOf(activeTab)}
                comment={commentOf(activeTab)}
                commentEdited={comOver[activeTab] !== undefined}
                onText={(v) => setCapOver((o) => ({ ...o, [activeTab]: v }))}
                onResetText={() => setCapOver((o) => { const n = { ...o }; delete n[activeTab]; return n; })}
                onPlace={(p) => setPlace((o) => ({ ...o, [activeTab]: p }))}
                onComment={(v) => setComOver((o) => ({ ...o, [activeTab]: v }))}
                onResetComment={() => setComOver((o) => { const n = { ...o }; delete n[activeTab]; return n; })}
              />
            )}
            {warnings.length > 0 && <p className="cx-warn">{[...new Set(warnings)].join(" ")}</p>}
          </section>

          <section className="card">
            <h2>Product link</h2>
            <input className="np-input" type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value.trim())} placeholder="https://… (Shopee or TikTok Shop)" aria-label="Product link" />
            {keys.length > 0 && <ul className="cx-how">{keys.map((k) => <li key={k}><BrandIcon ch={chOf(k)} size={18} /><span><b>{nameOf(k)}:</b> {linkWhere(k)}</span></li>)}</ul>}
            {keys.length > 0 && <p className="np-muted">Change where it goes in each channel&apos;s caption tab.</p>}
            {keys.some((k) => chOf(k) === "facebook") && link.trim() && (
              <div className="np-switchrow">
                <span><b>Remind me to add the Shopee product link on Facebook</b><small>Facebook&apos;s &quot;Add a product link&quot; (Monetization) can only be added in Facebook. Rezekii keeps a reminder on the post until you tick Done.</small></span>
                <button type="button" role="switch" aria-checked={remind} className={remind ? "np-switch on" : "np-switch"} onClick={() => setRemind(!remind)} aria-label="Remind me to add the product link"><span /></button>
              </div>
            )}
          </section>

          {keys.includes(TT) && (
            <section className="card np-sec">
              <h2>TikTok settings</h2>
              <div className="np-seg" role="radiogroup" aria-label="Where to send it">
                <button type="button" role="radio" aria-checked={mode === "direct"} className={mode === "direct" ? "on" : ""} onClick={() => setMode("direct")}>Post to TikTok</button>
                <button type="button" role="radio" aria-checked={mode === "inbox"} className={mode === "inbox" ? "on" : ""} onClick={() => setMode("inbox")}>Send to TikTok drafts</button>
              </div>
              {mode === "direct" && (
                <>
                  <label htmlFor="cx-privacy"><b>Who can view this post</b></label>
                  <select id="cx-privacy" className="np-input" value={privacy} onChange={(e) => setPrivacy(e.target.value as PrivacyLevel)} required>
                    <option value="" disabled>Choose who can view</option>
                    {(info?.privacy_level_options ?? []).map((p) => <option key={p} value={p} disabled={p === "SELF_ONLY" && promo.on && promo.branded}>{PRIVACY[p]}{p === "SELF_ONLY" && promo.on && promo.branded ? " (not allowed for branded content)" : ""}</option>)}
                  </select>
                  <div className="np-checks">
                    {([["comments", "Comment", info?.comment_disabled], ["duet", "Duet", info?.duet_disabled], ["stitch", "Stitch", info?.stitch_disabled]] as const).map(([k, label, off]) => (
                      <label key={k} className={off ? "np-check off" : "np-check"}><input type="checkbox" checked={allow[k] && !off} disabled={!!off} onChange={(e) => setAllow((a) => ({ ...a, [k]: e.target.checked }))} />Allow {label}{off ? " (turned off in your TikTok settings)" : ""}</label>
                    ))}
                  </div>
                  <div className="np-switchrow"><span><b>Disclose promotional content</b><small>Turn on if this video promotes yourself, a brand, product or service.</small></span><button type="button" role="switch" aria-checked={promo.on} className={promo.on ? "np-switch on" : "np-switch"} onClick={() => setPromo((p) => (p.on ? { on: false, own: false, branded: false } : { ...p, on: true }))} aria-label="Disclose promotional content"><span /></button></div>
                  {promo.on && (
                    <div className="np-checks">
                      <label className="np-check"><input type="checkbox" checked={promo.own} onChange={(e) => setPromo((p) => ({ ...p, own: e.target.checked }))} />Your brand<small>You are promoting yourself or your own business.</small></label>
                      <label className="np-check"><input type="checkbox" checked={promo.branded} onChange={(e) => { setPromo((p) => ({ ...p, branded: e.target.checked })); if (e.target.checked && privacy === "SELF_ONLY") setPrivacy(""); }} />Branded content<small>You are promoting another brand or a third party.</small></label>
                    </div>
                  )}
                  <div className="np-switchrow"><span><b>AI-generated content</b><small>Turn on if the video was made or heavily edited with AI.</small></span><button type="button" role="switch" aria-checked={isAigc} className={isAigc ? "np-switch on" : "np-switch"} onClick={() => setIsAigc(!isAigc)} aria-label="AI-generated content"><span /></button></div>
                </>
              )}
            </section>
          )}

          <section className="card">
            <h2>When</h2>
            <div className="np-when" role="radiogroup" aria-label="When to post">
              {([["now", "Post now"], ["recommended", info ? `Recommended time · ${myt(info.nextRecommended)}` : "Recommended time"], ["pick", "Pick a time"], ["draft", "Save as draft"]] as [When, string][]).map(([v, label]) => (
                <label key={v} className={when === v ? "np-radio on" : "np-radio"}><input type="radio" name="cx-when" value={v} checked={when === v} onChange={() => setWhen(v)} />{label}</label>
              ))}
            </div>
            {when === "pick" && <input className="np-input" type="datetime-local" value={pickAt} onChange={(e) => setPickAt(e.target.value)} aria-label="Date and time (your device's time)" />}
            <p className="np-muted">All channels go out at the same time.{when === "draft" ? " A draft stays in Rezekii until you schedule it." : ""}</p>
          </section>

          {errors.length > 0 && <ul className="np-errors" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
          {keys.includes(TT) && mode === "direct" && when !== "draft" && <p className="np-consent">{consentLine(choice)}</p>}
          <button type="submit" className="np-btn np-submit" disabled={!!busy || (keys.includes(TT) && !info && when !== "draft")}>
            {busy || `${when === "draft" ? "Save draft" : when === "now" ? "Post now" : "Schedule"} · ${keys.length} channel${keys.length === 1 ? "" : "s"}`}
          </button>
        </div>

        <aside className="cx-side" aria-label="Preview">
          {keys.length > 0 && (
            <div className="cx-tabs" role="tablist" aria-label="Preview channel">
              {keys.map((k) => <button key={k} type="button" role="tab" aria-selected={previewKey === k} onClick={() => setPreview(k)}><BrandIcon ch={chOf(k)} size={16} />{social.filter((a) => a.platform === chOf(k)).length > 1 ? nameOf(k) : NAMES[chOf(k)]}</button>)}
            </div>
          )}
          {mounted && previewKey ? <PhonePreview channel={chOf(previewKey)} caption={captionOf(previewKey)} comment={commentOf(previewKey)} video={videoUrl} who={who(previewKey)} fbView={fbView} theme={theme} /> : <div className="pv-phone"><div className="pv-scr" /></div>}
          {previewKey && chOf(previewKey) === "facebook" && <Seg value={fbView} set={setFbView} items={[["reels", "Reels"], ["feed", "Feed"]]} label="Facebook view" />}
          {previewKey && (chOf(previewKey) === "threads" || (chOf(previewKey) === "facebook" && fbView === "feed")) && <Seg value={theme} set={setTheme} items={[["light", "Light"], ["dark", "Dark"]]} label="App theme" />}
          <p className="cx-note">{previewKey ? PREVIEW_NOTE[chOf(previewKey)] : "Pick a channel to see its preview."}</p>
          {notes.map(([t, good]) => <p key={t} className={good ? "cx-good" : "cx-warn"}>{t}</p>)}
        </aside>
      </form>

      {sheet && (
        <div className="cx-sheet-wrap" onClick={(e) => e.target === e.currentTarget && setSheet(false)}>
          <div className="cx-sheet" role="dialog" aria-modal="true" aria-labelledby="cx-sheet-h">
            <span className="cx-grab" aria-hidden="true" />
            <h2 id="cx-sheet-h">Channels</h2>
            <p className="np-muted">Connect once, then pick the channel whenever you post. You sign in on each app&apos;s own page; Rezekii never sees your password.</p>
            {tiktok.map((a) => <Row key={a.open_id} icon={<BrandIcon ch="tiktok" size={34} />} title="TikTok" sub={a.username ? `@${a.username}` : "Connected"} action={<span className="badge">Connected</span>} />)}
            {social.map((a) => <Row key={a.id} icon={<BrandIcon ch={a.platform} size={34} />} title={a.name ?? NAMES[a.platform]} sub={`${NAMES[a.platform]}${a.username ? ` · @${a.username}` : ""}${a.status === "reconnect" ? " · needs reconnecting" : ""}`} action={a.status === "reconnect" ? <a className="np-btn" href={`/api/auth/meta/${a.platform}/start`}>Reconnect</a> : <button type="button" className="btn-outline" onClick={() => disconnect(a)}>Disconnect</button>} />)}
            {(["facebook", "instagram", "threads"] as Platform[]).map((p) => <Row key={p} icon={<BrandIcon ch={p} size={34} />} title={`Connect ${NAMES[p]}`} sub={p === "facebook" ? "Pick which Pages after signing in" : p === "instagram" ? "Business or Creator account" : "Your Threads profile"} action={<a className="np-btn" href={`/api/auth/meta/${p}/start`}>Connect</a>} />)}
            <p className="np-muted">Facebook Groups can&apos;t be added: Meta closed posting to Groups for all apps in 2024.</p>
            <button type="button" className="np-btn" onClick={() => setSheet(false)}>Done</button>
          </div>
        </div>
      )}
    </>
  );
}

const PREVIEW_NOTE: Record<Channel, string> = {
  tiktok: "As it appears on the For You feed.",
  instagram: "As it appears in the Reels viewer. Follow shows for people who don't follow you yet.",
  facebook: "Facebook shares videos as Reels. Switch to Feed to see the same post in the News Feed.",
  threads: "As it appears in the Threads feed. The video lines up with the text.",
};

/** Notes under the phone where a channel treats the post differently. [text, informational] */
function previewNotes(ch: Channel, caption: string, comment: string, hasLink: boolean, remind: boolean, fbView: "reels" | "feed"): [string, boolean][] {
  const out: [string, boolean][] = [];
  if (ch === "tiktok" && hasLink) out.push(["The product link isn't added on TikTok: links in TikTok captions can't be tapped. The product goes in the yellow basket (beg kuning).", false]);
  if (ch === "instagram" && links(caption).length) out.push(["Instagram shows the link as plain text. It can't be tapped.", false]);
  if (ch === "instagram" && comment) out.push([`The first comment goes out right after the Reel is published.${links(comment).length ? " Links in Instagram comments can't be tapped either." : ""}`, true]);
  if (ch === "facebook" && fbView === "reels" && links(caption).length) out.push(["Links in Facebook Reels captions can't be tapped. The link in the first comment can.", false]);
  if (ch === "facebook" && (links(caption).length || links(comment).length)) out.push(["Facebook is testing a limit of 2 posts or comments with links a month for Pages without Meta One. Over the limit, links may not be tappable.", false]);
  if (ch === "facebook" && hasLink && remind) out.push(["After posting, add the Shopee product link in Facebook (Monetization). Rezekii keeps a reminder until you tick Done.", true]);
  if (ch === "facebook" && comment) out.push(["The first comment goes out from the Page right after posting.", true]);
  if (ch === "threads" && comment) out.push(["The first comment goes out as your own reply under the post, right after it's published.", true]);
  return out;
}

function ChannelPane(p: { ch: Channel; name: string; text: string; edited: boolean; captionLength: number; linkAdded: boolean; place: Placement; comment: string; commentEdited: boolean; onText: (v: string) => void; onResetText: () => void; onPlace: (p: Placement) => void; onComment: (v: string) => void; onResetComment: () => void }) {
  const tt = p.ch === "tiktok";
  return (
    <>
      <div className="cx-row"><b>{p.name} caption</b>{p.edited ? <button type="button" className="cx-link" onClick={p.onResetText}>Use Rezekii&apos;s version</button> : <small className="np-muted">Rezekii&apos;s version · edit to change</small>}</div>
      <textarea className="np-input" rows={5} value={p.text} onChange={(e) => p.onText(e.target.value)} aria-label={`${p.name} caption`} />
      <span className={`np-count${p.captionLength > CAPTION_MAX[p.ch] ? " over" : ""}`}>{p.captionLength.toLocaleString("en-US")} / {CAPTION_MAX[p.ch].toLocaleString("en-US")}{p.linkAdded ? " · the link is added at the end" : ""}</span>
      <div className="cx-row" style={{ justifyContent: "flex-start" }}>
        <small className="np-muted">Product link</small>
        <button type="button" className="cx-chip" disabled={tt} aria-pressed={p.place.caption} onClick={() => p.onPlace({ ...p.place, caption: !p.place.caption })}>{p.place.caption ? "✓ " : ""}In the caption</button>
        <button type="button" className="cx-chip" disabled={tt} aria-pressed={p.place.comment} onClick={() => p.onPlace({ ...p.place, comment: !p.place.comment })}>{p.place.comment ? "✓ " : ""}In the first comment</button>
      </div>
      {tt ? (
        <p className="cx-info">TikTok captions can&apos;t hold a link that people can tap, and TikTok doesn&apos;t let apps post comments, so the link stays off. The product goes in the yellow basket (beg kuning).</p>
      ) : (
        <>
          <div className="cx-row"><b>First comment</b>{p.commentEdited ? <button type="button" className="cx-link" onClick={p.onResetComment}>Use Rezekii&apos;s version</button> : <small className="np-muted">Optional · posted right after the post</small>}</div>
          <textarea className="np-input" rows={3} value={p.comment} onChange={(e) => p.onComment(e.target.value)} placeholder="Optional. Posted as your first comment right after the post goes out." aria-label={`${p.name} first comment`} />
          <span className="np-count">{lengthFor(p.ch, p.comment).toLocaleString("en-US")} / {COMMENT_MAX[p.ch as Platform].toLocaleString("en-US")}</span>
          {p.ch === "instagram" && (p.place.caption || p.place.comment) && <p className="cx-warn">Links can&apos;t be tapped on Instagram, in captions or in comments.</p>}
        </>
      )}
    </>
  );
}

function Seg<T extends string>({ value, set, items, label }: { value: T; set: (v: T) => void; items: [T, string][]; label: string }) {
  return <div className="cx-tabs" role="tablist" aria-label={label}>{items.map(([v, l]) => <button key={v} type="button" role="tab" aria-selected={value === v} onClick={() => set(v)}>{l}</button>)}</div>;
}

function Row({ icon, title, sub, action }: { icon: ReactNode; title: string; sub: string; action: ReactNode }) {
  return <div className="cx-ch">{icon}<span><b>{title}</b><small>{sub}</small></span>{action}</div>;
}
