import { GRAPH_VERSION, MetaError, THREADS_VERSION, metaFetch, qs } from "./graph.ts";
import { createThreadsReply, publishThreads } from "./threads.ts";

/**
 * Comments (owner, 9 Nov 2026, after Meta approved the app): the latest comments on a Facebook Page's or Instagram account's
 * own posts, and replying to, hiding or deleting them. Only permissions Meta approved for every user are used:
 * pages_read_user_content + pages_manage_engagement (Facebook), instagram_business_manage_comments (Instagram).
 * Threads replies need threads_read_replies, in Meta's second review (owner, 12 Nov 2026): only accounts asked for it see them.
 */
const G = (path: string) => `https://graph.facebook.com/${GRAPH_VERSION}/${path}`;
const IG = (path: string) => `https://graph.instagram.com/${GRAPH_VERSION}/${path}`;
const TH = (path: string) => `https://graph.threads.net/${THREADS_VERSION}/${path}`;

export type Comment = {
  id: string;
  text: string;
  at: string | null;
  /** The commenter's name or username; null when Meta doesn't share it. */
  author: string | null;
  /** Written by the channel itself. */
  mine: boolean;
  hidden: boolean;
  canHide: boolean;
  canDelete: boolean;
  replies: Comment[];
};
export type CommentedPost = { id: string; caption: string; at: string | null; url: string | null; thumb: string | null; total: number; comments: Comment[] };
export type CommentAction = "reply" | "hide" | "unhide" | "delete";

/** How many posts and comments one look reads: enough to answer today's comments, small enough to stay quick. */
const POSTS = "10";
const COMMENTS = 25;
const REPLIES = 10;
const byTime = (a: Comment, b: Comment) => (b.at ?? "").localeCompare(a.at ?? "");

/** Meta refused for want of a permission (the channel was connected before Comments existed). */
export const noPermission = (err: unknown) => err instanceof MetaError && !err.needsReconnect && (err.code === 10 || err.code === 200 || /permission/i.test(err.message));

// ---- Facebook Page (Page token) ----

type FbComment = { id: string; message?: string; created_time?: string; from?: { id?: string; name?: string }; is_hidden?: boolean; can_hide?: boolean; can_remove?: boolean; comments?: { data?: FbComment[] } };
type FbPost = { id: string; message?: string; created_time?: string; permalink_url?: string; full_picture?: string; comments?: { data?: FbComment[]; summary?: { total_count?: number } } };

export function facebookComment(c: FbComment, pageId: string): Comment {
  const mine = c.from?.id === pageId;
  return {
    id: c.id,
    text: c.message ?? "",
    at: c.created_time ?? null,
    author: c.from?.name ?? null,
    mine,
    hidden: !!c.is_hidden,
    // Facebook can't hide a Page's own comment; it says per comment what's allowed.
    canHide: c.can_hide ?? !mine,
    canDelete: c.can_remove ?? true,
    replies: (c.comments?.data ?? []).map((r) => facebookComment(r, pageId)).sort((a, b) => -byTime(a, b)),
  };
}

export function facebookCommentedPost(p: FbPost, pageId: string): CommentedPost {
  return {
    id: p.id,
    caption: (p.message ?? "").slice(0, 300),
    at: p.created_time ?? null,
    url: p.permalink_url ?? null,
    thumb: p.full_picture ?? null,
    total: p.comments?.summary?.total_count ?? p.comments?.data?.length ?? 0,
    comments: (p.comments?.data ?? []).map((c) => facebookComment(c, pageId)).sort(byTime),
  };
}

