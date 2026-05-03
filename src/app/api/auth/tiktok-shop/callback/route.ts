import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ClientConfiguration, AccessTokenTool } from '@/lib/tiktokshop-sdk';
import { TikTokShopNodeApiClient } from '@/lib/tiktokshop-sdk';

/**
 * GET /api/auth/tiktok-shop/callback
 *
 * Handles the redirect back from TikTok Shop OAuth.
 * Exchanges the auth_code for access + refresh tokens,
 * fetches the shop cipher, and stores everything in httpOnly cookies.
 *
 * Cookies written:
 *   tts_access_token   — Shop API access token  (httpOnly, 7 days)
 *   tts_refresh_token  — Shop API refresh token (httpOnly, 30 days)
 *   tts_shop_cipher    — Required for Shop API calls (httpOnly, 7 days)
 *   tts_shop_connected — Client-visible flag     (7 days)
 */

const APP_KEY    = process.env.TIKTOK_SHOP_APP_KEY    ?? '';
const APP_SECRET = process.env.TIKTOK_SHOP_APP_SECRET ?? '';
const APP_URL    = 'https://rezekii.com';

const COOKIE_BASE = {
  secure:   true,
  sameSite: 'lax' as const,
  path:     '/',
};

// Configure SDK globals once at module load
ClientConfiguration.globalConfig.app_key    = APP_KEY;
ClientConfiguration.globalConfig.app_secret = APP_SECRET;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const authCode = searchParams.get('code') ?? searchParams.get('auth_code');
  const state    = searchParams.get('state');
  const errParam = searchParams.get('error');

  if (errParam) {
    console.error('[TikTokShop] OAuth error from TikTok:', errParam);
    return NextResponse.redirect(`${APP_URL}/home?error=shop_denied`);
  }

  if (!authCode) {
    return NextResponse.redirect(`${APP_URL}/home?error=shop_missing_code`);
  }

  // CSRF check (non-blocking — log only, to avoid locking out dev flows)
  const cookieStore = await cookies();
  const savedState  = cookieStore.get('tts_oauth_state')?.value;
  if (savedState && state !== savedState) {
    console.warn('[TikTokShop] CSRF state mismatch:', { received: state, saved: savedState });
  }

  if (!APP_KEY || !APP_SECRET) {
    console.error('[TikTokShop] App key/secret not configured');
    return NextResponse.redirect(`${APP_URL}/home?error=shop_config_missing`);
  }

  // ── 1. Exchange auth_code for access + refresh tokens ─────────────────────
  let accessToken   = '';
  let refreshToken  = '';
  let tokenExpireIn = 7 * 24 * 3600;      // default 7 days
  let refreshExpireIn = 30 * 24 * 3600;   // default 30 days

  try {
    const tokenResult = await AccessTokenTool.getAccessToken(authCode, APP_KEY, APP_SECRET);
    const tokenData   = tokenResult.body?.data;

    if (!tokenData?.access_token) {
      console.error('[TikTokShop] Token exchange failed:', JSON.stringify(tokenResult.body));
      return NextResponse.redirect(`${APP_URL}/home?error=shop_token_failed`);
    }

    accessToken     = tokenData.access_token;
    refreshToken    = tokenData.refresh_token ?? '';
    tokenExpireIn   = tokenData.access_token_expire_in
      ? tokenData.access_token_expire_in - Math.floor(Date.now() / 1000)
      : 7 * 24 * 3600;
    refreshExpireIn = tokenData.refresh_token_expire_in
      ? tokenData.refresh_token_expire_in - Math.floor(Date.now() / 1000)
      : 30 * 24 * 3600;

    console.log('[TikTokShop] Token exchange OK — user_type:', tokenData.user_type,
      'seller:', tokenData.seller_name);
  } catch (err) {
    console.error('[TikTokShop] Token exchange error:', err);
    return NextResponse.redirect(`${APP_URL}/home?error=shop_token_error`);
  }

  // ── 2. Fetch authorized shops to get shop_cipher ───────────────────────────
  let shopCipher = '';

  try {
    const shopClient = new TikTokShopNodeApiClient({ config: { sandbox: false } as ClientConfiguration });
    const shopsResult = await shopClient.api.AuthorizationV202309Api.ShopsGet(
      accessToken,
      'application/json',
    );

    const shopsList = (shopsResult.body as {
      data?: { shops?: Array<{ cipher: string; name: string; region: string }> };
    }).data?.shops ?? [];

    if (shopsList.length > 0) {
      shopCipher = shopsList[0].cipher;
      console.log('[TikTokShop] Shop cipher obtained for shop:', shopsList[0].name,
        'region:', shopsList[0].region);
    } else {
      console.warn('[TikTokShop] No shops returned — creator may not have a shop yet');
    }
  } catch (err) {
    // Non-fatal — creators don't always have a shop; token is still valid
    console.warn('[TikTokShop] Could not fetch shops (non-fatal):', err);
  }

  // ── 3. Build redirect and set all cookies on it ────────────────────────────
  const res = NextResponse.redirect(`${APP_URL}/home`);

  res.cookies.set('tts_access_token', accessToken, {
    ...COOKIE_BASE,
    httpOnly: true,
    maxAge:   Math.max(tokenExpireIn, 3600), // at least 1 hour
  });

  if (refreshToken) {
    res.cookies.set('tts_refresh_token', refreshToken, {
      ...COOKIE_BASE,
      httpOnly: true,
      maxAge:   Math.max(refreshExpireIn, 86400),
    });
  }

  if (shopCipher) {
    res.cookies.set('tts_shop_cipher', shopCipher, {
      ...COOKIE_BASE,
      httpOnly: true,
      maxAge:   Math.max(tokenExpireIn, 3600),
    });
  }

  // Client-visible flag — tells the frontend the Shop is connected
  res.cookies.set('tts_shop_connected', 'true', {
    ...COOKIE_BASE,
    httpOnly: false,
    maxAge:   Math.max(tokenExpireIn, 3600),
  });

  // Clear CSRF cookie
  res.cookies.delete('tts_oauth_state');

  return res;
}
