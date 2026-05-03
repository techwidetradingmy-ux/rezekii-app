import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get('tiktok_user')?.value;

  if (!raw) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const profile = JSON.parse(decodeURIComponent(raw));
    return NextResponse.json({ authenticated: true, ...profile });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
