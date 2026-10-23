import { GRAPH_VERSION, THREADS_VERSION, MetaError, metaFetch, qs } from "./graph.ts";

/**
 * Community → Numbers (owner, 23 Oct 2026): a channel's day and its recent posts' numbers, read with the channel's own token.
 * Meta's 2025 names: views and viewers replaced impressions (page_impressions, Instagram impressions and plays are gone). A
 * number Meta refuses is left out rather than failing the channel: the call is retried one number at a time.
 */
const G = (path: string) => `https://graph.facebook.com/${GRAPH_VERSION}/${path}`;
const IG = (path: string) => `https://graph.instagram.com/${GRAPH_VERSION}/${path}`;
const TH = (path: string) => `https://graph.threads.net/${THREADS_VERSION}/${path}`;

/** A channel's day. Threads' account "views" are profile views, so they are kept apart. */
export type DayNumbers = { followers?: number; views?: number; reach?: number; engagement?: number; follows?: number; unfollows?: number; profile_views?: number };
export type PostNumbers = { views?: number; reach?: number; likes?: number; comments?: number; shares?: number; saves?: number; reposts?: number; quotes?: number };
export type PostStat = { id: string; postedAt: string | null; permalink: string | null; caption: string; thumb: string | null; numbers: PostNumbers };

type Metric = { name: string; total_value?: { value?: unknown }; values?: { value?: unknown }[] };
const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null);

/** Meta's insights answer as { metric: number }: a total value, or the values added up (objects, i.e. breakdowns, are skipped). */
export function metricValues(data: Metric[] | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of data ?? []) {
    const total = num(m.total_value?.value);
    if (total !== null) out[m.name] = total;
    else if (m.values?.length) {
      const vs = m.values.map((v) => num(v.value)).filter((v): v is number => v !== null);
      if (vs.length) out[m.name] = vs.reduce((a, b) => a + b, 0);
    }
  }
  return out;
}

/** Reads `metrics` in one call; when Meta refuses the set, one call per metric, keeping the ones it answers. */
async function metricsOf(url: (metrics: string) => string, metrics: string[]): Promise<Record<string, number>> {
  try {
    return metricValues((await metaFetch<{ data?: Metric[] }>(url(metrics.join(",")))).data);
  } catch (err) {
    if (err instanceof MetaError && err.needsReconnect) throw err;
    const out: Record<string, number> = {};
    for (const m of metrics) {
      try {
        Object.assign(out, metricValues((await metaFetch<{ data?: Metric[] }>(url(m))).data));
      } catch (e) {
        if (e instanceof MetaError && e.needsReconnect) throw e;
      }
    }
    if (!Object.keys(out).length) throw err;
    return out;
  }
}

/** The first field set Meta accepts (a richer one first, plainer ones when a field or permission is missing). */
async function firstAccepted<T>(urls: string[]): Promise<T> {
  let last: unknown;
  for (const url of urls) {
    try {
      return await metaFetch<T>(url);
    } catch (err) {
      if (err instanceof MetaError && err.needsReconnect) throw err;
      last = err;
    }
  }
  throw last;
}

const unix = (iso: string) => String(Math.floor(Date.parse(iso) / 1000));
const pick = <K extends string>(o: Record<string, number>, map: Record<K, string | string[]>) => {
  const out = {} as Record<K, number>;
  for (const [k, from] of Object.entries(map) as [K, string | string[]][]) {
    const names = Array.isArray(from) ? from : [from];
    const vs = names.map((n) => o[n]).filter((v): v is number => v !== undefined);
    if (vs.length) out[k] = vs.reduce((a, b) => a + b, 0);
  }
  return out;
};

// ---- Facebook Page (Page token) ----

/** A Page's day between `from` and `to` (ISO times): followers now, the day's views, viewers, engagement and follows. */
export async function facebookDay(pageId: string, token: string, from: string, to: string): Promise<DayNumbers> {
  const page = await metaFetch<{ followers_count?: number; fan_count?: number }>(G(`${pageId}?${qs({ fields: "followers_count,fan_count", access_token: token })}`));
  const m = await metricsOf(
    (metrics) => G(`${pageId}/insights?${qs({ metric: metrics, period: "day", since: unix(from), until: unix(to), access_token: token })}`),
    ["page_media_view", "page_total_media_view_unique", "page_post_engagements", "page_daily_follows_unique", "page_daily_unfollows_unique"],
  );
  return { followers: page.followers_count ?? page.fan_count, ...pick(m, { views: "page_media_view", reach: "page_total_media_view_unique", engagement: "page_post_engagements", follows: "page_daily_follows_unique", unfollows: "page_daily_unfollows_unique" }) };
}

type FbPost = {
  id: string; created_time?: string; message?: string; permalink_url?: string; full_picture?: string; shares?: { count?: number };
  comments?: { summary?: { total_count?: number } }; reactions?: { summary?: { total_count?: number } }; insights?: { data?: Metric[] };
};
export function facebookPostStat(p: FbPost): PostStat {
  const m = metricValues(p.insights?.data);
  const numbers: PostNumbers = { ...pick(m, { views: "post_media_view", reach: "post_total_media_view_unique" }) };
  if (p.reactions?.summary?.total_count !== undefined) numbers.likes = p.reactions.summary.total_count;
  if (p.comments?.summary?.total_count !== undefined) numbers.comments = p.comments.summary.total_count;
  if (p.shares?.count !== undefined) numbers.shares = p.shares.count;
  return { id: p.id, postedAt: p.created_time ?? null, permalink: p.permalink_url ?? null, caption: (p.message ?? "").slice(0, 200), thumb: p.full_picture ?? null, numbers };
}

