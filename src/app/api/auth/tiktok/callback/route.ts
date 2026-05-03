import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY!;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const REDIRECT_URI = `${APP_URL}/api/auth/tiktok/callback`;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    console.error('TikTok OAuth error:', error, searchParams.get('error_description'));
    return NextResponse.redirect(`${APP_URL}/onboarding?error=tiktok_denied`);
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get('tiktok_oauth_state')?.value;

  if (!state || state !== savedState) {
    console.error('CSRF state mismatch');
    return NextResponse.redirect(`${APP_URL}/onboarding?error=csrf_mismatch`);
  }

  cookieStore.delete('tiktok_oauth_state');

  if (!code) {
    return NextResponse.redirect(`${APP_URL}/onboarding?error=missing_params`);
  }

  if (!CLIENT_KEY || !CLIENT_SECRET) {
    return NextResponse.redirect(`${APP_URL}/onboarding?error=config_missing`);
  }

  try {
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: CLIENT_KEY,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error('TikTok token exchange failed:', text);
      return NextResponse.redirect(`${APP_URL}/onboarding?error=token_failed`);
    }

    const tokenData = await tokenRes.json();
    const { access_token, open_id, expires_in, refresh_token, refresh_expires_in } = tokenData;

    if (!access_token) {
      console.error('No access_token in response:', tokenData);
      return NextResponse.redirect(`${APP_URL}/onboarding?error=token_failed`);
    }

    const session = JSON.stringify({ access_token, open_id, expires_in, refresh_token, refresh_expires_in });
    const isProd = process.env.NODE_ENV === 'production';

    cookieStore.set('tiktok_session', session, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: Number(expires_in) || 86400,
      path: '/',
    });

    cookieStore.set('rezekii_onboarded', 'true', {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60,
      path: '/',
    });

    return NextResponse.redirect(`${APP_URL}/home`);
  } catch (err) {
    console.error('Token exchange error:', err);
    return NextResponse.redirect(`${APP_URL}/onboarding?error=exchange_error`);
  }
}
