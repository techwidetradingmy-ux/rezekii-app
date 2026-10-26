import { MetaError } from "../../integrations/meta/graph.ts";
import { facebookDay, facebookPosts, instagramDay, instagramPosts, threadsDay, threadsPosts, type DayNumbers, type PostNumbers, type PostStat } from "../../integrations/meta/insights.ts";
import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { freshToken, markReconnect, type SocialAccount } from "../social/accounts.ts";
import type { Platform } from "../social/rules.ts";

/**
 * Community → Numbers (owner, 23 Oct 2026): the Admins' Facebook Pages, Instagram accounts and Threads profiles, read once a
 * day: each channel's yesterday (Malaysia time) and its posts from the last 30 days. A channel connected before Community
 * lacks the permissions until it is connected again; that is saved as the day's note, and posting is never affected.
 */
const DAY = 86_400_000;
const MYT = 8 * 3_600_000;
const POST_DAYS = 30;

const post = (path: string, rows: unknown[]) =>
  supabaseRest(path, { method: "POST", headers: { prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows) });

/** The Admins' channels, oldest first: active ones and those waiting to be reconnected, so a channel never silently drops off Numbers. */
async function adminChannels(): Promise<SocialAccount[]> {
  const admins = (await (await supabaseRest("app_users?role=eq.admin&select=id")).json()) as { id: string }[];
  if (!admins.length) return [];
  return (await supabaseRest(`social_accounts?user_id=in.(${admins.map((a) => a.id).join(",")})&status=in.(active,reconnect)&order=connected_at`)).json();
}

/** Yesterday in Malaysia, as its date and its start and end times. */
export function yesterday(now: number): { day: string; from: string; to: string } {
  const startToday = Date.parse(`${new Date(now + MYT).toISOString().slice(0, 10)}T00:00:00Z`) - MYT;
  return { day: new Date(startToday - DAY + MYT).toISOString().slice(0, 10), from: new Date(startToday - DAY).toISOString(), to: new Date(startToday).toISOString() };
}

/** Why a channel's numbers couldn't be read, in words an Admin can act on. */
export function noteFor(err: unknown): string {
  if (err instanceof MetaError) {
    if (err.needsReconnect) return "The sign-in has ended: connect this channel again.";
    if (err.code === 10 || err.code === 200 || /permission/i.test(err.message)) return "Connect this channel again to allow Community's numbers.";
    return err.message.slice(0, 200);
  }
  return err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200);
}

const DAY_READERS: Record<Platform, (id: string, token: string, from: string, to: string) => Promise<DayNumbers>> = { facebook: facebookDay, instagram: instagramDay, threads: threadsDay };
const POST_READERS: Record<Platform, (id: string, token: string, since: string) => Promise<PostStat[]>> = { facebook: facebookPosts, instagram: instagramPosts, threads: threadsPosts };

/** One channel's yesterday and recent posts, saved. Meta saying the sign-in has ended also marks the channel "Reconnect". */
async function refreshChannel(acc: SocialAccount, now: number): Promise<number> {
  const { day, from, to } = yesterday(now);
  let numbers: DayNumbers & { note?: string };
  let posts: PostStat[] = [];
  let failed: unknown;
  try {
    const token = await freshToken(acc);
    // The day and the posts are read apart: a Page connected before Community can still list its posts.
    const [d, p] = await Promise.allSettled([DAY_READERS[acc.platform](acc.external_id, token, from, to), POST_READERS[acc.platform](acc.external_id, token, new Date(now - POST_DAYS * DAY).toISOString())]);
    if (d.status === "rejected") failed = d.reason;
    numbers = d.status === "fulfilled" ? d.value : { note: noteFor(d.reason) };
    // Facebook answers an empty list, not an error, when the Page wasn't connected with Community's permissions.
    if (d.status === "fulfilled" && [numbers.views, numbers.reach, numbers.engagement, numbers.profile_views].every((v) => v === undefined))
      numbers = { ...numbers, note: "Connect this channel again to allow Community's numbers." };
    if (p.status === "fulfilled") posts = p.value;
  } catch (err) {
    failed = err;
    numbers = { note: noteFor(err) };
  }
  if (failed instanceof MetaError && failed.needsReconnect && acc.status !== "reconnect") await markReconnect(acc.id);
  const fetched = new Date(now).toISOString();
  await post("social_stats?on_conflict=account_id,day", [{ account_id: acc.id, day, numbers, fetched_at: fetched }]);
  if (posts.length)
    await post(
      "social_post_stats?on_conflict=account_id,media_id",
      posts.map((p) => ({ account_id: acc.id, media_id: p.id, posted_at: p.postedAt, permalink: p.permalink, caption: p.caption, thumb: p.thumb, numbers: p.numbers, fetched_at: fetched })),
    );
  return posts.length + 1;
}

