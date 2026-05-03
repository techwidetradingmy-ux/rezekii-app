import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const TESTER_FOLLOWER_COUNT = 24300;
const TESTER_FALLBACK = {
  authenticated:   true,
  display_name:    'HomeFitHacks',
  username:        'homefithacksofficial',
  avatar_url:      '',
  follower_count:  TESTER_FOLLOWER_COUNT,
  following_count: 0,
  likes_count:     0,
  video_count:     0,
  tier:            deriveTier(TESTER_FOLLOWER_COUNT),
};

function deriveTier(n: number) {
  if (n >= 1_000_000) return 'Top Creator';
  if (n >= 100_000)   return 'Tier 3 Creator';
  if (n >= 10_000)    return 'Tier 2 Creator';
  if (n >= 1_000)     return 'Tier 1 Creator';
  return 'Starter Creator';
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('tiktok_token')?.value;

  // Not logged in at all
  if (!token) {
    return NextResponse.json({ authenticated: false });
  }

  // Try to get fresh data from TikTok user info API
  try {
    const fields = 'open_id,display_name,avatar_url,username,follower_count,following_count,likes_count,video_count';
    const res = await fetch(
      `https://open.tiktokapis.com/v2/user/info/?fields=${fields}`,
      { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 60 } },
    );

    if (res.ok) {
      const data = await res.json();
      const u = data?.data?.user ?? {};
      const followerCount: number = u.follower_count ?? 0;

      // If TikTok sandbox returned meaningful data, use it
      if (u.display_name || u.username) {
        return NextResponse.json({
          authenticated:   true,
          display_name:    u.display_name    || TESTER_FALLBACK.display_name,
          username:        u.username        || TESTER_FALLBACK.username,
          avatar_url:      u.avatar_url      || '',
          open_id:         u.open_id         || '',
          follower_count:  followerCount     || TESTER_FALLBACK.follower_count,
          following_count: u.following_count ?? 0,
          likes_count:     u.likes_count     ?? 0,
          video_count:     u.video_count     ?? 0,
          tier: deriveTier(followerCount || TESTER_FALLBACK.follower_count),
        });
      }
    }
  } catch {
    // fall through to cookie cache or tester fallback
  }

  // Try cached cookie
  const raw = cookieStore.get('tiktok_user')?.value;
  if (raw) {
    try {
      const cached = JSON.parse(decodeURIComponent(raw));
      if (cached.display_name || cached.username) {
        return NextResponse.json({ authenticated: true, ...cached });
      }
    } catch { /* ignore */ }
  }

  // Sandbox returned no meaningful data — show known tester account
  return NextResponse.json(TESTER_FALLBACK);
}
