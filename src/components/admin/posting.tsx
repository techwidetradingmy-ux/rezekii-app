"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useDemo } from "@/components/demo";
import { Sheet, Title } from "@/components/ui";
import { Chips, Pill, Search, type Tone } from "@/components/admin/bits";
import { shortCount } from "@/integrations/tiktok/stats.ts";
import type { CalPost, CalWeek } from "@/modules/admin/posts.ts";
import type { AdminAccount } from "@/modules/admin/accounts.ts";
import type { VideoRow } from "@/modules/admin/videos.ts";

/**
 * Admin › Posting (owner, 21 Nov 2026: "combine both admins"): rezekii.com's admin calendar and drafts. Techwide's own TikTok
 * accounts can be rescheduled, cancelled, marked published or scheduled from Drafts; creators' posts are shown, not changed.
 */
const MYT = 8 * 3600_000;
const hhmm = (iso: string) => new Date(Date.parse(iso) + MYT).toISOString().slice(11, 16);
const dayKey = (iso: string) => new Date(Date.parse(iso) + MYT).toISOString().slice(0, 10);
const label12 = (t: string) => { const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kuala_Lumpur" });
export const PRIVACY: Record<string, string> = { PUBLIC_TO_EVERYONE: "Everyone", MUTUAL_FOLLOW_FRIENDS: "Friends", FOLLOWER_OF_CREATOR: "Followers", SELF_ONLY: "Only Me" };
const STATUS: Record<CalPost["status"], [string, Tone]> = { published: ["Posted", "ok"], scheduled: ["Scheduled", "info"], sending: ["Sending", "warn"], unconfirmed: ["Not Confirmed", "warn"], failed: ["Failed", "bad"], paused: ["Paused: Reconnect", "bad"] };
const CHANGEABLE = ["scheduled", "failed", "paused"];

/** One admin post action; gives back the server's error, or "" when it worked. */
async function act(id: string, body: Record<string, unknown>): Promise<string> {
  const r = await fetch(`/api/admin/posts/${id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  if (!r) return "Couldn't reach Rezekii. Please try again.";
  const j = (await r.json().catch(() => ({}))) as { error?: string };
  return r.ok ? "" : j.error || "Could not change the post.";
}

export function Cover({ src, size = 44 }: { src: string | null; size?: number }) {
  return (
    <span className="ad-cover" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" loading="lazy" /> : <Icon name="video" size={size / 2} />}
    </span>
  );
}

/** Every post on every TikTok account, one week at a time, Malaysia time. */
export function AdminCalendar({ week, posts, now, times, account }: { week: CalWeek; posts: CalPost[]; now: number; times: string[]; account?: string }) {
  const router = useRouter();
  const { toast } = useDemo();
  const handles = [...new Set(posts.map((p) => p.handle))].sort();
  const [acc, setAcc] = useState(() => posts.find((p) => p.openId === account)?.handle ?? "All Accounts");
  const [open, setOpen] = useState<CalPost | null>(null);
  const [mvDay, setMvDay] = useState("");
  const [mvTime, setMvTime] = useState("");
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const shown = posts.filter((p) => acc === "All Accounts" || p.handle === acc);
  const moveDays = Array.from({ length: 21 }, (_, i) => {
    const d = new Date(now + MYT + i * 86400_000);
    return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) };
  });
  const pick = (p: CalPost) => { setOpen(p); setSure(false); const k = dayKey(p.at); setMvDay(k >= week.todayKey ? k : week.todayKey); setMvTime(hhmm(p.at)); };
  const run = async (action: "move" | "cancel" | "published") => {
    if (!open || busy) return;
    setBusy(true);
    const at = action === "move" ? new Date(`${mvDay}T${mvTime || "12:00"}:00+08:00`).toISOString() : undefined;
    const err = await act(open.id, { action, at });
    setBusy(false);
    if (err) return toast(err);
    toast(action === "move" ? `Scheduled for ${moveDays.find((d) => d.key === mvDay)?.label ?? mvDay} ${label12(mvTime)}` : action === "cancel" ? "Cancelled and moved to Drafts" : "Marked as published");
    setOpen(null);
    router.refresh();
  };
  const sp = open;
  const canChange = !!sp && sp.techwide && CHANGEABLE.includes(sp.status);
  const nav = (o: number) => `/admin/posting${o ? `?week=${o}` : ""}`;

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Calendar" sub="Every scheduled and published TikTok post on every account, Malaysia time. Techwide's own accounts can be changed here.">
        <Link href="/admin/posting/drafts" className="ad-btn-ghost">Drafts</Link>
      </Title>
      <div className="ad-weeknav">
        <Link href={nav(week.offset - 1)} className="ad-btn-ghost" aria-label="Previous week"><Icon name="back" size={16} /></Link>
        <b>{week.label}</b>
        <Link href={nav(week.offset + 1)} className="ad-btn-ghost" aria-label="Next week"><Icon name="arrow" size={16} /></Link>
        {week.offset !== 0 && <Link href={nav(0)} className="pb-link">This Week</Link>}
      </div>
      {handles.length > 1 && <Chips label="Account" value={acc} onChange={setAcc} options={[["All Accounts", posts.length], ...handles.map((h): [string, number] => [h, posts.filter((p) => p.handle === h).length])]} />}
      {week.days.map((d) => {
        const list = shown.filter((p) => dayKey(p.at) === d.key).sort((a, b) => a.at.localeCompare(b.at));
        return (
          <section key={d.key} className="v2-card" style={{ padding: "6px 20px" }}>
            <h2 className="v2-h2 ad-dayh">{d.name} {d.date} {d.month}{d.key === week.todayKey && <Pill tone="info">Today</Pill>}</h2>
            <div className="ad-list">
              {list.map((p) => (
                <button key={p.id} type="button" className="ad-row ad-rowbtn" onClick={() => pick(p)}>
                  <Cover src={p.cover} />
                  <span className="main"><b>{p.handle}{p.techwide ? " · Techwide" : ""}</b><small>{(p.caption || "No caption").split("\n")[0].slice(0, 90)}</small></span>
                  <b className="ad-nowrap">{label12(hhmm(p.at))}</b>
                  <Pill tone={STATUS[p.status][1]}>{STATUS[p.status][0]}</Pill>
                </button>
              ))}
              {!list.length && <p className="v2-muted" style={{ padding: "12px 0" }}>No posts.</p>}
            </div>
          </section>
        );
      })}

      {sp && (
        <Sheet title={sp.handle} onClose={() => setOpen(null)}>
          <div className="ad-postsheet">
            <div className="ad-postinfo">
              <Cover src={sp.cover} size={88} />
              <span className="main">
                <b>{when(sp.at)}</b>
                <span style={{ overflowWrap: "anywhere" }}>{sp.caption || "No caption"}</span>
                {sp.privacy && <small className="v2-muted">Who can view: {PRIVACY[sp.privacy] ?? sp.privacy}</small>}
                <span><Pill tone={STATUS[sp.status][1]}>{STATUS[sp.status][0]}</Pill></span>
              </span>
            </div>
            {sp.status === "failed" && <p className="ad-note bad">{sp.error || "TikTok refused the post after 3 tries."}</p>}
            {sp.status === "unconfirmed" && <p className="ad-note warn">Rezekii sent this to TikTok, but TikTok hasn&apos;t confirmed it went live. Check the account in TikTok.</p>}
            {sp.status === "paused" && <p className="ad-note warn">Paused: this account&apos;s TikTok connection expired. It posts as soon as the account is reconnected.</p>}
            {sp.status === "published" && (sp.views !== null
              ? <div className="ad-mini4">{([["Views", sp.views], ["Likes", sp.likes], ["Comments", sp.comments], ["Shares", sp.shares]] as const).map(([k, v]) => <span key={k}><b>{shortCount(v ?? undefined)}</b><small>{k}</small></span>)}</div>
              : <small className="v2-muted">Video numbers show after the next daily stats refresh{sp.privacy === "SELF_ONLY" ? " (TikTok only shares numbers for videos others can see)" : ""}.</small>)}
            {sp.shareUrl && <a href={sp.shareUrl} target="_blank" rel="noreferrer" className="ad-btn-ghost">View on TikTok <Icon name="arrow" size={14} /></a>}
            {!sp.techwide && <small className="v2-muted">This is a creator&apos;s post. Only the creator can change it.</small>}
            {canChange && (
              <div className="ad-move">
                <b>{sp.status === "scheduled" ? "Change the Time" : "Pick a New Time"}</b>
                <div className="ad-move-row">
                  <select className="np-input" aria-label="Day" value={mvDay} onChange={(e) => setMvDay(e.target.value)}>{moveDays.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}</select>
                  <select className="np-input" aria-label="Time" value={mvTime} onChange={(e) => setMvTime(e.target.value)}>{[...new Set([...times, mvTime].filter(Boolean))].sort().map((t) => <option key={t} value={t}>{label12(t)}{times.includes(t) ? " · Recommended" : ""}</option>)}</select>
                </div>
                <button type="button" className="np-btn v2-btn-sm" disabled={busy} onClick={() => void run("move")}>{sp.status === "scheduled" ? "Save New Time" : "Reschedule"}</button>
              </div>
            )}
            {sp.techwide && sp.status === "unconfirmed" && <button type="button" className="ad-btn-ghost" disabled={busy} onClick={() => void run("published")}>It&apos;s Live on TikTok: Mark Published</button>}
            {canChange && (sure ? (
              <div className="ad-move">
                <b>Cancel this post?</b>
                <small className="v2-muted">It won&apos;t publish. The video stays in Drafts if you want it later.</small>
                <div className="ad-move-row">
                  <button type="button" className="ad-btn-ghost" onClick={() => setSure(false)}>Keep</button>
                  <button type="button" className="ad-btn-ghost danger" disabled={busy} onClick={() => void run("cancel")}>Cancel Post</button>
                </div>
              </div>
            ) : <button type="button" className="ad-btn-ghost danger" onClick={() => setSure(true)}>Cancel This Post</button>)}
          </div>
        </Sheet>
      )}
    </div>
  );
}

type Draft = CalPost & { createdAt: string };
type Info = { privacy_level_options: string[]; nextRecommended: string };

/** Drafts on Techwide's own TikTok accounts: they never post until scheduled here, with TikTok's own choices asked each time. */
export function AdminDrafts({ drafts }: { drafts: Draft[] }) {
  const router = useRouter();
  const { toast } = useDemo();
  const [q, setQ] = useState("");
  const [cur, setCur] = useState<Draft | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [infoError, setInfoError] = useState("");
  const [privacy, setPrivacy] = useState("");
  const [pickTime, setPickTime] = useState(false);
  const [dt, setDt] = useState("");
  const [consent, setConsent] = useState(false);
  const [del, setDel] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const s = q.trim().toLowerCase();
  const shown = drafts.filter((d) => !s || `${d.caption} ${d.handle}`.toLowerCase().includes(s));

  const openSheet = (d: Draft) => {
    setCur(d); setInfo(null); setInfoError(""); setPrivacy(""); setPickTime(false); setDt(""); setConsent(false);
    // TikTok asks apps to read the account's posting settings each time before posting.
    fetch(`/api/posts/creator-info?account=${encodeURIComponent(d.openId)}`, { cache: "no-store" })
      .then(async (r) => { const j = (await r.json().catch(() => ({}))) as Info & { error?: string }; if (!r.ok) throw new Error(j.error || "TikTok didn't answer."); setInfo(j); })
      .catch((e: unknown) => setInfoError(e instanceof Error ? e.message : String(e)));
  };
  const schedule = async () => {
    if (!cur || !info || busy) return;
    if (!privacy) return toast("Choose who can view this post");
    if (!consent) return toast("Agree to TikTok's Music Usage Confirmation first");
    const at = !pickTime ? info.nextRecommended : dt ? new Date(`${dt}:00+08:00`).toISOString() : "";
    if (!at) return toast("Pick a date and time");
    setBusy(true);
    const err = await act(cur.id, { action: "move", at, privacy, consent });
    setBusy(false);
    if (err) return toast(err);
    toast(`Scheduled for ${when(at)}`);
    setCur(null);
    router.refresh();
  };
  const remove = async () => {
    if (!del || busy) return;
    setBusy(true);
    const err = await act(del.id, { action: "delete" });
    setBusy(false);
    setDel(null);
    if (err) return toast(err);
    toast("Draft deleted");
    router.refresh();
  };

  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Drafts" sub="Saved posts on Techwide's TikTok accounts with no time yet. They never post until you schedule them.">
        <Link href="/admin/posting" className="ad-btn-ghost">Calendar</Link>
      </Title>
      <Search value={q} onChange={setQ} placeholder="Search captions or accounts" />
      <section className="v2-card" style={{ padding: "6px 20px" }}>
        <div className="ad-list">
          {shown.map((d) => (
            <div key={d.id} className="ad-row">
              <Cover src={d.cover} />
              <span className="main"><b>{(d.caption || "No caption").split("\n")[0].slice(0, 90)}</b><small>{d.handle}{d.privacy ? ` · ${PRIVACY[d.privacy] ?? d.privacy}` : ""} · Saved {when(d.createdAt)}</small></span>
              {del?.id === d.id ? (
                <span className="acts"><small className="v2-muted">Delete? The video file goes too.</small><button type="button" className="ad-btn-ghost" onClick={() => setDel(null)}>Keep</button><button type="button" className="ad-btn-ghost danger" disabled={busy} onClick={() => void remove()}>Delete</button></span>
              ) : (
                <span className="acts"><button type="button" className="np-btn v2-btn-sm" onClick={() => openSheet(d)}>Schedule</button><button type="button" className="ad-btn-ghost danger" onClick={() => setDel(d)}>Delete</button></span>
              )}
            </div>
          ))}
          {!shown.length && <p className="v2-muted" style={{ padding: "14px 0" }}>{drafts.length ? "No drafts match." : "No drafts. Drafts saved from New Post on Techwide's accounts show here."}</p>}
        </div>
      </section>

      {cur && (
        <Sheet title="Schedule This Draft" onClose={() => setCur(null)}>
          <div className="ad-postsheet">
            <span style={{ overflowWrap: "anywhere" }}>{cur.caption || "No caption"} · {cur.handle}</span>
            {infoError && <p className="ad-note bad">{infoError}</p>}
            {!info && !infoError && <p className="v2-muted">Reading the account&apos;s TikTok settings…</p>}
            {info && (
              <>
                <label className="pb-field"><b>Who Can View <span style={{ color: "var(--red)" }}>· Required</span></b>
                  <select className="np-input" value={privacy} onChange={(e) => setPrivacy(e.target.value)}>
                    <option value="">Choose who can view…</option>
                    {info.privacy_level_options.map((o) => <option key={o} value={o}>{PRIVACY[o] ?? o}</option>)}
                  </select>
                </label>
                <Chips label="When" value={pickTime ? "Pick a Time" : "Recommended Time"} onChange={(v) => setPickTime(v === "Pick a Time")} options={[["Recommended Time"], ["Pick a Time"]]} />
                {!pickTime ? <b>Next free recommended time: {when(info.nextRecommended)}</b> : <input type="datetime-local" className="np-input" aria-label="Date and time (Malaysia time)" value={dt} onChange={(e) => setDt(e.target.value)} />}
                <label className="ad-consent"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>By posting, you agree to TikTok&apos;s <a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer" className="pb-link">Music Usage Confirmation</a>.</span></label>
                <button type="button" className="np-btn" disabled={busy} onClick={() => void schedule()}>{busy ? "Scheduling…" : "Schedule"}</button>
              </>
            )}
          </div>
        </Sheet>
      )}
    </div>
  );
}

/** Every TikTok account connected to Rezekii: Techwide's own and creators'. Techwide's can be removed or connected here. */
export function AdminTikTokAccounts({ accounts }: { accounts: AdminAccount[] }) {
  const router = useRouter();
  const { toast } = useDemo();
  type F = "All" | "Techwide" | "Creators" | "Needs Reconnecting";
  const [f, setF] = useState<F>("All");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<AdminAccount | null>(null);
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const fits = (a: AdminAccount, x: F) => x === "All" || (x === "Techwide" ? a.techwide : x === "Creators" ? !a.techwide : a.tiktok === "expired");
  const s = q.trim().toLowerCase();
  const shown = accounts.filter((a) => fits(a, f) && (!s || `${a.handle} ${a.owner}`.toLowerCase().includes(s)));
  const remove = async () => {
    if (!open || busy) return;
    setBusy(true);
    const r = await fetch(`/api/admin/accounts/${encodeURIComponent(open.openId)}`, { method: "DELETE" }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string } | undefined;
    setBusy(false);
    if (!r?.ok) return toast(j?.error || "Could not remove the account.");
    toast(`${open.handle} removed`);
    setOpen(null);
    router.refresh();
  };
  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="TikTok Accounts" sub="Every TikTok account connected to Rezekii: Techwide's own and creators'. To connect a Techwide account, sign out of TikTok in this browser first if it's signed in to another account.">
        <a href="/api/auth/tiktok/start" className="np-btn v2-btn-sm">Connect Techwide Account</a>
      </Title>
      <Chips<F> label="Show" value={f} onChange={setF} options={(["All", "Techwide", "Creators", "Needs Reconnecting"] as F[]).map((x) => [x, accounts.filter((a) => fits(a, x)).length])} />
      <Search value={q} onChange={setQ} placeholder="Search handle or owner" />
      <section className="v2-card" style={{ padding: "6px 20px" }}>
        <div className="ad-list">
          {shown.map((a) => (
            <button key={a.openId} type="button" className="ad-row ad-rowbtn" onClick={() => { setOpen(a); setSure(false); }}>
              <Cover src={a.avatar} />
              <span className="main"><b>{a.handle}{a.techwide ? " · Techwide" : ""}</b><small>{a.owner}{a.shop ? " · TikTok Shop linked" : ""}</small></span>
              <span className="ad-nowrap v2-muted">{a.queued} queued</span>
              <Pill tone={a.tiktok === "ok" ? "ok" : "bad"}>{a.tiktok === "ok" ? "Connected" : "Needs Reconnecting"}</Pill>
            </button>
          ))}
          {!shown.length && <p className="v2-muted" style={{ padding: "14px 0" }}>No accounts.</p>}
        </div>
      </section>
      {open && (
        <Sheet title={open.handle} onClose={() => setOpen(null)}>
          <div className="ad-postsheet">
            <small className="v2-muted">{open.owner} · connected {new Date(open.connectedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" })}</small>
            {open.tiktok === "expired" && <p className="ad-note warn">TikTok stopped accepting this connection. {open.techwide ? "Reconnect it to keep posting." : "The creator has to connect it again."}</p>}
            {open.tiktok === "expired" && open.techwide && <a href="/api/auth/tiktok/start" className="np-btn v2-btn-sm">Reconnect Now</a>}
            <div className="ad-mini4" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              <span><b>{open.queued}</b><small>Posts Queued</small></span>
              <span><b>{open.techwide ? "—" : open.links30.toLocaleString("en-US")}</b><small>Links in 30 Days</small></span>
            </div>
            <Link href={`/admin/posting?account=${encodeURIComponent(open.openId)}`} className="ad-btn-ghost">See This Account&apos;s Posts</Link>
            {open.techwide ? (sure ? (
              <div className="ad-move">
                <b>Remove {open.handle}?</b>
                <small className="v2-muted">Rezekii can no longer post for it and its queued posts are cancelled. Its posted videos and link history are kept as business records.</small>
                <div className="ad-move-row"><button type="button" className="ad-btn-ghost" onClick={() => setSure(false)}>Keep</button><button type="button" className="ad-btn-ghost danger" disabled={busy} onClick={() => void remove()}>Remove</button></div>
              </div>
            ) : <button type="button" className="ad-btn-ghost danger" onClick={() => setSure(true)}>Remove Account from Rezekii</button>)
              : <Link href="/admin/users/creators" className="pb-link">Manage This Creator in Users</Link>}
          </div>
        </Sheet>
      )}
    </div>
  );
}

type Metric = "views" | "likes" | "comments" | "shares";
const METRICS: [Metric, string][] = [["views", "Views"], ["likes", "Likes"], ["comments", "Comments"], ["shares", "Shares"]];
const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** Every public video on connected TikTok accounts, whoever posted it, from the daily refresh; totals compare with the period before. */
export function AdminVideoStats({ rows, refreshedAt, now }: { rows: VideoRow[]; refreshedAt: string | null; now: number }) {
  const handles = [...new Set(rows.map((r) => r.handle))].sort();
  const [acc, setAcc] = useState("All Accounts");
  const [range, setRange] = useState("30 Days");
  const [sort, setSort] = useState<Metric>("views");
  const days = Number(range.split(" ")[0]);
  const at = (r: VideoRow) => (r.at ? Date.parse(r.at) : 0);
  const mine = rows.filter((r) => acc === "All Accounts" || r.handle === acc);
  const cur = mine.filter((r) => at(r) >= now - days * 86400_000);
  const prev = mine.filter((r) => at(r) < now - days * 86400_000 && at(r) >= now - 2 * days * 86400_000);
  const sum = (list: VideoRow[], m: Metric) => list.reduce((s, r) => s + r[m], 0);
  const top = [...cur].sort((a, b) => b[sort] - a[sort]).slice(0, 50);
  const exportCsv = () => {
    const lines = [["Posted", "Account", "Video", "Posted With", "Views", "Likes", "Comments", "Shares", "Link"], ...[...cur].sort((a, b) => at(b) - at(a)).map((r) => [r.at, r.handle, r.title, r.viaRezekii ? "Rezekii" : "TikTok", r.views, r.likes, r.comments, r.shares, r.url])];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.map((l) => l.map(csvCell).join(",")).join("\n")], { type: "text/csv" }));
    a.download = "rezekii-video-stats.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="v2-stack v2-in" style={{ gap: 18 }}>
      <Title title="Video Stats" sub={`Every public video on connected TikTok accounts, whoever posted it. Refreshed daily; 180 days kept.${refreshedAt ? ` Last refreshed ${when(refreshedAt)}.` : ""}`}>
        <button type="button" className="ad-btn-ghost" disabled={!cur.length} onClick={exportCsv}>Export CSV</button>
      </Title>
      {handles.length > 1 && <Chips label="Account" value={acc} onChange={setAcc} options={[["All Accounts"], ...handles.map((h): [string] => [h])]} />}
      <Chips label="Posted in the last" value={range} onChange={setRange} options={[["7 Days"], ["30 Days"], ["90 Days"]]} />
      <div className="ad-kpis">
        {METRICS.map(([m, label]) => {
          const v = sum(cur, m), p = sum(prev, m);
          const delta = p ? Math.round(((v - p) / p) * 100) : null;
          return (
            <div key={m} className="ad-kpi">
              <small>{label}</small>
              <b>{shortCount(v)}</b>
              <em>{cur.length} {cur.length === 1 ? "video" : "videos"}{delta !== null ? ` · ${delta >= 0 ? "+" : ""}${delta}% vs the ${days} days before` : ""}</em>
            </div>
          );
        })}
      </div>
      <section className="v2-card" style={{ padding: "6px 20px" }}>
        <div className="ad-dayh" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
          <h2 className="v2-h2" style={{ margin: 0, fontSize: 16 }}>Top Videos</h2>
          <Chips<Metric> label="Sort by" value={sort} onChange={setSort} options={METRICS.map(([m]) => [m])} />
        </div>
        <div className="ad-list">
          {top.map((r) => (
            <div key={r.id} className="ad-row">
              <Cover src={r.cover} />
              <span className="main"><b>{r.title.split("\n")[0].slice(0, 90)}</b><small>{r.handle} · {r.at ? when(r.at) : ""} · {r.viaRezekii ? "Posted with Rezekii" : "Posted in TikTok"}</small></span>
              <span className="ad-nowrap v2-muted">{shortCount(r.views)} views · {shortCount(r.likes)} likes</span>
              {r.url && <a href={r.url} target="_blank" rel="noreferrer" className="ad-btn-ghost">Open</a>}
            </div>
          ))}
          {!top.length && <p className="v2-muted" style={{ padding: "14px 0" }}>No videos posted in this time.</p>}
        </div>
      </section>
    </div>
  );
}
