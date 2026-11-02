"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useDemo } from "@/components/demo";
import { Icon } from "@/components/icons";
import { Sheet, Tip } from "@/components/ui";
import { PlatformIcon } from "@/components/creator2/bits";
import { POST_CREDITS, type MyPost, type PubBrand, type PubChannel, type PublishSetup } from "@/lib/mock-publish";
import { postToEdit, saveEdit } from "./post-edits";
import { creatorInfo, sendPost, upload, type CreatorInfo } from "@/lib/live-publish";
import { PhonePreview, type Who } from "./phone-previews";
import {
  APPS, CAPTION_MAX, COLLABORATORS_MAX, COMMENT_MAX, ICON, NAMES, PRIVACY, REPLY_CONTROLS, TAGS_MAX, UNIT,
  autoCaption, autoComment, channelProblems, channelWarnings, cleanTopic, consentLine, hasLinkOrCta, lengthFor, links, parseHashtags,
  parseUsernames, threadsTopic, tiktokProblems, withHashtags,
  type Channel, type Platform, type Privacy, type ReplyControl, type TrialMode,
} from "./rules";
import "@/app/creator2.css";
import "@/app/publish.css";

type When = "now" | "recommended" | "pick" | "draft";
/** The form's sections, so a problem can jump to the one that needs fixing. */
type Sec = "channels" | "video" | "caption" | "comment" | "tiktok" | "settings" | "when";
type Problem = [string, Sec];
/** A red star for a required field, and a grey tag for an optional one. */
const Req = () => <i className="pb-req" title="Required">*<span className="sr-only"> required</span></i>;
const Opt = () => <span className="pb-opt">Optional</span>;
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
  const [done, setDone] = useState<{ summary: string; when: When; at: string; cost: number } | null>(null);
  // Signed in (owner, 31 Oct 2026): real channels, real sending from this wallet.
  const liveSide = setup.live;
  const [credits, setCredits] = useState(setup.credits);
  const [sendError, setSendError] = useState("");
  const [info, setInfo] = useState<{ acct: string; info?: CreatorInfo; error?: string } | null>(null);

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
  // TikTok requires its rules for the account to be asked fresh each time it's picked for a post.
  useEffect(() => {
    if (!liveSide || !ttKey) return;
    const acct = openIdOf(ttKey);
    let on = true;
    creatorInfo(acct)
      .then((i) => { if (on) setInfo({ acct, info: i }); })
      .catch((e: unknown) => { if (on) setInfo({ acct, error: e instanceof Error ? e.message : "Couldn't reach TikTok." }); });
    return () => { on = false; };
  }, [liveSide, ttKey]);
  const ttInfo = liveSide && ttKey && info?.acct === openIdOf(ttKey) ? info : null;
  const privacyOptions = ttInfo?.info ? PRIVACY.filter(([p]) => ttInfo.info!.privacy_level_options.includes(p)) : PRIVACY;
  const lockAllow = { comments: !!ttInfo?.info?.comment_disabled, duet: !!ttInfo?.info?.duet_disabled, stitch: !!ttInfo?.info?.stitch_disabled };
  const keys = [...(ttKey ? [ttKey] : []), ...metaPicked.map((c) => c.key)];
  const chOf = (key: string): Channel => byKey.get(key)?.app ?? "facebook";
  const apps = APPS.filter((p) => keys.some((k) => chOf(k) === p));
  const inApp = (p: Channel) => keys.filter((k) => chOf(k) === p);
  // The main caption with the Hashtags box at the very bottom: what every app's suggested caption is written from.
  const mainFull = withHashtags(main, parseHashtags(tagsText));
  // Captions never carry the link or call to action; those go in the first comment (TikTok: the yellow basket).
  const captionOf = (p: Channel) => capOver[p] ?? autoCaption(p, mainFull);
  const commentOf = (p: Channel) => (p === "tiktok" ? "" : (comOver[p] ?? autoComment(p, link.trim(), ownComment, cta)));
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
  const vid = editing ? { cover: editing.cover, file: "Your video", seconds: editing.seconds } : setup.sample;
  const cover = source === "upload" && sample && !file ? vid.cover : null;
  const hasVideo = source === "upload" ? !!file || sample : /^https:\/\/\S+$/.test(linkUrl);

  // Cross-channel posting costs credits per channel (owner, 28 Oct 2026). Drafts are free; failed or cancelled channels get theirs back.
  // Editing a scheduled post only charges for channels added now.
  const paid = editing?.date ? editing.targets.map((t) => t.key) : [];
  const cost = when === "draft" ? 0 : keys.filter((k) => !paid.includes(k)).length * POST_CREDITS;
  const problems = ((): Problem[] => {
    const out: Problem[] = [];
    if (!keys.length) out.push(["Pick at least one channel.", "channels"]);
    if (!hasVideo) out.push(["Add a video: upload or paste a link.", "video"]);
    if (keys.length && !apps.some((p) => captionOf(p).trim())) out.push(["Write a caption.", "caption"]);
    if (ttKey && when !== "draft")
      for (const t of tiktokProblems({ mode, caption: captionOf("tiktok"), privacy, promo: promo.on, own: promo.own, branded: promo.branded }))
        out.push([t.startsWith("The caption") ? `TikTok: ${t}` : t, t.startsWith("The caption") ? "caption" : "tiktok"]);
    for (const p of apps)
      if (p !== "tiktok")
        for (const t of channelProblems(p, captionOf(p), commentOf(p), durationSec))
          out.push([t, t.includes("first comment") ? "comment" : /videos up to|at least 3 seconds/.test(t) ? "video" : "caption"]);
    if (apps.includes("instagram")) {
      const c = parseUsernames(collabText), g = parseUsernames(tagText);
      if (c.bad.length) out.push([`Instagram collaborators: "${c.bad[0]}" isn't an Instagram username.`, "settings"]);
      if (c.list.length > COLLABORATORS_MAX) out.push([`Instagram allows up to ${COLLABORATORS_MAX} collaborators.`, "settings"]);
      if (g.bad.length) out.push([`Instagram tagged people: "${g.bad[0]}" isn't an Instagram username.`, "settings"]);
    }
    if (liveSide && ttKey && when !== "draft" && mode === "direct") {
      if (ttInfo?.error) out.push([`TikTok: ${ttInfo.error}`, "tiktok"]);
      else if (!ttInfo?.info) out.push(["Checking your TikTok account. Try again in a moment.", "tiktok"]);
      else if (privacy && !ttInfo.info.privacy_level_options.includes(privacy)) out.push(["Pick who can view from TikTok's list for this account.", "tiktok"]);
      else if (durationSec && ttInfo.info.max_video_post_duration_sec && durationSec > ttInfo.info.max_video_post_duration_sec) out.push([`TikTok: this account can post videos up to ${ttInfo.info.max_video_post_duration_sec} seconds.`, "video"]);
    }
    if (when === "pick" && !pickAt) out.push(["Pick a date and time.", "when"]);
    if (cost > credits) out.push([`Not enough credits: needs ${cost}, you have ${credits.toLocaleString("en-MY")}. Earn more or save as draft.`, "when"]);
    return out;
  })();
  const shown = tried ? problems : [];
  const errorsIn = (s: Sec) => shown.filter(([, sec]) => sec === s).map(([t]) => t);
  const secClass = (s: Sec) => `v2-card pb-card${errorsIn(s).length ? " bad" : ""}${flash === s ? " flash" : ""}`;
  const warnings = [
    ...apps.flatMap((p) => channelWarnings(p, captionOf(p))),
    ...apps.filter((p) => hasLinkOrCta(captionOf(p), cta)).map((p) => `${NAMES[p]} caption has a link or call to action. Move it to the first comment.`),
  ];

  /** Real accounts: each app's own sign-in, then back here with the result. */
  function connectReal(app: Channel) {
    window.location.href = app === "tiktok" ? "/api/auth/tiktok/start" : `/api/auth/meta/${app}/start${liveSide === "seller" ? "?from=seller" : ""}`;
  }
  async function checkReal(c: PubChannel) {
    const r = await fetch("/api/channels/check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: c.key }) }).catch(() => null);
    const x = (await r?.json().catch(() => ({}))) as { status?: "active" | "reconnect"; error?: string } | undefined;
    if (!r?.ok || !x?.status) return say(x?.error || "Couldn't check. Try again.");
    const status = x.status;
    setChannels((l) => l.map((y) => (y.key === c.key ? { ...y, status } : y)));
    say(status === "active" ? `${c.name} is connected and working.` : `${c.name} needs reconnecting.`);
  }
  async function disconnectReal(c: PubChannel) {
    const r = await fetch(c.app === "tiktok" ? `/api/account/tiktok/${encodeURIComponent(openIdOf(c.key))}` : `/api/social/accounts/${c.key}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) return say("Couldn't disconnect. Try again.");
    setChannels((l) => l.filter((x) => x.key !== c.key));
    setPicked((s) => new Set([...s].filter((k) => k !== c.key)));
    say(c.app === "tiktok" ? `${c.name} disconnected. Its scheduled posts moved to drafts.` : `${c.name} disconnected. Its scheduled posts were cancelled.`);
  }
  async function saveBrandReal(b: PubBrand) {
    const isNew = !/^[0-9a-f-]{36}$/.test(b.id);
    const r = await fetch(isNew ? "/api/social/brands" : `/api/social/brands/${b.id}`, { method: isNew ? "POST" : "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: b.name, channels: b.channels }) }).catch(() => null);
    const d = (await r?.json().catch(() => ({}))) as { brand?: PubBrand; error?: string } | undefined;
    if (!r?.ok || !d?.brand) return say(d?.error || "Couldn't save the brand. Try again.");
    const saved = d.brand;
    setBrands((list) => [...list.filter((x) => x.id !== saved.id), saved].sort((x, y) => x.name.localeCompare(y.name)));
    say("Brand saved.");
  }
  async function deleteBrandReal(id: string) {
    const r = await fetch(`/api/social/brands/${id}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) return say("Couldn't delete the brand. Try again.");
    setBrands((list) => list.filter((x) => x.id !== id));
  }

  function sameAsLast() {
    const next = new Set(setup.last.filter((k) => connected.has(k)));
    if (!next.size) return say("Last post's channels aren't connected.");
    setPicked(next);
    const names = [...next].map((k) => byKey.get(k)?.name).filter(Boolean).slice(0, 4).join(", ");
    say(`Same as last post: ${names}.`);
  }
  function connectApp(c: PubChannel) {
    setChannels((list) => [...list, c]);
    say(`${NAMES[c.app]} connected.`);
  }
  /** Preview helper: the post Rezekii suggests (a sample video, caption and first comment), to the same channels as last time. */
  function fillSample() {
    setSource("upload");
    setSample(true);
    setFile(null);
    setDurationSec(setup.sample.seconds);
    setMain(setup.sample.main);
    setTagsText(setup.sample.tags);
    setLink(setup.sample.link);
    setCta(setup.sample.cta);
    setOwnComment(setup.sample.comment);
    setCapOver({});
    setComOver({});
    setPicked(new Set(setup.last.filter((k) => connected.has(k))));
    say("Sample post filled in.");
  }
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
      const app = NAMES[(q.get("channel") ?? "facebook") as Channel] ?? "The app";
      say(connect === "ok" ? `${app} connected.` : connect === "no_pages" ? "No Facebook Pages were picked. Connect again and tick your Pages." : connect === "personal" ? "That Instagram account is personal. Switch it to a Business or Creator account in Instagram, then connect again." : connect === "cancelled" ? `${app} sign-in was cancelled.` : connect === "expired" ? "That took too long. Please connect again." : `${app} didn't connect. Please try again.`);
      window.history.replaceState(null, "", window.location.pathname);
    }
    if (q.has("sample")) fillSample();
    // From Today's Ideas: the idea becomes the start of the caption; she adds the video.
    else if (q.get("idea")) { setMain(q.get("idea")!.slice(0, 200)); say("Idea added. Now add a video and channels."); }
    else if (q.get("edit")) {
      const p = postToEdit(q.get("edit")!);
      if (!p) return;
      setEditing(p);
      setSource("upload");
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
      if (source === "upload" && file) storagePath = await upload(file, (pct) => setBusy(`Uploading video… ${pct}%`));
      setBusy(when === "draft" ? "Saving…" : "Scheduling…");
      const at = when === "pick" ? new Date(pickAt).toISOString() : when;
      const settingsFor = (p: Channel): Record<string, unknown> => (p === "facebook" ? { draft: fbDraft } : p === "instagram" ? { feed: igFeed, collaborators, tags: tagged, trial: igTrial } : { replies, topic });
      const r = await sendPost({
        side, when: at, durationSec,
        video: { source, storagePath, linkUrl: source === "link" ? linkUrl : undefined },
        tiktok: ttKey ? { account: openIdOf(ttKey), choice: { mode, caption: captionOf("tiktok"), privacyLevel: privacy || null, allowComments: allow.comments && !lockAllow.comments, allowDuet: allow.duet && !lockAllow.duet, allowStitch: allow.stitch && !lockAllow.stitch, promo: promo.on, brandOrganic: promo.own, brandedContent: promo.branded, isAigc, durationSec } } : undefined,
        others: metaPicked.map((c) => ({ accountId: c.key, caption: captionOf(c.app), firstComment: c.app === "facebook" && fbDraft ? "" : commentOf(c.app), settings: settingsFor(c.app) })),
      });
      setCredits((n) => n - cost);
      setDone({ summary: summary(), when, at: r.at ? pretty(mytLocal(r.at)) : RECOMMENDED, cost });
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Didn't go through. Please try again.");
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
        !date ? "Draft saved" : `Saved. Goes out ${when === "pick" ? pretty(pickAt) : when === "now" ? "now" : RECOMMENDED}.`,
      );
      return router.push(setup.calendar);
    }
    setBusy(when === "draft" ? "Saving…" : "Scheduling…");
    window.setTimeout(() => {
      setBusy("");
      setDone({ summary: summary(), when, at: when === "pick" ? pretty(pickAt) : RECOMMENDED, cost });
    }, 700);
  }

  if (done) {
    return (
      <section className="v2-card pb-sent" role="status">
        <span className="pb-sent-ico" aria-hidden="true">✓</span>
        <h2>{done.when === "draft" ? "Saved as a Draft" : done.when === "now" ? "On Its Way" : "Scheduled"}</h2>
        <p>
          {done.when === "draft" ? `Saved in Rezekii for ${done.summary}.` : done.when === "now" ? `${done.summary}: posting now.` : `${done.summary}: ${done.at} (Malaysia time).`} Track or edit it in Content Calendar.
        </p>
        {done.cost > 0 && <p className="pb-sent-cost">{done.cost} credits used <Tip text="Refunded if a channel fails or is cancelled." /></p>}
        <div className="np-row">
          <Link href={setup.calendar} className="np-btn">Open Content Calendar</Link>
          <button type="button" className="btn-outline" onClick={onNew}>New Post</button>
        </div>
      </section>
    );
  }

  const counts = apps.map((p) => {
    const n = lengthFor(p, captionOf(p));
    return <span key={p} className={n > CAPTION_MAX[p] ? "over" : ""}><PlatformIcon name={ICON[p]} size={14} />{n.toLocaleString("en-US")} / {CAPTION_MAX[p].toLocaleString("en-US")}</span>;
  });
  const linkWhere = (p: Channel) =>
    p === "tiktok" ? "Yellow basket"
      : p === "facebook" && fbDraft ? "No comment on drafts"
      : p === "instagram" ? "First comment (links not tappable)"
      : "First comment";
  const notes = pApp ? previewNotes(pApp, captionOf(pApp), commentOf(pApp), !!link.trim(), fbView, { fbDraft, igFeed, igTrial, replies, tagged }) : [];
  const secErr = (s: Sec) => errorsIn(s).length > 0 && <ul className="pb-secerr" role="alert">{errorsIn(s).map((t) => <li key={t}>{t}</li>)}</ul>;
  const pComment = pApp && pApp !== "tiktok" && !(pApp === "facebook" && fbDraft) ? commentOf(pApp) : "";
  const q = query.trim().toLowerCase();
  const results = channels.filter((c) => c.status === "active" && (!q || `${c.name} ${c.sub} ${NAMES[c.app]}`.toLowerCase().includes(q)));
  const missing = setup.connectable.filter((c) => !channels.some((x) => x.key === c.key));
  const pickedChs = channels.filter((c) => picked.has(c.key) && connected.has(c.key));

  return (
    <>
      <div className="pb-top">
        <p className="pb-legend"><Req /> Required</p>
        {!liveSide && <button type="button" className="btn-outline v2-btn-sm" onClick={fillSample}>✦ Use a sample</button>}
      </div>
      <form className="pb" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        <div className="pb-col">
          <section id="pb-s-channels" className={secClass("channels")}>
            <div className="pb-bar">
              <h2>Post to <Req /></h2>
              <span className="pb-links">
                <button type="button" className="pb-link" onClick={sameAsLast}>Same as Last Post</button>
                <button type="button" className="pb-link" onClick={() => setSheet("brands")}>Manage Brands</button>
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
                    <button key={b.id} type="button" className="pb-chip pb-brand" aria-pressed={brandOn(b)} disabled={!on.length} onClick={() => toggleBrand(b)} title={on.length ? undefined : "No channels connected"}>
                      <span className="pb-faces">{on.slice(0, 3).map((k) => { const c = byKey.get(k); return c ? <Face key={k} ch={c} badge={false} /> : null; })}</span>
                      <span className="pb-blabel"><span>{b.name}</span><small>{on.length} · {bApps.map((p) => NAMES[p]).join(", ") || "not connected"}</small></span>
                    </button>
                  );
                })}
                {missing.map((c) => <button key={c.key} type="button" className="pb-chip add" onClick={() => connectApp(c)}>+ {NAMES[c.app]}</button>)}
              </div>
              {!brands.length && <p className="np-muted">Group channels to pick them in one tap. <button type="button" className="pb-link" onClick={() => setSheet("brands")}>Create a Brand</button></p>}
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
            ) : <p className="np-muted">No channels picked yet.</p>}
            {secErr("channels")}
          </section>

          <section id="pb-s-video" className={secClass("video")}>
            <h2>Video <Req /></h2>
            <div className="np-seg" role="radiogroup" aria-label="Video source">
              <button type="button" role="radio" aria-checked={source === "upload"} className={source === "upload" ? "on" : ""} onClick={() => setSource("upload")}>Upload</button>
              <button type="button" role="radio" aria-checked={source === "link"} className={source === "link" ? "on" : ""} onClick={() => setSource("link")}>Paste a Link</button>
            </div>
            {source === "upload" ? (
              sample && !file ? (
                <div className="pb-file">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={vid.cover} alt="" />
                  <span><b>{vid.file}</b><small>9:16 · {vid.seconds} seconds{editing ? "" : " · sample"}</small><button type="button" className="pb-link" style={{ justifySelf: "start" }} onClick={() => { setSample(false); setDurationSec(null); }}>Replace Video</button></span>
                </div>
              ) : (
                <label className="np-drop"><input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setDurationSec(null); setSample(false); }} /><span>{file ? `${file.name} · ${(file.size / 1048576).toFixed(1)} MB` : "Choose an MP4, MOV or WebM video (up to 50 MB)"}</span></label>
              )
            ) : (
              <input className="np-input" type="url" inputMode="url" placeholder="https://… (Drive, Dropbox or file link)" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value.trim())} aria-label="Video link" />
            )}
            {videoUrl && <video src={videoUrl} muted playsInline preload="metadata" hidden onLoadedMetadata={(e) => setDurationSec(Math.round(e.currentTarget.duration))} />}
            {durationSec !== null && (
              <p className="np-muted">
                Length {Math.floor(durationSec / 60)}:{String(durationSec % 60).padStart(2, "0")}
                {apps.includes("facebook") ? ` · Facebook: ${durationSec >= 3 && durationSec <= 90 ? "posts as a Reel" : "posts as a video (Reels are 3–90 s)"}` : ""}
              </p>
            )}
            {setup.precheck && ttKey && hasVideo && (
              <div className={`pb-check ${check}`}>
                <span className="pb-check-ico" aria-hidden="true">{check === "ok" ? "✓" : <Icon name="shield" size={18} />}</span>
                {check === "ok" ? (
                  <span><b>TikTok found no problems</b><small>No violations. Views aren&apos;t guaranteed.</small></span>
                ) : (
                  <span><b>{check === "busy" ? "TikTok is checking your video…" : "Check video first"}</b><small>Checks for violations before you post.</small></span>
                )}
                {check !== "ok" && <button type="button" className="btn-outline v2-btn-sm" disabled={check === "busy"} onClick={() => { setCheck("busy"); window.setTimeout(() => setCheck("ok"), 2200); }}>{check === "busy" ? "Checking…" : "Check"}</button>}
              </div>
            )}
            {secErr("video")}
          </section>

          <section id="pb-s-caption" className={secClass("caption")}>
            <h2>Caption <Req /> <Tip label="Caption tips" text="Hook first: only the first line shows. No links here: put them in the first comment. Each app gets its own version in the tabs." /></h2>
            {apps.length > 0 && (
              <div className="pb-tabs" role="tablist" aria-label="Caption for">
                {([["main", "Main"], ...apps.map((p) => [p, appLabel(p)])] as ["main" | Channel, string][]).map(([k, l]) => (
                  <button key={k} type="button" role="tab" aria-selected={activeTab === k} aria-label={k === "main" ? undefined : l} title={k === "main" ? undefined : l} className={k === "main" ? undefined : "pb-tab-ic"} onClick={() => setTab(k)}>
                    {k === "main" ? l : <PlatformIcon name={ICON[k]} size={20} />}{k !== "main" && (capOver[k] !== undefined || comOver[k] !== undefined) && <i className="dot" title="Edited" />}
                  </button>
                ))}
              </div>
            )}
            {activeTab === "main" ? (
              <>
                <label className="pb-field"><textarea className="np-input" rows={5} value={main} onChange={(e) => setMain(e.target.value)} placeholder="Hook first, then a few short lines." aria-label="Main caption" /></label>
                {counts.length > 0 && <div className="pb-counts" aria-label="Characters per app">{counts}</div>}
                {hasLinkOrCta(main, cta) && <p className="pb-warn">Links are removed from captions. Use First comment below.</p>}
                <label className="pb-field"><span className="pb-row"><b>Hashtags <Tip label="Hashtag tips" text="Up to 5 on TikTok and Instagram, none on Threads." /></b><Opt /></span><input className="np-input" type="text" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="#thermos #kopi #tiktokshopmy" aria-label="Hashtags" /></label>
                {apps.includes("threads") && (
                  <label className="pb-field">
                    <span className="pb-row"><b>Threads Topic <Tip label="Topic tips" text="One topic per post. No periods or &." /></b>{topicOver !== null ? <button type="button" className="pb-link" onClick={() => setTopicOver(null)}>Use the First Hashtag</button> : <Opt />}</span>
                    <input className="np-input" type="text" value={topicOver ?? threadsTopic(mainFull)} maxLength={60} onChange={(e) => setTopicOver(e.target.value)} placeholder="e.g. Dapur" aria-label="Threads topic" />
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
                extra={activeTab === "threads" ? <p className="np-muted">Topic: <b>{topic || "none"}</b> · set it in Main.</p> : undefined}
              />
            )}
            {[...new Set(warnings)].map((w) => <p key={w} className="pb-warn">{w}</p>)}
            {secErr("caption")}
          </section>

          <section id="pb-s-comment" className={secClass("comment")}>
            <div className="pb-bar"><h2>First Comment <Tip label="About the first comment" text="Your call to action and link, posted right after your post. Edit it per app under Caption." /></h2><Opt /></div>
            <div className="pb-two">
              <label className="pb-field"><span className="pb-row"><b>Call to action</b><Opt /></span><input className="np-input" type="text" value={cta} maxLength={80} onChange={(e) => setCta(e.target.value)} placeholder="e.g. Dapatkan di sini 👉" aria-label="Call to action" /></label>
              <label className="pb-field"><span className="pb-row"><b>Product link</b><Opt /></span><input className="np-input" type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value.trim())} placeholder="https://… (TikTok Shop or Shopee)" aria-label="Product link" /></label>
            </div>
            <label className="pb-field"><span className="pb-row"><b>More text</b><Opt /></span><textarea className="np-input" rows={2} value={ownComment} onChange={(e) => setOwnComment(e.target.value)} placeholder="e.g. Ada soalan? Tanya di komen 👇" aria-label="More text in the first comment" /></label>
            {apps.length > 0 && <ul className="pb-how">{apps.map((p) => <li key={p}><PlatformIcon name={ICON[p]} size={18} /><span><b>{appLabel(p)}</b><small>{linkWhere(p)}</small></span></li>)}</ul>}
            {secErr("comment")}
          </section>

          {ttKey && (
            <section id="pb-s-tiktok" className={`${secClass("tiktok")} np-sec`}>
              <h2>TikTok Settings</h2>
              <div className="np-seg" role="radiogroup" aria-label="Where to send it">
                <button type="button" role="radio" aria-checked={mode === "direct"} className={mode === "direct" ? "on" : ""} onClick={() => setMode("direct")}>Post to TikTok</button>
                <button type="button" role="radio" aria-checked={mode === "inbox"} className={mode === "inbox" ? "on" : ""} onClick={() => setMode("inbox")}>Send to TikTok Drafts</button>
              </div>
              {mode === "direct" && (
                <>
                  {ttInfo?.info?.creator_nickname && <p className="np-muted" style={{ margin: 0 }}>Posting as <b>{ttInfo.info.creator_nickname}</b></p>}
                  <label htmlFor="pb-privacy"><b>Who can view this post <Req /></b></label>
                  <select id="pb-privacy" className="np-input" value={privacy} onChange={(e) => setPrivacy(e.target.value as Privacy)} required>
                    <option value="" disabled>Choose who can view</option>
                    {privacyOptions.map(([p, l]) => <option key={p} value={p} disabled={p === "SELF_ONLY" && promo.on && promo.branded}>{l}{p === "SELF_ONLY" && promo.on && promo.branded ? " (not allowed for branded content)" : ""}</option>)}
                  </select>
                  <div className="np-checks">
                    {([["comments", "Allow Comment"], ["duet", "Allow Duet"], ["stitch", "Allow Stitch"]] as const).map(([k, label]) => (
                      <label key={k} className="np-check"><input type="checkbox" checked={allow[k] && !lockAllow[k]} disabled={lockAllow[k]} onChange={(e) => setAllow((a) => ({ ...a, [k]: e.target.checked }))} />{label}{lockAllow[k] && <small>Turned off for this account in TikTok.</small>}</label>
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
              {secErr("tiktok")}
            </section>
          )}

          {apps.some((p) => p !== "tiktok") && (
            <section id="pb-s-settings" className={`${secClass("settings")} np-sec`}>
              <div className="pb-bar"><h2>Post Settings</h2><Opt /></div>
              {apps.includes("facebook") && (
                <div className="pb-set">
                  <span className="pb-gh"><PlatformIcon name="Facebook" size={16} />Facebook</span>
                  <div className="np-seg" role="radiogroup" aria-label="Facebook">
                    <button type="button" role="radio" aria-checked={!fbDraft} className={!fbDraft ? "on" : ""} onClick={() => setFbDraft(false)}>Publish</button>
                    <button type="button" role="radio" aria-checked={fbDraft} className={fbDraft ? "on" : ""} onClick={() => setFbDraft(true)}>Save as Draft</button>
                  </div>
                  <p className="np-muted">@names don&apos;t link on Facebook.</p>
                  {fbDraft && <p className="np-muted">Hidden until you publish it in Facebook. No first comment. Reels (3–90 s) only.</p>}
                </div>
              )}
              {apps.includes("instagram") && (
                <div className="pb-set">
                  <span className="pb-gh"><PlatformIcon name="Instagram" size={16} />Instagram</span>
                  <div className="np-switchrow">
                    <span><b>Also show in the main feed</b><small>Off: Reels tab only.</small></span>
                    <button type="button" role="switch" aria-checked={igFeed} className={igFeed ? "np-switch on" : "np-switch"} onClick={() => setIgFeed(!igFeed)} aria-label="Also show in the main feed"><span /></button>
                  </div>
                  <details className="pb-guide pb-adv">
                    <summary>Advanced: collaborators, tags, trial reel{igAdvanced ? ` · ${igAdvanced} in use` : ""}</summary>
                    <div className="pb-adv-in">
                      <label className="pb-field"><b>Collaborators</b><input className="np-input" type="text" value={collabText} onChange={(e) => setCollabText(e.target.value)} placeholder="Up to 3 Instagram usernames, e.g. @brand" aria-label="Instagram collaborators" /><small className="np-muted">Shows on their profile once they accept.</small></label>
                      <label className="pb-field"><b>Tag people</b><input className="np-input" type="text" value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="Instagram usernames, e.g. @shopee_my" aria-label="Instagram tagged people" /><small className="np-muted">Up to {TAGS_MAX}. Instagram only.</small></label>
                      <b className="pb-sub">Trial reel</b>
                      <div className="np-seg" role="radiogroup" aria-label="Trial reel">
                        {([["off", "Off"], ["manual", "I'll share with followers"], ["auto", "Instagram decides"]] as [TrialMode, string][]).map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={igTrial === v} className={igTrial === v ? "on" : ""} onClick={() => setIgTrial(v)}>{l}</button>)}
                      </div>
                      {igTrial !== "off" && <p className="np-muted">Shown to non-followers first. {igTrial === "manual" ? "You share it with followers later." : "Instagram shares it if it does well."}</p>}
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
              <p className="np-muted">Need it private? Use a Facebook draft.</p>
              {secErr("settings")}
            </section>
          )}
        </div>

        <aside className="pb-side" aria-label="Preview and post">
          <span className="pb-side-h">Preview</span>
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
          <p className="pb-note">{pApp ? PREVIEW_NOTE[pApp] : "Pick a channel to preview."}</p>
          {pApp && pKey && (
            <div className="pb-cmt" aria-label="First comment as it will be posted">
              <span className="pb-cmt-h">{pApp === "tiktok" ? "Yellow basket" : "First comment"}</span>
              {pApp === "tiktok" ? (
                <p>Add your product to the yellow basket (beg kuning) in TikTok.</p>
              ) : pComment ? (
                <div className="pb-cmt-row">
                  <span className="pb-ini" style={{ background: byKey.get(pKey)?.color }}>{byKey.get(pKey)?.initials}</span>
                  <span><b>{who(pKey).username}</b><span className="pb-cmt-tx">{pComment}</span></span>
                </div>
              ) : (
                <p>{pApp === "facebook" && fbDraft ? "Facebook drafts get no first comment." : "None. Add one under First comment."}</p>
              )}
            </div>
          )}
          {notes.length > 0 && (
            <details className="pb-notes">
              <summary>{notes.length} note{notes.length === 1 ? "" : "s"} for {pApp ? NAMES[pApp] : "this app"}</summary>
              {notes.map(([text, good]) => <p key={text} className={good ? "pb-good" : "pb-warn"}>{text}</p>)}
            </details>
          )}

          <section id="pb-s-when" className={`${secClass("when")} pb-when`}>
            <h2>When <Req /> <Tip text="Malaysia time. All channels post together. Drafts stay here until you schedule them." /></h2>
            <div className="np-when" role="radiogroup" aria-label="When to post">
              {([["now", "Post now"], ["recommended", liveSide ? "Recommended time" : `Recommended · ${RECOMMENDED}`], ["pick", "Pick a time"], ["draft", "Save as draft"]] as [When, string][]).map(([v, label]) => (
                <label key={v} className={when === v ? "np-radio on" : "np-radio"}><input type="radio" name="pb-when" value={v} checked={when === v} onChange={() => setWhen(v)} />{label}</label>
              ))}
            </div>
            {when === "pick" && <input className="np-input" type="datetime-local" value={pickAt} min={liveSide ? nowLocal() : "2026-10-28T09:15"} onChange={(e) => setPickAt(e.target.value)} aria-label="Date and time (Malaysia time)" />}
            {secErr("when")}
          </section>
          {shown.length > 0 && (
            <div className="pb-fix" role="alert">
              <b>{shown.length === 1 ? "1 thing to fix" : `${shown.length} things to fix`}</b>
              {shown.map(([t, s]) => <button key={t} type="button" onClick={() => jump(s)}><span>{t}</span><Icon name="arrow" size={14} /></button>)}
            </div>
          )}
          {sendError && <div className="pb-fix" role="alert"><b>Not sent</b><span style={{ padding: "4px 0" }}>{sendError}</span></div>}
          {ttKey && mode === "direct" && when !== "draft" && <p className="np-consent">{consentLine(promo.on, promo.branded)}</p>}
          <button type="submit" className="np-btn np-submit" disabled={!!busy}>
            {busy || editing ? busy || `Save changes${when === "draft" ? "" : ` · ${cost} credits`}` : !keys.length ? `Pick a Channel${when === "draft" ? "" : ` · ${POST_CREDITS} credits each`}` : `${when === "draft" ? "Save draft" : when === "now" ? "Post now" : "Schedule"} · ${keys.length === 1 ? "1 channel" : `${keys.length} channels`}${when === "draft" ? "" : ` · ${cost} credits`}`}
          </button>
          <p className="pb-cost">
            <Icon name="wallet" size={14} />
            <span><b>{credits.toLocaleString("en-MY")}</b> credits</span>
            <Tip text={`${POST_CREDITS} credits per channel. Drafts are free. Refunded if a channel fails or is cancelled.`} />
            <Link href={setup.earn}>Earn More</Link>
          </p>
        </aside>
      </form>

      {sheet === "channels" && (
        <ChannelsSheet
          channels={channels}
          connectable={missing}
          onConnect={connectApp}
          onConnectApp={liveSide ? connectReal : undefined}
          onReconnect={(c) => { if (liveSide) return connectReal(c.app); setChannels((l) => l.map((x) => (x.key === c.key ? { ...x, status: "active" } : x))); say(`${c.name} reconnected`); }}
          onCheck={(c) => (liveSide ? void checkReal(c) : say(c.status === "active" ? `${c.name} is working.` : `${c.name} needs reconnecting.`))}
          onDisconnect={(c) => {
            if (liveSide) return void disconnectReal(c);
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
          onSaved={(b) => (liveSide ? void saveBrandReal(b) : setBrands((list) => [...list.filter((x) => x.id !== b.id), b].sort((x, y) => x.name.localeCompare(y.name))))}
          onDeleted={(id) => (liveSide ? void deleteBrandReal(id) : setBrands((list) => list.filter((x) => x.id !== id)))}
          onClose={() => setSheet("")}
        />
      )}
    </>
  );
}

const PREVIEW_NOTE: Record<Channel, string> = {
  tiktok: "For You feed.",
  instagram: "Reels viewer.",
  facebook: "Shown as a Reel. Switch to Feed to compare.",
  threads: "Threads feed.",
};

/** Notes under the phone where an app treats the post differently. [text, informational] */
function previewNotes(ch: Channel, caption: string, comment: string, hasLink: boolean, fbView: "reels" | "feed", s: { fbDraft: boolean; igFeed: boolean; igTrial: TrialMode; replies: ReplyControl; tagged: string[] }): [string, boolean][] {
  const out: [string, boolean][] = [];
  if (ch === "facebook" && s.fbDraft) out.push(["Draft: hidden until you publish it in Facebook.", true]);
  if (ch === "instagram" && !s.igFeed) out.push(["Reels tab only.", true]);
  if (ch === "instagram" && s.tagged.length) out.push([`Tagged: ${s.tagged.map((u) => `@${u}`).join(", ")}.`, true]);
  if (ch === "instagram" && s.igTrial !== "off") out.push([s.igTrial === "manual" ? "Trial reel: non-followers first; you share it with followers." : "Trial reel: non-followers first; Instagram shares it if it does well.", true]);
  if (ch === "threads" && s.replies !== "everyone") out.push([`Who can reply: ${REPLY_CONTROLS.find(([v]) => v === s.replies)?.[1] ?? ""}.`, true]);
  if (ch === "tiktok" && hasLink) out.push(["No link on TikTok. Use the yellow basket (beg kuning).", true]);
  if (links(caption).length) out.push(["Caption has a link. Move it to the first comment.", false]);
  if (ch === "instagram" && comment) out.push([`First comment posts right after the Reel.${links(comment).length ? " Links can't be tapped." : ""}`, true]);
  if (ch === "facebook" && comment && !s.fbDraft) out.push(["First comment posts from the Page right after.", true]);
  if (ch === "threads" && comment) out.push(["First comment posts as your reply.", true]);
  return out;
}

/** One app's tab: the caption Rezekii suggests for it (editable) and its first comment. */
function ChannelPane(p: { ch: Channel; name: string; text: string; edited: boolean; captionLength: number; comment: string; commentEdited: boolean; onText: (v: string) => void; onResetText: () => void; onComment: (v: string) => void; onResetComment: () => void; extra?: ReactNode }) {
  const tt = p.ch === "tiktok";
  return (
    <>
      <div className="pb-row"><b>{p.name} caption</b>{p.edited ? <button type="button" className="pb-link" onClick={p.onResetText}>Use Suggested</button> : <small className="pb-sug">✦ Suggested for {p.name}</small>}</div>
      <textarea className="np-input" rows={5} value={p.text} onChange={(e) => p.onText(e.target.value)} aria-label={`${p.name} caption`} />
      <span className={`np-count${p.captionLength > CAPTION_MAX[p.ch] ? " over" : ""}`}>{p.captionLength.toLocaleString("en-US")} / {CAPTION_MAX[p.ch].toLocaleString("en-US")}</span>
      {p.extra}
      {tt ? (
        <p className="pb-info">No comments or links on TikTok. Use the yellow basket (beg kuning).</p>
      ) : (
        <>
          <div className="pb-row"><b>{p.name} first comment</b>{p.commentEdited ? <button type="button" className="pb-link" onClick={p.onResetComment}>Use Suggested</button> : <Opt />}</div>
          <textarea className="np-input" rows={3} value={p.comment} onChange={(e) => p.onComment(e.target.value)} placeholder="Your call to action and product link." aria-label={`${p.name} first comment`} />
          <span className="np-count">{lengthFor(p.ch, p.comment).toLocaleString("en-US")} / {COMMENT_MAX[p.ch as Platform].toLocaleString("en-US")}</span>
          {p.ch === "instagram" && links(p.comment).length > 0 && <p className="pb-warn">Instagram links can&apos;t be tapped.</p>}
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
  const [q, setQ] = useState("");
  const s = q.trim().toLowerCase();
  return (
    <Sheet title="Channels" onClose={onClose}>
      <p className="np-muted" style={{ margin: 0 }}>Connect once. Rezekii never sees your password.</p>
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
                  {c.status === "reconnect" ? <button type="button" className="np-btn v2-btn-sm" onClick={() => onReconnect(c)}>Reconnect</button> : <button type="button" className="btn-outline v2-btn-sm pb-icobtn" aria-label={`Check ${c.name}`} title="Check now" onClick={() => onCheck(c)}><Icon name="refresh" size={16} /><span>Check Now</span></button>}
                  <button type="button" className="pb-link pb-off pb-icobtn" aria-label={`Disconnect ${c.name}`} title="Disconnect" onClick={() => onDisconnect(c)}><Icon name="x" size={16} /><span>Disconnect</span></button>
                </div>
              </div>
            ))}
            {!s && (
              <div className="pb-ch">
                <PlatformIcon name={ICON[p]} size={34} />
                <span><b>{list.length ? `Add ${UNIT[p]}` : `Connect ${NAMES[p]}`}</b><small>{p === "facebook" ? "Pick Pages after sign-in" : p === "instagram" ? "Business or Creator account" : p === "threads" ? "Your Threads profile" : "Your TikTok account"}</small></span>
                <button type="button" className="np-btn v2-btn-sm" onClick={() => (onConnectApp ? onConnectApp(p) : add ? onConnect(add) : toast(`Preview: ${NAMES[p]} sign-in opens here`))}>Connect</button>
              </div>
            )}
          </div>
        );
      })}
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
      <Sheet title={edit.id ? "Edit Brand" : "New Brand"} onClose={onClose}>
        <button type="button" className="pb-link" style={{ justifySelf: "start" }} onClick={() => setEdit(null)}>← Back</button>
        <label className="pb-field"><b>Brand name</b><input className="np-input" type="text" value={edit.name} maxLength={60} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="e.g. Seri Living" /></label>
        <p className="np-muted" style={{ margin: 0 }}>{edit.channels.length} channel{edit.channels.length === 1 ? "" : "s"} in this brand.</p>
        {APPS.map((p) => {
          const list = channels.filter((c) => c.app === p);
          return list.length ? (
            <div key={p} className="pb-group">
              <span className="pb-gh"><PlatformIcon name={ICON[p]} size={16} />{NAMES[p]}</span>
              {list.map((c) => <label key={c.key} className="pb-check"><Face ch={c} /><span><b>{c.name}</b><small>{c.sub}{c.status === "reconnect" ? " · needs reconnecting" : ""}</small></span><input type="checkbox" checked={edit.channels.includes(c.key)} onChange={() => toggle(c.key)} /></label>)}
            </div>
          ) : null;
        })}
        <button type="button" className="np-btn" disabled={!edit.name.trim() || !edit.channels.length} onClick={() => { onSaved({ id: edit.id ?? `b${Date.now()}`, name: edit.name.trim(), channels: edit.channels }); setEdit(null); }}>Save Brand</button>
        {edit.id && (confirmDelete ? (
          <div className="pb-row"><span className="np-muted">Delete &ldquo;{edit.name}&rdquo;? Its channels stay connected.</span><span className="pb-links"><button type="button" className="pb-link pb-danger" onClick={() => { onDeleted(edit.id!); setEdit(null); }}>Delete</button><button type="button" className="pb-link" onClick={() => setConfirmDelete(false)}>Keep</button></span></div>
        ) : (
          <button type="button" className="pb-link pb-danger" style={{ justifySelf: "start" }} onClick={() => setConfirmDelete(true)}>Delete Brand</button>
        ))}
      </Sheet>
    );
  }

  return (
    <Sheet title="Brands" onClose={onClose}>
      <p className="np-muted" style={{ margin: 0 }}>Group channels to pick them in one tap.</p>
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
      {!brands.length && <p className="np-muted" style={{ margin: 0 }}>No brands yet.</p>}
      <button type="button" className="btn-outline" onClick={() => open({ name: "", channels: [] })}>+ New brand</button>
      <button type="button" className="np-btn" onClick={onClose}>Done</button>
    </Sheet>
  );
}
