"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { CreatorInfo, PrivacyLevel } from "@/integrations/tiktok/posting.ts";
import { useLang, useT } from "@/lib/i18n/client.tsx";
import { dateLocale, tx, type Lang, type T } from "@/lib/i18n/lang.ts";
import type { PublicAccount } from "@/modules/social/accounts.ts";
import type { Brand } from "@/modules/social/brands.ts";
import { consentLine, postProblems, type PostChoice } from "@/modules/posting/rules.ts";
import { brandChannels, brandPicked, cleanPick, isTikTokKey, openIdOf, tiktokKey, toggleBrand, toggleChannel } from "@/modules/social/picker.ts";
import { COLLABORATORS_MAX, TAGS_MAX, REPLY_CONTROLS, cleanTopic, parseCollaborators, settingsProblems, threadsTopic, type ReplyControl, type TrialMode } from "@/modules/social/settings.ts";
import { KEYFRAME_GAP_MAX, readKeyframes, type KeyframeInfo } from "@/modules/posting/keyframes.ts";
import type { EditPost } from "@/modules/posting/edit.ts";
import type { Recipe } from "@/modules/social/recipe.ts";
import { localInput } from "./new-post-form";
import { CAPTION_MAX, COMMENT_MAX, DEFAULT_PLACEMENT, NAMES, parseHashtags, withHashtags, autoCaption, autoComment, channelProblems, channelWarnings, lengthFor, links, postedCaption, shopeeProblems, shopeeProduct, type Channel, type Placement, type Platform } from "@/modules/social/rules.ts";
import { BrandIcon, ShopeeIcon } from "../brand-icons";
import type { PublicShopee } from "@/modules/shopee/connections.ts";
import type { ShopeeItem } from "@/integrations/shopee/products.ts";
import { PhonePreview, type Who } from "./phone-previews";
import "./composer.css";

