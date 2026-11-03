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
import { APP_PUSH } from "./ms/app-push.ts";
import { APP_ACCOUNTS } from "./ms/app-accounts.ts";
import { APP_GUIDE } from "./ms/app-guide.ts";

/** The Malay word lists by area, kept apart so each screen's text is easy to find and check (owner, 3 Nov 2026). */
export const MS_PARTS = { APP_COMMON, APP_HOME, APP_MARKET, APP_IDEAS, APP_ANALYTICS, APP_PUBLISH, APP_ACCOUNT, APP_REWARDS, APP_SIGNIN, APP_LANDING, APP_SELLER, APP_SERVER, APP_PUSH, APP_ACCOUNTS, APP_GUIDE };

/** English text → Malay (Bahasa Melayu), for every page that switches language. */
export const MS: Record<string, string> = Object.assign({}, ...Object.values(MS_PARTS));
