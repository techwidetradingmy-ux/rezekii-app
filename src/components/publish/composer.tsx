"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useDemo } from "@/components/demo";
import { Icon } from "@/components/icons";
import { Sheet, Tip } from "@/components/ui";
import { useLang, useT } from "@/lib/i18n/client";
import { dateLocale, tx, type Lang, type T } from "@/lib/i18n/lang";
import { rich } from "./rich";
import { PlatformIcon } from "@/components/creator2/bits";
import { NotYet, useCanPost } from "@/components/not-yet";
import { POST_CREDITS, type MyPost, type PubBrand, type PubChannel, type PublishSetup } from "@/lib/mock-publish";
import { postToEdit, saveEdit } from "./post-edits";
import { creatorInfo, sendPost, upload, type CreatorInfo } from "@/lib/live-publish";
import { PhonePreview, type Who } from "./phone-previews";
import {
  APPS, CAPTION_MAX, COLLABORATORS_MAX, COMMENT_MAX, ICON, NAMES, PRIVACY, REPLY_CONTROLS, TAGS_MAX,
  autoCaption, autoComment, channelProblems, channelWarnings, cleanTopic, hasLinkOrCta, lengthFor, links, parseHashtags,
  parseUsernames, threadsTopic, tiktokProblems, withHashtags,
  type Channel, type Platform, type Privacy, type ReplyControl, type TrialMode,
} from "./rules";
import { PHOTO_MAX, instagramCrop, instagramMisfits, photoProblems } from "@/modules/social/rules.ts";
import { PHOTOS_MAX } from "@/modules/posting/photos.ts";
import "@/app/creator2.css";
import "@/app/publish.css";

type When = "now" | "recommended" | "pick" | "draft";
/** The form's sections, so a problem can jump to the one that needs fixing. */
type Sec = "channels" | "video" | "caption" | "comment" | "tiktok" | "settings" | "when";
type Problem = [string, Sec];

/**
 * One photo of a photo post (owner, 21 Nov 2026, as on rezekii.com), made a JPG here, with its size. `ig` is Instagram's own copy,
 * cut to fit, when the photo is taller than 4:5 or wider than 1.91:1 (instagramCrop).
 */
type Photo = { key: string; file: File; url: string; w: number; h: number; ig?: { file: File; url: string } };

/** Draws part of an image (all of it by default) as a JPG of `w` × `h`, on white where it was see-through. */
async function drawJpeg(src: ImageBitmap, w: number, h: number, name: string, box = { x: 0, y: 0, w: src.width, h: src.height }): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(src, box.x, box.y, box.w, box.h, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("no jpeg");
  return new File([blob], name, { type: "image/jpeg" });
}

/** Instagram's copy of a photo, cut to fit, or nothing when it already fits. */
async function instagramCopy(src: ImageBitmap, w: number, h: number, name: string): Promise<Photo["ig"]> {
  const box = instagramCrop(w, h);
  if (!box) return undefined;
  const s = src.width / w;
  const file = await drawJpeg(src, box.w, box.h, name.replace(/\.jpg$/, "-instagram.jpg"), { x: box.x * s, y: box.y * s, w: box.w * s, h: box.h * s });
  return { file, url: URL.createObjectURL(file) };
}

/**
 * Turns a picked image into the JPG every app takes: at most 1080 × 1920 (TikTok's 1080p), with Instagram's own cut copy when
 * it needs one. Fails for images the browser can't read (for example HEIC).
 */
async function toJpeg(file: File): Promise<{ file: File; w: number; h: number; ig: Photo["ig"] }> {
  const bmp = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1080 / bmp.width, 1920 / bmp.height);
    const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale));
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return { file: await drawJpeg(bmp, w, h, name), w, h, ig: await instagramCopy(bmp, w, h, name) };
  } finally {
    bmp.close();
  }
}
/** A red star for a required field, and a grey tag for an optional one. */
function Req() {
  const t = useT();
  return <i className="pb-req" title={t("Required")}>*<span className="sr-only"> {t("required")}</span></i>;
}
function Opt() {
  const t = useT();
  return <span className="pb-opt">{t("Optional")}</span>;
}
/** The next recommended time for this account, Malaysia time (V1 picks 6 am, 12 pm or 8 pm). Shown in her language. */
const RECOMMENDED = tx("Today, 8:00 PM");
const SEARCH_ICON = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/**
 * "2026-10-29T20:00" → "Thu 29 Oct, 8:00 PM" (no locale lookups in English, so server and browser agree). Malay and Chinese
 * use the browser's dates in that language; it's only called after she presses a button.
 */
function pretty(v: string, lang: Lang) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v);
  if (!m) return v;
  if (lang !== "en") return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]))).toLocaleString(dateLocale(lang), { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "UTC" });
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const h = Number(m[4]);
  return `${DAYS[d.getDay()]} ${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}, ${h % 12 || 12}:${m[5]} ${h < 12 ? "AM" : "PM"}`;
}