/** The Page's latest posts with their newest comments and each comment's replies, in one call. */
export async function facebookComments(pageId: string, token: string): Promise<CommentedPost[]> {
  const one = `id,message,created_time,from{id,name},is_hidden,can_hide,can_remove`;
  const fields = `id,message,created_time,permalink_url,full_picture,comments.order(reverse_chronological).limit(${COMMENTS}).summary(true){${one},comments.limit(${REPLIES}){${one}}}`;
  const r = await metaFetch<{ data?: FbPost[] }>(G(`${pageId}/published_posts?${qs({ fields, limit: POSTS, access_token: token })}`));
  return (r.data ?? []).map((p) => facebookCommentedPost(p, pageId));
}

export async function facebookCommentAction(commentId: string, token: string, action: CommentAction, message = ""): Promise<string | null> {
  if (action === "reply") return (await metaFetch<{ id: string }>(G(`${commentId}/comments`), { message, access_token: token })).id;
  if (action === "delete") await metaFetch(G(`${commentId}?${qs({ access_token: token })}`), undefined, 60_000, "DELETE");
  else await metaFetch(G(commentId), { is_hidden: String(action === "hide"), access_token: token });
  return null;
}

// ---- Instagram (Instagram Login) ----

type IgComment = { id: string; text?: string; timestamp?: string; username?: string; from?: { id?: string; username?: string }; hidden?: boolean; replies?: { data?: IgComment[] } };
type IgMedia = { id: string; caption?: string; timestamp?: string; permalink?: string; thumbnail_url?: string; media_url?: string; media_type?: string; comments_count?: number; comments?: { data?: IgComment[] } };

export function instagramComment(c: IgComment, username: string | null): Comment {
  const who = c.username ?? c.from?.username ?? null;
  const mine = !!username && who === username;
  return {
    id: c.id,
    text: c.text ?? "",
    at: c.timestamp ?? null,
    author: who,
    mine,
    hidden: !!c.hidden,
    // Instagram doesn't let an account hide its own comments.
    canHide: !mine,
    canDelete: true,
    replies: (c.replies?.data ?? []).map((r) => instagramComment(r, username)).sort((a, b) => -byTime(a, b)),
  };
}

export function instagramCommentedPost(m: IgMedia, username: string | null): CommentedPost {
  return {
    id: m.id,
    caption: (m.caption ?? "").slice(0, 300),
    at: m.timestamp ?? null,
    url: m.permalink ?? null,
    thumb: m.thumbnail_url ?? (m.media_type === "IMAGE" ? m.media_url ?? null : null),
    total: m.comments_count ?? m.comments?.data?.length ?? 0,
    comments: (m.comments?.data ?? []).map((c) => instagramComment(c, username)).sort(byTime).slice(0, COMMENTS),
  };
}

/** The account's latest posts with their comments and replies, in one call. */
export async function instagramComments(igId: string, token: string, username: string | null): Promise<CommentedPost[]> {
  const one = "id,text,timestamp,username,hidden";
  const fields = `id,caption,timestamp,permalink,thumbnail_url,media_url,media_type,comments_count,comments.limit(50){${one},replies.limit(${REPLIES}){${one}}}`;
  const r = await metaFetch<{ data?: IgMedia[] }>(IG(`${igId}/media?${qs({ fields, limit: POSTS, access_token: token })}`));
  return (r.data ?? []).map((m) => instagramCommentedPost(m, username));
}

export async function instagramCommentAction(commentId: string, token: string, action: CommentAction, message = ""): Promise<string | null> {
  if (action === "reply") return (await metaFetch<{ id: string }>(IG(`${commentId}/replies`), { message, access_token: token })).id;
  if (action === "delete") await metaFetch(IG(`${commentId}?${qs({ access_token: token })}`), undefined, 60_000, "DELETE");
  else await metaFetch(IG(commentId), { hide: String(action === "hide"), access_token: token });
  return null;
}

// ---- Threads (threads_read_replies to read, threads_manage_replies to hide and reply) ----

type ThReply = { id: string; text?: string; timestamp?: string; username?: string; hide_status?: string; replied_to?: { id?: string }; is_reply_owned_by_me?: boolean };
type ThPost = { id: string; text?: string; timestamp?: string; permalink?: string; thumbnail_url?: string; media_url?: string; media_type?: string };

