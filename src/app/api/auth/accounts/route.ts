import { NextResponse, type NextRequest } from "next/server";
import { supabaseRest } from "@/integrations/supabase/rest.ts";
import { MAX_ACCOUNTS, deleteSession } from "@/modules/accounts/session.ts";
import { USER_COLUMNS, type AppUser } from "@/modules/accounts/users.ts";
import { myPhoto } from "@/modules/photos/store.ts";
import { profileOf, type CreatorDetails } from "@/modules/rewards/profiles.ts";
import { deviceSessions, setCurrent, setOthers } from "../device.ts";

export const dynamic = "force-dynamic";

const NO_STORE = { headers: { "cache-control": "private, no-store" } };

export type DeviceAccount = { id: string; name: string; sub: string | null; photo: string | null; current: boolean };

/**
 * Switch Account (owner, 4 Nov 2026): the accounts signed in on this device, the one in use first. Names and photos only;
 * the sign-in keys stay in HTTP-only cookies. Accounts whose sign-in ended drop off the list.
 */
export async function GET(req: NextRequest) {
  try {
    const { current, others } = await deviceSessions(req);
    const all = [...(current ? [current] : []), ...others];
    const users = all.length ? ((await (await supabaseRest(`app_users?id=in.(${all.map((s) => s.userId).join(",")})&select=${USER_COLUMNS}`)).json()) as AppUser[]) : [];
    const byId = new Map(users.map((u) => [u.id, u]));
    const accounts: DeviceAccount[] = await Promise.all(
      all.filter((s) => byId.has(s.userId)).map(async (s) => {
        const u = byId.get(s.userId)!;
        // The name she gave at sign-up, as everywhere else in the app (owner, 1 Nov 2026).
        const profile = await profileOf<CreatorDetails>(u.id, "creator").catch(() => null);
        return {
          id: u.id,
          name: profile?.details.name?.trim() || u.display_name || u.tiktok_username || u.email || "Rezekii account",
          sub: u.tiktok_username ? `@${u.tiktok_username}` : u.email,
          photo: myPhoto(u) ?? u.avatar_url,
          current: s === current,
        };
      }),
    );
    const res = NextResponse.json({ accounts, max: MAX_ACCOUNTS }, NO_STORE);
    setOthers(res, others);
    return res;
  } catch (err) {
    console.error("[accounts] list", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't load your accounts." }, { status: 500 });
  }
}

/** { to: accountId } switches to an account signed in on this device; { remove: accountId } signs that one out here. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Wrong site." }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { to?: unknown; remove?: unknown };
  const id = typeof b.to === "string" ? b.to : typeof b.remove === "string" ? b.remove : null;
  if (!id) return NextResponse.json({ error: "Which account?" }, { status: 400 });
  try {
    const { current, others } = await deviceSessions(req);
    const pick = others.find((s) => s.userId === id);
    if (!pick) return NextResponse.json({ error: "That account isn't signed in on this device any more." }, { status: 404 });
    const rest = others.filter((s) => s !== pick);
    const res = NextResponse.json({ ok: true }, NO_STORE);
    if (typeof b.to === "string") {
      setCurrent(res, pick);
      setOthers(res, [...(current ? [current] : []), ...rest]);
    } else {
      await deleteSession(pick.token);
      setOthers(res, rest);
    }
    return res;
  } catch (err) {
    console.error("[accounts] switch", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "That didn't work. Please try again." }, { status: 500 });
  }
}
