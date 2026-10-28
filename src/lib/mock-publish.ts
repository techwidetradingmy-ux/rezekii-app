/**
 * Sample channels and brands for New post (creator and seller), following V1's composer. Invented accounts; nothing is
 * connected or sent anywhere.
 */
import type { Channel } from "@/components/publish/rules";

export type PubChannel = { key: string; app: Channel; name: string; sub: string; initials: string; color: string; status: "active" | "reconnect" };
export type PubBrand = { id: string; name: string; channels: string[] };
export type PublishSetup = {
  /** Shown as the account in the phone previews. */
  channels: PubChannel[];
  brands: PubBrand[];
  /** Channels of the last post, for "Same as last post". */
  last: string[];
  /** Apps that can still be connected (the "+ Threads" chips). */
  connectable: PubChannel[];
  sample: { main: string; tags: string; link: string; cta: string; cover: string; file: string; seconds: number };
  calendar: string;
};

const ch = (key: string, app: Channel, name: string, sub: string, initials: string, color: string, status: PubChannel["status"] = "active"): PubChannel => ({ key, app, name, sub, initials, color, status });

export const CREATOR_SETUP: PublishSetup = {
  channels: [
    ch("tt-aisyah", "tiktok", "@aisyah.glow", "TikTok", "AR", "#00a862"),
    ch("fb-aisyah", "facebook", "Aisyah Glow", "Facebook Page", "AG", "#1877f2"),
    ch("ig-aisyah", "instagram", "Aisyah Glow", "@aisyah.glow", "AR", "#e1306c"),
  ],
  brands: [{ id: "b1", name: "Aisyah Glow", channels: ["tt-aisyah", "fb-aisyah", "ig-aisyah"] }],
  last: ["tt-aisyah", "ig-aisyah", "fb-aisyah"],
  connectable: [ch("th-aisyah", "threads", "Aisyah Glow", "@aisyah.glow", "AR", "#111111")],
  sample: {
    main: "Thermos test part 3: is coffee still hot after 12 hours?\nI tried it on a full work day, 7am to 7pm.\nDapatkan di sini 👉 https://vt.tiktok.com/ZSthermos/",
    tags: "#thermos #kopi #tiktokshopmy",
    link: "https://vt.tiktok.com/ZSthermos/",
    cta: "Dapatkan di sini 👉",
    cover: "/products/tap-21.jpg",
    file: "thermos-part3.mp4",
    seconds: 42,
  },
  calendar: "/app/publish/calendar",
};

export const SELLER_SETUP: PublishSetup = {
  channels: [
    ch("tt-seri", "tiktok", "@seriliving.my", "TikTok", "SL", "#00a862"),
    ch("fb-seri", "facebook", "Seri Living MY", "Facebook Page", "SL", "#1877f2"),
    ch("fb-outlet", "facebook", "Seri Living Outlet", "Facebook Page", "SO", "#3b5ba9"),
    ch("ig-seri", "instagram", "Seri Living MY", "@seriliving.my", "SL", "#e1306c"),
    ch("ig-deals", "instagram", "Seri Living Deals", "@seriliving.deals", "SD", "#c13584", "reconnect"),
    ch("th-seri", "threads", "Seri Living MY", "@seriliving.my", "SL", "#111111"),
  ],
  brands: [
    { id: "b1", name: "Seri Living MY", channels: ["tt-seri", "fb-seri", "ig-seri", "th-seri"] },
    { id: "b2", name: "Seri Living Outlet", channels: ["fb-outlet", "ig-deals"] },
  ],
  last: ["fb-seri", "ig-seri", "th-seri"],
  connectable: [],
  sample: {
    main: "Chopper vs knife: 1 kg onions in 30 seconds.\nNo more crying in the kitchen.\nDapatkan di sini 👉 https://vt.tiktok.com/ZSchopper/",
    tags: "#dapur #chopper #tiktokshopmy",
    link: "https://vt.tiktok.com/ZSchopper/",
    cta: "Dapatkan di sini 👉",
    cover: "/products/tap-11.jpg",
    file: "chopper-onions.mp4",
    seconds: 34,
  },
  calendar: "/seller/app/publish/calendar",
};
