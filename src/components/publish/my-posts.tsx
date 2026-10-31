"use client";

import { useEffect, useState } from "react";
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
import { cancelChannel, loadPosts, retryChannel } from "@/lib/live-publish";
import { ICON, NAMES, type Channel } from "./rules";
import "@/app/creator2.css";
import "@/app/publish.css";

/** Today in the sample preview: Wednesday 28 October 2026, 9:15 AM Malaysia time. */
const SAMPLE_TODAY = "2026-10-28";
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const add = (s: string, n: number) => { const d = new Date(`${s}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dow = (s: string) => new Date(`${s}T00:00:00Z`).getUTCDay();
const dayLabelOn = (s: string, today: string) => (s === today ? "Today" : s === add(today, 1) ? "Tomorrow" : s === add(today, -1) ? "Yesterday" : `${DOW[dow(s)]} ${dayName(s)}`);
/** Today in Malaysia, for real posts (owner, 31 Oct 2026). */
const mytToday = () => new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
const clock = (t: string) => { const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const views = (n = 0) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n));

const PRESETS: [string, string][] = [["around", "Last 7 & next 7 days"], ["today", "Today"], ["next7", "Next 7 days"], ["week", "This week"], ["last7", "Last 7 days"], ["month", "This month"], ["last30", "Last 30 days"]];
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
  { key: "sched", title: "Scheduled", tone: "violet", icon: "clock" },
  { key: "done", title: "Posted", tone: "green", icon: "check" },
  { key: "fail", title: "Needs You", tone: "red", icon: "alert" },
  { key: "draft", title: "Drafts", tone: "gray", icon: "edit" },
];

/** V1's live statuses, per app. */
function statusText(s: PostStatus, app: Channel) {
  switch (s) {
    case "draft": return "Draft";
    case "scheduled": return "Scheduled";
    case "uploading": return "Uploading video";
    case "sending": return app === "tiktok" ? "Sending to TikTok" : `Publishing to ${NAMES[app]}`;
    case "processing": return `${NAMES[app]} is processing`;
    case "posted": return "Posted · live";
    case "inbox": return "In your TikTok drafts";
    case "failed": return "Failed";
    case "removed": return "Deleted after posting";
    case "pagedraft": return "Draft on your Page";
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
  const router = useRouter();
  const [posts, setPosts] = useState(start);
  // Signed in (owner, 31 Oct 2026): her real posts, real dates, and Cancel / Try again that really happen.
  const live = !!setup.live;
  const TODAY = live ? mytToday() : SAMPLE_TODAY;
  const RANGE = rangesFor(TODAY);
  const dayLabel = (s: string) => dayLabelOn(s, TODAY);
  const reload = () => loadPosts().then(setPosts).catch(() => toast("Couldn't refresh your posts."));
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
  const [month, setMonth] = useState(() => TODAY.slice(0, 7));
  const [cancelling, setCancelling] = useState<string | null>(null);
  // Owner, 28 Oct 2026: posts she made from her phone show here too, marked, so the calendar is the whole picture.
  const [src, setSrc] = useState<"all" | "rezekii" | "phone">("all");
  const srcOk = (p: MyPost) => src === "all" || (src === "phone") === (p.source === "phone");

  // Posts going out move one step every couple of seconds, like V1's status updates while TikTok works on them.
  const moving = posts.some((p) => p.targets.some((t) => MOVING.includes(t.status)));
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
        if (!p.targets.some((t) => MOVING.includes(t.status))) return p;
        const targets = p.targets.map((t) => (MOVING.includes(t.status) ? { ...t, status: next(t.status) } : t));
        // The next app starts uploading once the first ones are processing.
        const started = targets.map((t, i) => (t.status === "scheduled" && i > 0 && targets[i - 1].status === "processing" ? { ...t, status: "uploading" as const } : t));
        return { ...p, targets: started };
      }));
    }, 3500);
    return () => window.clearInterval(id);
  }, [moving, live]);

  const chan = (key: string) => setup.channels.find((c) => c.key === key);
  const appOf = (t: PostTarget): Channel => chan(t.key)?.app ?? "facebook";
  const inRange = (p: MyPost) => !p.date || (p.date >= from && p.date <= to);
  const shown = posts.filter((p) => srcOk(p) && inRange(p) && (!day || p.date === day) && (!only || groupOf(p) === only));
  const count = (g: Group) => posts.filter((p) => srcOk(p) && inRange(p) && groupOf(p) === g).length;
  const SOURCES = [["all", "All"], ["rezekii", "Via Rezekii"], ["phone", "From phone"]] as const;
  const needs = count("fail");

  const choose = (a: string, b: string, key: string | null) => { setRange([a, b]); setPreset(key); setDay(null); setMonth(b < TODAY ? b.slice(0, 7) : a > TODAY ? a.slice(0, 7) : TODAY.slice(0, 7)); };
  const label = preset ? PRESETS.find(([k]) => k === preset)![1] : `${dayName(from)} – ${dayName(to)}`;

  const setTarget = (postId: string, key: string, patch: Partial<PostTarget>) =>
    setPosts((all) => all.map((p) => (p.id !== postId ? p : { ...p, targets: p.targets.map((t) => (t.key === key ? { ...t, ...patch } : t)) })));
  const fix = (p: MyPost, t: PostTarget) => {
    const name = `${NAMES[appOf(t)]} ${chan(t.key)?.name ?? ""}`.trim();
    if (live && t.postId) {
      retryChannel(appOf(t), t.postId).then(() => { toast(`Trying ${name} again. ${POST_CREDITS} credits`); reload(); }).catch((e: unknown) => toast(e instanceof Error ? e.message : "Couldn't try again."));
      return;
    }
    toast(`${t.fix === "Reconnect" ? `${name} reconnected. Posting again…` : `Trying ${name} again…`} ${POST_CREDITS} credits`);
    setTarget(p.id, t.key, { status: "uploading", reason: undefined, fix: undefined });
  };
  const cancel = (p: MyPost) => {
    if (live) {
      const go = p.targets.filter((t) => t.canCancel && t.postId);
      Promise.all(go.map((t) => cancelChannel(appOf(t), t.postId!)))
        .then(() => toast("Cancelled. Its credits come back to your wallet."))
        .catch((e: unknown) => toast(e instanceof Error ? e.message : "Couldn't cancel."))
        .finally(() => { setCancelling(null); reload(); });
      return;
    }
    setPosts((all) => all.map((x) => (x.id !== p.id ? x : { ...x, date: "", time: "", targets: x.targets.map((t) => ({ ...t, status: "draft" as const })) })));
    setCancelling(null);
    toast(`Cancelled. ${p.targets.length * POST_CREDITS} credits refunded; moved to drafts.`);
  };

  // The month map: each day shows a dot per post, in its group's colour.
  const [y, m] = month.split("-").map(Number);
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const daysIn = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const moveMonth = (k: number) => { const d = new Date(Date.UTC(y, m - 1 + k, 1)); setMonth(d.toISOString().slice(0, 7)); };

  const row = (p: MyPost) => {
    const g = groupOf(p);
    // Real posts can be cancelled here while scheduled; editing them comes later.
    const editable = live ? g === "sched" && p.targets.some((t) => t.canCancel) : g === "sched" || g === "draft";
    const link = p.targets.find((t) => t.permalink)?.permalink;
    return (
      <li key={p.id} className={`sq-post ${g}`}>
        <span className="sq-cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.cover ? <img src={p.cover} alt="" /> : <span style={{ display: "grid", placeItems: "center", width: "100%", height: "100%" }}><Icon name="video" size={22} /></span>}
          {p.seconds > 0 && <small>{Math.floor(p.seconds / 60)}:{String(p.seconds % 60).padStart(2, "0")}</small>}
        </span>
        <span className="sq-body">
          <span className="sq-when">
            {p.date ? <><b>{dayLabel(p.date)}</b> · {clock(p.time)}</> : <b>No time yet</b>}
            <span className={`sq-src${p.source === "phone" ? " phone" : ""}`}>{p.source === "phone" ? <><Icon name="phone" size={12} /> From phone</> : "Via Rezekii"}</span>
          </span>
          <strong className="sq-cap">{p.caption}</strong>
          <span className="sq-targets">
            {p.targets.map((t) => {
              const app = appOf(t);
              const c = chan(t.key);
              const step = STEPS.indexOf(t.status);
              return (
                <span key={t.key} className={`sq-t ${t.status}`}>
                  <span className="sq-t-app"><PlatformIcon name={ICON[app]} size={18} /><span>{c?.name ?? NAMES[app]}</span></span>
                  <span className="sq-pill">{MOVING.includes(t.status) && <i className="sq-spin" aria-hidden="true" />}{t.status === "posted" && <i className="sq-live" aria-hidden="true" />}{statusText(t.status, app)}</span>
                  {MOVING.includes(t.status) && <span className="sq-track" aria-hidden="true">{STEPS.slice(1).map((s, i) => <i key={s} className={i + 1 <= step ? "on" : ""} />)}</span>}
                  {t.status === "posted" && t.views ? <small className="sq-views"><Icon name="eye" size={13} /> {views(t.views)} views</small> : null}
                  {t.status === "failed" && (
                    <span className="sq-why">
                      <small>{t.reason}{t.fix || !live ? ` · ${POST_CREDITS} credits returned` : ""}</small>
                      {(t.fix || !live) && <button type="button" className={t.fix === "Reconnect" ? "np-btn v2-btn-sm" : "btn-outline v2-btn-sm"} onClick={() => fix(p, t)}>{t.fix ?? "Retry"}</button>}
                    </span>
                  )}
                </span>
              );
            })}
          </span>
          {editable && (cancelling === p.id ? (
            <span className="sq-confirm" role="alert">
              <span>{g === "draft" ? "Delete this draft?" : "Cancel this post? It moves to Drafts."}</span>
              <button type="button" className="btn-outline v2-btn-sm" onClick={() => setCancelling(null)}>Keep it</button>
              <button type="button" className="sq-danger v2-btn-sm" onClick={() => (g === "draft" ? (setPosts((all) => all.filter((x) => x.id !== p.id)), toast("Draft deleted")) : cancel(p))}>{g === "draft" ? "Delete" : "Cancel post"}</button>
            </span>
          ) : (
            <span className="sq-acts">
              {!live && <button type="button" className="btn-outline v2-btn-sm" onClick={() => { openPost(p); router.push(`${newPost}?edit=${encodeURIComponent(p.id)}`); }}><Icon name="edit" size={15} /> Edit</button>}
              <button type="button" className="sq-ghost v2-btn-sm" onClick={() => setCancelling(p.id)}>{g === "draft" ? "Delete" : "Cancel"}</button>
            </span>
          ))}
          {g === "done" && !live && <span className="sq-acts"><button type="button" className="sq-ghost v2-btn-sm" onClick={() => toast("Preview: opens the post in the app")}>View post <Icon name="arrow" size={14} /></button></span>}
          {g === "done" && live && link && <span className="sq-acts"><a className="sq-ghost v2-btn-sm" href={link} target="_blank" rel="noopener noreferrer">View post <Icon name="arrow" size={14} /></a></span>}
        </span>
      </li>
    );
  };

  return (
    <div className="v2-stack v2-in sq-page" style={{ gap: 18 }}>
      <Title title="Content Calendar" sub="Every post and its status · Malaysia time">
        <CalendarPicker
          compact
          label={label}
          sub={`${dayName(from)} – ${dayName(to)}`}
          today={TODAY}
          first={live ? add(TODAY, -180) : "2026-09-01"}
          last={live ? add(TODAY, 90) : "2026-12-31"}
          from={from}
          to={to}
          onRange={(a, b) => choose(a, b, null)}
          presets={PRESETS}
          preset={preset}
          onPreset={(k) => choose(RANGE[k][0], RANGE[k][1], k)}
        />
      </Title>
      <p className="an-range"><b>{label}</b><span>{dayName(from)} – {dayName(to)}</span></p>

      {needs > 0 && only !== "fail" && (
        <div className="sq-phonebar">
          <button type="button" className="sq-alert" onClick={() => { setOnly("fail"); setDay(null); }}>
            <Icon name="alert" size={17} /><span>{needs} post{needs === 1 ? "" : "s"} need{needs === 1 ? "s" : ""} you</span><b>Fix</b>
          </button>
        </div>
      )}
      {/* What's showing, in plain words, and every narrowing as a chip she can remove (owner, 1 Nov 2026). */}
      <div className="sq-showing">
        <p>Showing <b>{shown.length} post{shown.length === 1 ? "" : "s"}</b>{only ? <> that are <b>{GROUPS.find((g) => g.key === only)!.title.toLowerCase()}</b></> : ""} {day ? <>on <b>{dayLabel(day)}</b></> : <>in <b>{label.toLowerCase()}</b></>}. Tap a status or a day to narrow it down.</p>
        {(only || day || src !== "all") && (
          <span className="sq-chips">
            {only && <button type="button" className="sq-chip" onClick={() => setOnly(null)} aria-label={`Remove ${GROUPS.find((g) => g.key === only)!.title}`}>{GROUPS.find((g) => g.key === only)!.title} <Icon name="x" size={13} width={2.6} /></button>}
            {day && <button type="button" className="sq-chip" onClick={() => setDay(null)} aria-label={`Remove ${dayLabel(day)}`}>{dayLabel(day)} <Icon name="x" size={13} width={2.6} /></button>}
            {src !== "all" && <button type="button" className="sq-chip" onClick={() => setSrc("all")} aria-label="Remove posted from">{SOURCES.find(([k]) => k === src)![1]} <Icon name="x" size={13} width={2.6} /></button>}
            <button type="button" className="pb-link" onClick={() => { setOnly(null); setDay(null); setSrc("all"); }}>Show All</button>
          </span>
        )}
      </div>

      <div className="sq-tiles" role="group" aria-label="Show only">
        {GROUPS.map((g) => (
          <button key={g.key} type="button" className={`sq-tile ${g.tone}`} aria-pressed={only === g.key} onClick={() => setOnly(only === g.key ? null : g.key)}>
            <span className="sq-tile-ico"><Icon name={g.icon} size={18} /></span>
            <b>{count(g.key)}</b>
            <small>{g.title}</small>
          </button>
        ))}
      </div>

      {!live && <div className="sq-srcbar">
        <div className="v2-chips" role="group" aria-label="Posted from">
          {([["all", "All posts"], ["rezekii", "Via Rezekii"], ["phone", "From phone"]] as const).map(([k, l]) => (
            <button key={k} type="button" className={`v2-chip${src === k ? " on" : ""}`} aria-pressed={src === k} onClick={() => setSrc(k)}>{k === "phone" && <Icon name="phone" size={15} />}{l}</button>
          ))}
        </div>
        <span className="v2-small">Phone posts sync every 30 minutes.</span>
      </div>}

      <section className="v2-card sq-map">
        <div className="sq-map-h">
          <button type="button" className="cp-nav" aria-label="Previous month" onClick={() => moveMonth(-1)}><Icon name="back" size={16} /></button>
          <h2 className="v2-h2">{MONTHS[m - 1]} {y}</h2>
          <button type="button" className="cp-nav" aria-label="Next month" onClick={() => moveMonth(1)}><Icon name="arrow" size={16} /></button>
        </div>
        <div className="sq-grid" role="grid" aria-label={`Posts in ${MONTHS[m - 1]} ${y}`}>
          {WEEK.map((w) => <span key={w} className="sq-wd">{w}</span>)}
          {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} />)}
          {Array.from({ length: daysIn }, (_, i) => {
            const d = `${month}-${String(i + 1).padStart(2, "0")}`;
            const list = posts.filter((p) => p.date === d && srcOk(p));
            const out = d < from || d > to;
            // How many went up that day (owner, 1 Nov 2026), with a dot for anything else.
            const posted = list.filter((p) => groupOf(p) === "done").length;
            return (
              <button key={d} type="button" className={`sq-day${d === TODAY ? " today" : ""}${day === d ? " on" : ""}${out ? " out" : ""}`} onClick={() => setDay(day === d ? null : d)} aria-label={`${dayName(d)}: ${posted} posted, ${list.length} post${list.length === 1 ? "" : "s"} in all`} aria-pressed={day === d}>
                <b>{i + 1}</b>
                {posted > 0 && <em className="sq-posted">{posted}</em>}
                <span className="sq-dots">{list.filter((p) => groupOf(p) !== "done").slice(0, 3).map((p) => <i key={p.id} className={groupOf(p)} />)}</span>
              </button>
            );
          })}
        </div>
        <div className="sq-legend">
          <span><em className="sq-posted">2</em>Posted that day</span>
          {GROUPS.filter((g) => g.key !== "draft" && g.key !== "done").map((g) => <span key={g.key}><i className={g.key} />{g.title}</span>)}
        </div>
      </section>


      {GROUPS.map((g) => {
        const list = shown.filter((p) => groupOf(p) === g.key).sort((a, b) => (g.key === "done" || g.key === "fail" ? `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`) : `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)));
        return list.length > 0 && (
          <section key={g.key} className={`v2-card sq-group ${g.tone}`}>
            <div className="v2-card-h">
              <h2 className="v2-h2"><span className={`sq-gico ${g.tone}`}><Icon name={g.icon} size={15} /></span>{g.title}</h2>
              <span className="v2-small">{list.length}</span>
            </div>
            <ul className="sq-list">{list.map(row)}</ul>
          </section>
        );
      })}
      {shown.length === 0 && (
        <section className="v2-card sq-empty">
          <h2 className="v2-h2">Nothing Here</h2>
          <p className="v2-small">No posts for these dates.</p>
          <a href={newPost} className="np-btn v2-btn-sm">New Post</a>
        </section>
      )}
      <p className="v2-small" style={{ margin: 0 }}>{live ? "You can cancel until a post starts sending." : "You can edit or cancel until a post starts sending."}</p>


    </div>
  );
}

/** Edit in place: the time, and each app's caption and first comment. Saving a draft with a time schedules it. */
