"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet, Title } from "@/components/ui";
import { CalendarPicker, dayName } from "@/components/calendar-picker";
import { PlatformIcon } from "@/components/creator2/bits";
import { POST_CREDITS, type MyPost, type PostStatus, type PostTarget, type PublishSetup } from "@/lib/mock-publish";
import { CAPTION_MAX, ICON, NAMES, type Channel } from "./rules";
import "@/app/creator2.css";
import "@/app/publish.css";

/** Today in the preview: Wednesday 28 October 2026, 9:15 AM Malaysia time. */
const TODAY = "2026-10-28";
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const add = (s: string, n: number) => { const d = new Date(`${s}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dow = (s: string) => new Date(`${s}T00:00:00Z`).getUTCDay();
const dayLabel = (s: string) => (s === TODAY ? "Today" : s === add(TODAY, 1) ? "Tomorrow" : s === add(TODAY, -1) ? "Yesterday" : `${DOW[dow(s)]} ${dayName(s)}`);
const clock = (t: string) => { const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
const views = (n = 0) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n));

const PRESETS: [string, string][] = [["around", "Last 7 & next 7 days"], ["today", "Today"], ["next7", "Next 7 days"], ["week", "This week"], ["last7", "Last 7 days"], ["month", "This month"], ["last30", "Last 30 days"]];
const MONDAY = add(TODAY, -((dow(TODAY) + 6) % 7));
const RANGE: Record<string, [string, string]> = {
  around: [add(TODAY, -7), add(TODAY, 7)], today: [TODAY, TODAY], next7: [TODAY, add(TODAY, 6)], week: [MONDAY, add(MONDAY, 6)],
  last7: [add(TODAY, -6), TODAY], month: ["2026-10-01", "2026-10-31"], last30: [add(TODAY, -29), TODAY],
};

/** How a post is doing overall, which decides its group and colour. */
type Group = "fail" | "live" | "sched" | "draft" | "done";
const MOVING: PostStatus[] = ["uploading", "sending", "processing"];
const groupOf = (p: MyPost): Group =>
  p.targets.some((t) => t.status === "failed") ? "fail"
    : p.targets.some((t) => MOVING.includes(t.status)) ? "live"
    : p.targets.every((t) => t.status === "draft") ? "draft"
    : p.targets.some((t) => t.status === "scheduled") ? "sched"
    : "done";
const GROUPS: { key: Group; title: string; tone: string; icon: "alert" | "send" | "clock" | "edit" | "check" }[] = [
  { key: "fail", title: "Needs you", tone: "red", icon: "alert" },
  { key: "live", title: "Going out now", tone: "blue", icon: "send" },
  { key: "sched", title: "Scheduled", tone: "violet", icon: "clock" },
  { key: "draft", title: "Drafts", tone: "gray", icon: "edit" },
  { key: "done", title: "Posted", tone: "green", icon: "check" },
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
  const [posts, setPosts] = useState(start);
  const [preset, setPreset] = useState<string | null>("around");
  const [[from, to], setRange] = useState<[string, string]>(RANGE.around);
  const [only, setOnly] = useState<Group | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [month, setMonth] = useState(() => TODAY.slice(0, 7));
  const [editing, setEditing] = useState<MyPost | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  // Owner, 28 Oct 2026: posts she made from her phone show here too, marked, so the calendar is the whole picture.
  const [src, setSrc] = useState<"all" | "rezekii" | "phone">("all");
  const srcOk = (p: MyPost) => src === "all" || (src === "phone") === (p.source === "phone");

  // Posts going out move one step every couple of seconds, like V1's status updates while TikTok works on them.
  const moving = posts.some((p) => p.targets.some((t) => MOVING.includes(t.status)));
  useEffect(() => {
    if (!moving) return;
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
  }, [moving]);

  const chan = (key: string) => setup.channels.find((c) => c.key === key);
  const appOf = (t: PostTarget): Channel => chan(t.key)?.app ?? "facebook";
  const inRange = (p: MyPost) => !p.date || (p.date >= from && p.date <= to);
  const shown = posts.filter((p) => srcOk(p) && inRange(p) && (!day || p.date === day) && (!only || groupOf(p) === only));
  const count = (g: Group) => posts.filter((p) => srcOk(p) && inRange(p) && groupOf(p) === g).length;

  const choose = (a: string, b: string, key: string | null) => { setRange([a, b]); setPreset(key); setDay(null); setMonth(b < TODAY ? b.slice(0, 7) : a > TODAY ? a.slice(0, 7) : TODAY.slice(0, 7)); };
  const label = preset ? PRESETS.find(([k]) => k === preset)![1] : `${dayName(from)} – ${dayName(to)}`;

  const setTarget = (postId: string, key: string, patch: Partial<PostTarget>) =>
    setPosts((all) => all.map((p) => (p.id !== postId ? p : { ...p, targets: p.targets.map((t) => (t.key === key ? { ...t, ...patch } : t)) })));
  const fix = (p: MyPost, t: PostTarget) => {
    const name = `${NAMES[appOf(t)]} ${chan(t.key)?.name ?? ""}`.trim();
    toast(`${t.fix === "Reconnect" ? `${name} reconnected. Posting again…` : `Trying ${name} again…`} ${POST_CREDITS} credits`);
    setTarget(p.id, t.key, { status: "uploading", reason: undefined, fix: undefined });
  };
  const cancel = (p: MyPost) => {
    setPosts((all) => all.map((x) => (x.id !== p.id ? x : { ...x, date: "", time: "", targets: x.targets.map((t) => ({ ...t, status: "draft" as const })) })));
    setCancelling(null);
    toast(`Cancelled. ${p.targets.length * POST_CREDITS} credits are back in your wallet; the post is kept in your drafts.`);
  };

  // The month map: each day shows a dot per post, in its group's colour.
  const [y, m] = month.split("-").map(Number);
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const daysIn = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const moveMonth = (k: number) => { const d = new Date(Date.UTC(y, m - 1 + k, 1)); setMonth(d.toISOString().slice(0, 7)); };

  const row = (p: MyPost) => {
    const g = groupOf(p);
    const editable = g === "sched" || g === "draft";
    return (
      <li key={p.id} className={`sq-post ${g}`}>
        <span className="sq-cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.cover} alt="" />
          <small>{Math.floor(p.seconds / 60)}:{String(p.seconds % 60).padStart(2, "0")}</small>
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
                      <small>{t.reason} · {POST_CREDITS} credits returned</small>
                      <button type="button" className={t.fix === "Reconnect" ? "np-btn v2-btn-sm" : "btn-outline v2-btn-sm"} onClick={() => fix(p, t)}>{t.fix ?? "Retry"}</button>
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
              <button type="button" className="btn-outline v2-btn-sm" onClick={() => setEditing(p)}><Icon name="edit" size={15} /> Edit</button>
              <button type="button" className="sq-ghost v2-btn-sm" onClick={() => setCancelling(p.id)}>{g === "draft" ? "Delete" : "Cancel"}</button>
            </span>
          ))}
          {g === "done" && <span className="sq-acts"><button type="button" className="sq-ghost v2-btn-sm" onClick={() => toast("Preview: opens the post in the app")}>View post <Icon name="arrow" size={14} /></button></span>}
        </span>
      </li>
    );
  };

  return (
    <div className="v2-stack v2-in sq-page" style={{ gap: 18 }}>
      <Title title="Content Calendar" sub="Every post and its live status on each app · Malaysia time">
        <CalendarPicker
          label={label}
          sub={`${dayName(from)} – ${dayName(to)}`}
          today={TODAY}
          first="2026-09-01"
          last="2026-12-31"
          from={from}
          to={to}
          onRange={(a, b) => choose(a, b, null)}
          presets={PRESETS}
          preset={preset}
          onPreset={(k) => choose(RANGE[k][0], RANGE[k][1], k)}
        />
      </Title>

      <div className="sq-tiles" role="group" aria-label="Show only">
        {GROUPS.map((g) => (
          <button key={g.key} type="button" className={`sq-tile ${g.tone}`} aria-pressed={only === g.key} onClick={() => setOnly(only === g.key ? null : g.key)}>
            <span className="sq-tile-ico"><Icon name={g.icon} size={18} /></span>
            <b>{count(g.key)}</b>
            <small>{g.title}</small>
          </button>
        ))}
      </div>

      <div className="sq-srcbar">
        <div className="v2-chips" role="group" aria-label="Posted from">
          {([["all", "All posts"], ["rezekii", "Via Rezekii"], ["phone", "From phone"]] as const).map(([k, l]) => (
            <button key={k} type="button" className={`v2-chip${src === k ? " on" : ""}`} aria-pressed={src === k} onClick={() => setSrc(k)}>{k === "phone" && <Icon name="phone" size={15} />}{l}</button>
          ))}
        </div>
        <span className="v2-small">From phone = posts you made in the apps yourself. Rezekii checks your connected accounts every 30 minutes.</span>
      </div>

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
            return (
              <button key={d} type="button" className={`sq-day${d === TODAY ? " today" : ""}${day === d ? " on" : ""}${out ? " out" : ""}`} onClick={() => setDay(day === d ? null : d)} aria-label={`${dayName(d)}: ${list.length} post${list.length === 1 ? "" : "s"}`} aria-pressed={day === d}>
                <b>{i + 1}</b>
                <span className="sq-dots">{list.slice(0, 4).map((p) => <i key={p.id} className={groupOf(p)} />)}</span>
              </button>
            );
          })}
        </div>
        <div className="sq-legend">
          {GROUPS.filter((g) => g.key !== "draft").map((g) => <span key={g.key}><i className={g.key} />{g.title}</span>)}
        </div>
      </section>

      {(day || only) && (
        <p className="sq-filter">
          Showing {only ? GROUPS.find((g) => g.key === only)!.title.toLowerCase() : "all posts"}{day ? ` on ${dayLabel(day)}` : ""}
          <button type="button" className="pb-link" onClick={() => { setDay(null); setOnly(null); }}>Show all</button>
        </p>
      )}

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
          <h2 className="v2-h2">Nothing here</h2>
          <p className="v2-small">No posts for these dates. Pick other dates, or make a new post.</p>
          <a href={newPost} className="np-btn v2-btn-sm">New Post</a>
        </section>
      )}
      <p className="v2-small" style={{ margin: 0 }}>A post counts as posted only after the app confirms it. You can edit or cancel until it starts sending; after that, change or delete it in the app itself. Posts you make from your phone show up here too, once they&apos;re live.</p>

      {editing && <EditSheet post={editing} appOf={appOf} chan={chan} onClose={() => setEditing(null)} onSave={(p) => { setPosts((all) => all.map((x) => (x.id === p.id ? p : x))); setEditing(null); toast(p.date ? `Saved. Goes out ${dayLabel(p.date)}, ${clock(p.time)}.` : "Draft saved"); }} />}
    </div>
  );
}

/** Edit in place: the time, and each app's caption and first comment. Saving a draft with a time schedules it. */
function EditSheet({ post, appOf, chan, onClose, onSave }: { post: MyPost; appOf: (t: PostTarget) => Channel; chan: (k: string) => PublishSetup["channels"][number] | undefined; onClose: () => void; onSave: (p: MyPost) => void }) {
  const [at, setAt] = useState(post.date ? `${post.date}T${post.time}` : "");
  const [caption, setCaption] = useState(post.caption);
  const [comment, setComment] = useState(post.comment);
  const [error, setError] = useState("");
  const apps = [...new Set(post.targets.map(appOf))];
  const save = () => {
    if (!caption.trim()) return setError("Write a caption.");
    if (at && at < "2026-10-28T09:20") return setError("Pick a time from now on.");
    const [date, time] = at ? at.split("T") : ["", ""];
    onSave({ ...post, caption: caption.trim(), comment: comment.trim(), date, time, targets: post.targets.map((t) => ({ ...t, status: at ? "scheduled" : "draft", reason: undefined, fix: undefined })) });
  };
  return (
    <Sheet title="Edit post" onClose={onClose}>
      <div className="sq-edit-top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.cover} alt="" />
        <span>
          <b>{post.targets.length} channel{post.targets.length === 1 ? "" : "s"}</b>
          <span className="sq-edit-apps">{post.targets.map((t) => <span key={t.key}><PlatformIcon name={ICON[appOf(t)]} size={16} />{chan(t.key)?.name}</span>)}</span>
        </span>
      </div>
      <label className="pb-field"><b>When <i className="pb-req">*</i></b><input className="np-input" type="datetime-local" value={at} min="2026-10-28T09:20" onChange={(e) => setAt(e.target.value)} aria-label="Date and time (Malaysia time)" /><small className="np-muted">Malaysia time. Leave empty to keep it as a draft.</small></label>
      <label className="pb-field"><b>Caption <i className="pb-req">*</i></b><textarea className="np-input" rows={4} value={caption} onChange={(e) => setCaption(e.target.value)} aria-label="Caption" /><small className="np-muted">{caption.length.toLocaleString("en-US")} / {Math.min(...apps.map((a) => CAPTION_MAX[a])).toLocaleString("en-US")} · no links or calls to action here</small></label>
      {apps.some((a) => a !== "tiktok") && (
        <label className="pb-field"><span className="pb-row"><b>First comment</b><span className="pb-opt">Optional</span></span><textarea className="np-input" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Your call to action and product link" aria-label="First comment" /><small className="np-muted">Facebook, Instagram and Threads. TikTok uses the yellow basket.</small></label>
      )}
      {error && <p className="pb-secerr" role="alert"><span>{error}</span></p>}
      <button type="button" className="np-btn" onClick={save}>{at ? "Save changes" : "Save draft"}</button>
    </Sheet>
  );
}
