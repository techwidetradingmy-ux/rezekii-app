import { refLink } from "@/app/api/v2/referral/link";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/** A seller's invite link: remembers the code for 14 days (the last link tapped wins), then opens the seller page. */
export const GET = (req: NextRequest, ctx: { params: Promise<{ code: string }> }) => refLink(req, ctx, "seller");
