import {
  facebookCommentAction,
  facebookComments,
  instagramCommentAction,
  instagramComments,
  noPermission,
  type CommentAction,
  type CommentedPost,
} from "../../integrations/meta/comments.ts";
import { MetaError } from "../../integrations/meta/graph.ts";
import { tx } from "../../lib/i18n/lang.ts";
import { freshToken, getAccount, markReconnect, type SocialAccount } from "./accounts.ts";

/**
 * Comments (owner, 9 Nov 2026): every account reads and answers the comments on its own Facebook Pages and Instagram
 * accounts. Each look is read live from Meta (nothing is stored), one channel at a time.
 */
export type ChannelComments = { posts: CommentedPost[]; problem?: "reconnect" | "permission" };
export const ACTIONS: CommentAction[] = ["reply", "hide", "unhide", "delete"];
export const REPLY_MAX = 2000;

/** A channel of the signed-in account that has comments here (Facebook or Instagram), or null. */
async function ownChannel(userId: string, accountId: string): Promise<SocialAccount | null> {
  const acc = await getAccount(accountId, userId);
  return acc && (acc.platform === "facebook" || acc.platform === "instagram") ? acc : null;
}

/** Meta says the sign-in has ended: the channel shows Reconnect, as a failed post does. */
async function ended(acc: SocialAccount, err: unknown): Promise<boolean> {
  if (!(err instanceof MetaError && err.needsReconnect)) return false;
  if (acc.status !== "reconnect") await markReconnect(acc.id);
  return true;
}

export async function channelComments(userId: string, accountId: string): Promise<ChannelComments | null> {
  const acc = await ownChannel(userId, accountId);
  if (!acc) return null;
  try {
    const token = await freshToken(acc);
    const posts = acc.platform === "facebook" ? await facebookComments(acc.external_id, token) : await instagramComments(acc.external_id, token, acc.username);
    return { posts };
  } catch (err) {
    if (await ended(acc, err)) return { posts: [], problem: "reconnect" };
    if (noPermission(err)) return { posts: [], problem: "permission" };
    throw err;
  }
}

/** Reply to, hide, show again or delete one comment on the account's own channel. Returns the reply's id for a reply. */
export async function commentAction(userId: string, accountId: string, commentId: string, action: CommentAction, message = ""): Promise<{ ok: true; id: string | null } | { ok: false; error: string }> {
  if (!ACTIONS.includes(action) || !/^[\w.-]{1,100}$/.test(commentId)) return { ok: false, error: tx("Something's missing. Reload the page and try again.") };
  const text = message.trim();
  if (action === "reply" && !text) return { ok: false, error: tx("Write a reply first.") };
  if (text.length > REPLY_MAX) return { ok: false, error: tx("Keep the reply under 2,000 characters.") };
  const acc = await ownChannel(userId, accountId);
  if (!acc) return { ok: false, error: tx("This channel isn't connected to your account.") };
  try {
    const token = await freshToken(acc);
    const id = acc.platform === "facebook" ? await facebookCommentAction(commentId, token, action, text) : await instagramCommentAction(commentId, token, action, text);
    return { ok: true, id };
  } catch (err) {
    if (await ended(acc, err)) return { ok: false, error: tx("This channel needs connecting again (Posts → New post → Channels).") };
    if (noPermission(err)) return { ok: false, error: tx("Connect this channel again once so Meta allows answering comments (Posts → New post → Channels).") };
    return { ok: false, error: err instanceof Error ? err.message.slice(0, 300) : tx("Meta didn't answer. Try again.") };
  }
}
