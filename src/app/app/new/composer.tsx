"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { CreatorInfo, PrivacyLevel } from "@/integrations/tiktok/posting.ts";
import type { PublicAccount } from "@/modules/social/accounts.ts";
import type { Brand } from "@/modules/social/brands.ts";
import { consentLine, postProblems, type PostChoice } from "@/modules/posting/rules.ts";
import { brandChannels, brandPicked, cleanPick, isTikTokKey, openIdOf, tiktokKey, toggleBrand, toggleChannel } from "@/modules/social/picker.ts";
import { CAPTION_MAX, COMMENT_MAX, DEFAULT_PLACEMENT, NAMES, autoCaption, autoComment, channelProblems, channelWarnings, lengthFor, links, postedCaption, type Channel, type Placement, type Platform } from "@/modules/social/rules.ts";
import { BrandIcon } from "../brand-icons";
import { PhonePreview, type Who } from "./phone-previews";
import "./composer.css";

type Info = CreatorInfo & { nextRecommended: string };
type When = "now" | "recommended" | "pick" | "draft";
export type TikTokAccount = { open_id: string; username: string | null; avatar_url: string | null };
const TT = "tiktok";
const APPS: Channel[] = ["tiktok", "facebook", "instagram", "threads"];
const UNIT: Record<Channel, [string, string]> = { tiktok: ["account", "accounts"], facebook: ["Page", "Pages"], instagram: ["account", "accounts"], threads: ["profile", "profiles"] };
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
const SEARCH_ICON = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;

/** One channel as New post shows it: a TikTok account or a connected Page/account/profile. */
type Ch = { key: string; app: Channel; name: string; sub: string; avatar: string | null; status: "active" | "reconnect"; account?: PublicAccount };

/** A profile picture; falls back to the app's icon when there's none or the link has expired. */
function Face({ ch, badge = true }: { ch: Pick<Ch, "app" | "avatar">; badge?: boolean }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className="cx-face">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {ch.avatar && !broken ? <img src={ch.avatar} alt="" onError={() => setBroken(true)} /> : <BrandIcon ch={ch.app} size={26} />}
      {badge && ch.avatar && !broken && <span className="badge-pi"><BrandIcon ch={ch.app} size={12} /></span>}
    </span>
  );
}

/**
 * New post for Admins (design C with brands, docs/flows/social-posting.md). Pick channels by brand, by Same as last post or
 * one by one; nothing is picked by default. One main caption; Rezekii writes each app's version (editable), places the
 * product link where each app works best, adds first comments, and shows a phone preview per app. TikTok keeps every
 * setting its Content Sharing Guidelines require.
 */
