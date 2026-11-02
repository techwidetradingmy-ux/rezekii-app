import { ACCOUNT } from "./zh/account.ts";
import { COMMON } from "./zh/common.ts";
import { ERRORS } from "./zh/errors.ts";
import { LEVELS } from "./zh/levels.ts";
import { LINKS } from "./zh/links.ts";
import { POSTS } from "./zh/posts.ts";
import { PRODUCTS } from "./zh/products.ts";
import { PUBLIC } from "./zh/public.ts";
import { RANKINGS } from "./zh/rankings.ts";
import { SALES } from "./zh/sales.ts";
import { SAMPLES } from "./zh/samples.ts";
import { TODAY } from "./zh/today.ts";
import { APP_COMMON } from "./zh/app-common.ts";
import { APP_HOME } from "./zh/app-home.ts";
import { APP_MARKET } from "./zh/app-market.ts";
import { APP_IDEAS } from "./zh/app-ideas.ts";
import { APP_ANALYTICS } from "./zh/app-analytics.ts";
import { APP_PUBLISH } from "./zh/app-publish.ts";
import { APP_ACCOUNT } from "./zh/app-account.ts";
import { APP_REWARDS } from "./zh/app-rewards.ts";
import { APP_SIGNIN } from "./zh/app-signin.ts";
import { APP_LANDING } from "./zh/app-landing.ts";
import { APP_SELLER } from "./zh/app-seller.ts";
import { APP_SERVER } from "./zh/app-server.ts";
import { APP_PUSH } from "./zh/app-push.ts";

/** The Chinese word lists by page, kept apart so each page's text is easy to find and check. Rezekii 2.0's own (app-*) come last. */
export const ZH_PARTS = { COMMON, PRODUCTS, SAMPLES, LINKS, SALES, ACCOUNT, ERRORS, TODAY, LEVELS, RANKINGS, POSTS, PUBLIC, APP_COMMON, APP_HOME, APP_MARKET, APP_IDEAS, APP_ANALYTICS, APP_PUBLISH, APP_ACCOUNT, APP_REWARDS, APP_SIGNIN, APP_LANDING, APP_SELLER, APP_SERVER, APP_PUSH };

/** English text → Simplified Chinese, for every page that switches language. */
export const ZH: Record<string, string> = Object.assign({}, ...Object.values(ZH_PARTS));
