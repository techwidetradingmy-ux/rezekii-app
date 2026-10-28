"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useDemo } from "@/components/demo";
import { Sheet } from "@/components/ui";
import { PlatformIcon } from "@/components/creator2/bits";
import type { PubBrand, PubChannel, PublishSetup } from "@/lib/mock-publish";
import { PhonePreview, type Who } from "./phone-previews";
import {
  APPS, CAPTION_MAX, COLLABORATORS_MAX, COMMENT_MAX, DEFAULT_PLACEMENT, ICON, NAMES, PRIVACY, REPLY_CONTROLS, TAGS_MAX, UNIT,
  autoCaption, autoComment, channelProblems, channelWarnings, cleanTopic, consentLine, lengthFor, links, parseHashtags,
  parseUsernames, postedCaption, threadsTopic, tiktokProblems, withHashtags,
  type Channel, type Placement, type Platform, type Privacy, type ReplyControl, type TrialMode,
} from "./rules";
import "@/app/creator2.css";
import "@/app/publish.css";

type When = "now" | "recommended" | "pick" | "draft";
/** The next recommended time for this account, Malaysia time (V1 picks 6 am, 12 pm or 8 pm). */
const RECOMMENDED = "Today, 8:00 PM";
const SEARCH_ICON = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-10-29T20:00" → "Thu 29 Oct, 8:00 PM" (no locale lookups, so server and browser agree). */
function pretty(v: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v);
  if (!m) return v;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const h = Number(m[4]);
  return `${DAYS[d.getDay()]} ${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}, ${h % 12 || 12}:${m[5]} ${h < 12 ? "AM" : "PM"}`;
}

const isTikTok = (c?: PubChannel) => c?.app === "tiktok";

/** A profile picture: initials in the account's colour, with the app's icon in the corner. */
function Face({ ch, badge = true }: { ch: Pick<PubChannel, "app" | "initials" | "color">; badge?: boolean }) {
  return (
    <span className="pb-face">
      <span className="pb-ini" style={{ background: ch.color }}>{ch.initials}</span>
      {badge && <span className="badge-pi"><PlatformIcon name={ICON[ch.app]} size={12} /></span>}
    </span>
  );
}

/** New post for creators and sellers: V1's composer (pick channels, one caption written per app, link placement, settings, phone previews). */
export function Composer({ setup }: { setup: PublishSetup }) {
  const [round, setRound] = useState(0);
  return <ComposerForm key={round} setup={setup} onNew={() => setRound((r) => r + 1)} />;
}

