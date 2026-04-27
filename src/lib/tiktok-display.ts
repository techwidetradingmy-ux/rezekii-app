/**
 * TikTok Display API Client
 * ============================================================
 * Docs: https://developers.tiktok.com/doc/display-api-overview
 *
 * The Display API lets you fetch a creator's public TikTok videos,
 * profile info, and follower stats using an OAuth 2.0 access token.
 *
 * Required env vars:
 *   TIKTOK_DISPLAY_CLIENT_KEY    — from TikTok Developer Portal
 *   TIKTOK_DISPLAY_CLIENT_SECRET — from TikTok Developer Portal
 *
 * The access token is obtained via TikTok Login Kit OAuth flow.
 * Store per-user tokens securely (not in .env).
 */

const DISPLAY_BASE = "https://open.tiktokapis.com/v2";

// ─── Types ───────────────────────────────────────────────────

export interface TikTokVideo {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  shareUrl: string;
  embedLink: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  duration: number;        // seconds
  createTime: number;      // Unix timestamp
  platform: "video" | "live";
}

export interface TikTokUserInfo {
  openId: string;
  unionId: string;
  avatarUrl: string;
  displayName: string;
  bioDescription: string;
  profileDeepLink: string;
  isVerified: boolean;
  followerCount: number;
  followingCount: number;
  likesCount: number;
  videoCount: number;
}

// ─── Mock data ────────────────────────────────────────────────

const mockVideos: TikTokVideo[] = [
  {
    id: "v1",
    title: "COSRX Serum Review — Glowing Skin In 7 Days!",
    description: "Testing the famous COSRX Hydro Glow Serum for a week. Honest review! #skincare #cosrx #beautytok",
    coverUrl: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=600&fit=crop",
    shareUrl: "https://www.tiktok.com/@aisyah.creates/video/v1",
    embedLink: "https://www.tiktok.com/embed/v1",
    viewCount: 248000, likeCount: 18200, commentCount: 892, shareCount: 4100,
    duration: 58, createTime: 1745366400, platform: "video",
  },
  {
    id: "v2",
    title: "Unboxing & GRWM Ft. ZALORA Collab",
    description: "Unboxing my ZALORA haul and getting ready with the new linen pieces! #grwm #zalora #fashion",
    coverUrl: "https://images.unsplash.com/photo-1594938298603-c8148c4b4057?w=400&h=600&fit=crop",
    shareUrl: "https://www.tiktok.com/@aisyah.creates/video/v2",
    embedLink: "https://www.tiktok.com/embed/v2",
    viewCount: 312000, likeCount: 24800, commentCount: 1240, shareCount: 6300,
    duration: 92, createTime: 1745107200, platform: "video",
  },
  {
    id: "v3",
    title: "5 Tech Gadgets Under RM200",
    description: "Affordable tech finds that actually work! All linked in bio. #tech #gadgets #budgettech",
    coverUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=600&fit=crop",
    shareUrl: "https://www.tiktok.com/@aisyah.creates/video/v3",
    embedLink: "https://www.tiktok.com/embed/v3",
    viewCount: 155000, likeCount: 9700, commentCount: 430, shareCount: 2800,
    duration: 74, createTime: 1744934400, platform: "video",
  },
  {
    id: "v4",
    title: "Hari Raya Snack Haul LIVE",
    description: "Live shopping session! Trying all the Hari Raya snacks with you guys 🎉",
    coverUrl: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400&h=600&fit=crop",
    shareUrl: "https://www.tiktok.com/@aisyah.creates/video/v4",
    embedLink: "https://www.tiktok.com/embed/v4",
    viewCount: 89000, likeCount: 7200, commentCount: 2100, shareCount: 1500,
    duration: 3600, createTime: 1744761600, platform: "live",
  },
];

const mockUserInfo: TikTokUserInfo = {
  openId:          "user_aisyah_001",
  unionId:         "union_aisyah_001",
  avatarUrl:       "",
  displayName:     "Aisyah Nadirah",
  bioDescription:  "Gold Creator @ Rezekii ✨ | TikTok Shop Affiliate | Malaysian Content Creator 🇲🇾",
  profileDeepLink: "https://www.tiktok.com/@aisyah.creates",
  isVerified:      false,
  followerCount:   24800,
  followingCount:  412,
  likesCount:      284000,
  videoCount:      87,
};

// ─── Helpers ─────────────────────────────────────────────────

async function displayRequest<T>(
  path: string,
  accessToken: string,
  params: Record<string, string> = {},
): Promise<T | null> {
  if (!accessToken) return null;

  const url = new URL(`${DISPLAY_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  try {
    const res  = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 },
    });
    const json = await res.json();
    if (json.error?.code && json.error.code !== "ok") {
      console.error("[TikTok Display] Error:", json.error.message, json.error.code);
      return null;
    }
    return json.data as T;
  } catch (err) {
    console.error("[TikTok Display] Fetch error:", err);
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Get user's TikTok video list.
 * Falls back to mock data when no access token is provided.
 */
export async function getUserVideos(
  accessToken: string,
  maxCount = 20,
): Promise<TikTokVideo[]> {
  if (!accessToken) return mockVideos;

  const data = await displayRequest<{
    videos: Array<{
      id: string;
      title: string;
      video_description: string;
      cover_image_url: string;
      share_url: string;
      embed_link: string;
      view_count: number;
      like_count: number;
      comment_count: number;
      share_count: number;
      duration: number;
      create_time: number;
    }>;
  }>(
    "/video/list/",
    accessToken,
    {
      fields: "id,title,video_description,cover_image_url,share_url,embed_link,view_count,like_count,comment_count,share_count,duration,create_time",
      max_count: maxCount.toString(),
    },
  );

  if (!data?.videos) return mockVideos;

  return data.videos.map((v) => ({
    id:           v.id,
    title:        v.title,
    description:  v.video_description,
    coverUrl:     v.cover_image_url,
    shareUrl:     v.share_url,
    embedLink:    v.embed_link,
    viewCount:    v.view_count,
    likeCount:    v.like_count,
    commentCount: v.comment_count,
    shareCount:   v.share_count,
    duration:     v.duration,
    createTime:   v.create_time,
    platform:     v.duration > 600 ? "live" : "video",
  }));
}

/**
 * Get user profile info.
 * Falls back to mock data when no access token is provided.
 */
export async function getUserInfo(accessToken: string): Promise<TikTokUserInfo> {
  if (!accessToken) return mockUserInfo;

  const data = await displayRequest<{
    user: {
      open_id: string;
      union_id: string;
      avatar_url: string;
      display_name: string;
      bio_description: string;
      profile_deep_link: string;
      is_verified: boolean;
      follower_count: number;
      following_count: number;
      likes_count: number;
      video_count: number;
    };
  }>(
    "/user/info/",
    accessToken,
    { fields: "open_id,union_id,avatar_url,display_name,bio_description,profile_deep_link,is_verified,follower_count,following_count,likes_count,video_count" },
  );

  if (!data?.user) return mockUserInfo;

  const u = data.user;
  return {
    openId:          u.open_id,
    unionId:         u.union_id,
    avatarUrl:       u.avatar_url,
    displayName:     u.display_name,
    bioDescription:  u.bio_description,
    profileDeepLink: u.profile_deep_link,
    isVerified:      u.is_verified,
    followerCount:   u.follower_count,
    followingCount:  u.following_count,
    likesCount:      u.likes_count,
    videoCount:      u.video_count,
  };
}

export const isMockMode = !process.env.TIKTOK_DISPLAY_CLIENT_KEY;
