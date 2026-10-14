import { supabaseRest } from "../../integrations/supabase/rest.ts";
import type { AppUser } from "../accounts/users.ts";
import { userTikTokOpenId } from "../posting/store.ts";
import { accessFor, placesFull, type AccessStatus } from "./access.ts";

export type OnboardingState = {
  signedIn: string;
  status: AccessStatus | "none";
  reason: string | null;
  position: number | null;
  /** The linked TikTok Shop account, as TikTok Shop names it. */
  shop: { username: string; avatar: string | null } | null;
  /** Every place is taken: the creator can only join the waitlist. */
  full: boolean;
  tiktok: boolean;
};

/** Where a creator is in getting set up: signed in, TikTok Shop linked (required), approved by Techwide. */
export async function onboardingState(user: AppUser): Promise<OnboardingState> {
  const [access, shops, full, openId] = await Promise.all([
    accessFor(user.id),
    supabaseRest(`affiliate_connections?user_id=eq.${user.id}&select=username,avatar_url&order=updated_at.desc&limit=1`).then((r) => (r.ok ? (r.json() as Promise<{ username: string; avatar_url: string | null }[]>) : [])),
    placesFull(user.id),
    userTikTokOpenId(user.id),
  ]);
  const shop = shops[0];
  return {
    signedIn: user.tiktok_open_id && user.tiktok_username ? `With TikTok · @${user.tiktok_username}` : `As ${user.email ?? "your Rezekii account"}`,
    status: access?.status ?? "none",
    reason: access?.reason ?? null,
    position: access?.position ?? null,
    shop: shop ? { username: shop.username, avatar: shop.avatar_url } : null,
    full,
    tiktok: !!openId,
  };
}
