import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { refreshInstagramToken } from "../../integrations/meta/instagram.ts";
import { refreshThreadsToken } from "../../integrations/meta/threads.ts";
import { decryptToken, encryptToken } from "../creator-accounts/token-crypto.ts";
import type { Platform } from "./rules.ts";

/** A connected Facebook Page, Instagram account or Threads profile. Tokens are stored encrypted and never leave the server. */
export type SocialAccount = {
  id: string;
  user_id: string;
  platform: Platform;
  external_id: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
  account_type: string | null;
  token_enc: string;
  token_expires_at: string | null;
  status: "active" | "reconnect";
  connected_at: string;
};
export type PublicAccount = Omit<SocialAccount, "token_enc" | "user_id" | "token_expires_at">;
const PUBLIC = "id,platform,external_id,name,username,avatar_url,account_type,status,connected_at";
const iso = () => new Date().toISOString();

/** Saves a connection; connecting the same account again refreshes it (no duplicate). */
export async function saveAccount(userId: string, a: { platform: Platform; externalId: string; name?: string | null; username?: string | null; avatarUrl?: string | null; accountType?: string | null; token: string; expiresIn?: number | null }): Promise<void> {
  await supabaseRest("social_accounts?on_conflict=user_id,platform,external_id", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      user_id: userId,
      platform: a.platform,
      external_id: a.externalId,
      name: a.name ?? null,
      username: a.username ?? null,
      avatar_url: a.avatarUrl ?? null,
      account_type: a.accountType ?? null,
      token_enc: encryptToken(a.token),
      token_expires_at: a.expiresIn ? new Date(Date.now() + a.expiresIn * 1000).toISOString() : null,
      status: "active",
      updated_at: iso(),
    }),
  });
}

export async function listAccounts(userId: string): Promise<PublicAccount[]> {
  return (await supabaseRest(`social_accounts?user_id=eq.${userId}&select=${PUBLIC}&order=connected_at`)).json();
}

export async function getAccount(id: string, userId?: string): Promise<SocialAccount | null> {
  const mine = userId ? `&user_id=eq.${userId}` : "";
  const [row] = (await (await supabaseRest(`social_accounts?id=eq.${id}${mine}&limit=1`)).json()) as SocialAccount[];
  return row ?? null;
}

/** Disconnect: its scheduled posts are cancelled ("Channel disconnected"); posted history stays. */
export async function removeAccount(userId: string, id: string): Promise<boolean> {
  const acc = await getAccount(id, userId);
  if (!acc) return false;
  await supabaseRest(`social_posts?account_id=eq.${id}&status=in.(draft,scheduled)`, {
    method: "PATCH",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({ status: "cancelled", next_attempt_at: null, last_error: "Channel disconnected", updated_at: iso() }),
  });
  await supabaseRest(`social_accounts?id=eq.${id}&user_id=eq.${userId}`, { method: "DELETE", headers: { prefer: "return=minimal" } });
  return true;
}

/** Meta withdrew or expired the access: the channel shows "Reconnect" until the owner connects it again. */
export async function markReconnect(id: string): Promise<void> {
  await supabaseRest(`social_accounts?id=eq.${id}`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ status: "reconnect", updated_at: iso() }) });
}

const RENEW_BEFORE_MS = 7 * 86400e3;

/** The account's token, renewed (and saved) when an Instagram or Threads token has under 7 days left. Page tokens don't expire. */
export async function freshToken(acc: SocialAccount): Promise<string> {
  const token = decryptToken(acc.token_enc);
  if (!acc.token_expires_at || acc.platform === "facebook") return token;
  if (new Date(acc.token_expires_at).getTime() > Date.now() + RENEW_BEFORE_MS) return token;
  const t = acc.platform === "instagram" ? await refreshInstagramToken(token) : await refreshThreadsToken(token);
  await supabaseRest(`social_accounts?id=eq.${acc.id}`, {
    method: "PATCH",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify({ token_enc: encryptToken(t.token), token_expires_at: new Date(Date.now() + t.expiresIn * 1000).toISOString(), updated_at: iso() }),
  });
  return t.token;
}

/** Accounts whose 60-day token runs out within a week, renewed by the timer even when nothing is posted. */
export async function accountsToRenew(limit: number): Promise<SocialAccount[]> {
  const soon = new Date(Date.now() + RENEW_BEFORE_MS).toISOString();
  return (await supabaseRest(`social_accounts?status=eq.active&platform=in.(instagram,threads)&token_expires_at=lt.${encodeURIComponent(soon)}&order=token_expires_at&limit=${limit}`)).json();
}