const isTikTok = (c?: PubChannel) => c?.app === "tiktok";
/** A real TikTok channel's key is "tiktok:<open_id>". */
const openIdOf = (key: string) => key.replace(/^tiktok:/, "");
/** An ISO time as Malaysia time for pretty(). */
const mytLocal = (iso: string) => new Date(Date.parse(iso) + 8 * 3600_000).toISOString().slice(0, 16);
/** Now, as the date picker's minimum (the browser's own time). */
const nowLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset() + 2); return d.toISOString().slice(0, 16); };

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
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  // Edit opens this page with the post filled in (owner, 28 Oct 2026); saving updates that post instead of making a new one.
  const [editing, setEditing] = useState<MyPost | null>(null);
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
  const [tab, setTab] = useState<"main" | Channel>("main");
  const [source, setSource] = useState<"upload" | "link">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [sample, setSample] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [durationSec, setDurationSec] = useState<number | null>(null);
  // A photo post: photos instead of a video, in order; the first is the cover.
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [mediaError, setMediaError] = useState("");
  const isPhotos = photos.length > 0;
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
  // After the first try, problems show live under each section until they're fixed.
  const [tried, setTried] = useState(false);
  const [flash, setFlash] = useState<Sec | "">("");
  const [check, setCheck] = useState<"" | "busy" | "ok">("");
  const [done, setDone] = useState<{ summary: string; when: When; at: string; cost: number; tiktok: "direct" | "inbox" | null; photos?: boolean } | null>(null);
  // Signed in (owner, 31 Oct 2026): real channels, real sending from this wallet.
  const liveSide = setup.live;
  const [credits, setCredits] = useState(setup.credits);
  const [sendError, setSendError] = useState("");
  const [info, setInfo] = useState<{ acct: string; info?: CreatorInfo; error?: string } | null>(null);

  const byKey = useMemo(() => new Map(channels.map((c) => [c.key, c])), [channels]);
  // Only channels she can post to now (owner, 3 Nov 2026: posting to TikTok waits for TikTok's approval; admins can still post).
  const canPost = useCanPost();
  const connected = useMemo(() => new Set(channels.filter((c) => c.status === "active" && canPost(c.app)).map((c) => c.key)), [channels, canPost]);
  // One TikTok account per post: picking another swaps it.
  const toggleChannel = (key: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (!n.has(key) && !connected.has(key)) return s;
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
  // TikTok requires its rules for the account to be asked fresh each time it's picked for a post.
  useEffect(() => {
    if (!liveSide || !ttKey) return;
    const acct = openIdOf(ttKey);
    let on = true;
    creatorInfo(acct, t)
      .then((i) => { if (on) setInfo({ acct, info: i }); })
      .catch((e: unknown) => { if (on) setInfo({ acct, error: e instanceof Error ? e.message : t("Couldn't reach TikTok.") }); });
    return () => { on = false; };
  }, [liveSide, ttKey, t]);
  const ttInfo = liveSide && ttKey && info?.acct === openIdOf(ttKey) ? info : null;
  const privacyOptions = ttInfo?.info ? PRIVACY.filter(([p]) => ttInfo.info!.privacy_level_options.includes(p)) : PRIVACY;
  const lockAllow = { comments: !!ttInfo?.info?.comment_disabled, duet: !!ttInfo?.info?.duet_disabled, stitch: !!ttInfo?.info?.stitch_disabled };
  // TikTok's Content Sharing Guidelines (its Direct Post audit, as on rezekii.com since 6 Nov 2026): say which label the video
  // gets, keep Post off while the promotion switch is on with no box ticked, and grey out Branded content while "Only me" is
  // picked. The viewer choice is never cleared (owner, 6 Nov 2026: it jumped back to "Choose who can view").
  const promoLabel = promo.on && promo.branded ? t("Your video will be labeled \"Paid partnership\".") : promo.on && promo.own ? t("Your video will be labeled \"Promotional content\".") : "";
  const promoIncomplete = !!ttKey && mode === "direct" && when !== "draft" && promo.on && !promo.own && !promo.branded;
  const brandedBlocked = privacy === "SELF_ONLY" && !promo.branded;
  const keys = [...(ttKey ? [ttKey] : []), ...metaPicked.map((c) => c.key)];
  const chOf = (key: string): Channel => byKey.get(key)?.app ?? "facebook";
  const apps = APPS.filter((p) => keys.some((k) => chOf(k) === p));
  const inApp = (p: Channel) => keys.filter((k) => chOf(k) === p);
  // The main caption with the Hashtags box at the very bottom: what every app's suggested caption is written from.
  const mainFull = withHashtags(main, parseHashtags(tagsText));
  // Captions never carry the link or call to action; those go in the first comment (TikTok: the yellow basket).
  const captionOf = (p: Channel) => capOver[p] ?? autoCaption(p, mainFull);
  const commentOf = (p: Channel) => (p === "tiktok" ? "" : (comOver[p] ?? autoComment(p, link.trim(), ownComment, cta)));
  // "Facebook · 3 Pages" and "3 Facebook Pages": what each app calls a channel.
  const appLabel = (p: Channel) => { const n = inApp(p).length; const v = { app: NAMES[p], n }; return n < 2 ? NAMES[p] : p === "facebook" ? t("{app} · {n} Pages", v) : p === "threads" ? t("{app} · {n} profiles", v) : t("{app} · {n} accounts", v); };
  const summary = () => apps.map((p) => { const n = inApp(p).length; const v = { app: NAMES[p], n }; return n < 2 ? `${NAMES[p]} ${byKey.get(inApp(p)[0])?.name ?? ""}`.trim() : p === "facebook" ? t("{n} {app} Pages", v) : p === "threads" ? t("{n} {app} profiles", v) : t("{n} {app} accounts", v); }).join(lang === "zh" ? "、" : ", ");
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
  const vid = editing ? { cover: editing.cover, file: t("Your video"), seconds: editing.seconds } : setup.sample;
  const cover = source === "upload" && sample && !file ? vid.cover : null;
  const hasVideo = isPhotos || (source === "upload" ? !!file || sample : /^https:\/\/\S+$/.test(linkUrl));
  // Instagram takes photos from 4:5 to 1.91:1 only: one that doesn't fit goes to Instagram cut to fit (owner, 21 Nov 2026).
  const igMisfits = isPhotos ? instagramMisfits(photos) : [];

  // Cross-channel posting costs credits per channel (owner, 28 Oct 2026). Drafts are free; failed or cancelled channels get theirs back.
  // Editing a scheduled post only charges for channels added now.
  const paid = editing?.date ? editing.targets.map((x) => x.key) : [];
  const cost = when === "draft" ? 0 : keys.filter((k) => !paid.includes(k)).length * POST_CREDITS;
  const problems = ((): Problem[] => {
    const out: Problem[] = [];
    if (!keys.length) out.push([t("Pick at least one channel."), "channels"]);
    if (!hasVideo) out.push([t("Add a video or photos: upload them or paste a video link."), "video"]);
    if (isPhotos) for (const p of apps) photoProblems(p, photos.length, t).forEach((x) => out.push([x, "video"]));
    if (keys.length && !apps.some((p) => captionOf(p).trim())) out.push([t("Write a caption."), "caption"]);
    // Which section a problem belongs to is read from its English; she sees it in her language.
    if (ttKey && when !== "draft") {
      const choice = { mode, caption: captionOf("tiktok"), privacy, promo: promo.on, own: promo.own, branded: promo.branded };
      const shownAs = tiktokProblems(choice, t);
      tiktokProblems(choice).forEach((en, i) => out.push(en.startsWith("The caption") ? [t("TikTok: {problem}", { problem: shownAs[i] }), "caption"] : [shownAs[i], "tiktok"]));
    }
    for (const p of apps)
      if (p !== "tiktok") {
        const dur = isPhotos ? null : durationSec;
        const shownAs = channelProblems(p, captionOf(p), commentOf(p), dur, t);
        channelProblems(p, captionOf(p), commentOf(p), dur).forEach((en, i) => out.push([shownAs[i], en.includes("first comment") ? "comment" : /videos up to|at least 3 seconds/.test(en) ? "video" : "caption"]));
      }
    if (apps.includes("instagram")) {
      const c = parseUsernames(collabText), g = parseUsernames(tagText);
      if (c.bad.length) out.push([t("Instagram collaborators: \"{name}\" isn't an Instagram username.", { name: c.bad[0] }), "settings"]);
      if (c.list.length > COLLABORATORS_MAX) out.push([t("Instagram allows up to {max} collaborators.", { max: COLLABORATORS_MAX }), "settings"]);
      if (g.bad.length) out.push([t("Instagram tagged people: \"{name}\" isn't an Instagram username.", { name: g.bad[0] }), "settings"]);
    }
    if (liveSide && ttKey && when !== "draft" && mode === "direct") {
      if (ttInfo?.error) out.push([t("TikTok: {problem}", { problem: t(ttInfo.error) }), "tiktok"]);
      else if (!ttInfo?.info) out.push([t("Checking your TikTok account. Try again in a moment."), "tiktok"]);
      else if (privacy && !ttInfo.info.privacy_level_options.includes(privacy)) out.push([t("Pick who can view from TikTok's list for this account."), "tiktok"]);
      else if (!isPhotos && durationSec && ttInfo.info.max_video_post_duration_sec && durationSec > ttInfo.info.max_video_post_duration_sec) out.push([t("TikTok: this account can post videos up to {n} seconds.", { n: ttInfo.info.max_video_post_duration_sec }), "video"]);
    }
    if (when === "pick" && !pickAt) out.push([t("Pick a date and time."), "when"]);
    if (cost > credits) out.push([t("Not enough credits: needs {cost}, you have {credits}. Earn more or save as draft.", { cost, credits: credits.toLocaleString("en-MY") }), "when"]);
    return out;
  })();
  const shown = tried ? problems : [];
  const errorsIn = (s: Sec) => shown.filter(([, sec]) => sec === s).map(([text]) => text);
  const secClass = (s: Sec) => `v2-card pb-card${errorsIn(s).length ? " bad" : ""}${flash === s ? " flash" : ""}`;
  const warnings = [
    ...apps.flatMap((p) => channelWarnings(p, captionOf(p), t)),
    ...apps.filter((p) => hasLinkOrCta(captionOf(p), cta)).map((p) => t("{app} caption has a link or call to action. Move it to the first comment.", { app: NAMES[p] })),
  ];

  /** Real accounts: each app's own sign-in, then back here with the result. */
  function connectReal(app: Channel) {
    window.location.href = app === "tiktok" ? "/api/auth/tiktok/start" : `/api/auth/meta/${app}/start${liveSide === "seller" ? "?from=seller" : ""}`;
  }
  async function checkReal(c: PubChannel) {
    const r = await fetch("/api/channels/check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: c.key }) }).catch(() => null);
    const x = (await r?.json().catch(() => ({}))) as { status?: "active" | "reconnect"; error?: string } | undefined;
    if (!r?.ok || !x?.status) return say(x?.error ? t(x.error) : t("Couldn't check. Try again."));
    const status = x.status;
    setChannels((l) => l.map((y) => (y.key === c.key ? { ...y, status } : y)));
    say(status === "active" ? t("{name} is connected and working.", { name: c.name }) : t("{name} needs reconnecting.", { name: c.name }));
  }
  async function disconnectReal(c: PubChannel) {
    const r = await fetch(c.app === "tiktok" ? `/api/account/tiktok/${encodeURIComponent(openIdOf(c.key))}` : `/api/social/accounts/${c.key}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) return say(t("Couldn't disconnect. Try again."));
    setChannels((l) => l.filter((x) => x.key !== c.key));
    setPicked((s) => new Set([...s].filter((k) => k !== c.key)));
    say(c.app === "tiktok" ? t("{name} disconnected. Its scheduled posts moved to drafts.", { name: c.name }) : t("{name} disconnected. Its scheduled posts were cancelled.", { name: c.name }));
  }
  async function saveBrandReal(b: PubBrand) {
    const isNew = !/^[0-9a-f-]{36}$/.test(b.id);
    const r = await fetch(isNew ? "/api/social/brands" : `/api/social/brands/${b.id}`, { method: isNew ? "POST" : "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: b.name, channels: b.channels }) }).catch(() => null);
    const d = (await r?.json().catch(() => ({}))) as { brand?: PubBrand; error?: string } | undefined;
    if (!r?.ok || !d?.brand) return say(d?.error ? t(d.error) : t("Couldn't save the brand. Try again."));
    const saved = d.brand;
    setBrands((list) => [...list.filter((x) => x.id !== saved.id), saved].sort((x, y) => x.name.localeCompare(y.name)));
    say(t("Brand saved."));
  }
  async function deleteBrandReal(id: string) {
    const r = await fetch(`/api/social/brands/${id}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) return say(t("Couldn't delete the brand. Try again."));
    setBrands((list) => list.filter((x) => x.id !== id));
  }

  function sameAsLast() {
    const next = new Set(setup.last.filter((k) => connected.has(k)));
    if (!next.size) return say(t("Last post's channels aren't connected."));
    setPicked(next);
    const names = [...next].map((k) => byKey.get(k)?.name).filter(Boolean).slice(0, 4).join(", ");
    say(t("Same as last post: {names}.", { names }));
  }
  function connectApp(c: PubChannel) {
    setChannels((list) => [...list, c]);
    say(t("{app} connected.", { app: NAMES[c.app] }));
  }
  /** Preview helper: the post Rezekii suggests (a sample video, caption and first comment), to the same channels as last time. */
  function fillSample() {
    setSource("upload");
    setSample(true);
    setFile(null);
    setPhotos([]);
    setDurationSec(setup.sample.seconds);
    setMain(setup.sample.main);
    setTagsText(setup.sample.tags);
    setLink(setup.sample.link);
    setCta(setup.sample.cta);
    setOwnComment(setup.sample.comment);
    setCapOver({});
    setComOver({});
    setPicked(new Set(setup.last.filter((k) => connected.has(k))));
    say(t("Sample post filled in."));
  }
  /**
   * Picked files: one video, or photos (added after any already picked, up to TikTok's 35). Photos become JPGs here. A post is
   * a video or photos, never both, so photos replace a video and a video replaces photos.
   */
  async function pickFiles(list: FileList | null) {
    const files = [...(list ?? [])];
    if (!files.length) return;
    setMediaError("");
    const videos = files.filter((f) => f.type.startsWith("video/")), images = files.filter((f) => f.type.startsWith("image/"));
    if (videos.length > 1 || (videos.length && images.length)) return setMediaError(t("Pick one video, or photos. A post can't have both."));
    if (videos.length) {
      setFile(videos[0]);
      setDurationSec(null);
      setSample(false);
      setPhotos([]);
      return;
    }
    if (!images.length) return setMediaError(t("Pick a video (MP4, MOV or WebM) or photos (JPG, PNG or WebP)."));
    const room = PHOTOS_MAX - photos.length;
    if (room <= 0) return setMediaError(t("A post can have up to {max} photos.", { max: PHOTOS_MAX }));
    setBusy(t("Preparing photos…"));
    const added: Photo[] = [], failed: string[] = [];
    for (const f of images.slice(0, room)) {
      try {
        const j = await toJpeg(f);
        added.push({ key: `${f.name}-${f.size}-${Math.random().toString(36).slice(2)}`, file: j.file, url: URL.createObjectURL(j.file), w: j.w, h: j.h, ig: j.ig });
      } catch {
        failed.push(f.name);
      }
    }
    setBusy("");
    setFile(null);
    setSample(false);
    setDurationSec(null);
    setSource("upload");
    // Facebook drafts, Instagram's Reels-only switch and trial reels are for videos.
    setFbDraft(false);
    setIgFeed(true);
    setIgTrial("off");
    setPhotos((list) => [...list, ...added]);
    if (failed.length) setMediaError(t("Couldn't read {names}. Use JPG, PNG or WebP photos.", { names: failed.join(", ") }));
    else if (images.length > room) setMediaError(t("A post can have up to {max} photos, so only the first {n} were added.", { max: PHOTOS_MAX, n: room }));
  }
  const movePhoto = (i: number, by: number) => setPhotos((list) => { const n = [...list]; const [x] = n.splice(i, 1); n.splice(i + by, 0, x); return n; });
  const removePhoto = (i: number) => setPhotos((list) => {
    const gone = list[i];
    if (gone) URL.revokeObjectURL(gone.url);
    if (gone?.ig) URL.revokeObjectURL(gone.ig.url);
    return list.filter((_, k) => k !== i);
  });

  /** Scroll to a section, light it up for a moment and put the cursor in its first field. */
  function jump(s: Sec) {
    const el = document.getElementById(`pb-s-${s}`);
    if (!el) return;
    el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    el.querySelector<HTMLElement>("input:not([type=radio]):not([type=checkbox]), textarea, select")?.focus({ preventScroll: true });
    setFlash(s);
    window.setTimeout(() => setFlash(""), 1600);
  }
  // Arriving with ?sample opens New post already filled in (for demos).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    // Back from connecting Facebook, Instagram or Threads.
    const connect = q.get("connect");
    if (connect) {
      const app = NAMES[(q.get("channel") ?? "facebook") as Channel] ?? t("The app");
      say(connect === "ok" ? t("{app} connected.", { app }) : connect === "no_pages" ? t("No Facebook Pages were picked. Connect again and tick your Pages.") : connect === "personal" ? t("That Instagram account is personal. Switch it to a Business or Creator account in Instagram, then connect again.") : connect === "cancelled" ? t("{app} sign-in was cancelled.", { app }) : connect === "expired" ? t("That took too long. Please connect again.") : t("{app} didn't connect. Please try again.", { app }));
      window.history.replaceState(null, "", window.location.pathname);
    }
    if (q.has("sample")) fillSample();
    // From Today's Ideas: the idea becomes the start of the caption; she adds the video.
    else if (q.get("idea")) { setMain(q.get("idea")!.slice(0, 200)); say(t("Idea added. Now add a video and channels.")); }
    else if (q.get("edit")) {
      const p = postToEdit(q.get("edit")!);
      if (!p) return;
      setEditing(p);
      setSource("upload");
      setPhotos([]);
      setSample(p.seconds > 0);
      setDurationSec(p.seconds || null);
      setMain(p.caption);
      setOwnComment(p.comment);
      setPicked(new Set(p.targets.map((t) => t.key).filter((k) => connected.has(k))));
      if (p.date) { setWhen("pick"); setPickAt(`${p.date}T${p.time}`); } else setWhen("draft");
    }
  }, []);

  /** Real sending: upload, then TikTok, then the other apps as one group; each scheduled channel takes credits. */
  async function sendLive(side: "creator" | "seller") {
    setSendError("");
    try {
      let storagePath: string | undefined;
      if (source === "upload" && file && !isPhotos) storagePath = await upload(file, (pct) => setBusy(t("Uploading video… {pct}%", { pct })), t);
      // A photo post: each photo is uploaded in order; Instagram gets the cut copies of photos that don't fit it.
      const photoPaths: string[] = [];
      for (const [i, ph] of photos.entries()) photoPaths.push(await upload(ph.file, (pct) => setBusy(t("Uploading photo {n} of {total}… {pct}%", { n: i + 1, total: photos.length, pct })), t, "photo"));
      const instagramPhotoPaths: string[] = [];
      if (isPhotos && apps.includes("instagram") && photos.some((ph) => ph.ig))
        for (const [i, ph] of photos.entries()) instagramPhotoPaths.push(ph.ig ? await upload(ph.ig.file, (pct) => setBusy(t("Uploading photo {n} for Instagram… {pct}%", { n: i + 1, pct })), t, "photo") : photoPaths[i]);
      setBusy(when === "draft" ? t("Saving…") : t("Scheduling…"));
      const at = when === "pick" ? new Date(pickAt).toISOString() : when;
      const settingsFor = (p: Channel): Record<string, unknown> => (p === "facebook" ? { draft: fbDraft } : p === "instagram" ? { feed: igFeed, collaborators, tags: tagged, trial: igTrial } : { replies, topic });
      const r = await sendPost({
        side, when: at, durationSec: isPhotos ? null : durationSec,
        video: isPhotos ? { photoPaths, ...(instagramPhotoPaths.length ? { instagramPhotoPaths } : {}) } : { source, storagePath, linkUrl: source === "link" ? linkUrl : undefined },
        tiktok: ttKey ? { account: openIdOf(ttKey), choice: { mode, caption: captionOf("tiktok"), privacyLevel: privacy || null, allowComments: allow.comments && !lockAllow.comments, allowDuet: allow.duet && !lockAllow.duet && !isPhotos, allowStitch: allow.stitch && !lockAllow.stitch && !isPhotos, promo: promo.on, brandOrganic: promo.own, brandedContent: promo.branded, isAigc, durationSec: isPhotos ? null : durationSec } } : undefined,
        others: metaPicked.map((c) => ({ accountId: c.key, caption: captionOf(c.app), firstComment: c.app === "facebook" && fbDraft ? "" : commentOf(c.app), settings: settingsFor(c.app) })),
      }, t);
      setCredits((n) => n - cost);
      setDone({ summary: summary(), when, at: r.at ? pretty(mytLocal(r.at), lang) : t(RECOMMENDED), cost, tiktok: ttKey ? mode : null, photos: isPhotos });
    } catch (e) {
      setSendError(e instanceof Error ? t(e.message) : t("Didn't go through. Please try again."));
    } finally {
      setBusy("");
    }
  }

  function submit() {
    setTried(true);
    if (problems.length) return jump(problems[0][1]);
    if (liveSide) return void sendLive(liveSide);
    if (editing) {
      const [date, time] = when === "draft" ? ["", ""] : when === "pick" ? pickAt.split("T") : when === "now" ? ["2026-10-28", "09:20"] : ["2026-10-28", "20:00"];
      const comment = apps.filter((p) => p !== "tiktok").map(commentOf)[0] ?? ownComment.trim();
      saveEdit(
        { ...editing, caption: mainFull.trim(), comment, date, time, targets: keys.map((k) => ({ key: k, status: date ? "scheduled" : "draft" })) },
        !date ? t("Draft saved") : when === "now" ? t("Saved. Goes out now.") : t("Saved. Goes out {time}.", { time: when === "pick" ? pretty(pickAt, lang) : t(RECOMMENDED) }),
      );
      return router.push(setup.calendar);
    }
    setBusy(when === "draft" ? t("Saving…") : t("Scheduling…"));
    window.setTimeout(() => {
      setBusy("");
      setDone({ summary: summary(), when, at: when === "pick" ? pretty(pickAt, lang) : t(RECOMMENDED), cost, tiktok: ttKey ? mode : null, photos: isPhotos });
    }, 700);
  }

  if (done) {
    return (
      <section className="v2-card pb-sent" role="status">
        <span className="pb-sent-ico" aria-hidden="true">✓</span>
        <h2>{done.when === "draft" ? t("Saved as a Draft") : done.when === "now" ? t("On Its Way") : t("Scheduled")}</h2>
        <p>
          {done.when === "draft" ? t("Saved in Rezekii for {summary}. Track or edit it in Content Calendar.", { summary: done.summary }) : done.when === "now" ? t("{summary}: posting now. Track or edit it in Content Calendar.", { summary: done.summary }) : t("{summary}: {time} (Malaysia time). Track or edit it in Content Calendar.", { summary: done.summary, time: done.at })}
        </p>
        {done.tiktok && done.when !== "draft" && <p className="np-muted">{done.tiktok === "direct" ? (done.photos ? t("After it's posted, TikTok can take a few minutes before it shows on your profile.") : t("After it's posted, TikTok can take a few minutes to process the video before it shows on your profile.")) : t("It will land in your TikTok inbox, where you can finish and post it in the TikTok app.")}</p>}
        {done.cost > 0 && <p className="pb-sent-cost">{t("{n} credits used", { n: done.cost })} <Tip text={t("Refunded if a channel fails or is cancelled.")} /></p>}
        <div className="np-row">
          <Link href={setup.calendar} className="np-btn">{t("Open Content Calendar")}</Link>
          <button type="button" className="btn-outline" onClick={onNew}>{t("New Post")}</button>
        </div>
      </section>
    );
  }

  const counts = apps.map((p) => {
    const n = lengthFor(p, captionOf(p));
    return <span key={p} className={n > CAPTION_MAX[p] ? "over" : ""}><PlatformIcon name={ICON[p]} size={14} />{n.toLocaleString("en-US")} / {CAPTION_MAX[p].toLocaleString("en-US")}</span>;
  });
  const linkWhere = (p: Channel) =>
    p === "tiktok" ? t("Yellow basket")
      : p === "facebook" && fbDraft ? t("No comment on drafts")
      : p === "instagram" ? t("First comment (links not tappable)")
      : t("First comment");
  const notes = pApp ? previewNotes(pApp, captionOf(pApp), commentOf(pApp), !!link.trim(), fbView, { fbDraft, igFeed, igTrial, replies, tagged }, t) : [];
  const notesFor = pApp ? NAMES[pApp] : t("this app");
  // The video's length, and how Facebook will post it.
  const length = durationSec === null ? "" : `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, "0")}`;
  const lengthLine = !apps.includes("facebook") ? t("Length {length}", { length })
    : durationSec !== null && durationSec >= 3 && durationSec <= 90 ? t("Length {length} · Facebook: posts as a Reel", { length })
    : t("Length {length} · Facebook: posts as a video (Reels are 3–90 s)", { length });
  const secErr = (s: Sec) => errorsIn(s).length > 0 && <ul className="pb-secerr" role="alert">{errorsIn(s).map((x) => <li key={x}>{x}</li>)}</ul>;
  const pComment = pApp && pApp !== "tiktok" && !(pApp === "facebook" && fbDraft) ? commentOf(pApp) : "";
  const q = query.trim().toLowerCase();
  const results = channels.filter((c) => c.status === "active" && (!q || `${c.name} ${c.sub} ${NAMES[c.app]}`.toLowerCase().includes(q)));
  const missing = setup.connectable.filter((c) => !channels.some((x) => x.key === c.key));
  const pickedChs = channels.filter((c) => picked.has(c.key) && connected.has(c.key));

  return (
    <>
      <div className="pb-top">
        <p className="pb-legend"><Req /> {t("Required")}</p>
        {!liveSide && <button type="button" className="btn-outline v2-btn-sm" onClick={fillSample}>✦ {t("Use a sample")}</button>}
      </div>
      <form className="pb" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        <div className="pb-col">
          <section id="pb-s-channels" className={secClass("channels")}>
            <div className="pb-bar">
              <h2>{t("Post to")} <Req /></h2>
              <span className="pb-links">
                <button type="button" className="pb-link" onClick={sameAsLast}>{t("Same as Last Post")}</button>
                <button type="button" className="pb-link" onClick={() => setSheet("brands")}>{t("Manage Brands")}</button>
                <button type="button" className="pb-link" onClick={() => setSheet("channels")}>{t("Channels · {n}", { n: channels.length })}</button>
              </span>
            </div>
            <div className="pb-group">
              <span className="pb-gh">{t("Brands")}</span>
              <div className="pb-chips">
                {brands.map((b) => {
                  const on = live(b);
                  const bApps = APPS.filter((p) => on.some((k) => byKey.get(k)?.app === p));
                  return (
                    <button key={b.id} type="button" className="pb-chip pb-brand" aria-pressed={brandOn(b)} disabled={!on.length} onClick={() => toggleBrand(b)} title={on.length ? undefined : t("No channels connected")}>
                      <span className="pb-faces">{on.slice(0, 3).map((k) => { const c = byKey.get(k); return c ? <Face key={k} ch={c} badge={false} /> : null; })}</span>
                      <span className="pb-blabel"><span>{b.name}</span><small>{on.length} · {bApps.map((p) => NAMES[p]).join(", ") || t("not connected")}</small></span>
                    </button>
                  );
                })}
                {missing.map((c) => <button key={c.key} type="button" className="pb-chip add" onClick={() => connectApp(c)}>+ {NAMES[c.app]}</button>)}
              </div>
              {!brands.length && <p className="np-muted">{t("Group channels to pick them in one tap.")} <button type="button" className="pb-link" onClick={() => setSheet("brands")}>{t("Create a Brand")}</button></p>}
            </div>
            <div className="pb-finder" ref={finder}>
              <label className="pb-search">
                {SEARCH_ICON}
                <input className="np-input" type="search" value={query} onChange={(e) => { setQuery(e.target.value); setListOpen(true); }} onFocus={() => setListOpen(true)} onClick={() => setListOpen(true)} onKeyDown={(e) => e.key === "Escape" && setListOpen(false)} placeholder={t("Pick or search channels ({n})", { n: connected.size })} aria-label={t("Pick or search channels")} role="combobox" aria-expanded={listOpen} aria-controls="pb-channel-list" />
              </label>
              {listOpen && (
                <div id="pb-channel-list" className="pb-results" role="listbox" aria-label={t("Connected channels")} aria-multiselectable="true">
                  {APPS.map((p) => {
                    const list = results.filter((c) => c.app === p);
                    if (list.length && !canPost(p)) return <div key={p} className="pb-group"><span className="pb-gh"><PlatformIcon name={ICON[p]} size={16} />{NAMES[p]} · {list.length} <NotYet app={p} /></span></div>;
                    return list.length ? (
                      <div key={p} className="pb-group">
                        <span className="pb-gh"><PlatformIcon name={ICON[p]} size={16} />{NAMES[p]} · {list.length}</span>
                        {list.map((c) => <button key={c.key} type="button" role="option" aria-selected={picked.has(c.key)} className="pb-res" onClick={() => toggleChannel(c.key)}><Face ch={c} /><span>{c.name}</span><small>{c.app === "facebook" ? "" : c.sub}</small><i className="pb-tick" aria-hidden="true">{picked.has(c.key) ? "✓" : ""}</i></button>)}
                      </div>
                    ) : null;
                  })}
                  {!results.length && <p className="np-muted" style={{ padding: 6 }}>{q ? t("No channel matches \"{query}\".", { query }) : t("No channels connected yet.")}</p>}
                  <button type="button" className="pb-link pb-done" onClick={() => setListOpen(false)}>{t("Done")}</button>
                </div>
              )}
            </div>
            {pickedChs.length > 0 ? (
              <div className="pb-picked">
                {APPS.filter((p) => pickedChs.some((c) => c.app === p)).map((p) => (
                  <div key={p} className="pb-group">
                    <span className="pb-gh"><PlatformIcon name={ICON[p]} size={16} />{NAMES[p]}</span>
                    <div className="pb-tags">{pickedChs.filter((c) => c.app === p).map((c) => <span key={c.key} className="pb-tag"><Face ch={c} badge={false} /><span>{c.name}</span><button type="button" aria-label={t("Remove {name}", { name: c.name })} onClick={() => toggleChannel(c.key)}>×</button></span>)}</div>
                  </div>
                ))}
              </div>
            ) : <p className="np-muted">{t("No channels picked yet.")}</p>}
            {secErr("channels")}
          </section>

          <section id="pb-s-video" className={secClass("video")}>
            <h2>{t("Video or Photos")} <Req /></h2>
            {!isPhotos && (
              <div className="np-seg" role="radiogroup" aria-label={t("Video source")}>
                <button type="button" role="radio" aria-checked={source === "upload"} className={source === "upload" ? "on" : ""} onClick={() => setSource("upload")}>{t("Upload")}</button>
                <button type="button" role="radio" aria-checked={source === "link"} className={source === "link" ? "on" : ""} onClick={() => setSource("link")}>{t("Paste a Link")}</button>
              </div>
            )}
            {isPhotos && (
              <ol className="pb-photos" aria-label={t("Photos, in order")}>
                {photos.map((ph, i) => (
                  <li key={ph.key}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ph.url} alt={t("Photo {n}", { n: i + 1 })} />
                    <span className="pb-photo-n">{i === 0 ? t("Cover") : i + 1}</span>
                    <span className="pb-photo-act">
                      <button type="button" disabled={i === 0} onClick={() => movePhoto(i, -1)} aria-label={t("Move photo {n} earlier", { n: i + 1 })}>‹</button>
                      <button type="button" onClick={() => removePhoto(i)} aria-label={t("Remove photo {n}", { n: i + 1 })}>×</button>
                      <button type="button" disabled={i === photos.length - 1} onClick={() => movePhoto(i, 1)} aria-label={t("Move photo {n} later", { n: i + 1 })}>›</button>
                    </span>
                  </li>
                ))}
              </ol>
            )}
            {source === "upload" || isPhotos ? (
              sample && !file && !isPhotos ? (
                <div className="pb-file">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={vid.cover} alt="" />
                  <span><b>{vid.file}</b><small>{editing ? t("9:16 · {n} seconds", { n: vid.seconds }) : t("9:16 · {n} seconds · sample", { n: vid.seconds })}</small><button type="button" className="pb-link" style={{ justifySelf: "start" }} onClick={() => { setSample(false); setDurationSec(null); }}>{t("Replace Video")}</button></span>
                </div>
              ) : (
                <label className="np-drop">
                  <input type="file" multiple accept="video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/webp" onChange={(e) => { void pickFiles(e.target.files); e.target.value = ""; }} />
                  <span>{isPhotos ? t("Add more photos ({n} of {max})", { n: photos.length, max: PHOTOS_MAX }) : file ? `${file.name} · ${(file.size / 1048576).toFixed(1)} MB` : t("Choose one video (MP4, MOV or WebM, up to 50 MB) or photos (JPG, PNG or WebP)")}</span>
                </label>
              )
            ) : (
              <input className="np-input" type="url" inputMode="url" placeholder={t("https://… (Drive, Dropbox or file link)")} value={linkUrl} onChange={(e) => setLinkUrl(e.target.value.trim())} aria-label={t("Video link")} />
            )}
            {mediaError && <p className="np-error" role="alert">{mediaError}</p>}
            {!isPhotos && videoUrl && <video src={videoUrl} muted playsInline preload="metadata" hidden onLoadedMetadata={(e) => setDurationSec(Math.round(e.currentTarget.duration))} />}
            {!isPhotos && durationSec !== null && (
              <p className="np-muted">
                {lengthLine}
              </p>
            )}
            <p className="np-muted">{t("Photos per post:")} {(apps.length ? apps : APPS).map((p) => `${NAMES[p]} ${PHOTO_MAX[p]}`).join(" · ")}</p>
            <p className="np-muted">{t("Best photo size: 1080 × 1350 (4:5) fits every app. TikTok also takes 1080 × 1920 (9:16) full screen.")}</p>
            {igMisfits.length > 0 && apps.includes("instagram") && <p className="np-note" role="status">{t("For Instagram, photo {list} is cut to fit: Instagram takes photos from 4:5 (portrait) to 1.91:1 (landscape), so the middle part is used. The other apps get the whole photo.", { list: igMisfits.join(", ") })}</p>}
            {setup.precheck && ttKey && hasVideo && !isPhotos && (
              <div className={`pb-check ${check}`}>
                <span className="pb-check-ico" aria-hidden="true">{check === "ok" ? "✓" : <Icon name="shield" size={18} />}</span>
                {check === "ok" ? (
                  <span><b>{t("TikTok found no problems")}</b><small>{t("No violations. Views aren't guaranteed.")}</small></span>
                ) : (
                  <span><b>{check === "busy" ? t("TikTok is checking your video…") : t("Check video first")}</b><small>{t("Checks for violations before you post.")}</small></span>
                )}
                {check !== "ok" && <button type="button" className="btn-outline v2-btn-sm" disabled={check === "busy"} onClick={() => { setCheck("busy"); window.setTimeout(() => setCheck("ok"), 2200); }}>{check === "busy" ? t("Checking…") : t("Check")}</button>}
              </div>
            )}
            {secErr("video")}
          </section>

          <section id="pb-s-caption" className={secClass("caption")}>
            <h2>{t("Caption")} <Req /> <Tip label={t("Caption tips")} text={t("Hook first: only the first line shows. No links here: put them in the first comment. Each app gets its own version in the tabs.")} /></h2>
            {apps.length > 0 && (
              <div className="pb-tabs" role="tablist" aria-label={t("Caption for")}>
                {([["main", t("Main")], ...apps.map((p) => [p, appLabel(p)])] as ["main" | Channel, string][]).map(([k, l]) => (
                  <button key={k} type="button" role="tab" aria-selected={activeTab === k} aria-label={k === "main" ? undefined : l} title={k === "main" ? undefined : l} className={k === "main" ? undefined : "pb-tab-ic"} onClick={() => setTab(k)}>
                    {k === "main" ? l : <PlatformIcon name={ICON[k]} size={20} />}{k !== "main" && (capOver[k] !== undefined || comOver[k] !== undefined) && <i className="dot" title={t("Edited")} />}
                  </button>
                ))}
              </div>
            )}
            {activeTab === "main" ? (
              <>
                <label className="pb-field"><textarea className="np-input" rows={5} value={main} onChange={(e) => setMain(e.target.value)} placeholder={t("Hook first, then a few short lines.")} aria-label={t("Main caption")} /></label>
                {counts.length > 0 && <div className="pb-counts" aria-label={t("Characters per app")}>{counts}</div>}
                {hasLinkOrCta(main, cta) && <p className="pb-warn">{t("Links are removed from captions. Use First comment below.")}</p>}
                <label className="pb-field"><span className="pb-row"><b>{t("Hashtags")} <Tip label={t("Hashtag tips")} text={t("Up to 5 on TikTok and Instagram, none on Threads.")} /></b><Opt /></span><input className="np-input" type="text" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="#thermos #kopi #tiktokshopmy" aria-label={t("Hashtags")} /></label>
                {apps.includes("threads") && (
                  <label className="pb-field">
                    <span className="pb-row"><b>{t("Threads Topic")} <Tip label={t("Topic tips")} text={t("One topic per post. No periods or &.")} /></b>{topicOver !== null ? <button type="button" className="pb-link" onClick={() => setTopicOver(null)}>{t("Use the First Hashtag")}</button> : <Opt />}</span>
                    <input className="np-input" type="text" value={topicOver ?? threadsTopic(mainFull)} maxLength={60} onChange={(e) => setTopicOver(e.target.value)} placeholder={t("e.g. Dapur")} aria-label={t("Threads topic")} />
                  </label>
                )}
              </>
            ) : (
              <ChannelPane
                ch={activeTab}
                name={appLabel(activeTab)}
                text={captionOf(activeTab)}
                edited={capOver[activeTab] !== undefined}
                captionLength={lengthFor(activeTab, captionOf(activeTab))}
                comment={commentOf(activeTab)}
                commentEdited={comOver[activeTab] !== undefined}
                onText={(v) => setCapOver((o) => ({ ...o, [activeTab]: v }))}
                onResetText={() => setCapOver((o) => { const n = { ...o }; delete n[activeTab]; return n; })}
                onComment={(v) => setComOver((o) => ({ ...o, [activeTab]: v }))}
                onResetComment={() => setComOver((o) => { const n = { ...o }; delete n[activeTab]; return n; })}
                extra={activeTab === "threads" ? <p className="np-muted">{rich(t("Topic: {topic} · set it in Main."), { topic: <b>{topic || t("none")}</b> })}</p> : undefined}
              />
            )}
            {[...new Set(warnings)].map((w) => <p key={w} className="pb-warn">{w}</p>)}
            {secErr("caption")}
          </section>

          <section id="pb-s-comment" className={secClass("comment")}>
            <div className="pb-bar"><h2>{t("First Comment")} <Tip label={t("About the first comment")} text={t("Your call to action and link, posted right after your post. Edit it per app under Caption.")} /></h2><Opt /></div>
            <div className="pb-two">
              <label className="pb-field"><span className="pb-row"><b>{t("Call to action")}</b><Opt /></span><input className="np-input" type="text" value={cta} maxLength={80} onChange={(e) => setCta(e.target.value)} placeholder={t("e.g. Dapatkan di sini 👉")} aria-label={t("Call to action")} /></label>
              <label className="pb-field"><span className="pb-row"><b>{t("Product link")}</b><Opt /></span><input className="np-input" type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value.trim())} placeholder={t("https://… (TikTok Shop or Shopee)")} aria-label={t("Product link")} /></label>
            </div>
            <label className="pb-field"><span className="pb-row"><b>{t("More text")}</b><Opt /></span><textarea className="np-input" rows={2} value={ownComment} onChange={(e) => setOwnComment(e.target.value)} placeholder={t("e.g. Ada soalan? Tanya di komen 👇")} aria-label={t("More text in the first comment")} /></label>
            {apps.length > 0 && <ul className="pb-how">{apps.map((p) => <li key={p}><PlatformIcon name={ICON[p]} size={18} /><span><b>{appLabel(p)}</b><small>{linkWhere(p)}</small></span></li>)}</ul>}
            {secErr("comment")}
          </section>

          {ttKey && (
            <section id="pb-s-tiktok" className={`${secClass("tiktok")} np-sec`}>
              <h2>{t("TikTok Settings")}</h2>
              <div className="np-seg" role="radiogroup" aria-label={t("Where to send it")}>
                <button type="button" role="radio" aria-checked={mode === "direct"} className={mode === "direct" ? "on" : ""} onClick={() => setMode("direct")}>{t("Post to TikTok")}</button>
                <button type="button" role="radio" aria-checked={mode === "inbox"} className={mode === "inbox" ? "on" : ""} onClick={() => setMode("inbox")}>{t("Send to TikTok Drafts")}</button>
              </div>
              {mode === "direct" && (
                <>
                  {/* TikTok's guidelines: the post screen names the account the video goes to, with its photo. */}
                  {ttInfo?.info ? (
                    <div className="np-account" style={{ display: "flex" }}>
                      {ttInfo.info.creator_avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ttInfo.info.creator_avatar_url} alt="" width={48} height={48} />
                      ) : <span className="np-avatar" aria-hidden="true">{(ttInfo.info.creator_nickname || "?").slice(0, 1)}</span>}
                      <span><small>{t("Posting to")}</small><strong>{ttInfo.info.creator_nickname}{ttInfo.info.creator_username ? ` · @${ttInfo.info.creator_username}` : ""}</strong></span>
                    </div>
                  ) : liveSide && !ttInfo?.error && <p className="np-muted" style={{ margin: 0 }}>{t("Checking your TikTok account…")}</p>}
                  <label htmlFor="pb-privacy"><b>{t("Who can view this post")} <Req /></b></label>
                  <select id="pb-privacy" className="np-input" value={privacy} onChange={(e) => setPrivacy(e.target.value as Privacy)} required>
                    <option value="" disabled>{t("Choose who can view")}</option>
                    {privacyOptions.map(([p, l]) => <option key={p} value={p} disabled={p === "SELF_ONLY" && promo.on && promo.branded} title={p === "SELF_ONLY" && promo.on && promo.branded ? t("Branded content visibility cannot be set to private.") : undefined}>{t(l)}{p === "SELF_ONLY" && promo.on && promo.branded ? t(" (not allowed for branded content)") : ""}</option>)}
                  </select>
                  {promo.on && promo.branded && <p className="np-muted" style={{ margin: 0 }}>{t("Branded content visibility cannot be set to private.")}</p>}
                  <div className="np-checks">
                    {([["comments", t("Allow Comment")], ...(isPhotos ? [] : [["duet", t("Allow Duet")], ["stitch", t("Allow Stitch")]])] as ["comments" | "duet" | "stitch", string][]).map(([k, label]) => (
                      <label key={k} className={lockAllow[k] ? "np-check off" : "np-check"}><input type="checkbox" checked={allow[k] && !lockAllow[k]} disabled={lockAllow[k]} onChange={(e) => setAllow((a) => ({ ...a, [k]: e.target.checked }))} />{label}</label>
                    ))}
                  </div>
                  <div className="np-switchrow">
                    <span><b>{t("Disclose promotional content")}</b><small>{t("Turn on if this video promotes yourself, a brand, product or service.")}</small></span>
                    <button type="button" role="switch" aria-checked={promo.on} className={promo.on ? "np-switch on" : "np-switch"} onClick={() => setPromo((p) => (p.on ? { on: false, own: false, branded: false } : { ...p, on: true }))} aria-label={t("Disclose promotional content")}><span /></button>
                  </div>
                  {promo.on && (
                    <div className="np-checks">
                      <label className="np-check"><input type="checkbox" checked={promo.own} onChange={(e) => setPromo((p) => ({ ...p, own: e.target.checked }))} />{t("Your brand")}<small>{t("You are promoting yourself or your own business.")}</small></label>
                      <label className={brandedBlocked ? "np-check off" : "np-check"} title={brandedBlocked ? t("Branded content visibility cannot be set to private.") : undefined}><input type="checkbox" checked={promo.branded} disabled={brandedBlocked} onChange={(e) => setPromo((p) => ({ ...p, branded: e.target.checked }))} />{t("Branded content")}<small>{t("You are promoting another brand or a third party.")}</small></label>
                      {brandedBlocked && <p className="np-muted" style={{ margin: 0 }}>{t("Branded content visibility cannot be set to private.")}</p>}
                      {promoLabel ? <p className="np-note">{promoLabel}</p> : <p className="np-muted" style={{ margin: 0 }}>{t("You need to indicate if your content promotes yourself, a third party, or both.")}</p>}
                    </div>
                  )}
                  <div className="np-switchrow">
                    <span><b>{t("AI-generated content")}</b><small>{t("Turn on if the video was made or heavily edited with AI.")}</small></span>
                    <button type="button" role="switch" aria-checked={isAigc} className={isAigc ? "np-switch on" : "np-switch"} onClick={() => setIsAigc(!isAigc)} aria-label={t("AI-generated content")}><span /></button>
                  </div>
                </>
              )}
              {secErr("tiktok")}
            </section>
          )}

          {apps.some((p) => p !== "tiktok") && (
            <section id="pb-s-settings" className={`${secClass("settings")} np-sec`}>
              <div className="pb-bar"><h2>{t("Post Settings")}</h2><Opt /></div>
              {apps.includes("facebook") && (
                <div className="pb-set">
                  <span className="pb-gh"><PlatformIcon name="Facebook" size={16} />Facebook</span>
                  {!isPhotos && <div className="np-seg" role="radiogroup" aria-label="Facebook">
                    <button type="button" role="radio" aria-checked={!fbDraft} className={!fbDraft ? "on" : ""} onClick={() => setFbDraft(false)}>{t("Publish")}</button>
                    <button type="button" role="radio" aria-checked={fbDraft} className={fbDraft ? "on" : ""} onClick={() => setFbDraft(true)}>{t("Save as Draft")}</button>
                  </div>}
                  <p className="np-muted">{t("@names don't link on Facebook.")}</p>
                  {fbDraft && <p className="np-muted">{t("Hidden until you publish it in Facebook. No first comment. Reels (3–90 s) only.")}</p>}
                </div>
              )}
              {apps.includes("instagram") && (
                <div className="pb-set">
                  <span className="pb-gh"><PlatformIcon name="Instagram" size={16} />Instagram</span>
                  {!isPhotos && <div className="np-switchrow">
                    <span><b>{t("Also show in the main feed")}</b><small>{t("Off: Reels tab only.")}</small></span>
                    <button type="button" role="switch" aria-checked={igFeed} className={igFeed ? "np-switch on" : "np-switch"} onClick={() => setIgFeed(!igFeed)} aria-label={t("Also show in the main feed")}><span /></button>
                  </div>}
                  <details className="pb-guide pb-adv">
                    <summary>{igAdvanced ? t("Advanced: collaborators, tags, trial reel · {n} in use", { n: igAdvanced }) : t("Advanced: collaborators, tags, trial reel")}</summary>
                    <div className="pb-adv-in">
                      <label className="pb-field"><b>{t("Collaborators")}</b><input className="np-input" type="text" value={collabText} onChange={(e) => setCollabText(e.target.value)} placeholder={t("Up to 3 Instagram usernames, e.g. @brand")} aria-label={t("Instagram collaborators")} /><small className="np-muted">{t("Shows on their profile once they accept.")}</small></label>
                      <label className="pb-field"><b>{t("Tag people")}</b><input className="np-input" type="text" value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder={t("Instagram usernames, e.g. @shopee_my")} aria-label={t("Instagram tagged people")} /><small className="np-muted">{t("Up to {max}. Instagram only.", { max: TAGS_MAX })}</small></label>
                      {!isPhotos && <>
                      <b className="pb-sub">{t("Trial reel")}</b>
                      <div className="np-seg" role="radiogroup" aria-label={t("Trial reel")}>
                        {([["off", t("Off")], ["manual", t("I'll share with followers")], ["auto", t("Instagram decides")]] as [TrialMode, string][]).map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={igTrial === v} className={igTrial === v ? "on" : ""} onClick={() => setIgTrial(v)}>{l}</button>)}
                      </div>
                      {igTrial !== "off" && <p className="np-muted">{igTrial === "manual" ? t("Shown to non-followers first. You share it with followers later.") : t("Shown to non-followers first. Instagram shares it if it does well.")}</p>}
                      </>}
                    </div>
                  </details>
                </div>
              )}
              {apps.includes("threads") && (
                <div className="pb-set">
                  <span className="pb-gh"><PlatformIcon name="Threads" size={16} />Threads</span>
                  <label className="pb-field"><b>{t("Who can reply")}</b>
                    <select className="np-input" value={replies} onChange={(e) => setReplies(e.target.value as ReplyControl)}>{REPLY_CONTROLS.map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}</select>
                  </label>
                </div>
              )}
              <p className="np-muted">{t("Need it private? Use a Facebook draft.")}</p>
              {secErr("settings")}
            </section>
          )}
        </div>

        <aside className="pb-side" aria-label={t("Preview and post")}>
          <span className="pb-side-h">{t("Preview")}</span>
          {apps.length > 0 && (
            <div className="pb-tabs" role="tablist" aria-label={t("Preview app")}>
              {apps.map((p) => <button key={p} type="button" role="tab" aria-selected={pApp === p} onClick={() => setPreviewApp(p)}><PlatformIcon name={ICON[p]} size={16} />{NAMES[p]}</button>)}
            </div>
          )}
          {pApp && inApp(pApp).length > 1 && (
            <label className="pb-showing">{t("Showing")}
              <select className="np-input" value={pKey} onChange={(e) => setPreviewAcct(e.target.value)}>{inApp(pApp).map((k) => <option key={k} value={k}>{byKey.get(k)?.name}</option>)}</select>
            </label>
          )}
          <div className="pb-phone-wrap">
            {mounted && pApp && pKey ? (
              <PhonePreview channel={pApp} caption={captionOf(pApp)} comment={pApp === "facebook" && fbDraft ? "" : commentOf(pApp)} video={videoUrl} cover={cover} photos={isPhotos ? photos.map((ph) => (pApp === "instagram" && ph.ig ? ph.ig.url : ph.url)) : undefined} who={who(pKey)} fbView={fbView} theme={theme} topic={topic} collaborators={collaborators} />
            ) : (
              <div className="pb-pv-phone"><div className="pb-pv-scr" /></div>
            )}
          </div>
          {pApp === "facebook" && <Tabs value={fbView} set={setFbView} items={[["reels", "Reels"], ["feed", t("Feed")]]} label={t("Facebook view")} />}
          {(pApp === "threads" || (pApp === "facebook" && fbView === "feed")) && <Tabs value={theme} set={setTheme} items={[["light", t("Light")], ["dark", t("Dark")]]} label={t("App theme")} />}
          <p className="pb-note">{pApp ? t(PREVIEW_NOTE[pApp]) : t("Pick a channel to preview.")}</p>
          {pApp && pKey && (
            <div className="pb-cmt" aria-label={t("First comment as it will be posted")}>
              <span className="pb-cmt-h">{pApp === "tiktok" ? t("Yellow basket") : t("First comment")}</span>
              {pApp === "tiktok" ? (
                <p>{t("Add your product to the yellow basket (beg kuning) in TikTok.")}</p>
              ) : pComment ? (
                <div className="pb-cmt-row">
                  <span className="pb-ini" style={{ background: byKey.get(pKey)?.color }}>{byKey.get(pKey)?.initials}</span>
                  <span><b>{who(pKey).username}</b><span className="pb-cmt-tx">{pComment}</span></span>
                </div>
              ) : (
                <p>{pApp === "facebook" && fbDraft ? t("Facebook drafts get no first comment.") : t("None. Add one under First comment.")}</p>
              )}
            </div>
          )}
          {notes.length > 0 && (
            <details className="pb-notes">
              <summary>{notes.length === 1 ? t("{n} note for {app}", { n: 1, app: notesFor }) : t("{n} notes for {app}", { n: notes.length, app: notesFor })}</summary>
              {notes.map(([text, good]) => <p key={text} className={good ? "pb-good" : "pb-warn"}>{text}</p>)}
            </details>
          )}

          <section id="pb-s-when" className={`${secClass("when")} pb-when`}>
            <h2>{t("When")} <Req /> <Tip text={t("Malaysia time. All channels post together. Drafts stay here until you schedule them.")} /></h2>
            <div className="np-when" role="radiogroup" aria-label={t("When to post")}>
              {([["now", t("Post now")], ["recommended", liveSide ? t("Recommended time") : t("Recommended · {time}", { time: t(RECOMMENDED) })], ["pick", t("Pick a time")], ["draft", t("Save as draft")]] as [When, string][]).map(([v, label]) => (
                <label key={v} className={when === v ? "np-radio on" : "np-radio"}><input type="radio" name="pb-when" value={v} checked={when === v} onChange={() => setWhen(v)} />{label}</label>
              ))}
            </div>
            {when === "pick" && <input className="np-input" type="datetime-local" value={pickAt} min={liveSide ? nowLocal() : "2026-10-28T09:15"} onChange={(e) => setPickAt(e.target.value)} aria-label={t("Date and time (Malaysia time)")} />}
            {secErr("when")}
          </section>
          {shown.length > 0 && (
            <div className="pb-fix" role="alert">
              <b>{shown.length === 1 ? t("{n} thing to fix", { n: 1 }) : t("{n} things to fix", { n: shown.length })}</b>
              {shown.map(([text, s]) => <button key={text} type="button" onClick={() => jump(s)}><span>{text}</span><Icon name="arrow" size={14} /></button>)}
            </div>
          )}
          {sendError && <div className="pb-fix" role="alert"><b>{t("Not sent")}</b><span style={{ padding: "4px 0" }}>{sendError}</span></div>}
          {/* TikTok's declaration, with its two policy names as links to TikTok's pages, as in TikTok's guidelines. */}
          {ttKey && mode === "direct" && when !== "draft" && (
            <p className="np-consent">
              {t("By posting, you agree to TikTok's")}{" "}
              {promo.on && promo.branded && <><a href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noreferrer">{t("Branded Content Policy")}</a>{" "}{t("and")}{" "}</>}
              <a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer">{t("Music Usage Confirmation")}</a>
            </p>
          )}
          <span className="np-submit-wrap" title={promoIncomplete ? t("You need to indicate if your content promotes yourself, a third party, or both.") : undefined}>
          <button type="submit" className="np-btn np-submit" disabled={!!busy || promoIncomplete}>
            {/* Each part of the button in her language, joined by dots as in English. */}
            {busy || editing
              ? busy || [t("Save changes"), when === "draft" ? "" : t("{n} credits", { n: cost })].filter(Boolean).join(" · ")
              : !keys.length
                ? when === "draft" ? t("Pick a Channel") : t("Pick a Channel · {n} credits each", { n: POST_CREDITS })
                : [when === "draft" ? t("Save draft") : when === "now" ? t("Post now") : t("Schedule"), keys.length === 1 ? t("{n} channel", { n: 1 }) : t("{n} channels", { n: keys.length }), when === "draft" ? "" : t("{n} credits", { n: cost })].filter(Boolean).join(" · ")}
          </button>
          </span>
          <p className="pb-cost">
            <Icon name="wallet" size={14} />
            <span>{rich(t("{n} credits"), { n: <b>{credits.toLocaleString("en-MY")}</b> })}</span>
            <Tip text={t("{n} credits per channel. Drafts are free. Refunded if a channel fails or is cancelled.", { n: POST_CREDITS })} />
            <Link href={setup.earn}>{t("Earn More")}</Link>
          </p>
        </aside>
      </form>

      {sheet === "channels" && (
        <ChannelsSheet
          channels={channels}
          connectable={missing}
          onConnect={connectApp}
          onConnectApp={liveSide ? connectReal : undefined}
          onReconnect={(c) => { if (liveSide) return connectReal(c.app); setChannels((l) => l.map((x) => (x.key === c.key ? { ...x, status: "active" } : x))); say(t("{name} reconnected", { name: c.name })); }}
          onCheck={(c) => (liveSide ? void checkReal(c) : say(c.status === "active" ? t("{name} is working.", { name: c.name }) : t("{name} needs reconnecting.", { name: c.name })))}
          onDisconnect={(c) => {
            if (liveSide) return void disconnectReal(c);
            setChannels((l) => l.filter((x) => x.key !== c.key));
            setPicked((s) => new Set([...s].filter((k) => k !== c.key)));
            say(c.app === "tiktok" ? t("{name} disconnected. Its scheduled posts moved to drafts.", { name: c.name }) : t("{name} disconnected. Its scheduled posts were cancelled.", { name: c.name }));
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
          onSaved={(b) => (liveSide ? void saveBrandReal(b) : setBrands((list) => [...list.filter((x) => x.id !== b.id), b].sort((x, y) => x.name.localeCompare(y.name))))}
          onDeleted={(id) => (liveSide ? void deleteBrandReal(id) : setBrands((list) => list.filter((x) => x.id !== id)))}
          onClose={() => setSheet("")}
        />
      )}
    </>
  );
}

/** The note under the phone for each app, translated where it's shown. */
const PREVIEW_NOTE: Record<Channel, string> = {
  tiktok: tx("For You feed."),
  instagram: tx("Reels viewer."),
  facebook: tx("Shown as a Reel. Switch to Feed to compare."),
  threads: tx("Threads feed."),
};

/** Notes under the phone where an app treats the post differently. [text, informational] */
function previewNotes(ch: Channel, caption: string, comment: string, hasLink: boolean, fbView: "reels" | "feed", s: { fbDraft: boolean; igFeed: boolean; igTrial: TrialMode; replies: ReplyControl; tagged: string[] }, t: T): [string, boolean][] {
  const out: [string, boolean][] = [];
  if (ch === "facebook" && s.fbDraft) out.push([t("Draft: hidden until you publish it in Facebook."), true]);
  if (ch === "instagram" && !s.igFeed) out.push([t("Reels tab only."), true]);
  if (ch === "instagram" && s.tagged.length) out.push([t("Tagged: {users}.", { users: s.tagged.map((u) => `@${u}`).join(", ") }), true]);
  if (ch === "instagram" && s.igTrial !== "off") out.push([s.igTrial === "manual" ? t("Trial reel: non-followers first; you share it with followers.") : t("Trial reel: non-followers first; Instagram shares it if it does well."), true]);
  if (ch === "threads" && s.replies !== "everyone") out.push([t("Who can reply: {who}.", { who: t(REPLY_CONTROLS.find(([v]) => v === s.replies)?.[1] ?? "") }), true]);
  if (ch === "tiktok" && hasLink) out.push([t("No link on TikTok. Use the yellow basket (beg kuning)."), true]);
  if (links(caption).length) out.push([t("Caption has a link. Move it to the first comment."), false]);
  if (ch === "instagram" && comment) out.push([links(comment).length ? t("First comment posts right after the Reel. Links can't be tapped.") : t("First comment posts right after the Reel."), true]);
  if (ch === "facebook" && comment && !s.fbDraft) out.push([t("First comment posts from the Page right after."), true]);
  if (ch === "threads" && comment) out.push([t("First comment posts as your reply."), true]);
  return out;
}

/** One app's tab: the caption Rezekii suggests for it (editable) and its first comment. */
function ChannelPane(p: { ch: Channel; name: string; text: string; edited: boolean; captionLength: number; comment: string; commentEdited: boolean; onText: (v: string) => void; onResetText: () => void; onComment: (v: string) => void; onResetComment: () => void; extra?: ReactNode }) {
  const t = useT();
  const tt = p.ch === "tiktok";
  return (
    <>
      <div className="pb-row"><b>{t("{name} caption", { name: p.name })}</b>{p.edited ? <button type="button" className="pb-link" onClick={p.onResetText}>{t("Use Suggested")}</button> : <small className="pb-sug">✦ {t("Suggested for {name}", { name: p.name })}</small>}</div>
      <textarea className="np-input" rows={5} value={p.text} onChange={(e) => p.onText(e.target.value)} aria-label={t("{name} caption", { name: p.name })} />
      <span className={`np-count${p.captionLength > CAPTION_MAX[p.ch] ? " over" : ""}`}>{p.captionLength.toLocaleString("en-US")} / {CAPTION_MAX[p.ch].toLocaleString("en-US")}</span>
      {p.extra}
      {tt ? (
        <p className="pb-info">{t("No comments or links on TikTok. Use the yellow basket (beg kuning).")}</p>
      ) : (
        <>
          <div className="pb-row"><b>{t("{name} first comment", { name: p.name })}</b>{p.commentEdited ? <button type="button" className="pb-link" onClick={p.onResetComment}>{t("Use Suggested")}</button> : <Opt />}</div>
          <textarea className="np-input" rows={3} value={p.comment} onChange={(e) => p.onComment(e.target.value)} placeholder={t("Your call to action and product link.")} aria-label={t("{name} first comment", { name: p.name })} />
          <span className="np-count">{lengthFor(p.ch, p.comment).toLocaleString("en-US")} / {COMMENT_MAX[p.ch as Platform].toLocaleString("en-US")}</span>
          {p.ch === "instagram" && links(p.comment).length > 0 && <p className="pb-warn">{t("Instagram links can't be tapped.")}</p>}
        </>
      )}
    </>
  );
}

function Tabs<T extends string>({ value, set, items, label }: { value: T; set: (v: T) => void; items: [T, string][]; label: string }) {
  return <div className="pb-tabs" role="tablist" aria-label={label}>{items.map(([v, l]) => <button key={v} type="button" role="tab" aria-selected={value === v} onClick={() => set(v)}>{l}</button>)}</div>;
}

/** Channels: everything connected, grouped by app. Each can be checked, reconnected when the app stopped accepting it, or disconnected. */
function ChannelsSheet({ channels, connectable, onConnect, onConnectApp, onReconnect, onCheck, onDisconnect, onClose }: { channels: PubChannel[]; connectable: PubChannel[]; onConnect: (c: PubChannel) => void; onConnectApp?: (p: Channel) => void; onReconnect: (c: PubChannel) => void; onCheck: (c: PubChannel) => void; onDisconnect: (c: PubChannel) => void; onClose: () => void }) {
  const { toast } = useDemo();
  const t = useT();
  const can = useCanPost();
  const [q, setQ] = useState("");
  const s = q.trim().toLowerCase();
  return (
    <Sheet title={t("Channels")} onClose={onClose}>
      <p className="np-muted" style={{ margin: 0 }}>{t("Connect once. Rezekii never sees your password.")}</p>
      {channels.length > 8 && <label className="pb-search">{SEARCH_ICON}<input className="np-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search {n} channels", { n: channels.length })} aria-label={t("Search channels")} /></label>}
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
                <span><b>{c.name}</b><small>{c.sub}{c.status === "reconnect" ? t(" · needs reconnecting") : ""}</small></span>
                <div className="pb-acts">
                  {c.status === "reconnect" ? <button type="button" className="np-btn v2-btn-sm" onClick={() => onReconnect(c)}>{t("Reconnect")}</button> : <button type="button" className="btn-outline v2-btn-sm pb-icobtn" aria-label={t("Check {name}", { name: c.name })} title={t("Check now")} onClick={() => onCheck(c)}><Icon name="refresh" size={16} /><span>{t("Check Now")}</span></button>}
                  <button type="button" className="pb-link pb-off pb-icobtn" aria-label={t("Disconnect {name}", { name: c.name })} title={t("Disconnect")} onClick={() => onDisconnect(c)}><Icon name="x" size={16} /><span>{t("Disconnect")}</span></button>
                </div>
              </div>
            ))}
            {!s && (
              <div className="pb-ch">
                <PlatformIcon name={ICON[p]} size={34} />
                <span><b>{!list.length ? t("Connect {app}", { app: NAMES[p] }) : p === "facebook" ? t("Add Pages") : p === "threads" ? t("Add profiles") : t("Add accounts")}</b><small>{p === "facebook" ? t("Pick Pages after sign-in") : p === "instagram" ? t("Business or Creator account") : p === "threads" ? t("Your Threads profile") : t("Your TikTok account")}</small></span>
                {can(p) ? <button type="button" className="np-btn v2-btn-sm" onClick={() => (onConnectApp ? onConnectApp(p) : add ? onConnect(add) : toast(t("Preview: {app} sign-in opens here", { app: NAMES[p] })))}>{t("Connect")}</button> : <NotYet app={p} />}
              </div>
            )}
          </div>
        );
      })}
      <button type="button" className="np-btn" onClick={onClose}>{t("Done")}</button>
    </Sheet>
  );
}