/** The Page's posts since `since` (up to 30) with their numbers, in one call. */
export async function facebookPosts(pageId: string, token: string, since: string): Promise<PostStat[]> {
  const base = "id,created_time,message,permalink_url,full_picture,shares";
  const counts = "comments.summary(true).limit(0),reactions.summary(true).limit(0)";
  const ins = "insights.metric(post_media_view,post_total_media_view_unique)";
  const url = (fields: string) => G(`${pageId}/published_posts?${qs({ fields, since: unix(since), limit: "30", access_token: token })}`);
  const r = await firstAccepted<{ data?: FbPost[] }>([url(`${base},${counts},${ins}`), url(`${base},${counts}`), url(base)]);
  return (r.data ?? []).map(facebookPostStat);
}

// ---- Instagram (Instagram Login) ----

export async function instagramDay(igId: string, token: string, from: string, to: string): Promise<DayNumbers> {
  const user = await metaFetch<{ followers_count?: number }>(IG(`${igId}?${qs({ fields: "followers_count", access_token: token })}`));
  const m = await metricsOf(
    (metrics) => IG(`${igId}/insights?${qs({ metric: metrics, period: "day", metric_type: "total_value", since: unix(from), until: unix(to), access_token: token })}`),
    ["views", "reach", "total_interactions"],
  );
  return { followers: user.followers_count, ...pick(m, { views: "views", reach: "reach", engagement: "total_interactions" }) };
}

type IgMedia = { id: string; timestamp?: string; permalink?: string; thumbnail_url?: string; media_url?: string; media_type?: string; like_count?: number; comments_count?: number; caption?: string };

/** The account's posts since `since` (up to 30): counts from the list, views, reach, saves and shares from each post. */
export async function instagramPosts(igId: string, token: string, since: string): Promise<PostStat[]> {
  const url = (fields: string) => IG(`${igId}/media?${qs({ fields, limit: "30", access_token: token })}`);
  const base = "id,timestamp,permalink,thumbnail_url,media_url,media_type,like_count,comments_count";
  const r = await firstAccepted<{ data?: IgMedia[] }>([url(`${base},caption`), url(base)]);
  const recent = (r.data ?? []).filter((x) => !x.timestamp || x.timestamp >= since);
  const out: PostStat[] = [];
  for (const x of recent) {
    const m = await metricsOf((metrics) => IG(`${x.id}/insights?${qs({ metric: metrics, access_token: token })}`), ["views", "reach", "saved", "shares"]).catch((err) => {
      if (err instanceof MetaError && err.needsReconnect) throw err;
      return {};
    });
    const numbers: PostNumbers = { ...pick(m, { views: "views", reach: "reach", saves: "saved", shares: "shares" }) };
    if (x.like_count !== undefined) numbers.likes = x.like_count;
    if (x.comments_count !== undefined) numbers.comments = x.comments_count;
    out.push({ id: x.id, postedAt: x.timestamp ?? null, permalink: x.permalink ?? null, caption: (x.caption ?? "").slice(0, 200), thumb: x.thumbnail_url ?? (x.media_type === "IMAGE" ? x.media_url ?? null : null), numbers });
  }
  return out;
}

// ---- Threads ----

export async function threadsDay(userId: string, token: string, from: string, to: string): Promise<DayNumbers> {
  const f = await metricsOf((metrics) => TH(`${userId}/threads_insights?${qs({ metric: metrics, access_token: token })}`), ["followers_count"]).catch((err) => {
    if (err instanceof MetaError && err.needsReconnect) throw err;
    return {} as Record<string, number>;
  });
  const m = await metricsOf(
    (metrics) => TH(`${userId}/threads_insights?${qs({ metric: metrics, since: unix(from), until: unix(to), access_token: token })}`),
    ["views", "likes", "replies", "reposts", "quotes"],
  );
  return { ...pick(f, { followers: "followers_count" }), ...pick(m, { profile_views: "views", engagement: ["likes", "replies", "reposts", "quotes"] }) };
}

type ThreadsPost = { id: string; timestamp?: string; permalink?: string; text?: string; thumbnail_url?: string; media_type?: string };

export async function threadsPosts(userId: string, token: string, since: string): Promise<PostStat[]> {
  const r = await metaFetch<{ data?: ThreadsPost[] }>(TH(`${userId}/threads?${qs({ fields: "id,timestamp,permalink,text,thumbnail_url,media_type", since: unix(since), limit: "30", access_token: token })}`));
  const out: PostStat[] = [];
  for (const x of (r.data ?? []).filter((p) => p.media_type !== "REPOST_FACADE")) {
    const m = await metricsOf((metrics) => TH(`${x.id}/insights?${qs({ metric: metrics, access_token: token })}`), ["views", "likes", "replies", "reposts", "quotes", "shares"]).catch((err) => {
      if (err instanceof MetaError && err.needsReconnect) throw err;
      return {} as Record<string, number>;
    });
    out.push({ id: x.id, postedAt: x.timestamp ?? null, permalink: x.permalink ?? null, caption: (x.text ?? "").slice(0, 200), thumb: x.thumbnail_url ?? null, numbers: pick(m, { views: "views", likes: "likes", comments: "replies", reposts: "reposts", quotes: "quotes", shares: "shares" }) });
  }
  return out;
}
