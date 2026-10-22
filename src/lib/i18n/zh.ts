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

/** The Chinese word lists by page, kept apart so each page's text is easy to find and check. */
export const ZH_PARTS = { COMMON, PRODUCTS, SAMPLES, LINKS, SALES, ACCOUNT, ERRORS, TODAY, LEVELS, RANKINGS, POSTS, PUBLIC };

/** English text → Simplified Chinese, for every page that switches language. */
export const ZH: Record<string, string> = Object.assign({}, ...Object.values(ZH_PARTS));
