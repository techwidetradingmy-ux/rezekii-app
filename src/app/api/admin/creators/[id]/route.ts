import { after, NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { actorName, makeEmailAdmin } from "@/modules/admin/admins.ts";
import { removeCreator, setGoldInvite, setPasswordFor } from "@/modules/admin/creators.ts";
import { approvedCreatorToken, decideCreator } from "@/modules/creator-accounts/access.ts";
import { syncCreatorOrders } from "@/modules/sales/orders.ts";

export const dynamic = "force-dynamic";
// Approving also reads the creator's orders in the background, so their Sales page has GMV straight away.
export const maxDuration = 60;

async function admin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return null;
  const user = await currentUser();
  return user?.role === "admin" ? user : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Gold invitation { gold: true | false }, the TikTok Shop approval { decision: "approve" | "reject", reason }, a new password
 * for an email-and-password account { password }, or making such an account an admin { admin: true }.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await admin(req);
  if (!user) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const id = (await params).id;
  const b = (await req.json().catch(() => ({}))) as { gold?: boolean; decision?: string; reason?: string; password?: string; admin?: boolean };
  if (b.password !== undefined || b.admin === true) {
    if (!UUID.test(id)) return NextResponse.json({ error: "That account no longer exists." }, { status: 404 });
    if (b.admin === true)
      return (await makeEmailAdmin(id, actorName(user.email))) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Only an account that signs in with email and password alone can be made admin." }, { status: 409 });
    const r = await setPasswordFor(id, b.password, { id: user.id, name: actorName(user.email) });
    return r.ok ? NextResponse.json(r) : NextResponse.json({ error: r.error }, { status: r.status });
  }
  if (b.decision === "approve" || b.decision === "reject") {
    const reason = String(b.reason ?? "").trim().slice(0, 200);
    if (b.decision === "reject" && !reason) return NextResponse.json({ error: "Add a reason the creator will see." }, { status: 400 });
    const r = await decideCreator(id, b.decision === "approve", reason || null, actorName(user.email));
    if (r.ok && b.decision === "approve")
      after(async () => {
        const token = await approvedCreatorToken(id);
        if (token) await syncCreatorOrders(id, token, Date.now() + 50_000).catch((err) => console.error("[creators] first order read", err instanceof Error ? err.message : err));
      });
    return r.ok ? NextResponse.json(r) : NextResponse.json({ error: "That creator hasn't linked TikTok Shop." }, { status: 404 });
  }
  const ok = await setGoldInvite(id, !!b.gold, actorName(user.email));
  return ok ? NextResponse.json({ ok }) : NextResponse.json({ error: "That creator account no longer exists." }, { status: 404 });
}

/** Removes the creator's Rezekii account: { confirm: "DELETE" }. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await admin(req);
  if (!user) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const { confirm } = (await req.json().catch(() => ({}))) as { confirm?: string };
  if (confirm !== "DELETE") return NextResponse.json({ error: "Type DELETE to confirm." }, { status: 400 });
  const ok = await removeCreator((await params).id, actorName(user.email));
  return ok ? NextResponse.json({ ok }) : NextResponse.json({ error: "That creator account no longer exists." }, { status: 404 });
}