/** Brands: create, rename, change channels, delete. A channel can be in more than one brand. */
function BrandsSheet({ brands, channels, byKey, connected, onSaved, onDeleted, onClose }: { brands: PubBrand[]; channels: PubChannel[]; byKey: Map<string, PubChannel>; connected: Set<string>; onSaved: (b: PubBrand) => void; onDeleted: (id: string) => void; onClose: () => void }) {
  const t = useT();
  const [edit, setEdit] = useState<{ id?: string; name: string; channels: string[] } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const open = (b: { id?: string; name: string; channels: string[] }) => { setEdit({ ...b, channels: [...b.channels] }); setConfirmDelete(false); };

  if (edit) {
    const toggle = (k: string) => setEdit((e) => (e ? { ...e, channels: e.channels.includes(k) ? e.channels.filter((x) => x !== k) : [...e.channels, k] } : e));
    return (
      <Sheet title={edit.id ? t("Edit Brand") : t("New Brand")} onClose={onClose}>
        <button type="button" className="pb-link" style={{ justifySelf: "start" }} onClick={() => setEdit(null)}>← {t("Back")}</button>
        <label className="pb-field"><b>{t("Brand name")}</b><input className="np-input" type="text" value={edit.name} maxLength={60} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder={t("e.g. Seri Living")} /></label>
        <p className="np-muted" style={{ margin: 0 }}>{edit.channels.length === 1 ? t("{n} channel in this brand.", { n: 1 }) : t("{n} channels in this brand.", { n: edit.channels.length })}</p>
        {APPS.map((p) => {
          const list = channels.filter((c) => c.app === p);
          return list.length ? (
            <div key={p} className="pb-group">
              <span className="pb-gh"><PlatformIcon name={ICON[p]} size={16} />{NAMES[p]}</span>
              {list.map((c) => <label key={c.key} className="pb-check"><Face ch={c} /><span><b>{c.name}</b><small>{c.sub}{c.status === "reconnect" ? t(" · needs reconnecting") : ""}</small></span><input type="checkbox" checked={edit.channels.includes(c.key)} onChange={() => toggle(c.key)} /></label>)}
            </div>
          ) : null;
        })}
        <button type="button" className="np-btn" disabled={!edit.name.trim() || !edit.channels.length} onClick={() => { onSaved({ id: edit.id ?? `b${Date.now()}`, name: edit.name.trim(), channels: edit.channels }); setEdit(null); }}>{t("Save Brand")}</button>
        {edit.id && (confirmDelete ? (
          <div className="pb-row"><span className="np-muted">{t("Delete “{name}”? Its channels stay connected.", { name: edit.name })}</span><span className="pb-links"><button type="button" className="pb-link pb-danger" onClick={() => { onDeleted(edit.id!); setEdit(null); }}>{t("Delete")}</button><button type="button" className="pb-link" onClick={() => setConfirmDelete(false)}>{t("Keep")}</button></span></div>
        ) : (
          <button type="button" className="pb-link pb-danger" style={{ justifySelf: "start" }} onClick={() => setConfirmDelete(true)}>{t("Delete Brand")}</button>
        ))}
      </Sheet>
    );
  }

  return (
    <Sheet title={t("Brands")} onClose={onClose}>
      <p className="np-muted" style={{ margin: 0 }}>{t("Group channels to pick them in one tap.")}</p>
      {brands.map((b) => {
        const live = b.channels.filter((k) => connected.has(k));
        const bApps = APPS.filter((p) => live.some((k) => byKey.get(k)?.app === p));
        return (
          <div key={b.id} className="pb-ch">
            <span className="pb-faces">{live.slice(0, 3).map((k) => { const c = byKey.get(k); return c ? <Face key={k} ch={c} badge={false} /> : null; })}</span>
            <span><b>{b.name}</b><small>{live.length === 1 ? t("{n} channel", { n: 1 }) : t("{n} channels", { n: live.length })} · {bApps.map((p) => NAMES[p]).join(", ") || t("none connected")}</small></span>
            <button type="button" className="btn-outline v2-btn-sm" onClick={() => open(b)}>{t("Edit")}</button>
          </div>
        );
      })}
      {!brands.length && <p className="np-muted" style={{ margin: 0 }}>{t("No brands yet.")}</p>}
      <button type="button" className="btn-outline" onClick={() => open({ name: "", channels: [] })}>{t("+ New brand")}</button>
      <button type="button" className="np-btn" onClick={onClose}>{t("Done")}</button>
    </Sheet>
  );
}