/** Daily: every Admin channel, from `start`; returns where to carry on (`next`) when `stopAt` comes first. */
export async function refreshCommunity(start: number, stopAt: number, now = Date.now()): Promise<{ count: number; next: number | null }> {
  const channels = await adminChannels();
  let count = 0;
  for (let i = start; i < channels.length; i++) {
    if (Date.now() > stopAt) return { count, next: i };
    count += await refreshChannel(channels[i], now);
  }
  await supabaseRest("rpc/prune_community", { method: "POST", body: JSON.stringify({ today: new Date(now + MYT).toISOString().slice(0, 10) }) });
  return { count, next: null };
}

export type CommunityChannel = { id: string; platform: Platform; name: string; avatar: string | null; connectedAt: string };
export type CommunityDay = { channel: string; day: string; numbers: DayNumbers & { note?: string }; at: string };
export type CommunityPost = { channel: string; id: string; at: string | null; url: string | null; caption: string; thumb: string | null; numbers: PostNumbers };

/** What Numbers shows: the Admins' channels, their days from the last `days` days and their posts from the last 30 days. */
export async function communityNumbers(days: number, now = Date.now()): Promise<{ channels: CommunityChannel[]; days: CommunityDay[]; posts: CommunityPost[]; refreshedAt: string | null; now: number }> {
  const accounts = await adminChannels();
  const channels = accounts.map((a) => ({ id: a.id, platform: a.platform, name: a.name ?? a.username ?? a.platform, avatar: a.avatar_url, connectedAt: a.connected_at }));
  if (!channels.length) return { channels, days: [], posts: [], refreshedAt: null, now };
  const ids = channels.map((c) => c.id).join(",");
  const since = new Date(now + MYT - days * DAY).toISOString().slice(0, 10);
  const [dayRows, postRows] = await Promise.all([
    supabaseRest(`social_stats?account_id=in.(${ids})&day=gte.${since}&select=account_id,day,numbers,fetched_at&order=day`).then((r) => r.json() as Promise<{ account_id: string; day: string; numbers: CommunityDay["numbers"]; fetched_at: string }[]>),
    supabaseRest(`social_post_stats?account_id=in.(${ids})&posted_at=gte.${new Date(now - POST_DAYS * DAY).toISOString()}&select=account_id,media_id,posted_at,permalink,caption,thumb,numbers&order=posted_at.desc&limit=2000`).then(
      (r) => r.json() as Promise<{ account_id: string; media_id: string; posted_at: string | null; permalink: string | null; caption: string | null; thumb: string | null; numbers: PostNumbers }[]>,
    ),
  ]);
  return {
    channels,
    days: dayRows.map((r) => ({ channel: r.account_id, day: r.day, numbers: r.numbers, at: r.fetched_at })),
    posts: postRows.map((r) => ({ channel: r.account_id, id: r.media_id, at: r.posted_at, url: r.permalink, caption: r.caption ?? "", thumb: r.thumb, numbers: r.numbers })),
    refreshedAt: dayRows.reduce<string | null>((m, r) => (!m || r.fetched_at > m ? r.fetched_at : m), null),
    now,
  };
}
