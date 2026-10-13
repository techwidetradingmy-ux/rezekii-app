import { supabaseRest } from "../../integrations/supabase/rest.ts";
import type { PostRow } from "../posting/store.ts";
import { logActivity } from "./admins.ts";

/** How a post shows on the admin calendar. */
export type CalStatus = "published" | "scheduled" | "sending" | "unconfirmed" | "failed" | "paused";
export type CalPost = {
  id: string;
  openId: string;
  handle: string;
  techwide: boolean;
  caption: string;
  privacy: string | null;
  status: CalStatus;
  /** When it posts (or posted), ISO */
  at: string;
  error: string | null;
  tiktokPostId: string | null;
  cover: string | null;
  shareUrl: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
};

const UNCONFIRMED_AFTER_MS = 30 * 60_000;

/** Rezekii's post status → the calendar's (an expired TikTok connection pauses scheduled posts). Pure. */
export function calStatus(p: Pick<PostRow, "status" | "updated_at">, expired: boolean, now: number): CalStatus | null {
  if (p.status === "posted" || p.status === "sent_to_inbox") return "published";
  if (p.status === "failed") return "failed";
  if (p.status === "scheduled") return expired ? "paused" : "scheduled";
  if (p.status === "publishing") return "sending";
  if (p.status === "processing") return now - Date.parse(p.updated_at) > UNCONFIRMED_AFTER_MS ? "unconfirmed" : "sending";
  return null;
}

type Conn = { open_id: string; user_id: string; username: string | null; refresh_token_expires_at: string };

async function accountIndex() {
  const [conns, admins] = await Promise.all([
    supabaseRest("tiktok_connections?select=open_id,user_id,username,refresh_token_expires_at&limit=2000").then((r) => r.json() as Promise<Conn[]>),
    supabaseRest("app_users?role=eq.admin&select=id").then((r) => r.json() as Promise<{ id: string }[]>),
  ]);
  const adminIds = new Set(admins.map((a) => a.id));
  return new Map(conns.map((c) => [c.open_id, { handle: c.username ? `@${c.username}` : "TikTok account", techwide: adminIds.has(c.user_id), expired: Date.parse(c.refresh_token_expires_at) < Date.now() }]));
}

/** Every post on every account between two times (not drafts or cancelled), with video numbers for published ones. */
export async function postsBetween(fromIso: string, toIso: string): Promise<CalPost[]> {
  const cols = "id,tiktok_open_id,caption,privacy_level,status,scheduled_at,posted_at,updated_at,last_error,tiktok_post_id";
  const range = `or=(and(scheduled_at.gte.${fromIso},scheduled_at.lt.${toIso}),and(posted_at.gte.${fromIso},posted_at.lt.${toIso}))`;
  const [rows, accounts] = await Promise.all([
    supabaseRest(`posts?status=not.in.(draft,cancelled)&${range}&select=${cols}&order=scheduled_at&limit=3000`).then((r) => r.json() as Promise<PostRow[]>),
    accountIndex(),
  ]);
  const ids = rows.map((p) => p.tiktok_post_id).filter((x): x is string => !!x);
  const videos = ids.length
    ? new Map(((await (await supabaseRest(`tiktok_videos?video_id=in.(${ids.join(",")})&select=video_id,cover,share_url,views,likes,comments,shares`)).json()) as { video_id: string; cover: string | null; share_url: string | null; views: number; likes: number; comments: number; shares: number }[]).map((v) => [v.video_id, v]))
    : new Map();
  const now = Date.now();
  return rows.flatMap((p) => {
    const acc = accounts.get(p.tiktok_open_id);
    const status = calStatus(p, acc?.expired ?? false, now);
    if (!status) return [];
    const v = p.tiktok_post_id ? videos.get(p.tiktok_post_id) : undefined;
    return [{
      id: p.id, openId: p.tiktok_open_id, handle: acc?.handle ?? "Disconnected account", techwide: acc?.techwide ?? false, caption: p.caption, privacy: p.privacy_level,
      status, at: (status === "published" ? p.posted_at : null) ?? p.scheduled_at ?? p.updated_at, error: status === "failed" ? p.last_error : null,
      tiktokPostId: p.tiktok_post_id, cover: v?.cover ?? null, shareUrl: v?.share_url ?? null,
      views: v ? Number(v.views) : null, likes: v ? Number(v.likes) : null, comments: v ? Number(v.comments) : null, shares: v ? Number(v.shares) : null,
    }];
  });
}

