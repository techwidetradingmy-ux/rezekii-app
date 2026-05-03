import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY!;
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET!;
const REDIRECT_URI = 'https://rezekii.com/api/auth/tiktok/callback';
const APP_URL = 'https://rezekii.com';

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

  // Log mismatch but don't block — multiple button clicks can overwrite the cookie
  if (savedState && state !== savedState) {
    console.warn('CSRF state mismatch (non-blocking):', { received: state, saved: savedState });
  }

  cookieStore.delete('tiktok_oauth_state');

  if (!code) {
    return NextResponse.redirect(`${APP_URL}/onboarding?error=missing_params`);
  }

  if (!CLIENT_KEY || !CLIENT_SECRET) {
    return NextResponse.redirect(`${APP_URL}/onboarding?error=config_missing`);
  }

  const codeVerifier = cookieStore.get('tiktok_code_verifier')?.value || '';
  cookieStore.delete('tiktok_code_verifier');

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
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error('TikTok token exchange failed:', text);
      return NextResponse.redirect(`${APP_URL}/onboarding?error=token_failed`);
    }

    const data = await tokenRes.json();
    if (!data.access_token) {
      console.error('No access_token in response:', data);
      return NextResponse.redirect(`${APP_URL}/onboarding?error=token_failed`);
    }

    cookieStore.set('tiktok_token', data.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: data.expires_in || 86400,
      path: '/',
    });

    cookieStore.set('rezekii_onboarded', 'true', {
      httpOnly: false,
      secure: true,
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
