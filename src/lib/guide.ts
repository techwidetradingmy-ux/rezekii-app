import { tx } from "@/lib/i18n/lang";
import type { IconName } from "@/components/icons";

/**
 * Beginner guide (owner, 4 Nov 2026), in English; every screen shows it in her language. Three parts: the Welcome Tour (one
 * card per tab, once per account), Getting Started on Home (first steps ticked from real data) and the Guide page (short
 * how-tos with a button straight to the page).
 */
export type GuideSide = "creator" | "seller";
export type TourCard = { icon: IconName; title: string; line: string; tone: string };

export const TOUR: Record<GuideSide, TourCard[]> = {
  creator: [
    { icon: "scan", title: tx("Home"), line: tx("Press and hold Scan to check the products you already promote for better commission."), tone: "green" },
    { icon: "store", title: tx("Marketplace"), line: tx("Find products to promote, see their commission and request free samples."), tone: "blue" },
    { icon: "chart", title: tx("Analytics"), line: tx("See your sales, commission and payouts from TikTok Shop."), tone: "purple" },
    { icon: "send", title: tx("Publish"), line: tx("Today's Ideas tells you what to film next."), tone: "orange" },
    { icon: "gift", title: tx("Missions"), line: tx("Check in and finish small tasks to earn credits every day."), tone: "pink" },
  ],
  seller: [
    { icon: "home", title: tx("Home"), line: tx("See what needs you first and how your products are doing."), tone: "green" },
    { icon: "box", title: tx("Products"), line: tx("Register products for creators to promote and follow each one until it's live."), tone: "blue" },
    { icon: "chart", title: tx("Results"), line: tx("See the sales, videos and samples from creators promoting your products."), tone: "purple" },
    { icon: "send", title: tx("Publish"), line: tx("Plan and schedule posts for your shop."), tone: "orange" },
    { icon: "gift", title: tx("Rewards"), line: tx("Finish missions and invite friends to earn credits."), tone: "pink" },
  ],
};

/** Getting Started: the first steps, in order (ids match the server's real-data checks). */
export const FIRST_STEPS: Record<GuideSide, { id: string; title: string; href: string }[]> = {
  creator: [
    { id: "profile", title: tx("Fill In Your Profile"), href: "/app/account#profile" },
    { id: "shop", title: tx("Link TikTok Shop"), href: "/app/account#connections" },
    { id: "scan", title: tx("Run Your First Showcase Scan"), href: "/app" },
    { id: "sample", title: tx("Request Your First Sample"), href: "/app/market" },
  ],
  seller: [
    { id: "connect", title: tx("Connect Seller Center"), href: "/seller/connect" },
    { id: "register", title: tx("Register Your First Products"), href: "/seller/app/submit" },
    { id: "invite", title: tx("Invite a Creator or Seller"), href: "/seller/app/rewards/referral" },
  ],
};

export type HowTo = { icon: IconName; title: string; steps: string[]; href: string };

/** The Guide page: what people most often want to do, step by step. */
export const HOW_TOS: Record<GuideSide, HowTo[]> = {
  creator: [
    {
      icon: "store", title: tx("Find a Product to Promote"), href: "/app/market",
      steps: [tx("Open Marketplace."), tx("Pick a category or search for a product."), tx("Tap a product to see its commission and sales."), tx("Tap Add to Showcase to start promoting it.")],
    },
    {
      icon: "scan", title: tx("Check Your Showcase Commissions"), href: "/app",
      steps: [tx("Link TikTok Shop in My Account → Connections."), tx("Go to Home."), tx("Press and hold Scan."), tx("See which products have a better rate on Rezekii, and add them in one tap.")],
    },
    {
      icon: "gift", title: tx("Request a Free Sample"), href: "/app/market",
      steps: [tx("Open a product with Free Sample in Marketplace."), tx("Tap Request Free Sample."), tx("TikTok Shop opens. Check your address and apply there."), tx("Follow it in My Account → Samples & Delivery.")],
    },
    {
      icon: "flame", title: tx("Earn Credits With Missions"), href: "/app/rewards",
      steps: [tx("Open Missions."), tx("Check in every day to keep your streak."), tx("Finish a task, then tap its button to collect your credits."), tx("See your credits in My Account → Wallet.")],
    },
  ],
  seller: [
    {
      icon: "box", title: tx("Register Your Products"), href: "/seller/app/submit",
      steps: [tx("Connect Seller Center in Settings."), tx("Open Products → Register Products."), tx("Register your products in your campaign in Seller Center."), tx("Techwide reviews each one. Follow it in Products → Progress.")],
    },
    {
      icon: "star", title: tx("See What Creators Want"), href: "/seller/app/wanted",
      steps: [tx("Open Products → Wanted by Creators."), tx("See which of your products creators want to promote."), tx("Register the ones you're happy to offer.")],
    },
    {
      icon: "chart", title: tx("Check Your Results"), href: "/seller/app/results",
      steps: [tx("Open Results."), tx("TAP Performance shows sales and videos from creators."), tx("Where Samples Went shows who got your samples and what they posted.")],
    },
  ],
};

/** Where the Guide page lives in each app. */
export const GUIDE_HREF: Record<GuideSide, string> = { creator: "/app/guide", seller: "/seller/app/guide" };
