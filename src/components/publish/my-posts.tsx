"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Seg, Sheet, Tip, Title } from "@/components/ui";
import { CalendarPicker, dayName } from "@/components/calendar-picker";
import { PlatformIcon } from "@/components/creator2/bits";
import { POST_CREDITS, type MyPost, type PostStatus, type PostTarget, type PublishSetup } from "@/lib/mock-publish";
import { product } from "@/lib/mock";
import { IDEA_DRAFTS, type IdeaDraft } from "@/components/creator1/shoot-today";
import { openPost, takeEdits } from "./post-edits";
import { cancelChannel, loadPosts, retryChannel, retryComment } from "@/lib/live-publish";
import { ICON, NAMES, type Channel } from "./rules";
import { useLang, useT } from "@/lib/i18n/client";
import { dateLocale, tx, type Lang, type T } from "@/lib/i18n/lang";
import { rich } from "./rich";
import { AccountFace } from "./account-face";
import "@/app/creator2.css";
import "@/app/publish.css";

/** Today in the sample preview: Wednesday 28 October 2026, 9:15 AM Malaysia time. */
const SAMPLE_TODAY = "2026-10-28";
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const add = (s: string, n: number) => { const d = new Date(`${s}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dow = (s: string) => new Date(`${s}T00:00:00Z`).getUTCDay();
/** Dates and times in her language (owner, 3 Nov 2026): English as before; Malay and Chinese from the browser's own dates. */
const inLang = (s: string, lang: Lang, o: Intl.DateTimeFormatOptions) => new Date(`${s}T00:00:00Z`).toLocaleDateString(dateLocale(lang), { ...o, timeZone: "UTC" });
/** "28 Oct". */
const dayShort = (s: string, lang: Lang) => (lang === "en" ? dayName(s) : inLang(s, lang, { day: "numeric", month: "short" }));
const dayLabelOn = (s: string, today: string, lang: Lang, t: T) =>
  s === today ? t("Today") : s === add(today, 1) ? t("Tomorrow") : s === add(today, -1) ? t("Yesterday")
    : lang === "en" ? `${DOW[dow(s)]} ${dayName(s)}` : inLang(s, lang, { weekday: "short", day: "numeric", month: "short" });
/** Today in Malaysia, for real posts (owner, 31 Oct 2026). */
const mytToday = () => new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
const clock = (time: string, lang: Lang) => {
  const [h, m] = time.split(":").map(Number);
  return lang === "en" ? `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}` : new Date(Date.UTC(2026, 0, 1, h, m)).toLocaleTimeString(dateLocale(lang), { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
};
/** The overview's day heading: "Mon" over "24". */
const dayHead = (s: string, lang: Lang) => (lang === "en" ? DOW[dow(s)] : inLang(s, lang, { weekday: "short" }));
const OV_APPS: Channel[] = ["tiktok", "facebook", "instagram", "threads", "shopee"];
const PAGE_ROWS = 5;
const views = (n = 0) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n));

const PRESETS: [string, string][] = [["around", tx("Last 7 & next 7 days")], ["today", tx("Today")], ["next7", tx("Next 7 days")], ["week", tx("This week")], ["last7", tx("Last 7 days")], ["month", tx("This month")], ["last30", tx("Last 30 days")]];
/** The date presets around a given today. */
function rangesFor(t: string): Record<string, [string, string]> {
  const monday = add(t, -((dow(t) + 6) % 7));
  const [y, m] = t.split("-").map(Number);
  const monthEnd = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return {
    around: [add(t, -7), add(t, 7)], today: [t, t], next7: [t, add(t, 6)], week: [monday, add(monday, 6)],
    last7: [add(t, -6), t], month: [`${t.slice(0, 7)}-01`, monthEnd], last30: [add(t, -29), t],
  };
}

/**
 * How a post is doing overall, which decides its group and colour. Four statuses (owner, 1 Nov 2026): Scheduled, Posted, Needs
 * You and Drafts; a post on its way out is still Scheduled ("posting now" is a moment, not a status).
 */
type Group = "fail" | "sched" | "draft" | "done";
const MOVING: PostStatus[] = ["uploading", "sending", "processing"];
const groupOf = (p: MyPost): Group =>
  p.targets.some((t) => t.status === "failed") ? "fail"
    : p.targets.some((t) => MOVING.includes(t.status)) ? "sched"
    : p.targets.every((t) => t.status === "draft") ? "draft"
    : p.targets.some((t) => t.status === "scheduled") ? "sched"
    : "done";
const GROUPS: { key: Group; title: string; tone: string; icon: "alert" | "send" | "clock" | "edit" | "check" }[] = [
  { key: "sched", title: tx("Scheduled"), tone: "violet", icon: "clock" },
  { key: "done", title: tx("Posted"), tone: "green", icon: "check" },
  { key: "fail", title: tx("Needs You"), tone: "red", icon: "alert" },
  { key: "draft", title: tx("Drafts"), tone: "gray", icon: "edit" },
];

/** V1's live statuses, per app. */
function statusText(s: PostStatus, app: Channel, t: T) {
  switch (s) {
    case "draft": return t("Draft");
    case "scheduled": return t("Scheduled");
    case "uploading": return t("Uploading video");
    case "sending": return app === "tiktok" ? t("Sending to TikTok") : t("Publishing to {app}", { app: NAMES[app] });
    case "processing": return t("{app} is processing", { app: NAMES[app] });
    case "posted": return t("Posted · live");
    case "inbox": return t("In your TikTok drafts");
    case "failed": return t("Failed");
    case "removed": return t("Deleted after posting");
    case "pagedraft": return t("Draft on your Page");
  }
}
/** The steps a post goes through, for the little progress track. */
const STEPS: PostStatus[] = ["scheduled", "uploading", "sending", "processing", "posted"];
const next = (s: PostStatus): PostStatus => STEPS[Math.min(STEPS.indexOf(s) + 1, STEPS.length - 1)];

/**
 * Content calendar (owner, 28 Oct 2026): every post with each app's live status, V1-style, for any dates from the same
 * picker as Analytics. Scheduled posts and drafts can be edited or cancelled right here; a failed app can be retried.
 */
export function MyPosts({ setup, posts: start, newPost }: { setup: PublishSetup; posts: MyPost[]; newPost: string }) {
  const { toast } = useDemo();
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [posts, setPosts] = useState(start);
  // Signed in (owner, 31 Oct 2026): her real posts, real dates, and Cancel / Try again that really happen.
  const live = !!setup.live;
  const TODAY = live ? mytToday() : SAMPLE_TODAY;
  const RANGE = rangesFor(TODAY);
  const dayLabel = (s: string) => dayLabelOn(s, TODAY, lang, t);
  const reload = () => loadPosts().then(setPosts).catch(() => toast(t("Couldn't refresh your posts.")));
  // Changes saved on the New Post page replace the old version of each post (owner, 28 Oct 2026).
  useEffect(() => {
    const { edits, message } = takeEdits();
    if (Object.keys(edits).length) setPosts((all) => [...Object.values(edits).filter((e) => !all.some((p) => p.id === e.id)), ...all.map((p) => edits[p.id] ?? p)]);
    if (message) toast(message);
  }, [toast]);
  // Drafts made in Today's Ideas (creator only; preview keeps them in this browser tab).
  useEffect(() => {
    try {
      const drafts: IdeaDraft[] = JSON.parse(sessionStorage.getItem(IDEA_DRAFTS) ?? "[]");
      const first = setup.channels.find((c) => c.status === "active");
      if (live || !drafts.length || !first || !newPost.startsWith("/app/")) return;
      setPosts((all) => [
        ...drafts.filter((d) => !all.some((p) => p.id === d.id)).map((d) => ({ id: d.id, date: "", time: "", caption: d.idea, comment: "", cover: product(d.productId).img, seconds: 0, targets: [{ key: first.key, status: "draft" as const }] })),
        ...all,
      ]);
    } catch {}
  }, [setup.channels, newPost, live]);
  // The whole month by default (owner, 1 Nov 2026), nothing hidden.
  const [preset, setPreset] = useState<string | null>("month");
  const [[from, to], setRange] = useState<[string, string]>(RANGE.month);
  const [only, setOnly] = useState<Group | null>(null);
  const [day, setDay] = useState<string | null>(null);
  // Filter by page (owner, 23 Nov 2026: "very difficult for us to search for pages"): one or more of her accounts.
  const [pages, setPages] = useState<string[]>([]);
  const [pagesOpen, setPagesOpen] = useState(false);
  const [pageQ, setPageQ] = useState("");
  const [allPages, setAllPages] = useState(false);
  const [openCaps, setOpenCaps] = useState<Record<string, boolean>>({});
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);
  // Owner, 28 Oct 2026: posts she made from her phone show here too, marked, so the calendar is the whole picture.
  const [src, setSrc] = useState<"all" | "rezekii" | "phone">("all");
  const srcOk = (p: MyPost) => src === "all" || (src === "phone") === (p.source === "phone");
  // Show one brand's posts: any post that went to one of its channels (owner, 21 Nov 2026, as on rezekii.com).
  const [brand, setBrand] = useState<string | null>(null);
  const brandNow = setup.brands.find((b) => b.id === brand);
  const brandOk = (p: MyPost) => !brandNow || p.targets.some((tg) => brandNow.channels.includes(tg.key));
  const pageOk = (p: MyPost) => !pages.length || p.targets.some((tg) => pages.includes(tg.key));
  const togglePage = (k: string) => setPages((ps) => (ps.includes(k) ? ps.filter((x) => x !== k) : [...ps, k]));

  // Posts going out move one step every couple of seconds, like V1's status updates while TikTok works on them.
  const moving = posts.some((p) => p.targets.some((tg) => MOVING.includes(tg.status)));
  // Real posts: while one is going out, check its status again every 15 seconds.
  useEffect(() => {
    if (!live || !moving) return;
    const id = window.setInterval(reload, 15_000);
    return () => window.clearInterval(id);
  }, [live, moving]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (live || !moving) return;
    const id = window.setInterval(() => {
      setPosts((all) => all.map((p) => {
        if (!p.targets.some((tg) => MOVING.includes(tg.status))) return p;
        const targets = p.targets.map((tg) => (MOVING.includes(tg.status) ? { ...tg, status: next(tg.status) } : tg));
        // The next app starts uploading once the first ones are processing.
        const started = targets.map((tg, i) => (tg.status === "scheduled" && i > 0 && targets[i - 1].status === "processing" ? { ...tg, status: "uploading" as const } : tg));
        return { ...p, targets: started };
      }));
    }, 3500);
    return () => window.clearInterval(id);
  }, [moving, live]);

  const chan = (key: string) => setup.channels.find((c) => c.key === key);
  const appOf = (tg: PostTarget): Channel => chan(tg.key)?.app ?? "facebook";
  const inRange = (p: MyPost) => !p.date || (p.date >= from && p.date <= to);
  const shown = posts.filter((p) => srcOk(p) && brandOk(p) && pageOk(p) && inRange(p) && (!day || p.date === day) && (!only || groupOf(p) === only));
  const count = (g: Group) => posts.filter((p) => srcOk(p) && brandOk(p) && pageOk(p) && inRange(p) && groupOf(p) === g).length;
  // Each post's apps, only the picked pages when a page filter is on.
  const targetsOf = (p: MyPost) => (pages.length ? p.targets.filter((tg) => pages.includes(tg.key)) : p.targets);
  const inView = posts.filter((p) => srcOk(p) && brandOk(p) && pageOk(p) && inRange(p));

  // By page (owner, 23 Nov 2026): for each page, posted today, scheduled and failed in these dates.
  const perPage = new Map<string, { today: number; sched: number; fail: number }>();
  for (const p of inView) for (const tg of targetsOf(p)) {
    const r = perPage.get(tg.key) ?? { today: 0, sched: 0, fail: 0 };
    if (tg.status === "posted" && p.date === TODAY) r.today++;
    else if (tg.status === "scheduled" || MOVING.includes(tg.status)) r.sched++;
    else if (tg.status === "failed") r.fail++;
    perPage.set(tg.key, r);
  }
  const pageRows = [...perPage].filter(([, r]) => r.today + r.sched + r.fail > 0).sort((a, b) => b[1].sched + b[1].today + b[1].fail - (a[1].sched + a[1].today + a[1].fail));

  // Schedule overview (owner, 23 Nov 2026): how many videos go out each day, per app, across these dates.
  const days: string[] = [];
  for (let d = from; d <= to && days.length < 62; d = add(d, 1)) days.push(d);
  const onDay = (app: Channel | null, d: string) => inView.filter((p) => p.date === d).reduce((n, p) => n + targetsOf(p).filter((tg) => tg.status !== "draft" && (!app || appOf(tg) === app)).length, 0);
  const ovApps = OV_APPS.filter((a) => days.some((d) => onDay(a, d) > 0));
  const SOURCES = [["all", t("All")], ["rezekii", t("Via Rezekii")], ["phone", t("From Phone")]] as const;
  const needs = count("fail");

  const choose = (a: string, b: string, key: string | null) => { setRange([a, b]); setPreset(key); setDay(null); };
  const range = `${dayShort(from, lang)} – ${dayShort(to, lang)}`;
  const label = preset ? t(PRESETS.find(([k]) => k === preset)![1]) : range;

  const setTarget = (postId: string, key: string, patch: Partial<PostTarget>) =>
    setPosts((all) => all.map((p) => (p.id !== postId ? p : { ...p, targets: p.targets.map((tg) => (tg.key === key ? { ...tg, ...patch } : tg)) })));
  const fix = (p: MyPost, tg: PostTarget) => {
    const name = `${NAMES[appOf(tg)]} ${chan(tg.key)?.name ?? ""}`.trim();
    if (live && tg.postId) {
      retryChannel(appOf(tg), tg.postId, t).then(() => { toast(t("Trying {name} again. {n} credits", { name, n: POST_CREDITS })); reload(); }).catch((e: unknown) => toast(e instanceof Error ? t(e.message) : t("Couldn't try again.")));
      return;
    }
    toast(tg.fix === "Reconnect" ? t("{name} reconnected. Posting again… {n} credits", { name, n: POST_CREDITS }) : t("Trying {name} again… {n} credits", { name, n: POST_CREDITS }));
    setTarget(p.id, tg.key, { status: "uploading", reason: undefined, fix: undefined });
  };
  // The post went out but its first comment didn't: send just the comment again (owner, 21 Nov 2026, as on rezekii.com).
  const resend = (tg: PostTarget) => {
    if (!tg.postId || resending) return;
    setResending(tg.postId);
    retryComment(tg.postId, t)
      .then(() => { toast(t("Posting the first comment again.")); reload(); })
      .catch((e: unknown) => toast(e instanceof Error ? t(e.message) : t("Couldn't retry the comment. Please try again.")))
      .finally(() => setResending(null));
  };
  const cancel = (p: MyPost) => {
    if (live) {
      const go = p.targets.filter((tg) => tg.canCancel && tg.postId);
      Promise.all(go.map((tg) => cancelChannel(appOf(tg), tg.postId!, t)))
        .then(() => toast(t("Cancelled. Its credits come back to your wallet.")))
        .catch((e: unknown) => toast(e instanceof Error ? t(e.message) : t("Couldn't cancel.")))
        .finally(() => { setCancelling(null); reload(); });
      return;
    }
    setPosts((all) => all.map((x) => (x.id !== p.id ? x : { ...x, date: "", time: "", targets: x.targets.map((tg) => ({ ...tg, status: "draft" as const })) })));
    setCancelling(null);
    toast(t("Cancelled. {n} credits refunded; moved to drafts.", { n: p.targets.length * POST_CREDITS }));
  };

  // Reuse (owner, 21 Nov 2026, as on rezekii.com): New Post filled in like this post; she adds a new video or photos.
  const reuse = (p: MyPost) => router.push(`${newPost}?reuse=${encodeURIComponent(p.id)}`);

  const row = (p: MyPost) => {
    const g = groupOf(p);
    // Real posts can be cancelled here while scheduled; editing them comes later.
    const editable = live ? g === "sched" && p.targets.some((tg) => tg.canCancel) : g === "sched" || g === "draft";
    const link = p.targets.find((tg) => tg.permalink)?.permalink;
    return (
      <li key={p.id} className={`sq-post ${g}`}>
        <span className="sq-cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.preview ? <Preview url={p.preview.url} type={p.preview.type} /> : p.cover ? <img src={p.cover} alt="" /> : <span style={{ display: "grid", placeItems: "center", width: "100%", height: "100%" }}><Icon name="video" size={22} /></span>}
          {p.seconds > 0 && <small>{Math.floor(p.seconds / 60)}:{String(p.seconds % 60).padStart(2, "0")}</small>}
        </span>
        <span className="sq-body">
          <span className="sq-when">
            {p.date ? <><b>{dayLabel(p.date)}</b> · {clock(p.time, lang)}</> : <b>{t("No time yet")}</b>}
            <span className={`sq-src${p.source === "phone" ? " phone" : ""}`}>{p.source === "phone" ? <><Icon name="phone" size={12} /> {t("From Phone")}</> : t("Via Rezekii")}</span>
          </span>
          {/* Two lines, the rest on More (owner, 23 Nov 2026: "the description is too long"). */}
          <strong className={`sq-cap${openCaps[p.id] ? "" : " clamp"}`}>{p.caption}</strong>
          {p.caption.length > 90 && <button type="button" className="pb-link sq-more" onClick={() => setOpenCaps((o) => ({ ...o, [p.id]: !o[p.id] }))}>{openCaps[p.id] ? t("Less") : t("More")}</button>}
          <span className="sq-targets">
            {targetsOf(p).map((tg) => {
              const app = appOf(tg);
              const c = chan(tg.key);
              const step = STEPS.indexOf(tg.status);
              return (
                <span key={tg.key} className={`sq-t ${tg.status}`}>
                  <span className="sq-t-app"><PlatformIcon name={ICON[app]} size={18} /><span>{c?.name ?? NAMES[app]}</span></span>
                  <span className="sq-pill">{MOVING.includes(tg.status) && <i className="sq-spin" aria-hidden="true" />}{tg.status === "posted" && <i className="sq-live" aria-hidden="true" />}{statusText(tg.status, app, t)}</span>
                  {MOVING.includes(tg.status) && <span className="sq-track" aria-hidden="true">{STEPS.slice(1).map((s, i) => <i key={s} className={i + 1 <= step ? "on" : ""} />)}</span>}
                  {tg.status === "posted" && tg.views ? <small className="sq-views"><Icon name="eye" size={13} /> {t("{n} views", { n: views(tg.views) })}</small> : null}
                  {tg.commentFailed && (
                    <span className="sq-why">
                      <small>{tg.reason}</small>
                      <button type="button" className="btn-outline v2-btn-sm" disabled={!!resending} onClick={() => resend(tg)}>{t("Retry Comment")}</button>
                    </span>
                  )}
                  {tg.status === "failed" && (
                    <span className="sq-why">
                      {/* Why it failed is from TikTok or the app (or the sample), shown in her language where Rezekii knows the words. */}
                      <small>{tg.fix || !live ? t("{reason} · {n} credits returned", { reason: t(tg.reason ?? ""), n: POST_CREDITS }) : t(tg.reason ?? "")}</small>
                      {(tg.fix || !live) && <button type="button" className={tg.fix === "Reconnect" ? "np-btn v2-btn-sm" : "btn-outline v2-btn-sm"} onClick={() => fix(p, tg)}>{tg.fix === "Reconnect" ? t("Reconnect") : t("Retry")}</button>}
                    </span>
                  )}
                </span>
              );
            })}
          </span>
          {editable && (cancelling === p.id ? (
            <span className="sq-confirm" role="alert">
              <span>{g === "draft" ? t("Delete this draft?") : t("Cancel this post? It moves to Drafts.")}</span>
              <button type="button" className="btn-outline v2-btn-sm" onClick={() => setCancelling(null)}>{t("Keep It")}</button>
              <button type="button" className="sq-danger v2-btn-sm" onClick={() => (g === "draft" ? (setPosts((all) => all.filter((x) => x.id !== p.id)), toast(t("Draft deleted"))) : cancel(p))}>{g === "draft" ? t("Delete") : t("Cancel Post")}</button>
            </span>
          ) : (
            <span className="sq-acts">
              {/* A real post opens New Post filled in from the server (as on rezekii.com); the preview's sample through this tab. */}
              <button type="button" className="btn-outline v2-btn-sm" onClick={() => { if (!live) openPost(p); router.push(`${newPost}?edit=${encodeURIComponent(p.id)}`); }}><Icon name="edit" size={15} /> {t("Edit")}</button>
              {live && <button type="button" className="sq-ghost v2-btn-sm" onClick={() => reuse(p)}>{t("Reuse")}</button>}
              <button type="button" className="sq-ghost v2-btn-sm" onClick={() => setCancelling(p.id)}>{g === "draft" ? t("Delete") : t("Cancel")}</button>
            </span>
          ))}
          {g === "done" && !live && <span className="sq-acts"><button type="button" className="sq-ghost v2-btn-sm" onClick={() => toast(t("Preview: opens the post in the app"))}>{t("View Post")} <Icon name="arrow" size={14} /></button></span>}
          {live && !editable && (
            <span className="sq-acts">
              <button type="button" className="sq-ghost v2-btn-sm" onClick={() => reuse(p)}>{t("Reuse")}</button>
              {g === "done" && link && <a className="sq-ghost v2-btn-sm" href={link} target="_blank" rel="noopener noreferrer">{t("View Post")} <Icon name="arrow" size={14} /></a>}
            </span>
          )}
        </span>
      </li>
    );
  };

  return (
    <div className="v2-stack v2-in sq-page" style={{ gap: 18 }}>
      <Title title={t("Content Calendar")} sub={t("Every post and its status · Malaysia time")}>
        <CalendarPicker
          compact
          label={label}
          sub={range}
          today={TODAY}
          first={live ? add(TODAY, -180) : "2026-09-01"}
          last={live ? add(TODAY, 90) : "2026-12-31"}
          from={from}
          to={to}
          onRange={(a, b) => choose(a, b, null)}
          presets={PRESETS.map(([k, l]) => [k, t(l)])}
          preset={preset}
          onPreset={(k) => choose(RANGE[k][0], RANGE[k][1], k)}
        />
      </Title>
      <p className="an-range"><b>{label}</b><span>{range}</span></p>

      {needs > 0 && only !== "fail" && (
        <div className="sq-phonebar">
          <button type="button" className="sq-alert" onClick={() => { setOnly("fail"); setDay(null); }}>
            <Icon name="alert" size={17} /><span>{needs === 1 ? t("{n} post needs you", { n: 1 }) : t("{n} posts need you", { n: needs })}</span><b>{t("Fix")}</b>
          </button>
        </div>
      )}
      {/* What's showing, in plain words, and every narrowing as a chip she can remove (owner, 1 Nov 2026). */}
      <div className="sq-showing">
        <p>
          {/* One whole line per case, with the bold parts filled in (owner, 3 Nov 2026). */}
          {rich(
            only ? (day ? t("Showing {posts} that are {status} on {day}. Tap a status or a day to narrow it down.") : t("Showing {posts} that are {status} in {range}. Tap a status or a day to narrow it down."))
              : day ? t("Showing {posts} on {day}. Tap a status or a day to narrow it down.") : t("Showing {posts} in {range}. Tap a status or a day to narrow it down."),
            {
              posts: <b>{shown.length === 1 ? t("{n} post", { n: 1 }) : t("{n} posts", { n: shown.length })}</b>,
              status: <b>{only ? t(GROUPS.find((g) => g.key === only)!.title).toLowerCase() : ""}</b>,
              day: <b>{day ? dayLabel(day) : ""}</b>,
              range: <b>{label.toLowerCase()}</b>,
            },
          )}
        </p>
        {(only || day || src !== "all" || brandNow || pages.length > 0) && (
          <span className="sq-chips">
            {only && <button type="button" className="sq-chip" onClick={() => setOnly(null)} aria-label={t("Remove {name}", { name: t(GROUPS.find((g) => g.key === only)!.title) })}>{t(GROUPS.find((g) => g.key === only)!.title)} <Icon name="x" size={13} width={2.6} /></button>}
            {day && <button type="button" className="sq-chip" onClick={() => setDay(null)} aria-label={t("Remove {name}", { name: dayLabel(day) })}>{dayLabel(day)} <Icon name="x" size={13} width={2.6} /></button>}
            {src !== "all" && <button type="button" className="sq-chip" onClick={() => setSrc("all")} aria-label={t("Remove posted from")}>{SOURCES.find(([k]) => k === src)![1]} <Icon name="x" size={13} width={2.6} /></button>}
            {brandNow && <button type="button" className="sq-chip" onClick={() => setBrand(null)} aria-label={t("Remove {name}", { name: brandNow.name })}>{brandNow.name} <Icon name="x" size={13} width={2.6} /></button>}
            {pages.length > 0 && <button type="button" className="sq-chip" onClick={() => setPages([])} aria-label={t("Remove {name}", { name: t("{n} Pages", { n: pages.length }) })}>{pages.length === 1 ? chan(pages[0])?.name ?? t("1 Page") : t("{n} Pages", { n: pages.length })} <Icon name="x" size={13} width={2.6} /></button>}
            <button type="button" className="pb-link" onClick={() => { setOnly(null); setDay(null); setSrc("all"); setBrand(null); setPages([]); }}>{t("Show All")}</button>
          </span>
        )}
      </div>

      <div className="sq-tiles" role="group" aria-label={t("Show only")}>
        {GROUPS.map((g) => (
          <button key={g.key} type="button" className={`sq-tile ${g.tone}`} aria-pressed={only === g.key} onClick={() => setOnly(only === g.key ? null : g.key)}>
            <span className="sq-tile-ico"><Icon name={g.icon} size={18} /></span>
            <b>{count(g.key)}</b>
            <small>{t(g.title)}</small>
          </button>
        ))}
      </div>

      {setup.brands.length > 0 && (
        <div className="v2-chips sq-brands" role="group" aria-label={t("Brand")}>
          {[{ id: "", name: t("All Brands") }, ...setup.brands].map((b) => (
            <button key={b.id} type="button" className={`v2-chip${(brand ?? "") === b.id ? " on" : ""}`} aria-pressed={(brand ?? "") === b.id} onClick={() => setBrand(b.id || null)}>{b.name}</button>
          ))}
        </div>
      )}

      {setup.channels.length > 1 && (
        <div className="sq-pagepick">
          <button type="button" className={`v2-chip${pages.length ? " on" : ""}`} aria-expanded={pagesOpen} onClick={() => setPagesOpen((o) => !o)}>
            <Icon name="user" size={15} /> {pages.length === 0 ? t("All Pages") : pages.length === 1 ? chan(pages[0])?.name ?? t("1 Page") : t("{n} Pages", { n: pages.length })} <Icon name="updown" size={13} />
          </button>
          {pagesOpen && (
            <div className="v2-card sq-pagepanel">
              <input className="np-input" type="search" value={pageQ} onChange={(e) => setPageQ(e.target.value)} placeholder={t("Search pages")} aria-label={t("Search pages")} autoFocus />
              <div className="sq-pagelist">
                {setup.channels.filter((c) => !pageQ.trim() || `${c.name} ${c.sub}`.toLowerCase().includes(pageQ.trim().toLowerCase())).map((c) => (
                  <label key={c.key} className="pb-check">
                    <AccountFace icon={ICON[c.app]} photo={c.photo} initials={c.initials} color={c.color} />
                    <span><b>{c.name}</b><small>{c.sub}</small></span>
                    <input type="checkbox" checked={pages.includes(c.key)} onChange={() => togglePage(c.key)} />
                  </label>
                ))}
              </div>
              <div className="pb-row" style={{ justifyContent: "space-between" }}>
                <button type="button" className="pb-link" onClick={() => setPages([])}>{t("Clear")}</button>
                <button type="button" className="np-btn v2-btn-sm" onClick={() => setPagesOpen(false)}>{t("Done")}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {!live && <div className="sq-srcbar">
        <div className="v2-chips" role="group" aria-label={t("Posted from")}>
          {([["all", t("All Posts")], ["rezekii", t("Via Rezekii")], ["phone", t("From Phone")]] as const).map(([k, l]) => (
            <button key={k} type="button" className={`v2-chip${src === k ? " on" : ""}`} aria-pressed={src === k} onClick={() => setSrc(k)}>{k === "phone" && <Icon name="phone" size={15} />}{l}</button>
          ))}
        </div>
        <span className="v2-small">{t("Phone posts sync every 30 minutes.")}</span>
      </div>}

      <div className="sq-map">
        {/* Schedule overview (owner, 23 Nov 2026): videos per day for each app; tap a day to see only its posts. */}
        <section className="v2-card sq-ov-card">
          <div className="v2-card-h"><h2 className="v2-h2">{t("Schedule Overview")}</h2><span className="v2-small">{t("Videos per day, by app")}</span></div>
          {ovApps.length === 0 ? <p className="v2-small" style={{ margin: 0 }}>{t("No posts for these dates.")}</p> : (
            <div className="sq-ov-wrap">
              <table className="sq-ov">
                <thead>
                  <tr>
                    <th aria-label={t("App")} />
                    {days.map((d) => (
                      <th key={d}>
                        <button type="button" className={`sq-ov-day${d === TODAY ? " today" : ""}${day === d ? " on" : ""}`} aria-pressed={day === d} onClick={() => setDay(day === d ? null : d)} title={dayLabel(d)}>
                          <small>{dayHead(d, lang)}</small><b>{Number(d.slice(8))}</b>
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ovApps.map((a) => (
                    <tr key={a}>
                      <th><span className="sq-ov-app"><PlatformIcon name={ICON[a]} size={16} /><span>{NAMES[a]}</span></span></th>
                      {days.map((d) => { const n = onDay(a, d); return <td key={d} className={`${n ? "has" : ""}${d === TODAY ? " today" : ""}${day === d ? " on" : ""}`}>{n || ""}</td>; })}
                    </tr>
                  ))}
                  <tr className="sq-ov-total">
                    <th>{t("Total")}</th>
                    {days.map((d) => { const n = onDay(null, d); return <td key={d} className={`${d === TODAY ? "today" : ""}${day === d ? " on" : ""}`}>{n || ""}</td>; })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* By page (owner, 23 Nov 2026): what each page posted today and has scheduled, five until Show All. */}
        {pageRows.length > 0 && (
          <section className="v2-card sq-bypage">
            <div className="v2-card-h"><h2 className="v2-h2">{t("By Page")}</h2><span className="v2-small">{pageRows.length}</span></div>
            <div className="sq-bp-row sq-bp-head"><span>{t("Page")}</span><span>{t("Posted Today")}</span><span>{t("Scheduled")}</span><span>{t("Failed")}</span></div>
            {(allPages ? pageRows : pageRows.slice(0, PAGE_ROWS)).map(([k, r]) => {
              const c = chan(k);
              return (
                <button key={k} type="button" className={`sq-bp-row${pages.length === 1 && pages[0] === k ? " on" : ""}`} onClick={() => setPages(pages.length === 1 && pages[0] === k ? [] : [k])} title={t("Show only {name}", { name: c?.name ?? "" })}>
                  <span className="sq-bp-name">{c ? <AccountFace icon={ICON[c.app]} photo={c.photo} initials={c.initials} color={c.color} /> : null}<b>{c?.name ?? t("Removed account")}</b></span>
                  <span>{r.today || "–"}</span><span>{r.sched || "–"}</span><span className={r.fail ? "bad" : ""}>{r.fail || "–"}</span>
                </button>
              );
            })}
            {pageRows.length > PAGE_ROWS && <button type="button" className="pb-link" style={{ justifySelf: "start" }} onClick={() => setAllPages((v) => !v)}>{allPages ? t("Show Less") : t("Show All {n}", { n: pageRows.length })}</button>}
          </section>
        )}
      </div>


      {GROUPS.map((g) => {
        const list = shown.filter((p) => groupOf(p) === g.key).sort((a, b) => (g.key === "done" || g.key === "fail" ? `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`) : `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)));
        return list.length > 0 && (
          <section key={g.key} className={`v2-card sq-group ${g.tone}`}>
            <div className="v2-card-h">
              <h2 className="v2-h2"><span className={`sq-gico ${g.tone}`}><Icon name={g.icon} size={15} /></span>{t(g.title)}</h2>
              <span className="v2-small">{list.length}</span>
            </div>
            <ul className="sq-list">{list.map(row)}</ul>
          </section>
        );
      })}
      {shown.length === 0 && (
        <section className="v2-card sq-empty">
          <h2 className="v2-h2">{t("Nothing Here")}</h2>
          <p className="v2-small">{t("No posts for these dates.")}</p>
          <a href={newPost} className="np-btn v2-btn-sm">{t("New Post")}</a>
        </section>
      )}
      <p className="v2-small" style={{ margin: 0 }}>{live ? t("You can cancel until a post starts sending.") : t("You can edit or cancel until a post starts sending.")}</p>


    </div>
  );
}

/** A post's video (its first frame, tap to play or pause) or first photo, loaded only once it scrolls into view (owner, 23 Nov 2026). */
function Preview({ url, type }: { url: string; type: "video" | "photo" }) {
  const box = useRef<HTMLSpanElement>(null);
  const [seen, setSeen] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el || seen || typeof IntersectionObserver === "undefined") { if (!seen) setSeen(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); } }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  const blank = <span style={{ display: "grid", placeItems: "center", width: "100%", height: "100%" }}><Icon name="video" size={22} /></span>;
  return (
    <span ref={box} className="sq-prev">
      {!seen || failed ? blank : type === "photo" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" onError={() => setFailed(true)} />
      ) : (
        <video src={`${url}#t=0.5`} preload="metadata" muted playsInline onError={() => setFailed(true)} onClick={(e) => { const v = e.currentTarget; if (v.paused) { v.muted = false; void v.play(); } else v.pause(); }} />
      )}
    </span>
  );
}

/** Edit in place: the time, and each app's caption and first comment. Saving a draft with a time schedules it. */
