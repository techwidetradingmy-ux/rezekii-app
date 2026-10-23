import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { actorName, addAdmin, fixedAdmins, removeAdmin, removeEmailAdmin } from "@/modules/admin/admins.ts";
import { cleanEmail } from "@/modules/accounts/password.ts";

export const dynamic = "force-dynamic";

async function admin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return null;
  const user = await currentUser();
  return user?.role === "admin" ? user : null;
}

/** Adds an admin: { email }. They sign in with Google under that address. */
export async function POST(req: NextRequest) {
  const user = await admin(req);
  if (!user) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const email = cleanEmail(((await req.json().catch(() => ({}))) as { email?: string }).email);
  if (!email) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  await addAdmin(email, actorName(user.email));
  return NextResponse.json({ ok: true });
}

/**
 * Removes an admin added in Settings: ?email=, or an admin who signs in with email and password: ?id=. The fixed admins are
 * changed in the server settings only.
 */
export async function DELETE(req: NextRequest) {
  const user = await admin(req);
  if (!user) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    if (id === user.id) return NextResponse.json({ error: "You can't remove yourself." }, { status: 409 });
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: "Which admin?" }, { status: 400 });
    return (await removeEmailAdmin(id, actorName(user.email))) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "That admin no longer exists." }, { status: 404 });
  }
  const email = cleanEmail(req.nextUrl.searchParams.get("email"));
  if (!email) return NextResponse.json({ error: "Which admin?" }, { status: 400 });
  if (fixedAdmins().includes(email)) return NextResponse.json({ error: "This admin is set in Rezekii's server settings and can't be removed here." }, { status: 409 });
  if (email === user.email?.toLowerCase()) return NextResponse.json({ error: "You can't remove yourself." }, { status: 409 });
  await removeAdmin(email, actorName(user.email));
  return NextResponse.json({ ok: true });
}
