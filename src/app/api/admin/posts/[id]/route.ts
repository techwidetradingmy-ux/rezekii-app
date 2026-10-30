import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { actorName } from "@/modules/admin/admins.ts";
import { cancelPost, deleteDraft, markPublished, movePost } from "@/modules/admin/posts.ts";

export const dynamic = "force-dynamic";

/**
 * Admin actions on a post on Techwide's own accounts: { action: "move", at } (schedule or reschedule), "cancel" (to Drafts),
 * "published" (an unconfirmed post that is live on TikTok) or "delete" (a draft). Creators' posts are never changed here.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from rezekii.com." }, { status: 403 });
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const { id } = await params;
  const b = (await req.json().catch(() => ({}))) as { action?: string; at?: string; privacy?: string; consent?: boolean };
  const actor = actorName(user.email);
  const r =
    b.action === "move" ? await movePost(id, String(b.at ?? ""), actor, { privacy: b.privacy, consent: !!b.consent })
    : b.action === "cancel" ? await cancelPost(id, actor)
    : b.action === "published" ? await markPublished(id, actor)
    : b.action === "delete" ? await deleteDraft(id, actor)
    : ({ ok: false, error: "Unknown action.", status: 400 } as const);
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: r.status });
}
