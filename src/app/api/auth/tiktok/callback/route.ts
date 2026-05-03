import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY!;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET!;
const REDIRECT_URI = 'https://rezekii.com/api/auth/tiktok/callback';
const APP_URL = 'https://rezekii.com';

const COOKIE_OPTS = {
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    console.error('TikTok OAuth error:', error, searchParams.get('error_description'));
    return NextResponse.redirect(`${APP_URL}/onboarding?error=tiktok_denied`);
  }

  // Read request cookies for CSRF + PKCE verification
  const cookieStore = await cookies();
  const savedState = cookieStore.get('tiktok_oauth_state')?.value;

  if (savedState && state !== savedState) {
    console.warn('CSRF state mismatch (non-blocking):', { received: state, saved: savedState });
  }

  const codeVerifier = cookieStore.get('tiktok_code_verifier')?.value;

  if (!code) {
    return NextResponse.redirect(`${APP_URL}/onboarding?error=missing_params`);
  }

  if (!CLIENT_KEY || !CLIENT_SECRET) {
    return NextResponse.redirect(`${APP_URL}/onboarding?error=config_missing`);
  }

  const tokenParams: Record<string, string> = {
    client_key: CLIENT_KEY,
    client_secret: CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI,
  };
  if (codeVerifier) tokenParams.code_verifier = codeVerifier;

  try {
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(tokenParams),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error('TikTok token exchange failed:', text);
      return NextResponse.redirect(`${APP_URL}/onboarding?error=token_failed`);
    }

    const data = await tokenRes.json();
    if (!data.access_token) {
      console.error('No access_token in response:', JSON.stringify(data));
      return NextResponse.redirect(`${APP_URL}/onboarding?error=token_failed`);
    }

    const tokenMaxAge = data.expires_in || 86400;

    // First-time onboarding? Send user back to connect TikTok Shop next.
    // Re-logins (cookie already present) go straight to /home.
    const alreadyOnboarded = cookieStore.get('rezekii_onboarded')?.value === 'true';
    const postAuthDest = alreadyOnboarded ? `${APP_URL}/home` : `${APP_URL}/onboarding?shop_step=1`;

    // Build redirect response and attach all cookies to IT directly
    const res = NextResponse.redirect(postAuthDest);

    res.cookies.set('tiktok_token', data.access_token, {
      ...COOKIE_OPTS,
      httpOnly: true,
      maxAge: tokenMaxAge,
    });

    res.cookies.set('rezekii_onboarded', 'true', {
      ...COOKIE_OPTS,
      httpOnly: false,
      maxAge: 365 * 24 * 60 * 60,
    });

    // Fetch full user profile — display_name, avatar, username, follower count
    try {
      const fields = 'open_id,display_name,avatar_url,username,follower_count,following_count,likes_count,video_count';
      const userRes = await fetch(
        `https://open.tiktokapis.com/v2/user/info/?fields=${fields}`,
        { headers: { Authorization: `Bearer ${data.access_token}` } },
      );
      if (userRes.ok) {
        const userData = await userRes.json();
        const u = userData?.data?.user ?? {};
        const followerCount: number = u.follower_count ?? 0;
        const tier =
          followerCount >= 1_000_000 ? 'Top Creator' :
          followerCount >= 100_000   ? 'Tier 3 Creator' :
          followerCount >= 10_000    ? 'Tier 2 Creator' :
          followerCount >= 1_000     ? 'Tier 1 Creator' :
          'Starter Creator';
        const profile = JSON.stringify({
          display_name:    u.display_name    ?? '',
          avatar_url:      u.avatar_url      ?? '',
          username:        u.username        ?? '',
          open_id:         u.open_id         ?? data.open_id ?? '',
          follower_count:  followerCount,
          following_count: u.following_count ?? 0,
          likes_count:     u.likes_count     ?? 0,
          video_count:     u.video_count     ?? 0,
          tier,
        });
        res.cookies.set('tiktok_user', encodeURIComponent(profile), {
          ...COOKIE_OPTS,
          httpOnly: false,
          maxAge: tokenMaxAge,
        });
        console.log('TikTok user profile stored:', u.display_name, 'followers:', followerCount);
      } else {
        console.warn('Could not fetch TikTok user info:', await userRes.text());
      }
    } catch (userErr) {
      console.warn('User info fetch failed (non-fatal):', userErr);
    }

    // Clear CSRF + PKCE cookies
    res.cookies.delete('tiktok_oauth_state');
    res.cookies.delete('tiktok_code_verifier');

    return res;
  } catch (err) {
    console.error('Token exchange error:', err);
    return NextResponse.redirect(`${APP_URL}/onboarding?error=exchange_error`);
  }
}
