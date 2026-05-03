import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey) {
    return NextResponse.json({ error: 'TIKTOK_CLIENT_KEY not configured' }, { status: 500 });
  }

  const state = crypto.randomUUID();

  const cookieStore = await cookies();
  cookieStore.set('tiktok_csrf_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  });

  const params = new URLSearchParams({
    client_key: clientKey,
    scope: 'user.info.basic,video.list',
    response_type: 'code',
    redirect_uri: 'https://rezekii.com/api/auth/tiktok/callback',
    state: state,
  });

  const tiktokAuthUrl = 'https://www.tiktok.com/v2/auth/authorize/?' + params.toString();

  return NextResponse.redirect(tiktokAuthUrl);
}
