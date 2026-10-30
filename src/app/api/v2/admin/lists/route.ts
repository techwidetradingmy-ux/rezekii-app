import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { actorName } from "@/modules/admin/admins.ts";
import { CUSTOM_STATUSES, DISPUTE_KINDS, adminList, auditList, consentList, disputeList, openDispute, updateDispute, customList, feedbackList, feedbackShot, ledgerList, referralList, sellerList, setCustomStatus, setFeedbackStatus, waitlistList, type CustomStatus } from "@/modules/admin/lists.ts";

export const dynamic = "force-dynamic";

const LISTS = { audit: auditList, custom: customList, waitlist: waitlistList, referrals: referralList, ledger: ledgerList, feedback: feedbackList, admins: adminList, sellers: sellerList, consent: consentList, disputes: disputeList } as const;

/** Admin lists on real data (admins only; owner, 31 Oct 2026): ?part=audit|custom|waitlist|referrals|ledger|feedback|admins|sellers|consent|disputes; ?shot=<feedback id> for its screenshot. */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const shot = req.nextUrl.searchParams.get("shot");
  if (shot && /^[0-9a-f-]{36}$/.test(shot)) return NextResponse.json({ screenshot: await feedbackShot(shot) }, { headers: { "cache-control": "private, no-store" } });
  const part = req.nextUrl.searchParams.get("part") as keyof typeof LISTS | null;
  if (!part || !(part in LISTS)) return NextResponse.json({ error: "Say which list." }, { status: 400 });
  return NextResponse.json({ items: await LISTS[part]() }, { headers: { "cache-control": "private, no-store" } });
}

/** { custom: id, status } moves a Custom Service request along; { feedback: id, status } marks feedback (admins only). */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from Rezekii." }, { status: 403 });
  const user = await currentUser();
  if (user?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { custom?: unknown; feedback?: unknown; status?: unknown; dispute?: unknown; open?: Record<string, unknown>; outcome?: unknown; owner?: unknown };
  // Disputes: { open: { kind, creator, shop, product, detail } } opens one; { dispute: id, status?, outcome?, owner? } updates it.
  if (b.open && typeof b.open === "object") {
    const o = b.open;
    if (!DISPUTE_KINDS.includes(o.kind as (typeof DISPUTE_KINDS)[number]) || typeof o.detail !== "string" || !o.detail.trim()) return NextResponse.json({ error: "Choose the kind and say what happened." }, { status: 400 });
    return (await openDispute(o as { kind: string; detail: string }, actorName(user.email))) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Didn't save. Please try again." }, { status: 500 });
  }
  if (typeof b.dispute === "string") {
    if (!/^[0-9a-f-]{36}$/.test(b.dispute) || (b.status !== undefined && !["open", "waiting", "resolved"].includes(String(b.status)))) return NextResponse.json({ error: "Choose a case." }, { status: 400 });
    const ok = await updateDispute(b.dispute, { status: b.status as "open" | "waiting" | "resolved" | undefined, outcome: typeof b.outcome === "string" ? b.outcome : undefined, owner: typeof b.owner === "string" ? b.owner : undefined }, actorName(user.email));
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Didn't save. Please try again." }, { status: 500 });
  }
  if (typeof b.feedback === "string") {
    if (!/^[0-9a-f-]{36}$/.test(b.feedback) || (b.status !== "new" && b.status !== "handled")) return NextResponse.json({ error: "Choose a message and a status." }, { status: 400 });
    return (await setFeedbackStatus(b.feedback, b.status, actorName(user.email))) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Didn't save. Please try again." }, { status: 500 });
  }
  if (typeof b.custom !== "string" || !/^[0-9a-f-]{36}$/.test(b.custom) || !CUSTOM_STATUSES.includes(b.status as CustomStatus)) return NextResponse.json({ error: "Choose a request and a status." }, { status: 400 });
  const ok = await setCustomStatus(b.custom, b.status as CustomStatus, actorName(user.email));
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Didn't save. Please try again." }, { status: 500 });
}