type Info = CreatorInfo & { nextRecommended: string };
type When = "now" | "recommended" | "pick" | "draft";
export type TikTokAccount = { open_id: string; username: string | null; avatar_url: string | null; status: "active" | "reconnect" };
const TT = "tiktok";
const APPS: Channel[] = ["tiktok", "facebook", "instagram", "threads", "shopee"];
// Apps connected with their own sign-in links in Channels and Brands (Shopee has its own section there, and isn't in brands).
const SIGN_IN_APPS = APPS.filter((p) => p !== "shopee");
// What a channel is called in each app, for "Facebook · 3 Pages".
const UNIT: Record<Channel, string> = { tiktok: tx("accounts"), facebook: tx("Pages"), instagram: tx("accounts"), threads: tx("profiles"), shopee: tx("accounts") };
const PRIVACY: Record<PrivacyLevel, string> = { PUBLIC_TO_EVERYONE: tx("Everyone"), MUTUAL_FOLLOW_FRIENDS: tx("Friends (followers you follow back)"), FOLLOWER_OF_CREATOR: tx("Followers"), SELF_ONLY: tx("Only me") };
const myt = (iso: string, lang: Lang) => new Date(iso).toLocaleString(dateLocale(lang), { timeZone: "Asia/Kuala_Lumpur", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
const CONNECT_MSG: Record<string, (app: string, t: T) => string> = {
  ok: (app, t) => t("{app} connected.", { app }),
  cancelled: (app, t) => t("Not connected: {app} sign-in was cancelled.", { app }),
  expired: (_, t) => t("That took too long. Try connecting again."),
  no_pages: (_, t) => t("This Facebook account doesn't manage any Pages."),
  personal: (_, t) => t("Switch to a Business or Creator account in Instagram, then connect again."),
  config: (app, t) => t("{app} isn't set up on Rezekii yet (its app settings are missing).", { app }),
  failed: (app, t) => t("{app} didn't connect. Try again.", { app }),
};
const SEARCH_ICON = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;

/** One channel as New post shows it: a TikTok account, a connected Page/account/profile, or a Shopee account ("shopee:<id>"). */
type Ch = { key: string; app: Channel; name: string; sub: string; avatar: string | null; status: "active" | "reconnect"; account?: PublicAccount; shop?: PublicShopee };
const shopeeKey = (id: string) => `shopee:${id}`;

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
 * setting its Content Sharing Guidelines require. `edit`: a scheduled post filled in to change (its recipe comes as `reuse`),
 * with its video and comment image kept; saving holds the changed post and swaps it in for the old one.
 */
export function Composer({ tiktok: initialTikTok, social: initialSocial, shopee: initialShopee, brands: initialBrands, last, reuse, edit, connect }: { tiktok: TikTokAccount[]; social: PublicAccount[]; shopee: PublicShopee[] | null; brands: Brand[]; last: string[]; reuse: { recipe: Recipe; at: string | null } | null; edit?: EditPost | null; connect: { channel: string; result: string } | null }) {
  const t = useT();
  const lang = useLang();
  const [tiktok, setTikTok] = useState(initialTikTok);
  const [social, setSocial] = useState(initialSocial);
  // Connected Shopee accounts (null: Shopee isn't set up on this site).
  const [shopee, setShopee] = useState(initialShopee);
  const [brands, setBrands] = useState(initialBrands);
  // Reuse (M7): New post starts from an earlier post's channels, text and settings; only the video is picked again.
  const r0 = reuse?.recipe;
  const [picked, setPicked] = useState<Set<string>>(() => (r0 ? cleanPick(r0.channels, new Set([...initialTikTok.filter((a) => a.status === "active").map((a) => tiktokKey(a.open_id)), ...initialSocial.filter((a) => a.status === "active").map((a) => a.id), ...(initialShopee ?? []).filter((a) => a.status === "active").map((a) => shopeeKey(a.id))])) : new Set()));
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
  const [main, setMain] = useState(r0?.main ?? "");
  const [tagsText, setTagsText] = useState(r0?.tags ?? "");
  const [ownComment, setOwnComment] = useState(r0?.comment ?? "");
  const [link, setLink] = useState(r0?.link ?? "");
  const [cta, setCta] = useState(r0?.cta ?? "");
  const [capOver, setCapOver] = useState<Partial<Record<Channel, string>>>(r0?.captions ?? {});
  const [comOver, setComOver] = useState<Partial<Record<Channel, string>>>(r0?.comments ?? {});
  const [place, setPlace] = useState<Partial<Record<Channel, Placement>>>(r0?.place ?? {});
  const [tab, setTab] = useState<"main" | Channel>("main");
  const e0 = edit?.tiktok;
  const [source, setSource] = useState<"upload" | "link">(edit?.video.source ?? "upload");
  const [file, setFile] = useState<File | null>(null);
  // An edit keeps the post's video and comment image until others are picked or the image is removed.
  const [kept, setKept] = useState(edit?.video ?? null);
  const [keptImage, setKeptImage] = useState(edit?.commentImage ?? null);
  const [commentImage, setCommentImage] = useState<File | null>(null);
  // How far apart the uploaded video's full frames are (C7c): one in the whole clip breaks on Facebook and Threads.
  const [checked, setChecked] = useState<{ file: File; frames: KeyframeInfo | null } | null>(null);
  useEffect(() => {
    if (source !== "upload" || !file) return;
    let live = true;
    readKeyframes(file).then((frames) => { if (live) setChecked({ file, frames }); }, () => {});
    return () => { live = false; };
  }, [source, file]);
  const frames = source === "upload" && checked?.file === file ? checked.frames : null;
  const [linkUrl, setLinkUrl] = useState(edit?.video.linkUrl ?? "");
  const [durationSec, setDurationSec] = useState<number | null>(edit?.video.durationSec ?? null);
  const [infoFor, setInfoFor] = useState<{ acct: string; info?: Info; error?: string } | null>(null);
  const [mode, setMode] = useState<"direct" | "inbox">(e0?.mode ?? "direct");
  const [privacy, setPrivacy] = useState<PrivacyLevel | "">((e0?.privacy as PrivacyLevel | null) ?? "");
  const [allow, setAllow] = useState({ comments: e0?.allowComments ?? false, duet: e0?.allowDuet ?? false, stitch: e0?.allowStitch ?? false });
  const [promo, setPromo] = useState({ on: !!(e0?.brandOrganic || e0?.brandedContent), own: e0?.brandOrganic ?? false, branded: e0?.brandedContent ?? false });
  const [isAigc, setIsAigc] = useState(e0?.isAigc ?? false);
  // Shopee asks for these on every video; both start on (owner, 29 Oct 2026). The AI label is the TikTok switch, shared.
  const [shopeeAllow, setShopeeAllow] = useState({ duet: true, stitch: true });
  // Products picked per shop (up to 6, Shopee's limit), and each picked shop's live products from Shopee.
  const [shopeeItems, setShopeeItems] = useState<Record<string, number[]>>({});
  const [shopProducts, setShopProducts] = useState<Record<string, { items?: ShopeeItem[]; error?: string }>>({});
  const [when, setWhen] = useState<When>(edit ? (edit.at ? "pick" : "draft") : "recommended");
  const [pickAt, setPickAt] = useState(edit?.at ? localInput(edit.at) : "");
  const [fbDraft, setFbDraft] = useState(r0?.fbDraft ?? false);
  const [igFeed, setIgFeed] = useState(r0?.igFeed ?? true);
  const [igTrial, setIgTrial] = useState<TrialMode>(r0?.igTrial ?? "off");
  const [collabText, setCollabText] = useState(r0?.collaborators ?? "");
  const [tagText, setTagText] = useState(r0?.tagged ?? "");
  const [replies, setReplies] = useState<ReplyControl>(r0?.replies ?? "everyone");
  const [topicOver, setTopicOver] = useState<string | null>(r0?.topic ?? null);
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
  const [toast, setToast] = useState(() => (edit ? t("Editing your scheduled post. Saving replaces it, as long as it hasn't started sending.") : connect && CONNECT_MSG[connect.result] ? CONNECT_MSG[connect.result](NAMES[connect.channel as Platform] ?? (connect.channel === "shopee" ? "Shopee" : t("The channel")), t) : reuse ? (reuse.at ? t("Filled in from your post of {date}. Pick a video, then post.", { date: new Date(reuse.at).toLocaleDateString(dateLocale(lang), { day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" }) }) : t("Filled in from your post. Pick a video, then post.")) : ""));

  // Every channel, TikTok accounts first; only active ones can be picked.
  const channels: Ch[] = useMemo(() => [
    ...tiktok.map((a): Ch => ({ key: tiktokKey(a.open_id), app: "tiktok", name: a.username ? `@${a.username}` : "TikTok", sub: "TikTok", avatar: a.avatar_url, status: a.status })),
    ...social.map((a): Ch => ({ key: a.id, app: a.platform, name: a.name ?? NAMES[a.platform], sub: a.platform === "facebook" ? t("Facebook Page") : a.username ? `@${a.username}` : NAMES[a.platform], avatar: a.avatar_url, status: a.status, account: a })),
    ...(shopee ?? []).map((a): Ch => ({ key: shopeeKey(a.id), app: "shopee", name: shopeeName(a, t), sub: shopeeSub(a, t), avatar: a.avatar_url, status: a.status, shop: a })),
  ], [tiktok, social, shopee, t]);
  const byKey = useMemo(() => new Map(channels.map((c) => [c.key, c])), [channels]);
  const connected = useMemo(() => new Set(channels.filter((c) => c.status === "active").map((c) => c.key)), [channels]);
  // Updates from the current pick, so quick taps in a row all count.
  const pick = (next: Set<string>) => setPicked(next);
  const update = (fn: (s: Set<string>) => Set<string>) => setPicked(fn);

  const ttKey = [...picked].find((k) => isTikTokKey(k) && connected.has(k));
  const ttAccount = ttKey ? openIdOf(ttKey) : "";
  // TikTok requires fresh creator info every time the posting screen opens for an account.
  useEffect(() => {
    if (!ttAccount) return;
    let live = true;
    fetch(`/api/posts/creator-info?account=${encodeURIComponent(ttAccount)}`, { cache: "no-store" })
      .then(async (r) => (await r.json()) as Info & { error?: string })
      .then((d) => live && setInfoFor(d.error ? { acct: ttAccount, error: d.error } : { acct: ttAccount, info: d }))
      .catch(() => live && setInfoFor({ acct: ttAccount, error: tx("Couldn't reach TikTok. Check your connection and try again.") }));
    return () => { live = false; };
  }, [ttAccount]);
  const info = infoFor?.acct === ttAccount ? (infoFor.info ?? null) : null;
  const infoError = infoFor?.acct === ttAccount ? (infoFor.error ?? "") : "";
  const priv: PrivacyLevel | "" = privacy && info?.privacy_level_options.includes(privacy) ? privacy : "";

  const videoUrl = useMemo(() => (source === "upload" ? (file ? URL.createObjectURL(file) : (kept?.url ?? null)) : /^https:\/\//.test(linkUrl) ? linkUrl : null), [source, file, kept, linkUrl]);
  useEffect(() => () => { if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl); }, [videoUrl]);
  const commentImageUrl = useMemo(() => (commentImage ? URL.createObjectURL(commentImage) : (keptImage?.url ?? null)), [commentImage, keptImage]);
  useEffect(() => () => { if (commentImageUrl?.startsWith("blob:")) URL.revokeObjectURL(commentImageUrl); }, [commentImageUrl]);

  // Posting keys: "tiktok" for the picked TikTok account, then the picked Meta channels and Shopee accounts.
  const metaPicked = social.filter((a) => picked.has(a.id) && a.status === "active");
  const shopeePicked = (shopee ?? []).filter((a) => picked.has(shopeeKey(a.id)) && a.status === "active");
  const keys = [...(ttKey ? [TT] : []), ...metaPicked.map((a) => a.id), ...shopeePicked.map((a) => shopeeKey(a.id))];
  const chOf = (key: string): Channel => (key === TT ? "tiktok" : key.startsWith("shopee:") ? "shopee" : (social.find((a) => a.id === key)?.platform ?? "facebook"));
  const apps = APPS.filter((p) => keys.some((k) => chOf(k) === p));
  const inApp = (p: Channel) => keys.filter((k) => chOf(k) === p);
  const placeOf = (p: Channel) => place[p] ?? DEFAULT_PLACEMENT[p];
  // The main caption with the Hashtags box at the very bottom: what every app's version is written from.
  const mainFull = withHashtags(main, parseHashtags(tagsText));
  const textOf = (p: Channel) => capOver[p] ?? autoCaption(p, mainFull, placeOf(p));
  const captionOf = (p: Channel) => postedCaption(p, textOf(p), link.trim(), placeOf(p), cta);
  const commentOf = (p: Channel) => (p === "tiktok" || p === "shopee" ? "" : (comOver[p] ?? autoComment(p, link.trim(), placeOf(p), ownComment, cta)));
  // Shopee shows a shop's own products under the video; it refuses other shops' products (affiliates, 30 Oct 2026). Until
  // products are picked, Product link counts when it is one of the shop's own.
  const product = shopeeProduct(link.trim());
  const itemsFor = (a: PublicShopee): number[] => (a.role !== "seller" ? [] : shopeeItems[a.id] ?? (product && product.shopId === a.shop_id ? [Number(product.itemId)] : []));
  const sellersPicked = shopeePicked.filter((a) => a.role === "seller").map((a) => a.id).join(",");
  const asked = useRef(new Set<string>());
  useEffect(() => {
    for (const id of sellersPicked ? sellersPicked.split(",") : []) {
      if (asked.current.has(id)) continue;
      asked.current.add(id);
      fetch(`/api/shopee/connections/${id}/products`, { cache: "no-store" })
        .then(async (r) => (await r.json()) as { items?: ShopeeItem[]; error?: string })
        .then((d) => setShopProducts((o) => ({ ...o, [id]: d.items ? { items: d.items } : { error: d.error ?? tx("Couldn't load the shop's products from Shopee. Try again.") } })))
        .catch(() => setShopProducts((o) => ({ ...o, [id]: { error: tx("Couldn't load the shop's products from Shopee. Try again.") } })));
    }
  }, [sellersPicked]);
  const appLabel = (p: Channel) => { const n = inApp(p).length; return n > 1 ? `${NAMES[p]} · ${t("{n} {unit}", { n, unit: t(UNIT[p]) })}` : NAMES[p]; };
  const summary = () => apps.map((p) => { const n = inApp(p).length; return n > 1 ? t("{n} {app} {unit}", { n, app: NAMES[p], unit: t(UNIT[p]) }) : p === "tiktok" ? `TikTok ${byKey.get(ttKey ?? "")?.name ?? ""}`.trim() : `${NAMES[p]} ${byKey.get(inApp(p)[0])?.name ?? ""}`.trim(); }).join(", ");
  const who = (key: string): Who => {
    if (key === TT) return { name: info?.creator_nickname || info?.creator_username || "TikTok", username: info?.creator_username || "", avatar: info?.creator_avatar_url ?? null };
    const c = byKey.get(key);
    if (c?.shop) return { name: c.name, username: c.name, avatar: c.avatar };
    const a = social.find((x) => x.id === key);
    return { name: a?.name ?? "", username: a?.username ?? a?.name ?? "", avatar: a?.avatar_url ?? null };
  };
  const topic = cleanTopic(topicOver ?? threadsTopic(mainFull));
  const collaborators = parseCollaborators(collabText).list.slice(0, COLLABORATORS_MAX);
  const tagged = parseCollaborators(tagText).list.slice(0, TAGS_MAX);
  const igAdvanced = (collabText.trim() ? 1 : 0) + (tagText.trim() ? 1 : 0) + (igTrial !== "off" ? 1 : 0);
  const settingsFor = (p: Platform) => (p === "facebook" ? { draft: fbDraft } : p === "instagram" ? { feed: igFeed, collaborators, tags: tagged, trial: igTrial } : { replies, topic });
  const pApp = apps.includes(previewApp) ? previewApp : apps[0];
  const pKey = pApp ? (inApp(pApp).includes(previewAcct) ? previewAcct : inApp(pApp)[0]) : undefined;
  const activeTab = tab !== "main" && apps.includes(tab) ? tab : "main";

  const choice: PostChoice = { mode, caption: captionOf("tiktok"), privacyLevel: priv || null, allowComments: allow.comments, allowDuet: allow.duet, allowStitch: allow.stitch, promo: promo.on, brandOrganic: promo.own, brandedContent: promo.branded, isAigc, durationSec };
  const problems = (() => {
    const out: string[] = [];
    if (!keys.length) out.push(t("Pick at least one channel."));
    if (source === "upload" ? !file && !kept?.storagePath : !/^https:\/\/\S+$/.test(linkUrl)) out.push(t("Add a video: upload one or paste an https link."));
    if (ttKey && info && when !== "draft") out.push(...postProblems(choice, info, t));
    for (const p of apps) {
      if (p === "shopee") out.push(...shopeeProblems(captionOf(p), durationSec, t));
      else if (p !== "tiktok") out.push(...channelProblems(p, captionOf(p), commentOf(p), durationSec, t), ...settingsProblems(p, settingsFor(p), durationSec, p === "instagram" ? collabText : undefined, p === "instagram" ? tagText : undefined, t));
    }
    if (commentImage && !["image/jpeg", "image/png"].includes(commentImage.type)) out.push(t("The comment image must be a JPG or PNG."));
    else if (commentImage && commentImage.size > 8 * 1024 * 1024) out.push(t("The comment image is over 8 MB."));
    if (when === "pick" && !pickAt) out.push(t("Pick a date and time."));
    return out;
  })();
  const warnings = apps.flatMap((p) => channelWarnings(p, captionOf(p), t));

  async function disconnect(c: Ch) {
    const tt = isTikTokKey(c.key);
    const r = await fetch(tt ? `/api/account/tiktok/${encodeURIComponent(openIdOf(c.key))}` : `/api/social/accounts/${c.key}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) return setToast(t("Couldn't disconnect. Try again."));
    if (tt) setTikTok((s) => s.filter((x) => tiktokKey(x.open_id) !== c.key));
    else setSocial((s) => s.filter((x) => x.id !== c.key));
    setPicked((s) => new Set([...s].filter((k) => k !== c.key)));
    setToast(tt ? t("{name} disconnected. Its scheduled posts moved to drafts.", { name: c.name }) : t("{name} disconnected. Its scheduled posts were cancelled.", { name: c.name }));
  }
  // Check now: asks the app whether the channel still works and shows the answer.
  async function check(c: Ch) {
    const r = await fetch("/api/channels/check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: c.key }) }).catch(() => null);
    const x = (await r?.json().catch(() => ({}))) as { status?: "active" | "reconnect"; error?: string } | undefined;
    if (!r?.ok || !x?.status) return setToast(t(x?.error || tx("Couldn't check. Try again.")));
    const status = x.status;
    if (isTikTokKey(c.key)) setTikTok((s) => s.map((a) => (tiktokKey(a.open_id) === c.key ? { ...a, status } : a)));
    else setSocial((s) => s.map((a) => (a.id === c.key ? { ...a, status } : a)));
    if (status === "reconnect") setPicked((s) => new Set([...s].filter((k) => k !== c.key)));
    setToast(status === "active" ? t("{name} is connected and working.", { name: c.name }) : t("{name} needs reconnecting. Press Reconnect to sign in again.", { name: c.name }));
  }
  // Shopee (Channels only): disconnect, and Check now, which renews the Shopee sign-in.
  async function shopeeOff(s: PublicShopee, name: string) {
    const r = await fetch(`/api/shopee/connections/${s.id}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) return setToast(t("Couldn't disconnect. Try again."));
    setShopee((list) => list && list.filter((x) => x.id !== s.id));
    setToast(t("{name} disconnected.", { name }));
  }
  async function shopeeCheck(s: PublicShopee, name: string) {
    const r = await fetch("/api/channels/check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: `shopee:${s.id}` }) }).catch(() => null);
    const x = (await r?.json().catch(() => ({}))) as { status?: "active" | "reconnect"; error?: string } | undefined;
    if (!r?.ok || !x?.status) return setToast(t(x?.error || tx("Couldn't check. Try again.")));
    const status = x.status;
    setShopee((list) => list && list.map((a) => (a.id === s.id ? { ...a, status } : a)));
    setToast(status === "active" ? t("{name} is connected and working.", { name }) : t("{name} needs reconnecting. Press Reconnect to sign in again.", { name }));
  }
  // Rename (Channels: double-click a Shopee account's name). Rezekii only; empty goes back to the usual name.
  async function shopeeRename(s: PublicShopee, nickname: string) {
    const r = await fetch(`/api/shopee/connections/${s.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ nickname }) }).catch(() => null);
    const d = (await r?.json().catch(() => ({}))) as { nickname?: string | null; error?: string } | undefined;
    if (!r?.ok || !d) return setToast(t(d?.error || tx("Couldn't rename. Try again.")));
    setShopee((list) => list && list.map((a) => (a.id === s.id ? { ...a, nickname: d.nickname ?? null } : a)));
  }
  function sameAsLast() {
    const next = cleanPick(last, connected);
    if (!next.size) return setToast(t("The channels of your last post aren't connected any more."));
    pick(next);
    const names = [...next].map((k) => byKey.get(k)?.name).filter(Boolean).slice(0, 4).join(", ");
    setToast(next.size > 4 ? t("Same channels as your last post: {names} and {n} more.", { names, n: next.size - 4 }) : t("Same channels as your last post: {names}.", { names }));
  }

  // Straight to storage. XHR, so the button can show how far the upload is (the slow part on a slow connection).
  async function upload(f: File, what: string, kind?: "comment-image"): Promise<string> {
    setBusy(t("Uploading {what}… {pct}%", { what, pct: 0 }));
    const r = await fetch("/api/posts/upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: f.type, size: f.size, kind }) });
    const u = (await r.json()) as { path?: string; uploadUrl?: string; error?: string };
    if (!r.ok || !u.uploadUrl || !u.path) throw new Error(t(u.error || tx("Upload couldn't start.")));
    const uploaded = await new Promise<boolean>((resolve) => {
      const x = new XMLHttpRequest();
      x.open("PUT", u.uploadUrl as string);
      x.setRequestHeader("content-type", f.type);
      x.upload.onprogress = (e) => { if (e.lengthComputable) setBusy(t("Uploading {what}… {pct}%", { what, pct: Math.round((e.loaded / e.total) * 100) })); };
      x.onload = () => resolve(x.status >= 200 && x.status < 300);
      x.onerror = () => resolve(false);
      x.send(f);
    });
    if (!uploaded) throw new Error(t("The upload didn't finish. Try again."));
    return u.path;
  }

  async function submit() {
    setErrors([]);
    if (problems.length) return setErrors(problems);
    try {
      let storagePath: string | undefined = source === "upload" && !file ? (kept?.storagePath ?? undefined) : undefined;
      if (source === "upload" && file) storagePath = await upload(file, t("your video"));
      // The comment image goes to Facebook (not as a draft) and Threads; Instagram comments are text only (C4d).
      const imageApps = metaPicked.some((a) => (a.platform === "facebook" && !fbDraft) || a.platform === "threads");
      const commentImagePath = !imageApps ? undefined : commentImage ? await upload(commentImage, t("the comment image"), "comment-image") : (keptImage?.path ?? undefined);
      setBusy(when === "draft" ? t("Saving…") : t("Scheduling…"));
      const at = when === "pick" ? new Date(pickAt).toISOString() : when;
      const video = { source, storagePath, linkUrl: source === "link" ? linkUrl : undefined };
      let tiktokPost: { id: string; scheduled_at: string | null; status: string } | null = null;
      if (ttKey) {
        const r = await fetch("/api/posts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...choice, ...video, when: at, consent: true, account: ttAccount, staged: !!edit }) });
        const d = (await r.json()) as { post?: { id: string; scheduled_at: string | null; status: string }; error?: string | string[] };
        if (!r.ok || !d.post) throw new Error(Array.isArray(d.error) ? d.error.map((x) => t(x)).join(" ") : t(d.error || tx("TikTok post couldn't be saved.")));
        tiktokPost = d.post;
      }
      let at2: string | null = tiktokPost?.scheduled_at ?? null;
      let groupId: string | null = null;
      if (metaPicked.length || shopeePicked.length) {
        const channelsOut = [
          ...metaPicked.map((a) => ({ accountId: a.id, caption: captionOf(a.platform), firstComment: a.platform === "facebook" && fbDraft ? "" : commentOf(a.platform), settings: settingsFor(a.platform) as object })),
          ...shopeePicked.map((a) => ({ accountId: shopeeKey(a.id), caption: captionOf("shopee"), firstComment: "", settings: { items: itemsFor(a), duet: shopeeAllow.duet, stitch: shopeeAllow.stitch, aigc: isAigc } })),
        ];
        const r = await fetch("/api/social/posts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...video, durationSec, when: at, tiktokPostId: tiktokPost?.id, commentImagePath, staged: !!edit, channels: channelsOut }),
        });
        const d = (await r.json()) as { posts?: { scheduled_at: string | null; group_id: string }[]; error?: string | string[] };
        if (!r.ok || !d.posts) {
          const why = (Array.isArray(d.error) ? d.error.map((x) => t(x)).join(" ") : d.error ? t(d.error) : "") || t("the other channels couldn't be saved.");
          throw new Error(tiktokPost ? t("The TikTok post was saved, but {error}", { error: why }) : why);
        }
        at2 ??= d.posts[0]?.scheduled_at ?? null;
        groupId = d.posts[0]?.group_id ?? null;
      }
      const key = groupId ?? tiktokPost?.id;
      // An edit: the changed post, held so far, takes the old one's place (only if the old one hasn't started sending).
      if (edit && key) {
        setBusy(t("Saving your changes…"));
        const s = await fetch("/api/posts/swap", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ old: edit.key, new: key }) });
        const sd = (await s.json().catch(() => ({}))) as { error?: string };
        if (!s.ok) throw new Error(t(sd.error || tx("Your changes couldn't be saved.")));
      }
      // Kept with the post for Reuse (M7); a failure here doesn't affect the post.
      const recipe: Recipe = { channels: [...picked], main, tags: tagsText, comment: ownComment, link, cta, captions: capOver, comments: comOver, place, topic: topicOver, fbDraft, igFeed, igTrial, collaborators: collabText, tagged: tagText, replies };
      if (key) void fetch("/api/social/recipes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key, recipe }), keepalive: true }).catch(() => {});
      setDone({ summary: summary(), at: at2, draft: when === "draft" });
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
        <h2>{edit ? t("Changes saved") : done.draft ? t("Saved as a draft") : when === "now" ? t("On its way") : t("Scheduled")}</h2>
        <p>{done.draft ? t("Saved in Rezekii for {summary}.", { summary: done.summary }) : done.at && when !== "now" ? t("{summary}: {time} (Malaysia time).", { summary: done.summary, time: myt(done.at, lang) }) : t("{summary}: posting now.", { summary: done.summary })} {t("You'll see each channel's status in All channels.")}</p>
        <div className="np-row"><Link href="/app/posts" className="np-btn">{t("See it in All channels")}</Link>{!edit && <button type="button" className="btn-outline" onClick={() => window.location.reload()}>{t("New post")}</button>}</div>
      </section>
    );
  }

  const counts = apps.map((p) => { const n = lengthFor(p, captionOf(p)); const max = CAPTION_MAX[p]; return <span key={p} className={n > max ? "over" : ""}><BrandIcon ch={p} size={14} />{n.toLocaleString("en-US")} / {max.toLocaleString("en-US")}</span>; });
  const linkWhere = (p: Channel) => {
    const pl = placeOf(p);
    if (p === "tiktok") return t("not added (the product goes in the yellow basket)");
    if (p === "shopee") return shopeePicked.some((a) => itemsFor(a).length) ? t("the products you pick below show under the video") : t("not added (Shopee lets a shop show its own products only)");
    return pl.caption && pl.comment ? t("caption and first comment") : pl.caption ? t("caption") : pl.comment ? t("first comment") : t("not added");
  };
  const notes = pApp ? previewNotes(pApp, captionOf(pApp), commentOf(pApp), !!link.trim(), fbView, { fbDraft, igFeed, igTrial, replies, tagged }, t) : [];
  const q = query.trim().toLowerCase();
  const results = channels.filter((c) => c.status === "active" && (!q || `${c.name} ${c.sub} ${NAMES[c.app]}`.toLowerCase().includes(q)));
  const missing = SIGN_IN_APPS.filter((p) => !channels.some((c) => c.app === p));
  const pickedChs = channels.filter((c) => picked.has(c.key) && connected.has(c.key));

  return (
    <>
      {toast && <p className="np-note" role="status" style={{ marginBottom: 12 }}>{toast} <button type="button" className="cx-link" onClick={() => setToast("")}>{t("Close")}</button></p>}
      <form className="cx" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        <div className="cx-col">
          <section className="card">
            <div className="cx-bar">
              <h2>{t("Post to")}</h2>
              <span className="cx-links">
                {last.length > 0 && <button type="button" className="cx-link" onClick={sameAsLast}>{t("Same as last post")}</button>}
                <button type="button" className="cx-link" onClick={() => setSheet("brands")}>{t("Manage brands")}</button>
                <button type="button" className="cx-link" onClick={() => setSheet("channels")}>{t("Channels · {n}", { n: channels.length + (shopee?.length ?? 0) })}</button>
              </span>
            </div>
            <div className="cx-group">
              <span className="cx-gh">{t("Brands")}</span>
              <div className="cx-chips">
                {brands.map((b) => {
                  const live = brandChannels(b.channels, connected);
                  const bApps = APPS.filter((p) => live.some((k) => byKey.get(k)?.app === p));
                  return (
                    <button key={b.id} type="button" className="cx-chip cx-brand" aria-pressed={brandPicked(b.channels, picked, connected)} disabled={!live.length} onClick={() => update((s) => toggleBrand(s, b.channels, connected))} title={live.length ? undefined : t("None of this brand's channels are connected")}>
                      <span className="cx-faces">{live.slice(0, 3).map((k) => { const c = byKey.get(k); return c ? <Face key={k} ch={c} badge={false} /> : null; })}</span>
                      <span className="cx-blabel"><span>{b.name}</span><small>{live.length} · {bApps.map((p) => NAMES[p]).join(", ") || t("not connected")}</small></span>
                    </button>
                  );
                })}
                {missing.map((p) => <a key={p} className="cx-chip add" href={p === "tiktok" ? "/api/auth/tiktok/start" : `/api/auth/meta/${p}/start`}>+ {NAMES[p]}</a>)}
              </div>
              {!brands.length && <p className="np-muted">{t("Group the channels you post to together, like a brand's Facebook Page, Instagram and TikTok. Then one tap picks them all.")} <button type="button" className="cx-link" onClick={() => setSheet("brands")}>{t("Create a brand")}</button></p>}
            </div>
            <div className="cx-finder" ref={finder}>
              <label className="cx-search">{SEARCH_ICON}<input className="np-input" type="search" value={query} onChange={(e) => { setQuery(e.target.value); setListOpen(true); }} onFocus={() => setListOpen(true)} onClick={() => setListOpen(true)} onKeyDown={(e) => e.key === "Escape" && setListOpen(false)} placeholder={t("Pick or search channels ({n})", { n: connected.size })} aria-label={t("Pick or search channels")} role="combobox" aria-expanded={listOpen} aria-controls="cx-channel-list" /></label>
              {listOpen && (
                <div id="cx-channel-list" className="cx-results" role="listbox" aria-label={t("Connected channels")} aria-multiselectable="true">
                  {APPS.map((p) => {
                    const list = results.filter((c) => c.app === p);
                    return list.length ? (
                      <div key={p} className="cx-group">
                        <span className="cx-gh"><BrandIcon ch={p} size={16} />{NAMES[p]} · {list.length}</span>
                        {list.map((c) => <button key={c.key} type="button" role="option" aria-selected={picked.has(c.key)} className="cx-res" onClick={() => update((s) => toggleChannel(s, c.key, connected))}><Face ch={c} /><span>{c.name}</span><small>{c.app === "facebook" ? "" : c.sub}</small><i className="cx-tick" aria-hidden="true">{picked.has(c.key) ? "✓" : ""}</i></button>)}
                      </div>
                    ) : null;
                  })}
                  {!results.length && <p className="np-muted" style={{ padding: 6 }}>{q ? t("No channel matches \"{query}\".", { query }) : t("No channels connected yet.")}</p>}
                  <button type="button" className="cx-link cx-done" onClick={() => setListOpen(false)}>{t("Done")}</button>
                </div>
              )}
            </div>
            {pickedChs.length > 0 ? (
              <div className="cx-picked">
                {APPS.filter((p) => pickedChs.some((c) => c.app === p)).map((p) => (
                  <div key={p} className="cx-group">
                    <span className="cx-gh"><BrandIcon ch={p} size={16} />{NAMES[p]}</span>
                    <div className="cx-tags">{pickedChs.filter((c) => c.app === p).map((c) => <span key={c.key} className="cx-tag"><Face ch={c} badge={false} /><span>{c.name}</span><button type="button" aria-label={t("Remove {name}", { name: c.name })} onClick={() => update((s) => toggleChannel(s, c.key, connected))}>×</button></span>)}</div>
                  </div>
                ))}
              </div>
            ) : <p className="np-muted">{t("Nothing picked yet: pick a brand, use Same as last post, or search for a channel.")}</p>}
            {ttKey && infoError && <p className="np-error" role="alert">{t(infoError)}</p>}
          </section>

          <section className="card">
            <h2>{t("Video")}</h2>
            <div className="np-seg" role="radiogroup" aria-label={t("Video source")}>
              <button type="button" role="radio" aria-checked={source === "upload"} className={source === "upload" ? "on" : ""} onClick={() => setSource("upload")}>{t("Upload")}</button>
              <button type="button" role="radio" aria-checked={source === "link"} className={source === "link" ? "on" : ""} onClick={() => setSource("link")}>{t("Paste a link")}</button>
            </div>
            {source === "upload" ? (
              <label className="np-drop"><input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setDurationSec(null); setKept(null); }} /><span>{file ? `${file.name} · ${(file.size / 1048576).toFixed(1)} MB` : kept?.storagePath ? t("The post's video is kept. Choose another to replace it.") : t("Choose an MP4, MOV or WebM video (up to 50 MB)")}</span></label>
            ) : (
              <input className="np-input" type="url" inputMode="url" placeholder={t("https://… (Google Drive, Dropbox or a direct file link)")} value={linkUrl} onChange={(e) => setLinkUrl(e.target.value.trim())} aria-label={t("Video link")} />
            )}
            {videoUrl && <video src={videoUrl} muted playsInline preload="metadata" hidden onLoadedMetadata={(e) => setDurationSec(Math.round(e.currentTarget.duration))} />}
            {frames && frames.maxGapSec > KEYFRAME_GAP_MAX && <p className="cx-warn" role="status">{t("Facebook and Threads may show this video broken, mixed with other footage: it has {what}. This is common with videos straight from AI generators like Google Flow. Export it again (for example through CapCut) and upload that file.", { what: frames.keyframes === 1 ? t("only one full frame in the whole clip") : t("a {n}-second stretch without a full frame", { n: Math.round(frames.maxGapSec) }) })}</p>}
            {durationSec !== null && <p className="np-muted">{t("Length {length}", { length: `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, "0")}` })}{apps.includes("facebook") ? t(" · Facebook: {how}", { how: durationSec >= 3 && durationSec <= 90 ? t("goes out as a Reel") : t("goes out as a Page video (Reels are 3–90 s)") }) : ""}</p>}
          </section>

          <section className="card">
            <h2>{t("Caption")}</h2>
            {apps.length > 0 && (
              <div className="cx-tabs" role="tablist" aria-label={t("Caption for")}>
                {([["main", t("Main")], ...apps.map((p) => [p, appLabel(p)])] as ["main" | Channel, string][]).map(([k, l]) => (
                  <button key={k} type="button" role="tab" aria-selected={activeTab === k} onClick={() => setTab(k)}>{k !== "main" && <BrandIcon ch={k} size={16} />}{l}{k !== "main" && (capOver[k] !== undefined || comOver[k] !== undefined) && <i className="dot" title={t("Edited")} />}</button>
                ))}
              </div>
            )}
            {activeTab === "main" ? (
              <>
                <details className="cx-guide">
                  <summary>{t("How to write a post that works on every app")}</summary>
                  <ol>
                    <li><b>{t("Caption:")}</b> {t("start with a hook; the first line is what people see before \"more\". Keep the rest short, on separate lines.")}</li>
                    <li><b>{t("Call to action with the link")}</b> {t("(e.g. \"Dapatkan di sini 👉 link\"): Facebook keeps it where you typed it. TikTok, Instagram and Threads drop it together with its emoji, since links can't be tapped there.")}</li>
                    <li><b>{t("Hashtags:")}</b> {t("type them anywhere in the caption to keep them there, or put them in the Hashtags box to add them at the very bottom. Up to 5 on TikTok and Instagram, all on Facebook. Threads leaves them out (they can't be tapped) and uses one Topic.")}</li>
                    <li><b>{t("Product link:")}</b> {t("paste it in Product link; Rezekii puts it where each app works best (Facebook post and comment, Threads comment, Instagram \"Link dekat bio\", TikTok yellow basket).")}</li>
                    <li><b>{t("First comment:")}</b> {t("optional; it goes out on Facebook, Instagram and Threads right after the post (TikTok doesn't let apps comment). You can add one image to it on Facebook and Threads.")}</li>
                    <li><b>{t("Check each app's tab and the preview:")}</b> {t("the preview shows exactly what will be posted.")}</li>
                  </ol>
                </details>
                <label className="cx-field"><b>{t("Caption")}</b><textarea className="np-input" rows={5} value={main} onChange={(e) => setMain(e.target.value)} placeholder={t("Hook on the first line, then a few short lines.")} aria-label={t("Main caption")} /></label>
                <label className="cx-field"><b>{t("Hashtags")}</b><input className="np-input" type="text" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="#krilloil #sendi #wellnessmalaysia" aria-label={t("Hashtags")} /><small className="np-muted">{t("Added at the very bottom: up to 5 on TikTok and Instagram, all on Facebook, none on Threads.")}</small></label>
                <label className="cx-field"><b>{t("First comment")}</b><textarea className="np-input" rows={2} value={ownComment} onChange={(e) => setOwnComment(e.target.value)} placeholder={t("Optional, e.g. Ada soalan? Tanya di komen 👇")} aria-label={t("First comment")} /><small className="np-muted">{t("Facebook, Instagram and Threads. The product link is added after it where that app puts the link in the comment.")}</small></label>
                {(apps.includes("facebook") || apps.includes("threads")) && (
                  <div className="cx-field"><b>{t("Image in first comment")}</b>
                    {(commentImage || keptImage) && commentImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <span className="cx-cimg"><img src={commentImageUrl} alt="" /><span>{commentImage ? `${commentImage.name} · ${(commentImage.size / 1048576).toFixed(1)} MB` : t("The post's image")}</span><button type="button" className="cx-link" onClick={() => { setCommentImage(null); setKeptImage(null); }}>{t("Remove")}</button></span>
                    ) : (
                      <label className="np-drop"><input type="file" accept="image/jpeg,image/png" onChange={(e) => setCommentImage(e.target.files?.[0] ?? null)} /><span>{t("Optional: one JPG or PNG (up to 8 MB)")}</span></label>
                    )}
                    <small className="np-muted">{t("Goes under the first comment on Facebook and Threads. Instagram comments can only be text.")}</small>
                  </div>
                )}
                {apps.includes("threads") && (
                  <label className="cx-field"><span className="cx-row"><b>{t("Threads topic")}</b>{topicOver !== null ? <button type="button" className="cx-link" onClick={() => setTopicOver(null)}>{t("Use the first hashtag")}</button> : <small className="np-muted">{t("From your first hashtag · edit to change")}</small>}</span>
                    <input className="np-input" type="text" value={topicOver ?? threadsTopic(mainFull)} maxLength={60} onChange={(e) => setTopicOver(e.target.value)} placeholder={t("e.g. Kesihatan sendi")} aria-label={t("Threads topic")} />
                    <small className="np-muted">{t("Recommended: Threads shows one topic next to your name (like Add topic in the app), and people find posts by it. No periods or &.")}</small>
                  </label>
                )}
                {counts.length > 0 && <div className="cx-counts" aria-label={t("Characters per app")}>{counts}</div>}
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
                extra={activeTab === "threads" ? <p className="np-muted">{t("Topic:")} <b>{topic || t("none")}</b> {t("· set it in Main.")}</p> : undefined}
              />
            )}
            {warnings.length > 0 && <p className="cx-warn">{[...new Set(warnings)].join(" ")}</p>}
          </section>

          <section className="card">
            <h2>{t("Call to action & product link")}</h2>
            <label className="cx-field"><b>{t("Call to action before the link")}</b><input className="np-input" type="text" value={cta} maxLength={80} onChange={(e) => setCta(e.target.value)} placeholder={t("e.g. Dapatkan di sini 👉")} aria-label={t("Call to action before the link")} /><small className="np-muted">{t("Optional. Goes in front of the link wherever Rezekii adds it (Facebook caption, first comments).")}</small></label>
            <label className="cx-field"><b>{t("Product link")}</b><input className="np-input" type="url" inputMode="url" value={link} onChange={(e) => setLink(e.target.value.trim())} placeholder={t("https://… (Shopee or TikTok Shop)")} aria-label={t("Product link")} /></label>
            {apps.length > 0 && <ul className="cx-how">{apps.map((p) => <li key={p}><BrandIcon ch={p} size={18} /><span><b>{appLabel(p)}:</b> {linkWhere(p)}</span></li>)}</ul>}
            {apps.length > 0 && <p className="np-muted">{t("Change where it goes in each app's caption tab.")}</p>}
            {/* Shopee only lets a shop attach its own products (tested 30 Oct 2026); affiliates' videos go out without one. */}
            {shopeePicked.some((a) => a.role === "affiliate") && <p className="cx-warn">{t("Shopee doesn't let apps add a product to an affiliate account's video yet, so it posts without one. Only a shop can show its own products.")}</p>}
            {shopeePicked.filter((a) => a.role === "seller").map((a) => (
              <ShopeeProducts key={a.id} name={shopeeName(a, t)} list={shopProducts[a.id]} picked={itemsFor(a)} onPick={(ids) => setShopeeItems((o) => ({ ...o, [a.id]: ids }))} />
            ))}
          </section>

          {ttKey && (
            <section className="card np-sec">
              <h2>{t("TikTok settings")}</h2>
              <div className="np-seg" role="radiogroup" aria-label={t("Where to send it")}>
                <button type="button" role="radio" aria-checked={mode === "direct"} className={mode === "direct" ? "on" : ""} onClick={() => setMode("direct")}>{t("Post to TikTok")}</button>
                <button type="button" role="radio" aria-checked={mode === "inbox"} className={mode === "inbox" ? "on" : ""} onClick={() => setMode("inbox")}>{t("Send to TikTok drafts")}</button>
              </div>
              {mode === "direct" && (
                <>
                  <label htmlFor="cx-privacy"><b>{t("Who can view this post")}</b></label>
                  <select id="cx-privacy" className="np-input" value={priv} onChange={(e) => setPrivacy(e.target.value as PrivacyLevel)} required>
                    <option value="" disabled>{t("Choose who can view")}</option>
                    {(info?.privacy_level_options ?? []).map((p) => <option key={p} value={p} disabled={p === "SELF_ONLY" && promo.on && promo.branded}>{t(PRIVACY[p])}{p === "SELF_ONLY" && promo.on && promo.branded ? t(" (not allowed for branded content)") : ""}</option>)}
                  </select>
                  <div className="np-checks">
                    {([["comments", tx("Allow Comment"), info?.comment_disabled], ["duet", tx("Allow Duet"), info?.duet_disabled], ["stitch", tx("Allow Stitch"), info?.stitch_disabled]] as const).map(([k, label, off]) => (
                      <label key={k} className={off ? "np-check off" : "np-check"}><input type="checkbox" checked={allow[k] && !off} disabled={!!off} onChange={(e) => setAllow((a) => ({ ...a, [k]: e.target.checked }))} />{t(label)}{off ? t(" (turned off in your TikTok settings)") : ""}</label>
                    ))}
                  </div>
                  <div className="np-switchrow"><span><b>{t("Disclose promotional content")}</b><small>{t("Turn on if this video promotes yourself, a brand, product or service.")}</small></span><button type="button" role="switch" aria-checked={promo.on} className={promo.on ? "np-switch on" : "np-switch"} onClick={() => setPromo((p) => (p.on ? { on: false, own: false, branded: false } : { ...p, on: true }))} aria-label={t("Disclose promotional content")}><span /></button></div>
                  {promo.on && (
                    <div className="np-checks">
                      <label className="np-check"><input type="checkbox" checked={promo.own} onChange={(e) => setPromo((p) => ({ ...p, own: e.target.checked }))} />{t("Your brand")}<small>{t("You are promoting yourself or your own business.")}</small></label>
                      <label className="np-check"><input type="checkbox" checked={promo.branded} onChange={(e) => { setPromo((p) => ({ ...p, branded: e.target.checked })); if (e.target.checked && priv === "SELF_ONLY") setPrivacy(""); }} />{t("Branded content")}<small>{t("You are promoting another brand or a third party.")}</small></label>
                    </div>
                  )}
                  <div className="np-switchrow"><span><b>{t("AI-generated content")}</b><small>{t("Turn on if the video was made or heavily edited with AI.")}</small></span><button type="button" role="switch" aria-checked={isAigc} className={isAigc ? "np-switch on" : "np-switch"} onClick={() => setIsAigc(!isAigc)} aria-label={t("AI-generated content")}><span /></button></div>
                </>
              )}
            </section>
          )}

          {apps.some((p) => p !== "tiktok") && (
            <section className="card np-sec">
              <h2>{t("Post settings")}</h2>
              {apps.includes("facebook") && (
                <div className="cx-set">
                  <span className="cx-gh"><BrandIcon ch="facebook" size={16} />Facebook</span>
                  <div className="np-seg" role="radiogroup" aria-label="Facebook">
                    <button type="button" role="radio" aria-checked={!fbDraft} className={!fbDraft ? "on" : ""} onClick={() => setFbDraft(false)}>{t("Publish")}</button>
                    <button type="button" role="radio" aria-checked={fbDraft} className={fbDraft ? "on" : ""} onClick={() => setFbDraft(true)}>{t("Save as draft in Facebook")}</button>
                  </div>
                  <p className="np-muted">{t("On Facebook, @names stay plain text: Facebook doesn't turn them into mentions for posts made by apps. Instagram and Threads link @usernames.")}</p>
                  {fbDraft && <p className="np-muted">{t("The Reel is saved in the Page's drafts. Nobody sees it until you publish it from Facebook or Meta Business Suite. Drafts get no first comment, and work for Reels (3–90 seconds) only.")}</p>}
                </div>
              )}
              {apps.includes("instagram") && (
                <div className="cx-set">
                  <span className="cx-gh"><BrandIcon ch="instagram" size={16} />Instagram</span>
                  <div className="np-switchrow"><span><b>{t("Also show in the main feed")}</b><small>{t("Off: the Reel shows in the Reels tab only.")}</small></span><button type="button" role="switch" aria-checked={igFeed} className={igFeed ? "np-switch on" : "np-switch"} onClick={() => setIgFeed(!igFeed)} aria-label={t("Also show in the main feed")}><span /></button></div>
                  {/* Rarely needed, so folded away (S2, S3, S6); the summary says how many are in use. */}
                  <details className="cx-guide cx-adv">
                    <summary>{t("Advanced: collaborators, tag people, trial reel")}{igAdvanced ? t(" · {n} in use", { n: igAdvanced }) : ""}</summary>
                    <div className="cx-adv-in">
                      <label className="cx-field"><b>{t("Collaborators")}</b><input className="np-input" type="text" value={collabText} onChange={(e) => setCollabText(e.target.value)} placeholder={t("Up to 3 Instagram usernames, e.g. @brand")} aria-label={t("Instagram collaborators")} /><small className="np-muted">{t("They get an invite in Instagram; once they accept, the Reel shows on their profile too.")}</small></label>
                      <label className="cx-field"><b>{t("Tag people")}</b><input className="np-input" type="text" value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder={t("Instagram usernames, e.g. @shopee_my")} aria-label={t("Instagram tagged people")} /><small className="np-muted">{t("Up to {max}. They get a notification and the Reel shows in their Tagged tab. Facebook and Threads don't let apps tag people in videos.", { max: TAGS_MAX })}</small></label>
                      <b className="cx-sub">{t("Trial reel")}</b>
                      <div className="np-seg" role="radiogroup" aria-label={t("Trial reel")}>
                        {([["off", t("Off")], ["manual", t("I'll share with followers")], ["auto", t("Instagram decides")]] as [TrialMode, string][]).map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={igTrial === v} className={igTrial === v ? "on" : ""} onClick={() => setIgTrial(v)}>{l}</button>)}
                      </div>
                      {igTrial !== "off" && <p className="np-muted">{t("A trial reel is shown to people who don't follow you first.")} {igTrial === "manual" ? t("You share it with your followers yourself in Instagram.") : t("Instagram shares it with your followers if it does well.")}</p>}
                    </div>
                  </details>
                </div>
              )}
              {apps.includes("threads") && (
                <div className="cx-set">
                  <span className="cx-gh"><BrandIcon ch="threads" size={16} />Threads</span>
                  <label className="cx-field"><b>{t("Who can reply")}</b>
                    <select className="np-input" value={replies} onChange={(e) => setReplies(e.target.value as ReplyControl)}>{REPLY_CONTROLS.map(([v, l]) => <option key={v} value={v}>{t(l)}</option>)}</select>
                  </label>
                </div>
              )}
              {apps.includes("shopee") && (
                <div className="cx-set">
                  <span className="cx-gh"><BrandIcon ch="shopee" size={16} />Shopee</span>
                  <div className="np-checks">
                    <label className="np-check"><input type="checkbox" checked={shopeeAllow.duet} onChange={(e) => setShopeeAllow((a) => ({ ...a, duet: e.target.checked }))} />{t("Allow Duet")}</label>
                    <label className="np-check"><input type="checkbox" checked={shopeeAllow.stitch} onChange={(e) => setShopeeAllow((a) => ({ ...a, stitch: e.target.checked }))} />{t("Allow Stitch")}</label>
                  </div>
                  {ttKey && mode === "direct" ? <p className="np-muted">{t("AI label: the AI-generated content switch in TikTok settings applies to Shopee too.")}</p> : <div className="np-switchrow"><span><b>{t("AI-generated content")}</b><small>{t("Shopee shows an AI label on the video when this is on.")}</small></span><button type="button" role="switch" aria-checked={isAigc} className={isAigc ? "np-switch on" : "np-switch"} onClick={() => setIsAigc(!isAigc)} aria-label={t("AI-generated content")}><span /></button></div>}
                  <p className="np-muted">{t("Before an account's first post from Rezekii, post one video from Shopee Seller Centre on a computer (Marketing Centre → Live & Video → Upload Video) and tick Shopee Video's terms. Posts from the Shopee app don't count. Affiliates can sign in to Seller Centre with their own Shopee account.")}</p>
                </div>
              )}
              <p className="np-muted">{t("Facebook, Instagram and Threads don't offer \"Only me\" posts to apps. Use a Facebook draft to keep a post private until you publish it.")}</p>
            </section>
          )}

          <section className="card">
            <h2>{t("When")}</h2>
            <div className="np-when" role="radiogroup" aria-label={t("When to post")}>
              {([["now", t("Post now")], ["recommended", info ? t("Recommended time · {time}", { time: myt(info.nextRecommended, lang) }) : t("Recommended time")], ["pick", t("Pick a time")], ["draft", t("Save as draft")]] as [When, string][]).map(([v, label]) => (
                <label key={v} className={when === v ? "np-radio on" : "np-radio"}><input type="radio" name="cx-when" value={v} checked={when === v} onChange={() => setWhen(v)} />{label}</label>
              ))}
            </div>
            {when === "pick" && <input className="np-input" type="datetime-local" value={pickAt} onChange={(e) => setPickAt(e.target.value)} aria-label={t("Date and time (your device's time)")} />}
            <p className="np-muted">{t("All channels go out at the same time.")}{when === "draft" ? t(" A draft stays in Rezekii until you schedule it.") : ""}</p>
          </section>

          {errors.length > 0 && <ul className="np-errors" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
          {ttKey && mode === "direct" && when !== "draft" && <p className="np-consent">{consentLine(choice, t)}</p>}
          <button type="submit" className="np-btn np-submit" disabled={!!busy || (!!ttKey && !info && when !== "draft")}>
            {busy || `${edit ? t("Save changes") : when === "draft" ? t("Save draft") : when === "now" ? t("Post now") : t("Schedule")} · ${keys.length === 1 ? t("{n} channel", { n: 1 }) : t("{n} channels", { n: keys.length })}`}
          </button>
        </div>

        <aside className="cx-side" aria-label={t("Preview")}>
          {apps.length > 0 && (
            <div className="cx-tabs" role="tablist" aria-label={t("Preview app")}>
              {apps.map((p) => <button key={p} type="button" role="tab" aria-selected={pApp === p} onClick={() => setPreviewApp(p)}><BrandIcon ch={p} size={16} />{NAMES[p]}</button>)}
            </div>
          )}
          {pApp && inApp(pApp).length > 1 && (
            <label className="cx-showing">{t("Showing")}
              <select className="np-input" value={pKey} onChange={(e) => setPreviewAcct(e.target.value)}>{inApp(pApp).map((k) => <option key={k} value={k}>{byKey.get(k)?.name}</option>)}</select>
            </label>
          )}
          {mounted && pApp && pKey ? <PhonePreview channel={pApp} caption={captionOf(pApp)} commentImage={(pApp === "facebook" && !fbDraft) || pApp === "threads" ? commentImageUrl : null} comment={pApp === "facebook" && fbDraft ? "" : commentOf(pApp)} video={videoUrl} who={who(pKey)} fbView={fbView} theme={theme} topic={topic} collaborators={collaborators} product={pApp === "shopee" ? productLabel(shopeePicked.find((a) => shopeeKey(a.id) === pKey), itemsFor, t) : undefined} /> : <div className="pv-phone"><div className="pv-scr" /></div>}
          {pApp === "facebook" && <Seg value={fbView} set={setFbView} items={[["reels", "Reels"], ["feed", t("Feed")]]} label={t("Facebook view")} />}
          {(pApp === "threads" || (pApp === "facebook" && fbView === "feed")) && <Seg value={theme} set={setTheme} items={[["light", t("Light")], ["dark", t("Dark")]]} label={t("App theme")} />}
          <p className="cx-note">{pApp ? t(PREVIEW_NOTE[pApp]) : t("Pick a channel to see its preview.")}</p>
          {notes.map(([text, good]) => <p key={text} className={good ? "cx-good" : "cx-warn"}>{text}</p>)}
        </aside>
      </form>

      {sheet === "channels" && <ChannelsSheet channels={channels} shopee={shopee} onDisconnect={disconnect} onCheck={check} onShopeeOff={shopeeOff} onShopeeCheck={shopeeCheck} onShopeeRename={shopeeRename} onClose={() => setSheet("")} />}
      {sheet === "brands" && <BrandsSheet brands={brands} channels={channels} byKey={byKey} connected={connected} onSaved={(b) => setBrands((list) => [...list.filter((x) => x.id !== b.id), b].sort((x, y) => x.name.localeCompare(y.name)))} onDeleted={(id) => setBrands((list) => list.filter((x) => x.id !== id))} onClose={() => setSheet("")} />}
    </>
  );
}

const PREVIEW_NOTE: Record<Channel, string> = {
  tiktok: tx("As it appears on the For You feed."),
  instagram: tx("As it appears in the Reels viewer. Follow shows for people who don't follow you yet."),
  facebook: tx("Facebook shares videos as Reels. Switch to Feed to see the same post in the News Feed."),
  threads: tx("As it appears in the Threads feed. The video lines up with the text."),
  shopee: tx("As it appears in Shopee Video. A shop's own product shows under the caption."),
};

/** A Shopee account's name in Rezekii: its own name for it, else the shop's name, else what it is. */
function shopeeName(a: PublicShopee, t: T): string {
  return a.nickname ?? a.name ?? (a.role === "seller" ? t("Shopee shop") : t("Shopee affiliate"));
}
/** Under the name: a shop, or an affiliate with its Shopee account number (Shopee gives apps no username for affiliates). */
function shopeeSub(a: PublicShopee, t: T): string {
  return a.role === "seller" ? t("Seller") : t("Affiliate · ID {id}", { id: a.shopee_user_id });
}
function productLabel(a: PublicShopee | undefined, itemsFor: (a: PublicShopee) => number[], t: T): string | undefined {
  const n = a ? itemsFor(a).length : 0;
  return !n ? undefined : n === 1 ? t("Product from your shop") : t("{n} products from your shop", { n });
}

/** Pick up to 6 of a shop's own products to show under its Shopee Video, from its live products on Shopee. */
function ShopeeProducts({ name, list, picked, onPick }: { name: string; list?: { items?: ShopeeItem[]; error?: string }; picked: number[]; onPick: (ids: number[]) => void }) {
  const t = useT();
  const [q, setQ] = useState("");
  const items = list?.items;
  const s = q.trim().toLowerCase();
  const shown = (items ?? []).filter((i) => !s || i.name.toLowerCase().includes(s) || String(i.itemId) === s);
  const toggle = (id: number) => onPick(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id].slice(0, 6));
  return (
    <div className="cx-field">
      <span className="cx-row"><b><BrandIcon ch="shopee" size={16} /> {t("Products on Shopee · {name}", { name })}</b><small className="np-muted">{t("{n} of 6 picked", { n: picked.length })}</small></span>
      {!list || (!items && !list.error) ? <p className="np-muted">{t("Loading the shop's products from Shopee…")}</p>
        : list.error ? <p className="np-error">{t(list.error)}</p>
        : !items?.length ? <p className="np-muted">{t("This shop has no live products on Shopee.")}</p>
        : (
          <>
            {items.length > 6 && <label className="cx-search">{SEARCH_ICON}<input className="np-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search {n} products", { n: items.length })} aria-label={t("Search products")} /></label>}
            <div className="cx-products">
              {shown.map((i) => (
                <label key={i.itemId} className="cx-check">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <span className="cx-face">{i.image ? <img src={i.image} alt="" /> : <ShopeeIcon size={26} />}</span>
                  <span><b>{i.name}</b></span>
                  <input type="checkbox" checked={picked.includes(i.itemId)} disabled={!picked.includes(i.itemId) && picked.length >= 6} onChange={() => toggle(i.itemId)} />
                </label>
              ))}
              {!shown.length && <p className="np-muted">{t("No product matches \"{query}\".", { query: q })}</p>}
            </div>
          </>
        )}
      <small className="np-muted">{t("They show under the video on Shopee. Only your own shop's products can be added.")}</small>
    </div>
  );
}

/** Notes under the phone where an app treats the post differently. [text, informational] */
function previewNotes(ch: Channel, caption: string, comment: string, hasLink: boolean, fbView: "reels" | "feed", s: { fbDraft: boolean; igFeed: boolean; igTrial: TrialMode; replies: ReplyControl; tagged: string[] }, t: T): [string, boolean][] {
  const out: [string, boolean][] = [];
  if (ch === "facebook" && s.fbDraft) out.push([t("Saved as a draft on the Page: nobody sees it until you publish it in Facebook. It shows like this once published."), true]);
  if (ch === "instagram" && !s.igFeed) out.push([t("Shows in the Reels tab only, not in the main feed."), true]);
  if (ch === "instagram" && s.tagged.length) out.push([t("Tagged: {users}.", { users: s.tagged.map((u) => `@${u}`).join(", ") }), true]);
  if (ch === "instagram" && s.igTrial !== "off") out.push([s.igTrial === "manual" ? t("Trial reel: shown to people who don't follow you first; you share it with followers yourself.") : t("Trial reel: shown to people who don't follow you first; Instagram shares it with followers if it does well."), true]);
  if (ch === "threads" && s.replies !== "everyone") out.push([t("Who can reply: {who}.", { who: t(REPLY_CONTROLS.find(([v]) => v === s.replies)?.[1] ?? "") }), true]);
  if (ch === "tiktok" && hasLink) out.push([t("The product link isn't added on TikTok: links in TikTok captions can't be tapped. The product goes in the yellow basket (beg kuning)."), false]);
  if (ch === "instagram" && links(caption).length) out.push([t("Instagram shows the link as plain text. It can't be tapped."), false]);
  if (ch === "instagram" && comment) out.push([t("The first comment goes out right after the Reel is published.") + (links(comment).length ? t(" Links in Instagram comments can't be tapped either.") : ""), true]);
  if (ch === "facebook" && fbView === "reels" && links(caption).length) out.push([t("Links in Facebook Reels captions can't be tapped.") + (s.fbDraft ? "" : t(" The link in the first comment can.")), false]);
  if (ch === "facebook" && (links(caption).length || links(comment).length)) out.push([t("Facebook is testing a limit of 2 posts or comments with links a month for Pages without Meta One. Over the limit, links may not be tappable."), false]);
  if (ch === "facebook" && comment && !s.fbDraft) out.push([t("The first comment goes out from the Page right after posting."), true]);
  if (ch === "threads" && comment) out.push([t("The first comment goes out as your own reply under the post, right after it's published."), true]);
  return out;
}

function ChannelPane(p: { ch: Channel; name: string; text: string; edited: boolean; captionLength: number; linkAdded: boolean; place: Placement; comment: string; commentEdited: boolean; onText: (v: string) => void; onResetText: () => void; onPlace: (p: Placement) => void; onComment: (v: string) => void; onResetComment: () => void; extra?: ReactNode }) {
  const t = useT();
  const tt = p.ch === "tiktok";
  const shopee = p.ch === "shopee";
  return (
    <>
      <div className="cx-row"><b>{t("{name} caption", { name: p.name })}</b>{p.edited ? <button type="button" className="cx-link" onClick={p.onResetText}>{t("Use Rezekii's version")}</button> : <small className="np-muted">{t("Rezekii's version · edit to change")}</small>}</div>
      <textarea className="np-input" rows={5} value={p.text} onChange={(e) => p.onText(e.target.value)} aria-label={t("{name} caption", { name: p.name })} />
      <span className={`np-count${p.captionLength > CAPTION_MAX[p.ch] ? " over" : ""}`}>{p.captionLength.toLocaleString("en-US")} / {CAPTION_MAX[p.ch].toLocaleString("en-US")}{p.linkAdded ? t(" · the link is added at the end") : ""}</span>
      {p.extra}
      {!shopee && <div className="cx-row" style={{ justifyContent: "flex-start" }}>
        <small className="np-muted">{t("Product link")}</small>
        <button type="button" className="cx-chip" disabled={tt} aria-pressed={p.place.caption} onClick={() => p.onPlace({ ...p.place, caption: !p.place.caption })}>{p.place.caption ? "✓ " : ""}{t("In the caption")}</button>
        <button type="button" className="cx-chip" disabled={tt} aria-pressed={p.place.comment} onClick={() => p.onPlace({ ...p.place, comment: !p.place.comment })}>{p.place.comment ? "✓ " : ""}{t("In the first comment")}</button>
      </div>}
      {shopee ? (
        <p className="cx-info">{t("Shopee captions are 150 characters and can't hold links, and Shopee doesn't let apps post comments. A shop's own product from Product link shows under the video instead.")}</p>
      ) : tt ? (
        <p className="cx-info">{t("TikTok captions can't hold a link that people can tap, and TikTok doesn't let apps post comments, so the link stays off. The product goes in the yellow basket (beg kuning).")}</p>
      ) : (
        <>
          <div className="cx-row"><b>{t("First comment")}</b>{p.commentEdited ? <button type="button" className="cx-link" onClick={p.onResetComment}>{t("Use Rezekii's version")}</button> : <small className="np-muted">{t("Optional · posted right after the post")}</small>}</div>
          <textarea className="np-input" rows={3} value={p.comment} onChange={(e) => p.onComment(e.target.value)} placeholder={t("Optional. Posted as your first comment right after the post goes out.")} aria-label={t("{name} first comment", { name: p.name })} />
          <span className="np-count">{lengthFor(p.ch, p.comment).toLocaleString("en-US")} / {COMMENT_MAX[p.ch as Platform].toLocaleString("en-US")}</span>
          {p.ch === "instagram" && (p.place.caption || p.place.comment) && <p className="cx-warn">{t("Links can't be tapped on Instagram, in captions or in comments.")}</p>}
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

/**
 * Channels: everything connected, grouped by app, with a search for long lists of Pages. Each channel can be checked now,
 * reconnected when the app stopped accepting it, or disconnected.
 */
function ChannelsSheet({ channels, shopee, onDisconnect, onCheck, onShopeeOff, onShopeeCheck, onShopeeRename, onClose }: { channels: Ch[]; shopee: PublicShopee[] | null; onDisconnect: (c: Ch) => Promise<void>; onCheck: (c: Ch) => Promise<void>; onShopeeOff: (s: PublicShopee, name: string) => Promise<void>; onShopeeCheck: (s: PublicShopee, name: string) => Promise<void>; onShopeeRename: (s: PublicShopee, nickname: string) => Promise<void>; onClose: () => void }) {
  const t = useT();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const run = (c: Ch, what: string, fn: (c: Ch) => Promise<void>) => {
    setBusy(c.key + what);
    fn(c).finally(() => setBusy(""));
  };
  const s = q.trim().toLowerCase();
  const nameOf = (a: PublicShopee) => shopeeName(a, t);
  const shopeeList = (shopee ?? []).filter((a) => !s || `${nameOf(a)} ${a.shopee_user_id} shopee`.toLowerCase().includes(s));
  const runShopee = (a: PublicShopee, what: string, fn: (s: PublicShopee, name: string) => Promise<void>) => {
    setBusy(a.id + what);
    fn(a, nameOf(a)).finally(() => setBusy(""));
  };
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const saveName = (a: PublicShopee) => {
    const value = renaming?.id === a.id ? renaming.value : null;
    setRenaming(null);
    if (value !== null && value.trim() !== (a.nickname ?? "")) void onShopeeRename(a, value);
  };
  return (
    <Sheet title={t("Channels")} onClose={onClose}>
      <p className="np-muted">{t("Connect once, then pick the channel whenever you post. You sign in on each app's own page; Rezekii never sees your password.")}</p>
      {channels.length > 8 && <label className="cx-search">{SEARCH_ICON}<input className="np-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search {n} channels", { n: channels.length })} aria-label={t("Search channels")} /></label>}
      {SIGN_IN_APPS.map((p) => {
        const list = channels.filter((c) => c.app === p && (!s || `${c.name} ${c.sub}`.toLowerCase().includes(s)));
        if (s && !list.length) return null;
        return (
          <div key={p} className="cx-group">
            <span className="cx-gh"><BrandIcon ch={p} size={16} />{NAMES[p]}{list.length ? ` · ${list.length}` : ""}</span>
            {list.map((c) => (
              <div key={c.key} className="cx-ch">
                <Face ch={c} />
                <span><b>{c.name}</b><small>{c.sub}{c.status === "reconnect" ? t(" · needs reconnecting") : ""}</small></span>
                <div className="cx-acts">
                  {c.status === "reconnect" ? (
                    <a className="np-btn" href={c.app === "tiktok" ? "/api/auth/tiktok/start" : `/api/auth/meta/${c.app}/start`}>{t("Reconnect")}</a>
                  ) : (
                    <button type="button" className="btn-outline" disabled={!!busy} onClick={() => run(c, "check", onCheck)}>{busy === c.key + "check" ? t("Checking…") : t("Check now")}</button>
                  )}
                  <button type="button" className="cx-link cx-off" disabled={!!busy} onClick={() => run(c, "off", onDisconnect)}>{busy === c.key + "off" ? t("Disconnecting…") : t("Disconnect")}</button>
                </div>
              </div>
            ))}
            {!s && <div className="cx-ch"><BrandIcon ch={p} size={34} /><span><b>{list.length ? t("Add {unit}", { unit: t(UNIT[p]) }) : t("Connect {app}", { app: NAMES[p] })}</b><small>{p === "facebook" ? t("Pick which Pages after signing in") : p === "instagram" ? t("Business or Creator account") : p === "threads" ? t("Your Threads profile") : t("Your TikTok account")}</small></span><a className="np-btn" href={p === "tiktok" ? "/api/auth/tiktok/start" : `/api/auth/meta/${p}/start`}>{t("Connect")}</a></div>}
          </div>
        );
      })}
      {shopee && (!s || shopeeList.length > 0) && (
        <div className="cx-group">
          <span className="cx-gh"><ShopeeIcon size={16} />Shopee{shopeeList.length ? ` · ${shopeeList.length}` : ""}</span>
          {shopeeList.length > 0 && !s && <small className="np-muted">{t("Double-click a name to rename it in Rezekii, e.g. to your Shopee username.")}</small>}
          {shopeeList.map((a) => (
            <div key={a.id} className="cx-ch">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <span className="cx-face">{a.avatar_url ? <img src={a.avatar_url} alt="" /> : <ShopeeIcon size={26} />}</span>
              <span>
                {renaming?.id === a.id
                  ? <input className="np-input" value={renaming.value} maxLength={60} autoFocus onChange={(e) => setRenaming({ id: a.id, value: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") saveName(a); if (e.key === "Escape") setRenaming(null); }} onBlur={() => saveName(a)} placeholder={a.name ?? (a.role === "seller" ? t("Shopee shop") : t("Shopee affiliate"))} aria-label={t("Name in Rezekii")} />
                  : <b onDoubleClick={() => setRenaming({ id: a.id, value: a.nickname ?? "" })} title={t("Double-click to rename")}>{nameOf(a)}</b>}
                <small>{shopeeSub(a, t)}{a.status === "reconnect" ? t(" · needs reconnecting") : ""}</small>
              </span>
              <div className="cx-acts">
                {a.status === "reconnect" ? (
                  <a className="np-btn" href={`/api/auth/shopee/start?role=${a.role}`}>{t("Reconnect")}</a>
                ) : (
                  <button type="button" className="btn-outline" disabled={!!busy} onClick={() => runShopee(a, "check", onShopeeCheck)}>{busy === a.id + "check" ? t("Checking…") : t("Check now")}</button>
                )}
                <button type="button" className="cx-link cx-off" disabled={!!busy} onClick={() => runShopee(a, "off", onShopeeOff)}>{busy === a.id + "off" ? t("Disconnecting…") : t("Disconnect")}</button>
              </div>
            </div>
          ))}
          {!s && (
            <div className="cx-ch">
              <ShopeeIcon size={34} />
              <span><b>{shopeeList.length ? t("Add {unit}", { unit: t("accounts") }) : t("Connect {app}", { app: "Shopee" })}</b><small>{t("Sellers sign in as their shop, affiliates with their own Shopee account. Before the first post from Rezekii, post one video from Seller Centre on a computer and tick Shopee Video's terms.")}</small></span>
              <div className="cx-acts">
                <a className="np-btn" href="/api/auth/shopee/start?role=seller">{t("Seller")}</a>
                <a className="np-btn" href="/api/auth/shopee/start?role=affiliate">{t("Affiliate")}</a>
              </div>
            </div>
          )}
        </div>
      )}
      <p className="np-muted">{t("Facebook Groups can't be added: Meta closed posting to Groups for all apps in 2024.")}</p>
      <button type="button" className="np-btn" onClick={onClose}>{t("Done")}</button>
    </Sheet>
  );
}

/** Brands: create, rename, change channels, delete. A channel can be in more than one brand. */
function BrandsSheet({ brands, channels, byKey, connected, onSaved, onDeleted, onClose }: { brands: Brand[]; channels: Ch[]; byKey: Map<string, Ch>; connected: Set<string>; onSaved: (b: Brand) => void; onDeleted: (id: string) => void; onClose: () => void }) {
  const t = useT();
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
    if (!r?.ok || !d.brand) return setError(t(d.error ?? tx("Couldn't save the brand. Try again.")));
    onSaved(d.brand);
    setEdit(null);
  }
  async function remove() {
    if (!edit?.id) return;
    setBusy(true);
    const r = await fetch(`/api/social/brands/${edit.id}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (!r?.ok) return setError(t("Couldn't delete the brand. Try again."));
    onDeleted(edit.id);
    setEdit(null);
  }

  if (edit) {
    const s = q.trim().toLowerCase();
    const toggle = (k: string) => setEdit((e) => (e ? { ...e, channels: e.channels.includes(k) ? e.channels.filter((x) => x !== k) : [...e.channels, k] } : e));
    return (
      <Sheet title={edit.id ? t("Edit brand") : t("New brand")} extra={<button type="button" className="cx-link" onClick={() => setEdit(null)}>{t("Back")}</button>} onClose={onClose}>
        <label className="cx-field"><b>{t("Brand name")}</b><input className="np-input" type="text" value={edit.name} maxLength={60} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder={t("e.g. Spinelief+")} autoFocus /></label>
        <p className="np-muted">{edit.channels.length === 1 ? t("{n} channel in this brand. A channel can be in more than one brand.", { n: 1 }) : t("{n} channels in this brand. A channel can be in more than one brand.", { n: edit.channels.length })}</p>
        {channels.length > 8 && <label className="cx-search">{SEARCH_ICON}<input className="np-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search {n} channels", { n: channels.length })} aria-label={t("Search channels")} /></label>}
        {SIGN_IN_APPS.map((p) => {
          const list = channels.filter((c) => c.app === p && (!s || `${c.name} ${c.sub}`.toLowerCase().includes(s)));
          return list.length ? (
            <div key={p} className="cx-group">
              <span className="cx-gh"><BrandIcon ch={p} size={16} />{NAMES[p]}</span>
              {list.map((c) => <label key={c.key} className="cx-check"><Face ch={c} /><span><b>{c.name}</b><small>{c.sub}{c.status === "reconnect" ? t(" · needs reconnecting") : ""}</small></span><input type="checkbox" checked={edit.channels.includes(c.key)} onChange={() => toggle(c.key)} /></label>)}
            </div>
          ) : null;
        })}
        {error && <p className="np-error" role="alert">{error}</p>}
        <button type="button" className="np-btn" disabled={busy || !edit.name.trim() || !edit.channels.length} onClick={save}>{busy ? t("Saving…") : t("Save brand")}</button>
        {edit.id && (confirmDelete
          ? <div className="cx-row"><span className="np-muted">{t("Delete \"{name}\"? Its channels stay connected.", { name: edit.name })}</span><span className="cx-links"><button type="button" className="cx-link cx-danger" disabled={busy} onClick={remove}>{t("Delete")}</button><button type="button" className="cx-link" onClick={() => setConfirmDelete(false)}>{t("Keep")}</button></span></div>
          : <button type="button" className="cx-link cx-danger" onClick={() => setConfirmDelete(true)}>{t("Delete brand")}</button>)}
      </Sheet>
    );
  }

  return (
    <Sheet title={t("Brands")} extra={<button type="button" className="cx-link" onClick={() => open({ name: "", channels: [] })}>{t("+ New brand")}</button>} onClose={onClose}>
      <p className="np-muted">{t("Group the channels you post to together. Picking a brand in New post switches all of them on.")}</p>
      {brands.map((b) => {
        const live = brandChannels(b.channels, connected);
        const bApps = APPS.filter((p) => live.some((k) => byKey.get(k)?.app === p));
        return (
          <div key={b.id} className="cx-ch">
            <span className="cx-faces">{live.slice(0, 3).map((k) => { const c = byKey.get(k); return c ? <Face key={k} ch={c} badge={false} /> : null; })}</span>
            <span><b>{b.name}</b><small>{live.length === 1 ? t("{n} channel", { n: 1 }) : t("{n} channels", { n: live.length })} · {bApps.map((p) => NAMES[p]).join(", ") || t("none connected")}</small></span>
            <button type="button" className="btn-outline" onClick={() => open(b)}>{t("Edit")}</button>
          </div>
        );
      })}
      {!brands.length && <p className="np-muted">{t("No brands yet. Tap \"+ New brand\" to make your first one.")}</p>}
      <button type="button" className="np-btn" onClick={onClose}>{t("Done")}</button>
    </Sheet>
  );
}
