/**
 * Sign Out, everywhere it's offered: ends the account in use. When another account is signed in on this device it takes
 * over (owner, 4 Nov 2026) and the app opens at `home`; otherwise the page goes to `out`. `all` signs out every account here.
 */
export function signOut({ all = false, home = "/app", out = "/signin?in=1" }: { all?: boolean; home?: string; out?: string } = {}): void {
  fetch(`/api/auth/signout${all ? "?all=1" : ""}`, { method: "POST" })
    .then((r) => (r.ok ? (r.json() as Promise<{ switched?: boolean }>) : null))
    .then((d) => { window.location.href = d?.switched ? home : out; })
    .catch(() => { window.location.href = out; });
}