const threadsComment = (r: ThReply, replies: Comment[] = []): Comment => {
  const mine = !!r.is_reply_owned_by_me;
  return {
    id: r.id,
    text: r.text ?? "",
    at: r.timestamp ?? null,
    author: r.username ?? null,
    mine,
    hidden: r.hide_status === "HIDDEN",
    // Threads lets a profile hide others' replies to its posts, not its own; apps can't delete others' replies.
    canHide: !mine,
    canDelete: false,
    replies,
  };
};

/**
 * One post's conversation (all replies, every depth) as top replies with the rest under them: each deeper reply goes under the
 * top reply it belongs to, oldest first.
 */
export function threadsConversation(postId: string, all: ThReply[]): Comment[] {
  const byId = new Map(all.map((r) => [r.id, r]));
  const isTop = (r: ThReply) => !r.replied_to?.id || r.replied_to.id === postId;
  const topOf = (r: ThReply): string | null => {
    let cur: ThReply | undefined = r;
    for (let i = 0; cur && i < 20; i++) {
      if (isTop(cur)) return cur.id;
      cur = byId.get(cur.replied_to?.id ?? "");
    }
    return null;
  };
  const under = new Map<string, ThReply[]>();
  for (const r of all) {
    if (isTop(r)) continue;
    const top = topOf(r);
    if (top) under.set(top, [...(under.get(top) ?? []), r]);
  }
  return all
    .filter(isTop)
    .map((t) => threadsComment(t, (under.get(t.id) ?? []).map((r) => threadsComment(r)).sort((a, b) => -byTime(a, b))))
    .sort(byTime);
}

/** The profile's latest posts with their replies: one call for the posts, then one per post, at the same time. */
export async function threadsComments(userId: string, token: string): Promise<CommentedPost[]> {
  const r = await metaFetch<{ data?: ThPost[] }>(TH(`${userId}/threads?${qs({ fields: "id,text,timestamp,permalink,thumbnail_url,media_url,media_type", limit: POSTS, access_token: token })}`));
  const posts = (r.data ?? []).filter((p) => p.media_type !== "REPOST_FACADE");
  const fields = "id,text,timestamp,username,hide_status,replied_to,is_reply_owned_by_me";
  return Promise.all(
    posts.map(async (p) => {
      const c = await metaFetch<{ data?: ThReply[] }>(TH(`${p.id}/conversation?${qs({ fields, reverse: "false", limit: "50", access_token: token })}`));
      return {
        id: p.id,
        caption: (p.text ?? "").slice(0, 300),
        at: p.timestamp ?? null,
        url: p.permalink ?? null,
        thumb: p.thumbnail_url ?? (p.media_type === "IMAGE" ? p.media_url ?? null : null),
        total: (c.data ?? []).length,
        comments: threadsConversation(p.id, c.data ?? []).slice(0, COMMENTS),
      };
    }),
  );
}

/** Reply (a text reply from the profile, made then published), hide or show again. Apps can't delete Threads replies. */
export async function threadsCommentAction(userId: string, commentId: string, token: string, action: CommentAction, message = "", wait = (ms: number) => new Promise((r) => setTimeout(r, ms))): Promise<string | null> {
  if (action === "delete") throw new Error("Threads replies can't be deleted from here.");
  if (action === "hide" || action === "unhide") {
    await metaFetch(TH(`${commentId}/manage_reply`), { hide: String(action === "hide"), access_token: token });
    return null;
  }
  const container = await createThreadsReply(userId, token, message, commentId);
  // A text reply is usually ready at once; give Threads a moment and try again if it isn't.
  for (let i = 0; ; i++) {
    try {
      return await publishThreads(userId, token, container);
    } catch (err) {
      if (i >= 3 || (err instanceof MetaError && err.needsReconnect)) throw err;
      await wait(1500);
    }
  }
}
