import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { supabaseRest } from "@/integrations/supabase/rest.ts";

export const dynamic = "force-dynamic";

/** The signed-in creator's link history (newest first, up to 1,000). */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const res = await supabaseRest(`tap_links?user_id=eq.${user.id}&select=product_id,product_name,image,tag,link,made_at&order=made_at.desc&limit=1000`);
  return NextResponse.json({ links: await res.json() });
}