export function Composer({ tiktok, social: initialSocial, brands: initialBrands, last, connect }: { tiktok: TikTokAccount[]; social: PublicAccount[]; brands: Brand[]; last: string[]; connect: { channel: string; result: string } | null }) {
  const [social, setSocial] = useState(initialSocial);
  const [brands, setBrands] = useState(initialBrands);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const finder = useRef<HTMLDivElement>(null);
  // The channel list stays open while picking several; a tap anywhere else closes it.
  useEffect(() => {
    if (!listOpen) return;
    const away = (e: PointerEvent) => { if (!finder.current?.contains(e.target as Node)) setListOpen(false); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [listOpen]);
  const [main, setMain] = useState("");
  const [link, setLink] = useState("");
  const [remind, setRemind] = useState(true);
  const [capOver, setCapOver] = useState<Partial<Record<Channel, string>>>({});
  const [comOver, setComOver] = useState<Partial<Record<Channel, string>>>({});
  const [place, setPlace] = useState<Partial<Record<Channel, Placement>>>({});
  const [tab, setTab] = useState<"main" | Channel>("main");
  const [source, setSource] = useState<"upload" | "link">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [infoFor, setInfoFor] = useState<{ acct: string; info?: Info; error?: string } | null>(null);
  const [mode, setMode] = useState<"direct" | "inbox">("direct");
  const [privacy, setPrivacy] = useState<PrivacyLevel | "">("");
  const [allow, setAllow] = useState({ comments: false, duet: false, stitch: false });
  const [promo, setPromo] = useState({ on: false, own: false, branded: false });
  const [isAigc, setIsAigc] = useState(false);
  const [when, setWhen] = useState<When>("recommended");
  const [pickAt, setPickAt] = useState("");
  const [previewApp, setPreviewApp] = useState<Channel>(TT);
  const [previewAcct, setPreviewAcct] = useState("");
  const [fbView, setFbView] = useState<"reels" | "feed">("reels");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [sheet, setSheet] = useState<"" | "channels" | "brands">("");
  // The preview measures text, so it renders in the browser only.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [busy, setBusy] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState<{ summary: string; at: string | null; draft: boolean } | null>(null);
  const [toast, setToast] = useState(() => (connect && CONNECT_MSG[connect.result] ? CONNECT_MSG[connect.result](NAMES[connect.channel as Platform] ?? "The channel") : ""));

  // Every channel, TikTok accounts first; only active ones can be picked.
  const channels: Ch[] = useMemo(() => [
    ...tiktok.map((a): Ch => ({ key: tiktokKey(a.open_id), app: "tiktok", name: a.username ? `@${a.username}` : "TikTok", sub: "TikTok", avatar: a.avatar_url, status: "active" })),
    ...social.map((a): Ch => ({ key: a.id, app: a.platform, name: a.name ?? NAMES[a.platform], sub: a.platform === "facebook" ? "Facebook Page" : a.username ? `@${a.username}` : NAMES[a.platform], avatar: a.avatar_url, status: a.status, account: a })),
  ], [tiktok, social]);
  const byKey = useMemo(() => new Map(channels.map((c) => [c.key, c])), [channels]);
  const connected = useMemo(() => new Set(channels.filter((c) => c.status === "active").map((c) => c.key)), [channels]);
  const pick = (next: Set<string>) => setPicked(next);

  const ttKey = [...picked].find((k) => isTikTokKey(k) && connected.has(k));
  const ttAccount = ttKey ? openIdOf(ttKey) : "";
  // TikTok requires fresh creator info every time the posting screen opens for an account.
  useEffect(() => {
    if (!ttAccount) return;
    let live = true;
    fetch(`/api/posts/creator-info?account=${encodeURIComponent(ttAccount)}`, { cache: "no-store" })
      .then(async (r) => (await r.json()) as Info & { error?: string })
      .then((d) => live && setInfoFor(d.error ? { acct: ttAccount, error: d.error } : { acct: ttAccount, info: d }))
      .catch(() => live && setInfoFor({ acct: ttAccount, error: "Couldn't reach TikTok. Check your connection and try again." }));
    return () => { live = false; };
  }, [ttAccount]);
  const info = infoFor?.acct === ttAccount ? (infoFor.info ?? null) : null;
  const infoError = infoFor?.acct === ttAccount ? (infoFor.error ?? "") : "";
  const priv: PrivacyLevel | "" = privacy && info?.privacy_level_options.includes(privacy) ? privacy : "";

  const videoUrl = useMemo(() => (source === "upload" ? (file ? URL.createObjectURL(file) : null) : /^https:\/\//.test(linkUrl) ? linkUrl : null), [source, file, linkUrl]);
  useEffect(() => () => { if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  // Posting keys: "tiktok" for the picked TikTok account, then the picked Meta channels.
  const metaPicked = social.filter((a) => picked.has(a.id) && a.status === "active");
  const keys = [...(ttKey ? [TT] : []), ...metaPicked.map((a) => a.id)];
  const chOf = (key: string): Channel => (key === TT ? "tiktok" : (social.find((a) => a.id === key)?.platform ?? "facebook"));
  const apps = APPS.filter((p) => keys.some((k) => chOf(k) === p));
  const inApp = (p: Channel) => keys.filter((k) => chOf(k) === p);
  const placeOf = (p: Channel) => place[p] ?? DEFAULT_PLACEMENT[p];
  const textOf = (p: Channel) => capOver[p] ?? autoCaption(p, main, placeOf(p));
  const captionOf = (p: Channel) => postedCaption(p, textOf(p), link.trim(), placeOf(p));
  const commentOf = (p: Channel) => (p === "tiktok" ? "" : (comOver[p] ?? autoComment(p, link.trim(), placeOf(p))));
  const appLabel = (p: Channel) => { const n = inApp(p).length; return n > 1 ? `${NAMES[p]} · ${n} ${UNIT[p][1]}` : NAMES[p]; };
  const summary = () => apps.map((p) => { const n = inApp(p).length; return n > 1 ? `${n} ${NAMES[p]} ${UNIT[p][1]}` : p === "tiktok" ? `TikTok ${byKey.get(ttKey ?? "")?.name ?? ""}`.trim() : `${NAMES[p]} ${byKey.get(inApp(p)[0])?.name ?? ""}`.trim(); }).join(", ");
  const who = (key: string): Who => {
    if (key === TT) return { name: info?.creator_nickname || info?.creator_username || "TikTok", username: info?.creator_username || "", avatar: info?.creator_avatar_url ?? null };
    const a = social.find((x) => x.id === key);
    return { name: a?.name ?? "", username: a?.username ?? a?.name ?? "", avatar: a?.avatar_url ?? null };
  };
  const pApp = apps.includes(previewApp) ? previewApp : apps[0];
  const pKey = pApp ? (inApp(pApp).includes(previewAcct) ? previewAcct : inApp(pApp)[0]) : undefined;
  const activeTab = tab !== "main" && apps.includes(tab) ? tab : "main";

  const choice: PostChoice = { mode, caption: captionOf("tiktok"), privacyLevel: priv || null, allowComments: allow.comments, allowDuet: allow.duet, allowStitch: allow.stitch, promo: promo.on, brandOrganic: promo.own, brandedContent: promo.branded, isAigc, durationSec };
  const problems = (() => {
    const out: string[] = [];
    if (!keys.length) out.push("Pick at least one channel.");
    if (source === "upload" ? !file : !/^https:\/\/\S+$/.test(linkUrl)) out.push("Add a video: upload one or paste an https link.");
    if (ttKey && info && when !== "draft") out.push(...postProblems(choice, info));
    for (const p of apps) if (p !== "tiktok") out.push(...channelProblems(p, captionOf(p), commentOf(p), durationSec));
    if (when === "pick" && !pickAt) out.push("Pick a date and time.");
    return out;
  })();
  const warnings = apps.flatMap((p) => channelWarnings(p, captionOf(p)));

  async function disconnect(a: PublicAccount) {
    const r = await fetch(`/api/social/accounts/${a.id}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) return setToast("Couldn't disconnect. Try again.");
    setSocial((s) => s.filter((x) => x.id !== a.id));
    setPicked((s) => new Set([...s].filter((k) => k !== a.id)));
    setToast(`${a.name ?? NAMES[a.platform]} disconnected. Its scheduled posts were cancelled.`);
  }
  function sameAsLast() {
    const next = cleanPick(last, connected);
    if (!next.size) return setToast("The channels of your last post aren't connected any more.");
    pick(next);
    setToast(`Same channels as your last post: ${[...next].map((k) => byKey.get(k)?.name).filter(Boolean).slice(0, 4).join(", ")}${next.size > 4 ? ` and ${next.size - 4} more` : ""}.`);
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
      if (ttKey) {
        const r = await fetch("/api/posts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...choice, ...video, when: at, consent: true, account: ttAccount }) });
        const d = (await r.json()) as { post?: { id: string; scheduled_at: string | null; status: string }; error?: string | string[] };
        if (!r.ok || !d.post) throw new Error(Array.isArray(d.error) ? d.error.join(" ") : d.error || "TikTok post couldn't be saved.");
        tiktokPost = d.post;
      }
      let at2: string | null = tiktokPost?.scheduled_at ?? null;
      if (metaPicked.length) {
        const r = await fetch("/api/social/posts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...video, durationSec, when: at, tiktokPostId: tiktokPost?.id, channels: metaPicked.map((a) => ({ accountId: a.id, caption: captionOf(a.platform), firstComment: commentOf(a.platform), linkReminder: a.platform === "facebook" && remind && !!link.trim() })) }),
        });
        const d = (await r.json()) as { posts?: { scheduled_at: string | null }[]; error?: string | string[] };
        if (!r.ok || !d.posts) throw new Error(`${tiktokPost ? "The TikTok post was saved, but " : ""}${Array.isArray(d.error) ? d.error.join(" ") : d.error || "the other channels couldn't be saved."}`);
        at2 ??= d.posts[0]?.scheduled_at ?? null;
      }
      setDone({ summary: summary(), at: at2, draft: when === "draft" });
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
        <p>{done.draft ? `Saved in Rezekii for ${done.summary}.` : `${done.summary}${done.at && when !== "now" ? `: ${myt(done.at)} (Malaysia time)` : ": posting now"}.`} You&apos;ll see each channel&apos;s status in All channels.</p>
        <div className="np-row"><Link href="/app/posts" className="np-btn">See it in All channels</Link><button type="button" className="btn-outline" onClick={() => window.location.reload()}>New post</button></div>
      </section>
    );
  }

  const counts = apps.map((p) => { const n = lengthFor(p, captionOf(p)); const max = CAPTION_MAX[p]; return <span key={p} className={n > max ? "over" : ""}><BrandIcon ch={p} size={14} />{n.toLocaleString("en-US")} / {max.toLocaleString("en-US")}</span>; });
  const linkWhere = (p: Channel) => { const pl = placeOf(p); return p === "tiktok" ? "not added (the product goes in the yellow basket)" : pl.caption && pl.comment ? "caption and first comment" : pl.caption ? "caption" : pl.comment ? "first comment" : "not added"; };
  const notes = pApp ? previewNotes(pApp, captionOf(pApp), commentOf(pApp), !!link.trim(), remind, fbView) : [];
  const q = query.trim().toLowerCase();
  const results = channels.filter((c) => c.status === "active" && (!q || `${c.name} ${c.sub} ${NAMES[c.app]}`.toLowerCase().includes(q)));
  const missing = APPS.filter((p) => !channels.some((c) => c.app === p));
  const pickedChs = channels.filter((c) => picked.has(c.key) && connected.has(c.key));

  return (
    <>
      {toast && <p className="np-note" role="status" style={{ marginBottom: 12 }}>{toast} <button type="button" className="cx-link" onClick={() => setToast("")}>Close</button></p>}
      <form className="cx" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        <div className="cx-col">
          <section className="card">
            <div className="cx-bar">
              <h2>Post to</h2>
              <span className="cx-links">
                {last.length > 0 && <button type="button" className="cx-link" onClick={sameAsLast}>Same as last post</button>}
                <button type="button" className="cx-link" onClick={() => setSheet("brands")}>Manage brands</button>
                <button type="button" className="cx-link" onClick={() => setSheet("channels")}>Channels · {channels.length}</button>
              </span>
            </div>
            <div className="cx-group">
              <span className="cx-gh">Brands</span>
              <div className="cx-chips">
                {brands.map((b) => {
                  const live = brandChannels(b.channels, connected);
                  const bApps = APPS.filter((p) => live.some((k) => byKey.get(k)?.app === p));
                  return (
                    <button key={b.id} type="button" className="cx-chip cx-brand" aria-pressed={brandPicked(b.channels, picked, connected)} disabled={!live.length} onClick={() => pick(toggleBrand(picked, b.channels, connected))} title={live.length ? undefined : "None of this brand's channels are connected"}>
                      <span className="cx-faces">{live.slice(0, 3).map((k) => { const c = byKey.get(k); return c ? <Face key={k} ch={c} badge={false} /> : null; })}</span>
                      <span className="cx-blabel"><span>{b.name}</span><small>{live.length} · {bApps.map((p) => NAMES[p]).join(", ") || "not connected"}</small></span>
                    </button>
                  );
                })}
                {missing.map((p) => <a key={p} className="cx-chip add" href={p === "tiktok" ? "/api/auth/tiktok/start" : `/api/auth/meta/${p}/start`}>+ {NAMES[p]}</a>)}
              </div>
              {!brands.length && <p className="np-muted">Group the channels you post to together, like a brand&apos;s Facebook Page, Instagram and TikTok. Then one tap picks them all. <button type="button" className="cx-link" onClick={() => setSheet("brands")}>Create a brand</button></p>}
            </div>
            <div className="cx-finder" ref={finder}>
              <label className="cx-search">{SEARCH_ICON}<input className="np-input" type="search" value={query} onChange={(e) => { setQuery(e.target.value); setListOpen(true); }} onFocus={() => setListOpen(true)} onKeyDown={(e) => e.key === "Escape" && setListOpen(false)} placeholder={`Pick or search channels (${connected.size})`} aria-label="Pick or search channels" role="combobox" aria-expanded={listOpen} aria-controls="cx-channel-list" /></label>
              {listOpen && (
                <div id="cx-channel-list" className="cx-results" role="listbox" aria-label="Connected channels" aria-multiselectable="true">
                  {APPS.map((p) => {
                    const list = results.filter((c) => c.app === p);
                    return list.length ? (
                      <div key={p} className="cx-group">
                        <span className="cx-gh"><BrandIcon ch={p} size={16} />{NAMES[p]} · {list.length}</span>
                        {list.map((c) => <button key={c.key} type="button" role="option" aria-selected={picked.has(c.key)} className="cx-res" onClick={() => pick(toggleChannel(picked, c.key, connected))}><Face ch={c} /><span>{c.name}</span><small>{c.app === "facebook" ? "" : c.sub}</small><i className="cx-tick" aria-hidden="true">{picked.has(c.key) ? "✓" : ""}</i></button>)}
                      </div>
                    ) : null;
                  })}
                  {!results.length && <p className="np-muted" style={{ padding: 6 }}>{q ? <>No channel matches &quot;{query}&quot;.</> : "No channels connected yet."}</p>}
                  <button type="button" className="cx-link cx-done" onClick={() => setListOpen(false)}>Done</button>
                </div>
              )}
            </div>
            {pickedChs.length > 0 ? (
              <div className="cx-picked">
                {APPS.filter((p) => pickedChs.some((c) => c.app === p)).map((p) => (
                  <div key={p} className="cx-group">
                    <span className="cx-gh"><BrandIcon ch={p} size={16} />{NAMES[p]}</span>
                    <div className="cx-tags">{pickedChs.filter((c) => c.app === p).map((c) => <span key={c.key} className="cx-tag"><Face ch={c} badge={false} /><span>{c.name}</span><button type="button" aria-label={`Remove ${c.name}`} onClick={() => pick(toggleChannel(picked, c.key, connected))}>×</button></span>)}</div>
                  </div>
                ))}
              </div>
            ) : <p className="np-muted">Nothing picked yet: pick a brand, use Same as last post, or search for a channel.</p>}
            {ttKey && infoError && <p className="np-error" role="alert">{infoError}</p>}
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
            {durationSec !== null && <p className="np-muted">Length {Math.floor(durationSec / 60)}:{String(durationSec % 60).padStart(2, "0")}{apps.includes("facebook") ? ` · Facebook: ${durationSec >= 3 && durationSec <= 90 ? "goes out as a Reel" : "goes out as a Page video (Reels are 3–90 s)"}` : ""}</p>}
          </section>

          <section className="card">
            <h2>Caption</h2>
            {apps.length > 0 && (
              <div className="cx-tabs" role="tablist" aria-label="Caption for">
                {([["main", "Main"], ...apps.map((p) => [p, appLabel(p)])] as ["main" | Channel, string][]).map(([k, l]) => (
                  <button key={k} type="button" role="tab" aria-selected={activeTab === k} onClick={() => setTab(k)}>{k !== "main" && <BrandIcon ch={k} size={16} />}{l}{k !== "main" && (capOver[k] !== undefined || comOver[k] !== undefined) && <i className="dot" title="Edited" />}</button>
                ))}
              </div>
            )}
            {activeTab === "main" ? (
              <>
                <textarea className="np-input" rows={5} value={main} onChange={(e) => setMain(e.target.value)} placeholder="Write your caption and hashtags. Rezekii writes each app's version from it." aria-label="Main caption" />
                <p className="np-muted">Rezekii writes each app&apos;s version from this: a short TikTok caption pointing to the yellow basket, Instagram pointing to the link in bio, at most 5 hashtags on both, one topic on Threads, and the link where each app works best. Open an app&apos;s tab to check or change its version; every Page or account of that app gets it.</p>
                {counts.length > 0 && <div className="cx-counts" aria-label="Characters per app">{counts}</div>}
              </>
            ) : (
              <ChannelPane
                ch={activeTab}
                name={appLabel(activeTab)}
                text={textOf(activeTab)}
                edited={capOver[activeTab] !== undefined}
                captionLength={lengthFor(activeTab, captionOf(activeTab))}
                linkAdded={!!link.trim() && placeOf(activeTab).caption && activeTab !== "tiktok"}
                place={placeOf(activeTab)}
                comment={commentOf(activeTab)}
                commentEdited={comOver[activeTab] !== undefined}
                onText={(v) => setCapOver((o) => ({ ...o, [activeTab]: v }))}
                onResetText={() => setCapOver((o) => { const n = { ...o }; delete n[activeTab]; return n; })}
                onPlace={(pl) => setPlace((o) => ({ ...o, [activeTab]: pl }))}
                onComment={(v) => setComOver((o) => ({ ...o, [activeTab]: v }))}
                onResetComment={() => setComOver((o) => { const n = { ...o }; delete n[activeTab]; return n; })}
              />
            )}
            {warnings.length > 0 && <p className="cx-warn">{[...new Set(warnings)].join(" ")}</p>}
          </section>

          <section className="card">
            <h2>Product link</h2>
            <input className="np-input" type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value.trim())} placeholder="https://… (Shopee or TikTok Shop)" aria-label="Product link" />
            {apps.length > 0 && <ul className="cx-how">{apps.map((p) => <li key={p}><BrandIcon ch={p} size={18} /><span><b>{appLabel(p)}:</b> {linkWhere(p)}</span></li>)}</ul>}
            {apps.length > 0 && <p className="np-muted">Change where it goes in each app&apos;s caption tab.</p>}
            {apps.includes("facebook") && link.trim() && (
              <div className="np-switchrow">
                <span><b>Remind me to add the Shopee product link on Facebook</b><small>Facebook&apos;s &quot;Add a product link&quot; (Monetization) can only be added in Facebook. Rezekii keeps a reminder on each Facebook post until you tick Done.</small></span>
                <button type="button" role="switch" aria-checked={remind} className={remind ? "np-switch on" : "np-switch"} onClick={() => setRemind(!remind)} aria-label="Remind me to add the product link"><span /></button>
              </div>
            )}
          </section>

          {ttKey && (
            <section className="card np-sec">
              <h2>TikTok settings</h2>
              <div className="np-seg" role="radiogroup" aria-label="Where to send it">
                <button type="button" role="radio" aria-checked={mode === "direct"} className={mode === "direct" ? "on" : ""} onClick={() => setMode("direct")}>Post to TikTok</button>
                <button type="button" role="radio" aria-checked={mode === "inbox"} className={mode === "inbox" ? "on" : ""} onClick={() => setMode("inbox")}>Send to TikTok drafts</button>
              </div>
              {mode === "direct" && (
                <>
                  <label htmlFor="cx-privacy"><b>Who can view this post</b></label>
                  <select id="cx-privacy" className="np-input" value={priv} onChange={(e) => setPrivacy(e.target.value as PrivacyLevel)} required>
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
                      <label className="np-check"><input type="checkbox" checked={promo.branded} onChange={(e) => { setPromo((p) => ({ ...p, branded: e.target.checked })); if (e.target.checked && priv === "SELF_ONLY") setPrivacy(""); }} />Branded content<small>You are promoting another brand or a third party.</small></label>
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
          {ttKey && mode === "direct" && when !== "draft" && <p className="np-consent">{consentLine(choice)}</p>}
          <button type="submit" className="np-btn np-submit" disabled={!!busy || (!!ttKey && !info && when !== "draft")}>
            {busy || `${when === "draft" ? "Save draft" : when === "now" ? "Post now" : "Schedule"} · ${keys.length} channel${keys.length === 1 ? "" : "s"}`}
          </button>
        </div>

        <aside className="cx-side" aria-label="Preview">
          {apps.length > 0 && (
            <div className="cx-tabs" role="tablist" aria-label="Preview app">
              {apps.map((p) => <button key={p} type="button" role="tab" aria-selected={pApp === p} onClick={() => setPreviewApp(p)}><BrandIcon ch={p} size={16} />{NAMES[p]}</button>)}
            </div>
          )}
          {pApp && inApp(pApp).length > 1 && (
            <label className="cx-showing">Showing
              <select className="np-input" value={pKey} onChange={(e) => setPreviewAcct(e.target.value)}>{inApp(pApp).map((k) => <option key={k} value={k}>{byKey.get(k)?.name}</option>)}</select>
            </label>
          )}
          {mounted && pApp && pKey ? <PhonePreview channel={pApp} caption={captionOf(pApp)} comment={commentOf(pApp)} video={videoUrl} who={who(pKey)} fbView={fbView} theme={theme} /> : <div className="pv-phone"><div className="pv-scr" /></div>}
          {pApp === "facebook" && <Seg value={fbView} set={setFbView} items={[["reels", "Reels"], ["feed", "Feed"]]} label="Facebook view" />}
          {(pApp === "threads" || (pApp === "facebook" && fbView === "feed")) && <Seg value={theme} set={setTheme} items={[["light", "Light"], ["dark", "Dark"]]} label="App theme" />}
          <p className="cx-note">{pApp ? PREVIEW_NOTE[pApp] : "Pick a channel to see its preview."}</p>
          {notes.map(([t, good]) => <p key={t} className={good ? "cx-good" : "cx-warn"}>{t}</p>)}
        </aside>
      </form>

      {sheet === "channels" && <ChannelsSheet channels={channels} onDisconnect={disconnect} onClose={() => setSheet("")} />}
      {sheet === "brands" && <BrandsSheet brands={brands} channels={channels} byKey={byKey} connected={connected} onSaved={(b) => setBrands((list) => [...list.filter((x) => x.id !== b.id), b].sort((x, y) => x.name.localeCompare(y.name)))} onDeleted={(id) => setBrands((list) => list.filter((x) => x.id !== id))} onClose={() => setSheet("")} />}
    </>
  );
}

const PREVIEW_NOTE: Record<Channel, string> = {
  tiktok: "As it appears on the For You feed.",
  instagram: "As it appears in the Reels viewer. Follow shows for people who don't follow you yet.",
  facebook: "Facebook shares videos as Reels. Switch to Feed to see the same post in the News Feed.",
  threads: "As it appears in the Threads feed. The video lines up with the text.",
};

/** Notes under the phone where an app treats the post differently. [text, informational] */
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

function Sheet({ title, extra, onClose, children }: { title: string; extra?: ReactNode; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="cx-sheet-wrap" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cx-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <span className="cx-grab" aria-hidden="true" />
        <div className="cx-bar"><h2>{title}</h2>{extra}</div>
        {children}
      </div>
    </div>
  );
}

/** Channels: everything connected, grouped by app, with a search for long lists of Pages. */
function ChannelsSheet({ channels, onDisconnect, onClose }: { channels: Ch[]; onDisconnect: (a: PublicAccount) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const s = q.trim().toLowerCase();
  return (
    <Sheet title="Channels" onClose={onClose}>
      <p className="np-muted">Connect once, then pick the channel whenever you post. You sign in on each app&apos;s own page; Rezekii never sees your password.</p>
      {channels.length > 8 && <label className="cx-search">{SEARCH_ICON}<input className="np-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${channels.length} channels`} aria-label="Search channels" /></label>}
      {APPS.map((p) => {
        const list = channels.filter((c) => c.app === p && (!s || `${c.name} ${c.sub}`.toLowerCase().includes(s)));
        if (s && !list.length) return null;
        return (
          <div key={p} className="cx-group">
            <span className="cx-gh"><BrandIcon ch={p} size={16} />{NAMES[p]}{list.length ? ` · ${list.length}` : ""}</span>
            {list.map((c) => (
              <div key={c.key} className="cx-ch">
                <Face ch={c} />
                <span><b>{c.name}</b><small>{c.sub}{c.status === "reconnect" ? " · needs reconnecting" : ""}</small></span>
                {c.app === "tiktok" ? <span className="badge">Connected</span> : c.status === "reconnect" ? <a className="np-btn" href={`/api/auth/meta/${c.app}/start`}>Reconnect</a> : <button type="button" className="btn-outline" onClick={() => c.account && onDisconnect(c.account)}>Disconnect</button>}
              </div>
            ))}
            {!s && <div className="cx-ch"><BrandIcon ch={p} size={34} /><span><b>{list.length ? `Add ${UNIT[p][1]}` : `Connect ${NAMES[p]}`}</b><small>{p === "facebook" ? "Pick which Pages after signing in" : p === "instagram" ? "Business or Creator account" : p === "threads" ? "Your Threads profile" : "Your TikTok account"}</small></span><a className="np-btn" href={p === "tiktok" ? "/api/auth/tiktok/start" : `/api/auth/meta/${p}/start`}>Connect</a></div>}
          </div>
        );
      })}
      <p className="np-muted">Facebook Groups can&apos;t be added: Meta closed posting to Groups for all apps in 2024.</p>
      <button type="button" className="np-btn" onClick={onClose}>Done</button>
    </Sheet>
  );
}

/** Brands: create, rename, change channels, delete. A channel can be in more than one brand. */
function BrandsSheet({ brands, channels, byKey, connected, onSaved, onDeleted, onClose }: { brands: Brand[]; channels: Ch[]; byKey: Map<string, Ch>; connected: Set<string>; onSaved: (b: Brand) => void; onDeleted: (id: string) => void; onClose: () => void }) {
  const [edit, setEdit] = useState<{ id?: string; name: string; channels: string[] } | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const open = (b: { id?: string; name: string; channels: string[] }) => { setEdit({ ...b, channels: [...b.channels] }); setQ(""); setError(""); setConfirmDelete(false); };

  async function save() {
    if (!edit) return;
    setBusy(true);
    setError("");
    const r = await fetch(edit.id ? `/api/social/brands/${edit.id}` : "/api/social/brands", { method: edit.id ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: edit.name, channels: edit.channels }) }).catch(() => null);
    const d = (await r?.json().catch(() => ({}))) as { brand?: Brand; error?: string };
    setBusy(false);
    if (!r?.ok || !d.brand) return setError(d.error ?? "Couldn't save the brand. Try again.");
    onSaved(d.brand);
    setEdit(null);
  }
  async function remove() {
    if (!edit?.id) return;
    setBusy(true);
    const r = await fetch(`/api/social/brands/${edit.id}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (!r?.ok) return setError("Couldn't delete the brand. Try again.");
    onDeleted(edit.id);
    setEdit(null);
  }

  if (edit) {
    const s = q.trim().toLowerCase();
    const toggle = (k: string) => setEdit((e) => (e ? { ...e, channels: e.channels.includes(k) ? e.channels.filter((x) => x !== k) : [...e.channels, k] } : e));
    return (
      <Sheet title={edit.id ? "Edit brand" : "New brand"} extra={<button type="button" className="cx-link" onClick={() => setEdit(null)}>Back</button>} onClose={onClose}>
        <label className="cx-field"><b>Brand name</b><input className="np-input" type="text" value={edit.name} maxLength={60} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="e.g. Spinelief+" autoFocus /></label>
        <p className="np-muted">{edit.channels.length} channel{edit.channels.length === 1 ? "" : "s"} in this brand. A channel can be in more than one brand.</p>
        {channels.length > 8 && <label className="cx-search">{SEARCH_ICON}<input className="np-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${channels.length} channels`} aria-label="Search channels" /></label>}
        {APPS.map((p) => {
          const list = channels.filter((c) => c.app === p && (!s || `${c.name} ${c.sub}`.toLowerCase().includes(s)));
          return list.length ? (
            <div key={p} className="cx-group">
              <span className="cx-gh"><BrandIcon ch={p} size={16} />{NAMES[p]}</span>
              {list.map((c) => <label key={c.key} className="cx-check"><Face ch={c} /><span><b>{c.name}</b><small>{c.sub}{c.status === "reconnect" ? " · needs reconnecting" : ""}</small></span><input type="checkbox" checked={edit.channels.includes(c.key)} onChange={() => toggle(c.key)} /></label>)}
            </div>
          ) : null;
        })}
        {error && <p className="np-error" role="alert">{error}</p>}
        <button type="button" className="np-btn" disabled={busy || !edit.name.trim() || !edit.channels.length} onClick={save}>{busy ? "Saving…" : "Save brand"}</button>
        {edit.id && (confirmDelete
          ? <div className="cx-row"><span className="np-muted">Delete &quot;{edit.name}&quot;? Its channels stay connected.</span><span className="cx-links"><button type="button" className="cx-link cx-danger" disabled={busy} onClick={remove}>Delete</button><button type="button" className="cx-link" onClick={() => setConfirmDelete(false)}>Keep</button></span></div>
          : <button type="button" className="cx-link cx-danger" onClick={() => setConfirmDelete(true)}>Delete brand</button>)}
      </Sheet>
    );
  }

  return (
    <Sheet title="Brands" extra={<button type="button" className="cx-link" onClick={() => open({ name: "", channels: [] })}>+ New brand</button>} onClose={onClose}>
      <p className="np-muted">Group the channels you post to together. Picking a brand in New post switches all of them on.</p>
      {brands.map((b) => {
        const live = brandChannels(b.channels, connected);
        const bApps = APPS.filter((p) => live.some((k) => byKey.get(k)?.app === p));
        return (
          <div key={b.id} className="cx-ch">
            <span className="cx-faces">{live.slice(0, 3).map((k) => { const c = byKey.get(k); return c ? <Face key={k} ch={c} badge={false} /> : null; })}</span>
            <span><b>{b.name}</b><small>{live.length} channel{live.length === 1 ? "" : "s"} · {bApps.map((p) => NAMES[p]).join(", ") || "none connected"}</small></span>
            <button type="button" className="btn-outline" onClick={() => open(b)}>Edit</button>
          </div>
        );
      })}
      {!brands.length && <p className="np-muted">No brands yet. Tap &quot;+ New brand&quot; to make your first one.</p>}
      <button type="button" className="np-btn" onClick={onClose}>Done</button>
    </Sheet>
  );
}
