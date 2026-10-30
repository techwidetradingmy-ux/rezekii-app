/** Minimal server-only PostgREST client. The secret key bypasses RLS, so never import this in browser code. */
export async function supabaseRest(path: string, init: RequestInit = {}): Promise<Response> {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set");
  const go = () => fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: secret, "content-type": "application/json", ...init.headers },
    cache: "no-store",
  });
  let res: Response;
  try {
    res = await go();
  } catch (err) {
    // A dropped connection after a quiet spell ("fetch failed") once made a signed-in account look signed out (31 Oct 2026).
    // Reads are tried once more; writes never, so nothing is saved twice.
    if ((init.method ?? "GET").toUpperCase() !== "GET") throw err;
    await new Promise((r) => setTimeout(r, 300));
    res = await go();
  }
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res;
}
