import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

/**
 * GET /api/auth/tiktok-shop/connect
 *
 * Initiates TikTok Shop OAuth.
 * Redirects the user to TikTok's consent screen so they can authorise
 * Rezekii to read their affiliate creator data.
 *
 * ⚠️  Register https://rezekii.com/api/auth/tiktok-shop/callback
 *     as an allowed redirect URI in TikTok Shop Partner Center
 *     (App Management → App Info → Redirect Domain).
 */

const APP_KEY     = process.env.TIKTOK_SHOP_APP_KEY    ?? '';
const APP_URL     = 'https://rezekii.com';
const REDIRECT_URI = `${APP_URL}/api/auth/tiktok-shop/callback`;

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   true,
  sameSite: 'lax' as const,
  path:     '/',
  maxAge:   600, // 10-minute window to complete OAuth
};

export async function GET() {
  if (!APP_KEY) {
    console.error('[TikTokShop] TIKTOK_SHOP_APP_KEY is not set');
    return NextResponse.redirect(`${APP_URL}/home?error=shop_config_missing`);
  }

  // CSRF state
  const state = randomBytes(16).toString('hex');

  // Build TikTok Shop OAuth URL
  const params = new URLSearchParams({
    app_key:      APP_KEY,
    state,
    redirect_uri: REDIRECT_URI,
  });

  const authUrl = `https://auth.tiktok-shops.com/oauth/authorize?${params}`;

  const res = NextResponse.redirect(authUrl);
  res.cookies.set('tts_oauth_state', state, COOKIE_OPTS);
  return res;
}