function ComposerForm({ setup, onNew }: { setup: PublishSetup; onNew: () => void }) {
  const { toast: say } = useDemo();
  const [channels, setChannels] = useState<PubChannel[]>(setup.channels);
  const [brands, setBrands] = useState<PubBrand[]>(setup.brands);
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
  const [tagsText, setTagsText] = useState("");
  const [ownComment, setOwnComment] = useState("");
  const [link, setLink] = useState("");
  const [cta, setCta] = useState("");
  const [capOver, setCapOver] = useState<Partial<Record<Channel, string>>>({});
  const [comOver, setComOver] = useState<Partial<Record<Channel, string>>>({});
  const [place, setPlace] = useState<Partial<Record<Channel, Placement>>>({});
  const [tab, setTab] = useState<"main" | Channel>("main");
  const [source, setSource] = useState<"upload" | "link">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [sample, setSample] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [mode, setMode] = useState<"direct" | "inbox">("direct");
  const [privacy, setPrivacy] = useState<Privacy | "">("");
  const [allow, setAllow] = useState({ comments: false, duet: false, stitch: false });
  const [promo, setPromo] = useState({ on: false, own: false, branded: false });
  const [isAigc, setIsAigc] = useState(false);
  const [when, setWhen] = useState<When>("recommended");
  const [pickAt, setPickAt] = useState("");
  const [fbDraft, setFbDraft] = useState(false);
  const [igFeed, setIgFeed] = useState(true);
  const [igTrial, setIgTrial] = useState<TrialMode>("off");
  const [collabText, setCollabText] = useState("");
  const [tagText, setTagText] = useState("");
  const [replies, setReplies] = useState<ReplyControl>("everyone");
  const [topicOver, setTopicOver] = useState<string | null>(null);
  const [previewApp, setPreviewApp] = useState<Channel>("tiktok");
  const [previewAcct, setPreviewAcct] = useState("");
  const [fbView, setFbView] = useState<"reels" | "feed">("reels");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [sheet, setSheet] = useState<"" | "channels" | "brands">("");
  // The preview measures text, so it renders in the browser only.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [busy, setBusy] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState<{ summary: string; when: When; at: string } | null>(null);
  const [note, setNote] = useState("");

  const byKey = useMemo(() => new Map(channels.map((c) => [c.key, c])), [channels]);
  const connected = useMemo(() => new Set(channels.filter((c) => c.status === "active").map((c) => c.key)), [channels]);
  // One TikTok account per post: picking another swaps it.
  const toggleChannel = (key: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else {
        if (isTikTok(byKey.get(key))) for (const k of n) if (isTikTok(byKey.get(k))) n.delete(k);
        n.add(key);
      }
      return n;
    });
  const live = (b: PubBrand) => b.channels.filter((k) => connected.has(k));
  const brandOn = (b: PubBrand) => live(b).length > 0 && live(b).every((k) => picked.has(k));
  const toggleBrand = (b: PubBrand) =>
    setPicked((s) => {
      const n = new Set(s);
      if (brandOn(b)) live(b).forEach((k) => n.delete(k));
      else {
        const tt = live(b).find((k) => isTikTok(byKey.get(k)));
        if (tt) for (const k of n) if (isTikTok(byKey.get(k))) n.delete(k);
        live(b).filter((k) => !isTikTok(byKey.get(k)) || k === tt).forEach((k) => n.add(k));
      }
      return n;
    });

  const ttKey = [...picked].find((k) => connected.has(k) && isTikTok(byKey.get(k)));
  const metaPicked = channels.filter((c) => picked.has(c.key) && c.status === "active" && c.app !== "tiktok");
  const keys = [...(ttKey ? [ttKey] : []), ...metaPicked.map((c) => c.key)];
  const chOf = (key: string): Channel => byKey.get(key)?.app ?? "facebook";
  const apps = APPS.filter((p) => keys.some((k) => chOf(k) === p));
  const inApp = (p: Channel) => keys.filter((k) => chOf(k) === p);
  const placeOf = (p: Channel) => place[p] ?? DEFAULT_PLACEMENT[p];
  // The main caption with the Hashtags box at the very bottom: what every app's version is written from.
  const mainFull = withHashtags(main, parseHashtags(tagsText));
  const textOf = (p: Channel) => capOver[p] ?? autoCaption(p, mainFull, placeOf(p));
  const captionOf = (p: Channel) => postedCaption(p, textOf(p), link.trim(), placeOf(p), cta);
  const commentOf = (p: Channel) => (p === "tiktok" ? "" : (comOver[p] ?? autoComment(p, link.trim(), placeOf(p), ownComment, cta)));
  const appLabel = (p: Channel) => { const n = inApp(p).length; return n > 1 ? `${NAMES[p]} · ${n} ${UNIT[p]}` : NAMES[p]; };
  const summary = () => apps.map((p) => { const n = inApp(p).length; return n > 1 ? `${n} ${NAMES[p]} ${UNIT[p]}` : `${NAMES[p]} ${byKey.get(inApp(p)[0])?.name ?? ""}`.trim(); }).join(", ");
  const who = (key: string): Who => {
    const c = byKey.get(key);
    if (!c) return { name: "", username: "", avatar: null, initials: "", color: "#888" };
    const handle = (c.app === "tiktok" ? c.name : c.sub).replace(/^@/, "");
    return { name: c.app === "tiktok" ? handle : c.name, username: c.app === "facebook" ? c.name : handle, avatar: null, initials: c.initials, color: c.color };
  };
  const topic = cleanTopic(topicOver ?? threadsTopic(mainFull));
  const collaborators = parseUsernames(collabText).list.slice(0, COLLABORATORS_MAX);
  const tagged = parseUsernames(tagText).list.slice(0, TAGS_MAX);
  const igAdvanced = (collabText.trim() ? 1 : 0) + (tagText.trim() ? 1 : 0) + (igTrial !== "off" ? 1 : 0);
  const pApp = apps.includes(previewApp) ? previewApp : apps[0];
  const pKey = pApp ? (inApp(pApp).includes(previewAcct) ? previewAcct : inApp(pApp)[0]) : undefined;
  const activeTab = tab !== "main" && apps.includes(tab) ? tab : "main";

  const videoUrl = useMemo(() => (source === "upload" ? (file ? URL.createObjectURL(file) : null) : /^https:\/\/\S+\.(mp4|mov|webm)(\?|$)/i.test(linkUrl) ? linkUrl : null), [source, file, linkUrl]);
  useEffect(() => () => { if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl); }, [videoUrl]);
  const cover = source === "upload" && sample && !file ? setup.sample.cover : null;
  const hasVideo = source === "upload" ? !!file || sample : /^https:\/\/\S+$/.test(linkUrl);

  const problems = (() => {
    const out: string[] = [];
    if (!keys.length) out.push("Pick at least one channel.");
    if (!hasVideo) out.push("Add a video: upload one or paste an https link.");
    if (ttKey && when !== "draft") out.push(...tiktokProblems({ mode, caption: captionOf("tiktok"), privacy, promo: promo.on, own: promo.own, branded: promo.branded }));
    for (const p of apps) if (p !== "tiktok") out.push(...channelProblems(p, captionOf(p), commentOf(p), durationSec));
    if (apps.includes("instagram")) {
      const c = parseUsernames(collabText), g = parseUsernames(tagText);
      if (c.bad.length) out.push(`Instagram collaborators: "${c.bad[0]}" isn't an Instagram username.`);
      if (c.list.length > COLLABORATORS_MAX) out.push(`Instagram allows up to ${COLLABORATORS_MAX} collaborators.`);
      if (g.bad.length) out.push(`Instagram tagged people: "${g.bad[0]}" isn't an Instagram username.`);
    }
    if (when === "pick" && !pickAt) out.push("Pick a date and time.");
    return out;
  })();
  const warnings = apps.flatMap((p) => channelWarnings(p, captionOf(p)));

  function sameAsLast() {
    const next = new Set(setup.last.filter((k) => connected.has(k)));
    if (!next.size) return setNote("The channels of your last post aren't connected any more.");
    setPicked(next);
    const names = [...next].map((k) => byKey.get(k)?.name).filter(Boolean).slice(0, 4).join(", ");
    setNote(`Same channels as your last post: ${names}.`);
  }
  function connectApp(c: PubChannel) {
    setChannels((list) => [...list, c]);
    setNote(`${NAMES[c.app]} connected.`);
  }
  /** Preview helper: a sample video and caption, posted to the same channels as last time. */
  function fillSample() {
    setSource("upload");
    setSample(true);
    setFile(null);
    setDurationSec(setup.sample.seconds);
    setMain(setup.sample.main);
    setTagsText(setup.sample.tags);
    setLink(setup.sample.link);
    setCta(setup.sample.cta);
    setPicked(new Set(setup.last.filter((k) => connected.has(k))));
    setNote("Filled in with a sample post. Nothing is sent from this preview.");
  }
  // Arriving with ?sample opens New post already filled in (for demos).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("sample")) fillSample();
  }, []);

  function submit() {
    setErrors([]);
    if (problems.length) return setErrors(problems);
    setBusy(when === "draft" ? "Saving…" : "Scheduling…");
    window.setTimeout(() => {
      setBusy("");
      setDone({ summary: summary(), when, at: when === "pick" ? pretty(pickAt) : RECOMMENDED });
    }, 700);
  }

  if (done) {
    return (
      <section className="v2-card pb-sent" role="status">
        <span className="pb-sent-ico" aria-hidden="true">✓</span>
        <h2>{done.when === "draft" ? "Saved as a draft" : done.when === "now" ? "On its way" : "Scheduled"}</h2>
        <p>
          {done.when === "draft" ? `Saved in Rezekii for ${done.summary}.` : done.when === "now" ? `${done.summary}: posting now.` : `${done.summary}: ${done.at} (Malaysia time).`} You&apos;ll see each
          channel&apos;s status in Calendar &amp; history.
        </p>
        <div className="np-row">
          <Link href={setup.calendar} className="np-btn">See it in Calendar &amp; history</Link>
          <button type="button" className="btn-outline" onClick={onNew}>New post</button>
        </div>
      </section>
    );
  }

  const counts = apps.map((p) => {
    const n = lengthFor(p, captionOf(p));
    return <span key={p} className={n > CAPTION_MAX[p] ? "over" : ""}><PlatformIcon name={ICON[p]} size={14} />{n.toLocaleString("en-US")} / {CAPTION_MAX[p].toLocaleString("en-US")}</span>;
  });
  const linkWhere = (p: Channel) => { const pl = placeOf(p); return p === "tiktok" ? "not added (the product goes in the yellow basket)" : pl.caption && pl.comment ? "caption and first comment" : pl.caption ? "caption" : pl.comment ? "first comment" : "not added"; };
  const notes = pApp ? previewNotes(pApp, captionOf(pApp), commentOf(pApp), !!link.trim(), fbView, { fbDraft, igFeed, igTrial, replies, tagged }) : [];
  const q = query.trim().toLowerCase();
  const results = channels.filter((c) => c.status === "active" && (!q || `${c.name} ${c.sub} ${NAMES[c.app]}`.toLowerCase().includes(q)));
  const missing = setup.connectable.filter((c) => !channels.some((x) => x.key === c.key));
  const pickedChs = channels.filter((c) => picked.has(c.key) && connected.has(c.key));

  return (
    <>
      <p className="pb-demo">
        {note || "Preview: nothing is posted. Fill in a sample to try every step."}
        <button type="button" className="pb-link" onClick={fillSample}>Fill in a sample post</button>
      </p>
      <form className="pb" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        <div className="pb-col">
          <section className="v2-card pb-card">
            <div className="pb-bar">
              <h2>Post to</h2>
              <span className="pb-links">
                <button type="button" className="pb-link" onClick={sameAsLast}>Same as last post</button>
                <button type="button" className="pb-link" onClick={() => setSheet("brands")}>Manage brands</button>
                <button type="button" className="pb-link" onClick={() => setSheet("channels")}>Channels · {channels.length}</button>
              </span>
            </div>
            <div className="pb-group">
              <span className="pb-gh">Brands</span>
              <div className="pb-chips">
                {brands.map((b) => {
                  const on = live(b);
                  const bApps = APPS.filter((p) => on.some((k) => byKey.get(k)?.app === p));
                  return (
                    <button key={b.id} type="button" className="pb-chip pb-brand" aria-pressed={brandOn(b)} disabled={!on.length} onClick={() => toggleBrand(b)} title={on.length ? undefined : "None of this brand's channels are connected"}>
                      <span className="pb-faces">{on.slice(0, 3).map((k) => { const c = byKey.get(k); return c ? <Face key={k} ch={c} badge={false} /> : null; })}</span>
                      <span className="pb-blabel"><span>{b.name}</span><small>{on.length} · {bApps.map((p) => NAMES[p]).join(", ") || "not connected"}</small></span>
                    </button>
                  );
                })}
                {missing.map((c) => <button key={c.key} type="button" className="pb-chip add" onClick={() => connectApp(c)}>+ {NAMES[c.app]}</button>)}
              </div>
              {!brands.length && <p className="np-muted">Group the channels you post to together, like a brand&apos;s Facebook Page, Instagram and TikTok. Then one tap picks them all. <button type="button" className="pb-link" onClick={() => setSheet("brands")}>Create a brand</button></p>}
            </div>
            <div className="pb-finder" ref={finder}>
              <label className="pb-search">
                {SEARCH_ICON}
                <input className="np-input" type="search" value={query} onChange={(e) => { setQuery(e.target.value); setListOpen(true); }} onFocus={() => setListOpen(true)} onClick={() => setListOpen(true)} onKeyDown={(e) => e.key === "Escape" && setListOpen(false)} placeholder={`Pick or search channels (${connected.size})`} aria-label="Pick or search channels" role="combobox" aria-expanded={listOpen} aria-controls="pb-channel-list" />
              </label>
              {listOpen && (
                <div id="pb-channel-list" className="pb-results" role="listbox" aria-label="Connected channels" aria-multiselectable="true">
                  {APPS.map((p) => {
                    const list = results.filter((c) => c.app === p);
                    return list.length ? (
                      <div key={p} className="pb-group">
                        <span className="pb-gh"><PlatformIcon name={ICON[p]} size={16} />{NAMES[p]} · {list.length}</span>
                        {list.map((c) => <button key={c.key} type="button" role="option" aria-selected={picked.has(c.key)} className="pb-res" onClick={() => toggleChannel(c.key)}><Face ch={c} /><span>{c.name}</span><small>{c.app === "facebook" ? "" : c.sub}</small><i className="pb-tick" aria-hidden="true">{picked.has(c.key) ? "✓" : ""}</i></button>)}
                      </div>
                    ) : null;
                  })}
                  {!results.length && <p className="np-muted" style={{ padding: 6 }}>{q ? `No channel matches "${query}".` : "No channels connected yet."}</p>}
                  <button type="button" className="pb-link pb-done" onClick={() => setListOpen(false)}>Done</button>
                </div>
              )}
            </div>
            {pickedChs.length > 0 ? (
              <div className="pb-picked">
                {APPS.filter((p) => pickedChs.some((c) => c.app === p)).map((p) => (
                  <div key={p} className="pb-group">
                    <span className="pb-gh"><PlatformIcon name={ICON[p]} size={16} />{NAMES[p]}</span>
                    <div className="pb-tags">{pickedChs.filter((c) => c.app === p).map((c) => <span key={c.key} className="pb-tag"><Face ch={c} badge={false} /><span>{c.name}</span><button type="button" aria-label={`Remove ${c.name}`} onClick={() => toggleChannel(c.key)}>×</button></span>)}</div>
                  </div>
                ))}
              </div>
            ) : <p className="np-muted">Nothing picked yet: pick a brand, use Same as last post, or search for a channel.</p>}
          </section>

          <section className="v2-card pb-card">
            <h2>Video</h2>
            <div className="np-seg" role="radiogroup" aria-label="Video source">
              <button type="button" role="radio" aria-checked={source === "upload"} className={source === "upload" ? "on" : ""} onClick={() => setSource("upload")}>Upload</button>
              <button type="button" role="radio" aria-checked={source === "link"} className={source === "link" ? "on" : ""} onClick={() => setSource("link")}>Paste a link</button>
            </div>
            {source === "upload" ? (
              sample && !file ? (
                <div className="pb-file">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={setup.sample.cover} alt="" />
                  <span><b>{setup.sample.file}</b><small>9:16 · {setup.sample.seconds} seconds · sample</small><button type="button" className="pb-link" style={{ justifySelf: "start" }} onClick={() => { setSample(false); setDurationSec(null); }}>Replace video</button></span>
                </div>
              ) : (
                <label className="np-drop"><input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setDurationSec(null); setSample(false); }} /><span>{file ? `${file.name} · ${(file.size / 1048576).toFixed(1)} MB` : "Choose an MP4, MOV or WebM video (up to 50 MB)"}</span></label>
              )
            ) : (
              <input className="np-input" type="url" inputMode="url" placeholder="https://… (Google Drive, Dropbox or a direct file link)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value.trim())} aria-label="Video link" />
            )}
            {videoUrl && <video src={videoUrl} muted playsInline preload="metadata" hidden onLoadedMetadata={(e) => setDurationSec(Math.round(e.currentTarget.duration))} />}
            {durationSec !== null && (
              <p className="np-muted">
                Length {Math.floor(durationSec / 60)}:{String(durationSec % 60).padStart(2, "0")}
                {apps.includes("facebook") ? ` · Facebook: ${durationSec >= 3 && durationSec <= 90 ? "goes out as a Reel" : "goes out as a Page video (Reels are 3–90 s)"}` : ""}
              </p>
            )}
          </section>

          <section className="v2-card pb-card">
            <h2>Caption</h2>
            {apps.length > 0 && (
              <div className="pb-tabs" role="tablist" aria-label="Caption for">
                {([["main", "Main"], ...apps.map((p) => [p, appLabel(p)])] as ["main" | Channel, string][]).map(([k, l]) => (
                  <button key={k} type="button" role="tab" aria-selected={activeTab === k} onClick={() => setTab(k)}>
                    {k !== "main" && <PlatformIcon name={ICON[k]} size={16} />}{l}{k !== "main" && (capOver[k] !== undefined || comOver[k] !== undefined) && <i className="dot" title="Edited" />}
                  </button>
                ))}
              </div>
            )}
            {activeTab === "main" ? (
              <>
                <details className="pb-guide">
                  <summary>How to write a post that works on every app</summary>
                  <ol>
                    <li><b>Caption:</b> start with a hook; the first line is what people see before &ldquo;more&rdquo;. Keep the rest short, on separate lines.</li>
                    <li><b>Call to action with the link</b> (e.g. &ldquo;Dapatkan di sini 👉 link&rdquo;): Facebook keeps it where you typed it. TikTok, Instagram and Threads drop it together with its emoji, since links can&apos;t be tapped there.</li>
                    <li><b>Hashtags:</b> type them anywhere in the caption to keep them there, or put them in the Hashtags box to add them at the very bottom. Up to 5 on TikTok and Instagram, all on Facebook. Threads leaves them out (they can&apos;t be tapped) and uses one Topic.</li>
                    <li><b>Product link:</b> paste it in Product link; Rezekii puts it where each app works best (Facebook post and comment, Threads comment, Instagram &ldquo;Link dekat bio&rdquo;, TikTok yellow basket).</li>
                    <li><b>First comment:</b> optional; it goes out on Facebook, Instagram and Threads right after the post (TikTok doesn&apos;t let apps comment).</li>
                    <li><b>Check each app&apos;s tab and the preview:</b> the preview shows exactly what will be posted.</li>
                  </ol>
                </details>
                <label className="pb-field"><b>Caption</b><textarea className="np-input" rows={5} value={main} onChange={(e) => setMain(e.target.value)} placeholder="Hook on the first line, then a few short lines." aria-label="Main caption" /></label>
                <label className="pb-field"><b>Hashtags</b><input className="np-input" type="text" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="#thermos #kopi #tiktokshopmy" aria-label="Hashtags" /><small className="np-muted">Added at the very bottom: up to 5 on TikTok and Instagram, all on Facebook, none on Threads.</small></label>
                <label className="pb-field"><b>First comment</b><textarea className="np-input" rows={2} value={ownComment} onChange={(e) => setOwnComment(e.target.value)} placeholder="Optional, e.g. Ada soalan? Tanya di komen 👇" aria-label="First comment" /><small className="np-muted">Facebook, Instagram and Threads. The product link is added after it where that app puts the link in the comment.</small></label>
                {apps.includes("threads") && (
                  <label className="pb-field">
                    <span className="pb-row"><b>Threads topic</b>{topicOver !== null ? <button type="button" className="pb-link" onClick={() => setTopicOver(null)}>Use the first hashtag</button> : <small className="np-muted">From your first hashtag · edit to change</small>}</span>
                    <input className="np-input" type="text" value={topicOver ?? threadsTopic(mainFull)} maxLength={60} onChange={(e) => setTopicOver(e.target.value)} placeholder="e.g. Dapur" aria-label="Threads topic" />
                    <small className="np-muted">Recommended: Threads shows one topic next to your name, and people find posts by it. No periods or &amp;.</small>
                  </label>
                )}
                {counts.length > 0 && <div className="pb-counts" aria-label="Characters per app">{counts}</div>}
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
                extra={activeTab === "threads" ? <p className="np-muted">Topic: <b>{topic || "none"}</b> · set it in Main.</p> : undefined}
              />
            )}
            {warnings.length > 0 && <p className="pb-warn">{[...new Set(warnings)].join(" ")}</p>}
          </section>

          <section className="v2-card pb-card">
            <h2>Call to action &amp; product link</h2>
            <label className="pb-field"><b>Call to action before the link</b><input className="np-input" type="text" value={cta} maxLength={80} onChange={(e) => setCta(e.target.value)} placeholder="e.g. Dapatkan di sini 👉" aria-label="Call to action before the link" /><small className="np-muted">Optional. Goes in front of the link wherever Rezekii adds it (Facebook caption, first comments).</small></label>
            <label className="pb-field"><b>Product link</b><input className="np-input" type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value.trim())} placeholder="https://… (Shopee or TikTok Shop)" aria-label="Product link" /></label>
            {apps.length > 0 && <ul className="pb-how">{apps.map((p) => <li key={p}><PlatformIcon name={ICON[p]} size={18} /><span><b>{appLabel(p)}:</b> {linkWhere(p)}</span></li>)}</ul>}
            {apps.length > 0 && <p className="np-muted">Change where it goes in each app&apos;s caption tab.</p>}
          </section>

          {ttKey && (
            <section className="v2-card pb-card np-sec">
              <h2>TikTok settings</h2>
              <div className="np-seg" role="radiogroup" aria-label="Where to send it">
                <button type="button" role="radio" aria-checked={mode === "direct"} className={mode === "direct" ? "on" : ""} onClick={() => setMode("direct")}>Post to TikTok</button>
                <button type="button" role="radio" aria-checked={mode === "inbox"} className={mode === "inbox" ? "on" : ""} onClick={() => setMode("inbox")}>Send to TikTok drafts</button>
              </div>
              {mode === "direct" && (
                <>
                  <label htmlFor="pb-privacy"><b>Who can view this post</b></label>
                  <select id="pb-privacy" className="np-input" value={privacy} onChange={(e) => setPrivacy(e.target.value as Privacy)} required>
                    <option value="" disabled>Choose who can view</option>
                    {PRIVACY.map(([p, l]) => <option key={p} value={p} disabled={p === "SELF_ONLY" && promo.on && promo.branded}>{l}{p === "SELF_ONLY" && promo.on && promo.branded ? " (not allowed for branded content)" : ""}</option>)}
                  </select>
                  <div className="np-checks">
                    {([["comments", "Allow Comment"], ["duet", "Allow Duet"], ["stitch", "Allow Stitch"]] as const).map(([k, label]) => (
                      <label key={k} className="np-check"><input type="checkbox" checked={allow[k]} onChange={(e) => setAllow((a) => ({ ...a, [k]: e.target.checked }))} />{label}</label>
                    ))}
                  </div>
                  <div className="np-switchrow">
                    <span><b>Disclose promotional content</b><small>Turn on if this video promotes yourself, a brand, product or service.</small></span>
                    <button type="button" role="switch" aria-checked={promo.on} className={promo.on ? "np-switch on" : "np-switch"} onClick={() => setPromo((p) => (p.on ? { on: false, own: false, branded: false } : { ...p, on: true }))} aria-label="Disclose promotional content"><span /></button>
                  </div>
                  {promo.on && (
                    <div className="np-checks">
                      <label className="np-check"><input type="checkbox" checked={promo.own} onChange={(e) => setPromo((p) => ({ ...p, own: e.target.checked }))} />Your brand<small>You are promoting yourself or your own business.</small></label>
                      <label className="np-check"><input type="checkbox" checked={promo.branded} onChange={(e) => { setPromo((p) => ({ ...p, branded: e.target.checked })); if (e.target.checked && privacy === "SELF_ONLY") setPrivacy(""); }} />Branded content<small>You are promoting another brand or a third party.</small></label>
                    </div>
                  )}
                  <div className="np-switchrow">
                    <span><b>AI-generated content</b><small>Turn on if the video was made or heavily edited with AI.</small></span>
                    <button type="button" role="switch" aria-checked={isAigc} className={isAigc ? "np-switch on" : "np-switch"} onClick={() => setIsAigc(!isAigc)} aria-label="AI-generated content"><span /></button>
                  </div>
                </>
              )}
            </section>
          )}

          {apps.some((p) => p !== "tiktok") && (
            <section className="v2-card pb-card np-sec">
              <h2>Post settings</h2>
              {apps.includes("facebook") && (
                <div className="pb-set">
                  <span className="pb-gh"><PlatformIcon name="Facebook" size={16} />Facebook</span>
                  <div className="np-seg" role="radiogroup" aria-label="Facebook">
                    <button type="button" role="radio" aria-checked={!fbDraft} className={!fbDraft ? "on" : ""} onClick={() => setFbDraft(false)}>Publish</button>
                    <button type="button" role="radio" aria-checked={fbDraft} className={fbDraft ? "on" : ""} onClick={() => setFbDraft(true)}>Save as draft in Facebook</button>
                  </div>
                  <p className="np-muted">On Facebook, @names stay plain text: Facebook doesn&apos;t turn them into mentions for posts made by apps. Instagram and Threads link @usernames.</p>
                  {fbDraft && <p className="np-muted">The Reel is saved in the Page&apos;s drafts. Nobody sees it until you publish it from Facebook or Meta Business Suite. Drafts get no first comment, and work for Reels (3–90 seconds) only.</p>}
                </div>
              )}
              {apps.includes("instagram") && (
                <div className="pb-set">
                  <span className="pb-gh"><PlatformIcon name="Instagram" size={16} />Instagram</span>
                  <div className="np-switchrow">
                    <span><b>Also show in the main feed</b><small>Off: the Reel shows in the Reels tab only.</small></span>
                    <button type="button" role="switch" aria-checked={igFeed} className={igFeed ? "np-switch on" : "np-switch"} onClick={() => setIgFeed(!igFeed)} aria-label="Also show in the main feed"><span /></button>
                  </div>
                  <details className="pb-guide pb-adv">
                    <summary>Advanced: collaborators, tag people, trial reel{igAdvanced ? ` · ${igAdvanced} in use` : ""}</summary>
                    <div className="pb-adv-in">
                      <label className="pb-field"><b>Collaborators</b><input className="np-input" type="text" value={collabText} onChange={(e) => setCollabText(e.target.value)} placeholder="Up to 3 Instagram usernames, e.g. @brand" aria-label="Instagram collaborators" /><small className="np-muted">They get an invite in Instagram; once they accept, the Reel shows on their profile too.</small></label>
                      <label className="pb-field"><b>Tag people</b><input className="np-input" type="text" value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="Instagram usernames, e.g. @shopee_my" aria-label="Instagram tagged people" /><small className="np-muted">Up to {TAGS_MAX}. They get a notification and the Reel shows in their Tagged tab. Facebook and Threads don&apos;t let apps tag people in videos.</small></label>
                      <b className="pb-sub">Trial reel</b>
                      <div className="np-seg" role="radiogroup" aria-label="Trial reel">
                        {([["off", "Off"], ["manual", "I'll share with followers"], ["auto", "Instagram decides"]] as [TrialMode, string][]).map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={igTrial === v} className={igTrial === v ? "on" : ""} onClick={() => setIgTrial(v)}>{l}</button>)}
                      </div>
                      {igTrial !== "off" && <p className="np-muted">A trial reel is shown to people who don&apos;t follow you first. {igTrial === "manual" ? "You share it with your followers yourself in Instagram." : "Instagram shares it with your followers if it does well."}</p>}
                    </div>
                  </details>
                </div>
              )}
              {apps.includes("threads") && (
                <div className="pb-set">
                  <span className="pb-gh"><PlatformIcon name="Threads" size={16} />Threads</span>
                  <label className="pb-field"><b>Who can reply</b>
                    <select className="np-input" value={replies} onChange={(e) => setReplies(e.target.value as ReplyControl)}>{REPLY_CONTROLS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                  </label>
                </div>
              )}
              <p className="np-muted">Facebook, Instagram and Threads don&apos;t offer &ldquo;Only me&rdquo; posts to apps. Use a Facebook draft to keep a post private until you publish it.</p>
            </section>
          )}

          <section className="v2-card pb-card">
            <h2>When</h2>
            <div className="np-when" role="radiogroup" aria-label="When to post">
              {([["now", "Post now"], ["recommended", `Recommended time · ${RECOMMENDED}`], ["pick", "Pick a time"], ["draft", "Save as draft"]] as [When, string][]).map(([v, label]) => (
                <label key={v} className={when === v ? "np-radio on" : "np-radio"}><input type="radio" name="pb-when" value={v} checked={when === v} onChange={() => setWhen(v)} />{label}</label>
              ))}
            </div>
            {when === "pick" && <input className="np-input" type="datetime-local" value={pickAt} min="2026-10-28T09:15" onChange={(e) => setPickAt(e.target.value)} aria-label="Date and time (Malaysia time)" />}
            <p className="np-muted">All channels go out at the same time.{when === "draft" ? " A draft stays in Rezekii until you schedule it." : ""}</p>
          </section>

          {errors.length > 0 && <ul className="np-errors" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
          {ttKey && mode === "direct" && when !== "draft" && <p className="np-consent">{consentLine(promo.on, promo.branded)}</p>}
          <button type="submit" className="np-btn np-submit" disabled={!!busy}>
            {busy || `${when === "draft" ? "Save draft" : when === "now" ? "Post now" : "Schedule"} · ${keys.length === 1 ? "1 channel" : `${keys.length} channels`}`}
          </button>
        </div>

        <aside className="pb-side" aria-label="Preview">
          {apps.length > 0 && (
            <div className="pb-tabs" role="tablist" aria-label="Preview app">
              {apps.map((p) => <button key={p} type="button" role="tab" aria-selected={pApp === p} onClick={() => setPreviewApp(p)}><PlatformIcon name={ICON[p]} size={16} />{NAMES[p]}</button>)}
            </div>
          )}
          {pApp && inApp(pApp).length > 1 && (
            <label className="pb-showing">Showing
              <select className="np-input" value={pKey} onChange={(e) => setPreviewAcct(e.target.value)}>{inApp(pApp).map((k) => <option key={k} value={k}>{byKey.get(k)?.name}</option>)}</select>
            </label>
          )}
          <div className="pb-phone-wrap">
            {mounted && pApp && pKey ? (
              <PhonePreview channel={pApp} caption={captionOf(pApp)} comment={pApp === "facebook" && fbDraft ? "" : commentOf(pApp)} video={videoUrl} cover={cover} who={who(pKey)} fbView={fbView} theme={theme} topic={topic} collaborators={collaborators} />
            ) : (
              <div className="pb-pv-phone"><div className="pb-pv-scr" /></div>
            )}
          </div>
          {pApp === "facebook" && <Tabs value={fbView} set={setFbView} items={[["reels", "Reels"], ["feed", "Feed"]]} label="Facebook view" />}
          {(pApp === "threads" || (pApp === "facebook" && fbView === "feed")) && <Tabs value={theme} set={setTheme} items={[["light", "Light"], ["dark", "Dark"]]} label="App theme" />}
          <p className="pb-note">{pApp ? PREVIEW_NOTE[pApp] : "Pick a channel to see its preview."}</p>
          {notes.map(([text, good]) => <p key={text} className={good ? "pb-good" : "pb-warn"}>{text}</p>)}
        </aside>
      </form>

      {sheet === "channels" && (
        <ChannelsSheet
          channels={channels}
          connectable={missing}
          onConnect={connectApp}
          onReconnect={(c) => { setChannels((l) => l.map((x) => (x.key === c.key ? { ...x, status: "active" } : x))); say(`${c.name} reconnected`); }}
          onCheck={(c) => say(c.status === "active" ? `${c.name} is connected and working.` : `${c.name} needs reconnecting. Press Reconnect to sign in again.`)}
          onDisconnect={(c) => {
            setChannels((l) => l.filter((x) => x.key !== c.key));
            setPicked((s) => new Set([...s].filter((k) => k !== c.key)));
            say(c.app === "tiktok" ? `${c.name} disconnected. Its scheduled posts moved to drafts.` : `${c.name} disconnected. Its scheduled posts were cancelled.`);
          }}
          onClose={() => setSheet("")}
        />
      )}
      {sheet === "brands" && (
        <BrandsSheet
          brands={brands}
          channels={channels}
          byKey={byKey}
          connected={connected}
          onSaved={(b) => setBrands((list) => [...list.filter((x) => x.id !== b.id), b].sort((x, y) => x.name.localeCompare(y.name)))}
          onDeleted={(id) => setBrands((list) => list.filter((x) => x.id !== id))}
          onClose={() => setSheet("")}
        />
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

/** Notes under the phone where an app treats the post differently. [text, informational] */
function previewNotes(ch: Channel, caption: string, comment: string, hasLink: boolean, fbView: "reels" | "feed", s: { fbDraft: boolean; igFeed: boolean; igTrial: TrialMode; replies: ReplyControl; tagged: string[] }): [string, boolean][] {
  const out: [string, boolean][] = [];
  if (ch === "facebook" && s.fbDraft) out.push(["Saved as a draft on the Page: nobody sees it until you publish it in Facebook. It shows like this once published.", true]);
  if (ch === "instagram" && !s.igFeed) out.push(["Shows in the Reels tab only, not in the main feed.", true]);
  if (ch === "instagram" && s.tagged.length) out.push([`Tagged: ${s.tagged.map((u) => `@${u}`).join(", ")}.`, true]);
  if (ch === "instagram" && s.igTrial !== "off") out.push([s.igTrial === "manual" ? "Trial reel: shown to people who don't follow you first; you share it with followers yourself." : "Trial reel: shown to people who don't follow you first; Instagram shares it with followers if it does well.", true]);
  if (ch === "threads" && s.replies !== "everyone") out.push([`Who can reply: ${REPLY_CONTROLS.find(([v]) => v === s.replies)?.[1] ?? ""}.`, true]);
  if (ch === "tiktok" && hasLink) out.push(["The product link isn't added on TikTok: links in TikTok captions can't be tapped. The product goes in the yellow basket (beg kuning).", false]);
  if (ch === "instagram" && links(caption).length) out.push(["Instagram shows the link as plain text. It can't be tapped.", false]);
  if (ch === "instagram" && comment) out.push([`The first comment goes out right after the Reel is published.${links(comment).length ? " Links in Instagram comments can't be tapped either." : ""}`, true]);
  if (ch === "facebook" && fbView === "reels" && links(caption).length) out.push([`Links in Facebook Reels captions can't be tapped.${s.fbDraft ? "" : " The link in the first comment can."}`, false]);
  if (ch === "facebook" && comment && !s.fbDraft) out.push(["The first comment goes out from the Page right after posting.", true]);
  if (ch === "threads" && comment) out.push(["The first comment goes out as your own reply under the post, right after it's published.", true]);
  return out;
}

/** One app's tab: Rezekii's version of the caption (editable), where the link goes, and the first comment. */
function ChannelPane(p: { ch: Channel; name: string; text: string; edited: boolean; captionLength: number; linkAdded: boolean; place: Placement; comment: string; commentEdited: boolean; onText: (v: string) => void; onResetText: () => void; onPlace: (p: Placement) => void; onComment: (v: string) => void; onResetComment: () => void; extra?: ReactNode }) {
  const tt = p.ch === "tiktok";
  return (
    <>
      <div className="pb-row"><b>{p.name} caption</b>{p.edited ? <button type="button" className="pb-link" onClick={p.onResetText}>Use Rezekii&apos;s version</button> : <small className="np-muted">Rezekii&apos;s version · edit to change</small>}</div>
      <textarea className="np-input" rows={5} value={p.text} onChange={(e) => p.onText(e.target.value)} aria-label={`${p.name} caption`} />
      <span className={`np-count${p.captionLength > CAPTION_MAX[p.ch] ? " over" : ""}`}>{p.captionLength.toLocaleString("en-US")} / {CAPTION_MAX[p.ch].toLocaleString("en-US")}{p.linkAdded ? " · the link is added at the end" : ""}</span>
      {p.extra}
      <div className="pb-row" style={{ justifyContent: "flex-start" }}>
        <small className="np-muted">Product link</small>
        <button type="button" className="pb-chip" disabled={tt} aria-pressed={p.place.caption} onClick={() => p.onPlace({ ...p.place, caption: !p.place.caption })}>{p.place.caption ? "✓ " : ""}In the caption</button>
        <button type="button" className="pb-chip" disabled={tt} aria-pressed={p.place.comment} onClick={() => p.onPlace({ ...p.place, comment: !p.place.comment })}>{p.place.comment ? "✓ " : ""}In the first comment</button>
      </div>
      {tt ? (
        <p className="pb-info">TikTok captions can&apos;t hold a link that people can tap, and TikTok doesn&apos;t let apps post comments, so the link stays off. The product goes in the yellow basket (beg kuning).</p>
      ) : (
        <>
          <div className="pb-row"><b>First comment</b>{p.commentEdited ? <button type="button" className="pb-link" onClick={p.onResetComment}>Use Rezekii&apos;s version</button> : <small className="np-muted">Optional · posted right after the post</small>}</div>
          <textarea className="np-input" rows={3} value={p.comment} onChange={(e) => p.onComment(e.target.value)} placeholder="Optional. Posted as your first comment right after the post goes out." aria-label={`${p.name} first comment`} />
          <span className="np-count">{lengthFor(p.ch, p.comment).toLocaleString("en-US")} / {COMMENT_MAX[p.ch as Platform].toLocaleString("en-US")}</span>
          {p.ch === "instagram" && (p.place.caption || p.place.comment) && <p className="pb-warn">Links can&apos;t be tapped on Instagram, in captions or in comments.</p>}
        </>
      )}
    </>
  );
}

function Tabs<T extends string>({ value, set, items, label }: { value: T; set: (v: T) => void; items: [T, string][]; label: string }) {
  return <div className="pb-tabs" role="tablist" aria-label={label}>{items.map(([v, l]) => <button key={v} type="button" role="tab" aria-selected={value === v} onClick={() => set(v)}>{l}</button>)}</div>;
}

/** Channels: everything connected, grouped by app. Each can be checked, reconnected when the app stopped accepting it, or disconnected. */
function ChannelsSheet({ channels, connectable, onConnect, onReconnect, onCheck, onDisconnect, onClose }: { channels: PubChannel[]; connectable: PubChannel[]; onConnect: (c: PubChannel) => void; onReconnect: (c: PubChannel) => void; onCheck: (c: PubChannel) => void; onDisconnect: (c: PubChannel) => void; onClose: () => void }) {
  const { toast } = useDemo();
  const [q, setQ] = useState("");
  const s = q.trim().toLowerCase();
  return (
    <Sheet title="Channels" onClose={onClose}>
      <p className="np-muted" style={{ margin: 0 }}>Connect once, then pick the channel whenever you post. You sign in on each app&apos;s own page; Rezekii never sees your password.</p>
      {channels.length > 8 && <label className="pb-search">{SEARCH_ICON}<input className="np-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${channels.length} channels`} aria-label="Search channels" /></label>}
      {APPS.map((p) => {
        const list = channels.filter((c) => c.app === p && (!s || `${c.name} ${c.sub}`.toLowerCase().includes(s)));
        if (s && !list.length) return null;
        const add = connectable.find((c) => c.app === p);
        return (
          <div key={p} className="pb-group">
            <span className="pb-gh"><PlatformIcon name={ICON[p]} size={16} />{NAMES[p]}{list.length ? ` · ${list.length}` : ""}</span>
            {list.map((c) => (
              <div key={c.key} className="pb-ch">
                <Face ch={c} />
                <span><b>{c.name}</b><small>{c.sub}{c.status === "reconnect" ? " · needs reconnecting" : ""}</small></span>
                <div className="pb-acts">
                  {c.status === "reconnect" ? <button type="button" className="np-btn v2-btn-sm" onClick={() => onReconnect(c)}>Reconnect</button> : <button type="button" className="btn-outline v2-btn-sm" onClick={() => onCheck(c)}>Check now</button>}
                  <button type="button" className="pb-link pb-off" onClick={() => onDisconnect(c)}>Disconnect</button>
                </div>
              </div>
            ))}
            {!s && (
              <div className="pb-ch">
                <PlatformIcon name={ICON[p]} size={34} />
                <span><b>{list.length ? `Add ${UNIT[p]}` : `Connect ${NAMES[p]}`}</b><small>{p === "facebook" ? "Pick which Pages after signing in" : p === "instagram" ? "Business or Creator account" : p === "threads" ? "Your Threads profile" : "Your TikTok account"}</small></span>
                <button type="button" className="np-btn v2-btn-sm" onClick={() => (add ? onConnect(add) : toast(`Preview: ${NAMES[p]} sign-in opens here`))}>Connect</button>
              </div>
            )}
          </div>
        );
      })}
      <p className="np-muted" style={{ margin: 0 }}>Facebook Groups can&apos;t be added: Meta closed posting to Groups for all apps in 2024.</p>
      <button type="button" className="np-btn" onClick={onClose}>Done</button>
    </Sheet>
  );
}

/** Brands: create, rename, change channels, delete. A channel can be in more than one brand. */
function BrandsSheet({ brands, channels, byKey, connected, onSaved, onDeleted, onClose }: { brands: PubBrand[]; channels: PubChannel[]; byKey: Map<string, PubChannel>; connected: Set<string>; onSaved: (b: PubBrand) => void; onDeleted: (id: string) => void; onClose: () => void }) {
  const [edit, setEdit] = useState<{ id?: string; name: string; channels: string[] } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const open = (b: { id?: string; name: string; channels: string[] }) => { setEdit({ ...b, channels: [...b.channels] }); setConfirmDelete(false); };

  if (edit) {
    const toggle = (k: string) => setEdit((e) => (e ? { ...e, channels: e.channels.includes(k) ? e.channels.filter((x) => x !== k) : [...e.channels, k] } : e));
    return (
      <Sheet title={edit.id ? "Edit brand" : "New brand"} onClose={onClose}>
        <button type="button" className="pb-link" style={{ justifySelf: "start" }} onClick={() => setEdit(null)}>← Back</button>
        <label className="pb-field"><b>Brand name</b><input className="np-input" type="text" value={edit.name} maxLength={60} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="e.g. Seri Living" /></label>
        <p className="np-muted" style={{ margin: 0 }}>{edit.channels.length} channel{edit.channels.length === 1 ? "" : "s"} in this brand. A channel can be in more than one brand.</p>
        {APPS.map((p) => {
          const list = channels.filter((c) => c.app === p);
          return list.length ? (
            <div key={p} className="pb-group">
              <span className="pb-gh"><PlatformIcon name={ICON[p]} size={16} />{NAMES[p]}</span>
              {list.map((c) => <label key={c.key} className="pb-check"><Face ch={c} /><span><b>{c.name}</b><small>{c.sub}{c.status === "reconnect" ? " · needs reconnecting" : ""}</small></span><input type="checkbox" checked={edit.channels.includes(c.key)} onChange={() => toggle(c.key)} /></label>)}
            </div>
          ) : null;
        })}
        <button type="button" className="np-btn" disabled={!edit.name.trim() || !edit.channels.length} onClick={() => { onSaved({ id: edit.id ?? `b${Date.now()}`, name: edit.name.trim(), channels: edit.channels }); setEdit(null); }}>Save brand</button>
        {edit.id && (confirmDelete ? (
          <div className="pb-row"><span className="np-muted">Delete &ldquo;{edit.name}&rdquo;? Its channels stay connected.</span><span className="pb-links"><button type="button" className="pb-link pb-danger" onClick={() => { onDeleted(edit.id!); setEdit(null); }}>Delete</button><button type="button" className="pb-link" onClick={() => setConfirmDelete(false)}>Keep</button></span></div>
        ) : (
          <button type="button" className="pb-link pb-danger" style={{ justifySelf: "start" }} onClick={() => setConfirmDelete(true)}>Delete brand</button>
        ))}
      </Sheet>
    );
  }

  return (
    <Sheet title="Brands" onClose={onClose}>
      <p className="np-muted" style={{ margin: 0 }}>Group the channels you post to together. Picking a brand in New post switches all of them on.</p>
      {brands.map((b) => {
        const live = b.channels.filter((k) => connected.has(k));
        const bApps = APPS.filter((p) => live.some((k) => byKey.get(k)?.app === p));
        return (
          <div key={b.id} className="pb-ch">
            <span className="pb-faces">{live.slice(0, 3).map((k) => { const c = byKey.get(k); return c ? <Face key={k} ch={c} badge={false} /> : null; })}</span>
            <span><b>{b.name}</b><small>{live.length} channel{live.length === 1 ? "" : "s"} · {bApps.map((p) => NAMES[p]).join(", ") || "none connected"}</small></span>
            <button type="button" className="btn-outline v2-btn-sm" onClick={() => open(b)}>Edit</button>
          </div>
        );
      })}
      {!brands.length && <p className="np-muted" style={{ margin: 0 }}>No brands yet. Tap &ldquo;+ New brand&rdquo; to make your first one.</p>}
      <button type="button" className="btn-outline" onClick={() => open({ name: "", channels: [] })}>+ New brand</button>
      <button type="button" className="np-btn" onClick={onClose}>Done</button>
    </Sheet>
  );
}
