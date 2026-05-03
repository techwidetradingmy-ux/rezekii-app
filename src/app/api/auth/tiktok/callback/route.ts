import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle errors from TikTok
  if (error) {
    console.error('TikTok OAuth error:', error, searchParams.get('error_description'));
    return NextResponse.redirect(new URL('/onboarding?error=tiktok_denied', request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/onboarding?error=missing_params', request.url));
  }

  // Validate CSRF state
  const cookieStore = await cookies();
  const savedState = cookieStore.get('tiktok_csrf_state')?.value;

  if (!savedState || savedState !== state) {
    console.error('CSRF state mismatch');
    return NextResponse.redirect(new URL('/onboarding?error=csrf_mismatch', request.url));
  }

  // Exchange code for access token
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    return NextResponse.redirect(new URL('/onboarding?error=config_missing', request.url));
  }

  try {
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: 'https://rezekii.com/api/auth/tiktok/callback',
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error('Token exchange failed:', tokenData);
      return NextResponse.redirect(new URL('/onboarding?error=token_failed', request.url));
    }

    // Store access token in httpOnly cookie
    cookieStore.set('tiktok_token', tokenData.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: tokenData.expires_in || 86400,
      path: '/',
    });

    // Clear CSRF state cookie
    cookieStore.delete('tiktok_csrf_state');

    // Store onboarded flag
    cookieStore.set('rezekii_onboarded', 'true', {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      maxAge: 365 * 24 * 60 * 60,
      path: '/',
    });

    return NextResponse.redirect(new URL('/home', request.url));
  } catch (err) {
    console.error('Token exchange error:', err);
    return NextResponse.redirect(new URL('/onboarding?error=exchange_error', request.url));
  }
}
