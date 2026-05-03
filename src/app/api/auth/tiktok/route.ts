import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY!;
const REDIRECT_URI = 'https://rezekii.com/api/auth/tiktok/callback';
const SCOPES = 'user.info.basic,video.list';

function base64url(buffer: Buffer): string {
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function GET() {
    const state = crypto.randomBytes(16).toString('hex');

  // PKCE: generate code_verifier and code_challenge
  const codeVerifier = base64url(crypto.randomBytes(32));
    const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest());

  const cookieStore = await cookies();
    cookieStore.set('tiktok_oauth_state', state, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 600,
          path: '/',
    });
    cookieStore.set('tiktok_code_verifier', codeVerifier, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 600,
          path: '/',
    });

  const params = new URLSearchParams({
        client_key: CLIENT_KEY,
        scope: SCOPES,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
  });

  return NextResponse.redirect(
        `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`
      );
}
