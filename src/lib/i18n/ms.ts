import { APP_COMMON } from "./ms/app-common.ts";
import { APP_HOME } from "./ms/app-home.ts";
import { APP_MARKET } from "./ms/app-market.ts";
import { APP_IDEAS } from "./ms/app-ideas.ts";
import { APP_ANALYTICS } from "./ms/app-analytics.ts";
import { APP_PUBLISH } from "./ms/app-publish.ts";
import { APP_ACCOUNT } from "./ms/app-account.ts";
import { APP_REWARDS } from "./ms/app-rewards.ts";
import { APP_SIGNIN } from "./ms/app-signin.ts";
import { APP_LANDING } from "./ms/app-landing.ts";
import { APP_SELLER } from "./ms/app-seller.ts";
import { APP_SERVER } from "./ms/app-server.ts";

/** The Malay word lists by area, kept apart so each screen's text is easy to find and check (owner, 3 Nov 2026). */
export const MS_PARTS = { APP_COMMON, APP_HOME, APP_MARKET, APP_IDEAS, APP_ANALYTICS, APP_PUBLISH, APP_ACCOUNT, APP_REWARDS, APP_SIGNIN, APP_LANDING, APP_SELLER, APP_SERVER };

/** English text → Malay (Bahasa Melayu), for every page that switches language. */
export const MS: Record<string, string> = Object.assign({}, ...Object.values(MS_PARTS));
