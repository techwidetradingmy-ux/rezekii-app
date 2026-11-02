import type { IconName } from "@/components/icons";

/** My Account's sections; the address bar keeps the open one (#referral) so links and the account panel can open it. */
export const ACCOUNT_TABS = [
  ["profile", "Profile", "user"],
  ["level", "Level, Streak & Badges", "medal"],
  ["wallet", "Wallet", "wallet"],
  ["referral", "Referral", "users"],
  ["samples", "Samples & Delivery", "box"],
  ["wish", "Wish List", "gift"],
  ["connections", "Connections", "link"],
  ["rate-card", "Rate Card", "tag"],
  ["settings", "Settings", "gear"],
] as const satisfies readonly (readonly [string, string, IconName])[];
export type AccountTab = (typeof ACCOUNT_TABS)[number][0];

/** #streak opens Level, Streak & Badges at its Streak section (owner, 1 Nov 2026). */
export const tabFor = (hash: string): AccountTab | null => (hash === "streak" ? "level" : ACCOUNT_TABS.find(([k]) => k === hash)?.[0] ?? null);

/** Asks the shell to open the account panel (phones). */
export const OPEN_ACCOUNT_MENU = "rz-account-menu";
