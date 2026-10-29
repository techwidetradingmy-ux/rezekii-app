import type { IconName } from "@/components/icons";

/** My Account's sections; the address bar keeps the open one (#referral) so links and the account panel can open it. */
export const ACCOUNT_TABS = [
  ["profile", "Profile", "user"],
  ["level", "Level & Badges", "medal"],
  ["wallet", "Wallet", "wallet"],
  ["referral", "Referral", "users"],
  ["samples", "Samples & Delivery", "box"],
  ["wish", "Wish List", "gift"],
  ["connections", "Connections", "link"],
  ["rate-card", "Rate Card", "tag"],
  ["settings", "Settings", "gear"],
] as const satisfies readonly (readonly [string, string, IconName])[];
export type AccountTab = (typeof ACCOUNT_TABS)[number][0];

/** Asks the shell to open the account panel (phones). */
export const OPEN_ACCOUNT_MENU = "rz-account-menu";