/** Drafts on Techwide's team accounts (posts saved with no time). */
export async function teamDrafts(): Promise<(CalPost & { createdAt: string })[]> {
  const accounts = await accountIndex();
  const team = [...accounts.entries()].filter(([, a]) => a.techwide).map(([id]) => id);
  if (!team.length) return [];
  const rows = (await (await supabaseRest(`posts?status=eq.draft&tiktok_open_id=in.(${team.map(encodeURIComponent).join(",")})&select=id,tiktok_open_id,caption,privacy_level,created_at,updated_at&order=created_at.desc&limit=500`)).json()) as PostRow[];
  return rows.map((p) => ({
    id: p.id, openId: p.tiktok_open_id, handle: accounts.get(p.tiktok_open_id)?.handle ?? "", techwide: true, caption: p.caption, privacy: p.privacy_level, status: "scheduled" as CalStatus,
    at: p.created_at, error: null, tiktokPostId: null, cover: null, shareUrl: null, views: null, likes: null, comments: null, shares: null, createdAt: p.created_at,
  }));
}

/** A post an admin may change: only on Techwide's team accounts (creators manage their own posts). */
async function teamPost(id: string): Promise<(PostRow & { handle: string }) | null> {
  const [p] = (await (await supabaseRest(`posts?id=eq.${encodeURIComponent(id)}&select=*&limit=1`)).json()) as PostRow[];
  if (!p) return null;
  const acc = (await accountIndex()).get(p.tiktok_open_id);
  return acc?.techwide ? { ...p, handle: acc.handle } : null;
}

const patch = (id: string, body: Partial<PostRow>) =>
  supabaseRest(`posts?id=eq.${id}`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }) });
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kuala_Lumpur" });

export type AdminPostResult = { ok: true } | { ok: false; error: string; status: number };
const notTeam: AdminPostResult = { ok: false, error: "Only posts on Techwide's own accounts can be changed here. Creators manage their own posts.", status: 403 };

/** Schedule (or reschedule) a team post for a new time: scheduled, failed and draft posts. */
export async function movePost(id: string, iso: string, actor: string): Promise<AdminPostResult> {
  const p = await teamPost(id);
  if (!p) return notTeam;
  if (!["scheduled", "failed", "draft"].includes(p.status)) return { ok: false, error: "This post can't be moved any more.", status: 409 };
  const t = Date.parse(iso);
  if (!Number.isFinite(t) || t < Date.now() + 60_000) return { ok: false, error: "Pick a time at least a minute from now.", status: 400 };
  if (t > Date.now() + 60 * 86400_000) return { ok: false, error: "Pick a time within the next 60 days.", status: 400 };
  if (p.status === "draft" && !p.privacy_level && p.mode === "direct") return { ok: false, error: "Open this draft in New post to pick who can view it before scheduling.", status: 409 };
  const at = new Date(t).toISOString();
  await patch(id, { status: "scheduled", scheduled_at: at, next_attempt_at: at, attempts: 0, last_error: null });
  await logActivity(actor, "Posts", `${p.status === "scheduled" ? "rescheduled" : "scheduled"} ${p.handle} for ${when(at)}`);
  return { ok: true };
}

/** Cancel a team post that hasn't gone out: it moves to Drafts. */
export async function cancelPost(id: string, actor: string): Promise<AdminPostResult> {
  const p = await teamPost(id);
  if (!p) return notTeam;
  if (!["scheduled", "failed"].includes(p.status)) return { ok: false, error: "This post can't be cancelled any more.", status: 409 };
  await patch(id, { status: "draft", next_attempt_at: null });
  await logActivity(actor, "Posts", `cancelled ${p.handle} ${p.scheduled_at ? when(p.scheduled_at) : ""} (moved to Drafts)`);
  return { ok: true };
}

/** An unconfirmed team post the admin checked on TikTok: mark it published. */
export async function markPublished(id: string, actor: string): Promise<AdminPostResult> {
  const p = await teamPost(id);
  if (!p) return notTeam;
  if (p.status !== "processing") return { ok: false, error: "Only posts waiting for TikTok's confirmation can be marked.", status: 409 };
  await patch(id, { status: "posted", posted_at: new Date().toISOString() });
  await logActivity(actor, "Posts", `marked ${p.handle} ${p.scheduled_at ? when(p.scheduled_at) : ""} as published`);
  return { ok: true };
}

/** Delete a team draft for good (its uploaded video stays until storage cleanup). */
export async function deleteDraft(id: string, actor: string): Promise<AdminPostResult> {
  const p = await teamPost(id);
  if (!p) return notTeam;
  if (p.status !== "draft") return { ok: false, error: "Only drafts can be deleted.", status: 409 };
  await patch(id, { status: "cancelled" });
  await logActivity(actor, "Posts", `deleted a draft on ${p.handle}`);
  return { ok: true };
}
