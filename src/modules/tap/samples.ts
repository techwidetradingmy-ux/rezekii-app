import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { getProduct } from "./catalog.ts";

/** A creator's free-sample request. Techwide applies for it in TikTok Shop; after that the sample follows TikTok's own status. */
export type SampleRequest = {
  id: string;
  user_id: string;
  product_id: string;
  product_name: string;
  shop: string | null;
  image: string | null;
  status: "requested" | "applied" | "rejected" | "cancelled";
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type RequestResult = { ok: true; request: SampleRequest } | { ok: false; error: string; status: number };

/** Files a request for a product that offers free samples. A second open request for the same product is refused. */
export async function requestSample(userId: string, productId: string): Promise<RequestResult> {
  const product = await getProduct(productId);
  if (!product) return { ok: false, error: "This product is no longer in a Techwide TAP campaign.", status: 404 };
  if (product.samples <= 0) return { ok: false, error: "This product has no free samples right now.", status: 409 };
  const open = await supabaseRest(`sample_requests?user_id=eq.${userId}&product_id=eq.${productId}&status=in.(requested,applied)&select=id&limit=1`);
  if (((await open.json()) as unknown[]).length) return { ok: false, error: "You already asked for this sample. Follow it in My samples.", status: 409 };
  const res = await supabaseRest("sample_requests", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({ user_id: userId, product_id: productId, product_name: product.name, shop: product.shop, image: product.image }),
  });
  const [request] = (await res.json()) as SampleRequest[];
  return { ok: true, request };
}

export async function mySamples(userId: string): Promise<SampleRequest[]> {
  const res = await supabaseRest(`sample_requests?user_id=eq.${userId}&status=neq.cancelled&order=created_at.desc&limit=200`);
  return res.json();
}

export async function cancelSample(userId: string, id: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return false;
  const res = await supabaseRest(`sample_requests?id=eq.${id}&user_id=eq.${userId}&status=eq.requested`, {
    method: "PATCH",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({ status: "cancelled", updated_at: new Date().toISOString() }),
  });
  return ((await res.json()) as unknown[]).length > 0;
}

/** Techwide's queue: every request with the creator's name, newest first. */
export async function sampleQueue(status: SampleRequest["status"] | "all" = "requested"): Promise<(SampleRequest & { creator: string })[]> {
  const filter = status === "all" ? "" : `status=eq.${status}&`;
  const res = await supabaseRest(`sample_requests?${filter}select=*,app_users(display_name,tiktok_username,email)&order=created_at.desc&limit=300`);
  type Row = SampleRequest & { app_users: { display_name: string | null; tiktok_username: string | null; email: string | null } | null };
  return ((await res.json()) as Row[]).map(({ app_users: u, ...r }) => ({ ...r, creator: u?.tiktok_username ? `@${u.tiktok_username}` : u?.display_name || u?.email || "Unknown" }));
}

/** Techwide marks a request applied (sample requested in TikTok Shop) or rejected, with an optional note for the creator. */
export async function setSampleStatus(id: string, status: "applied" | "rejected", note: string | null): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return false;
  const res = await supabaseRest(`sample_requests?id=eq.${id}&status=in.(requested,applied)`, {
    method: "PATCH",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({ status, note: note?.slice(0, 300) || null, updated_at: new Date().toISOString() }),
  });
  return ((await res.json()) as unknown[]).length > 0;
}
