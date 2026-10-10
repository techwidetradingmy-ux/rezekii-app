/** Minimal server-only PostgREST client. The secret key bypasses RLS, so never import this in browser code. */
export async function supabaseRest(path: string, init: RequestInit = {}): Promise<Response> {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set");
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: secret, "content-type": "application/json", ...init.headers },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res;
}
