import type { AppUser } from "../accounts/users.ts";
import type { Platform } from "./rules.ts";

/**
 * Facebook, Instagram and Threads posting, for every signed-in account (owner, 23 Oct 2026: Meta's App Review tests it as a
 * creator). Until Meta approves the permissions, only people with a role on the Meta app can finish connecting.
 */
export const canUseSocial = (u: Pick<AppUser, "role"> | null | undefined) => !!u;

export const isPlatform = (p: string | null | undefined): p is Platform => p === "facebook" || p === "instagram" || p === "threads";
