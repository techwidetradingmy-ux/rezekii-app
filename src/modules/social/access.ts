import type { AppUser } from "../accounts/users.ts";
import type { Platform } from "./rules.ts";

/**
 * While the Meta app is in Development mode only accounts with a role on it can connect, so the new channels show for
 * Admins only (flow W1). Opening them to creators is a separate change.
 */
export const canUseSocial = (u: Pick<AppUser, "role"> | null | undefined) => u?.role === "admin";

export const isPlatform = (p: string | null | undefined): p is Platform => p === "facebook" || p === "instagram" || p === "threads";
