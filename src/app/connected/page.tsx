import { Splash } from "../splash";

const MESSAGES: Record<string, { title: string; body: string; retry?: boolean }> = {
  connected: { title: "TikTok Shop linked", body: "Your TikTok Shop account is linked and approved. Affiliate links, product lookup and showcase are ready on Rezekii." },
  waiting: { title: "TikTok Shop linked", body: "Techwide approves each new creator account. You'll see it on My accounts once it's approved." },
  waitlist: { title: "You're on the waitlist", body: "All of Rezekii's TikTok Shop places are taken for now, so nothing was saved. When a place frees up you'll be invited to link again from My accounts." },
  taken: { title: "Already linked", body: "This TikTok Shop account is already linked to a different Rezekii account." },
  signin: { title: "Sign in first", body: "Sign in to Rezekii, then link TikTok Shop from My accounts.", retry: true },
  "not-allowed": { title: "Not part of this test", body: "This TikTok account isn't in the current test, so nothing was saved." },
  denied: { title: "Linking cancelled", body: "You didn't approve Rezekii in TikTok Shop.", retry: true },
  expired: { title: "Link expired", body: "This link expired or was opened in a different browser.", retry: true },
  error: { title: "Something went wrong", body: "TikTok Shop didn't finish linking.", retry: true },
  "partner-connected": { title: "Partner account linked", body: "Techwide's TAP campaigns are now connected to Rezekii. You can close this page." },
  "partner-not-allowed": { title: "Partner account not allowed", body: "This Partner Center account isn't on the test list, so nothing was saved." },
  "seller-connected": { title: "Shop linked", body: "Your TikTok Shop is now connected to Rezekii. You can close this page." },
  "seller-not-allowed": { title: "Shop not allowed", body: "This shop isn't on the test list, so nothing was saved." },
};

export default async function Connected({ searchParams }: { searchParams: Promise<{ result?: string; id?: string }> }) {
  const { result, id } = await searchParams;
  const msg = MESSAGES[result ?? ""] ?? MESSAGES.error;
  return (
    <Splash>
      <h1>{msg.title}</h1>
      <p>
        {msg.body}
        {result === "partner-not-allowed" && id ? ` (TikTok's partner ID: ${id})` : ""}
        {result === "seller-not-allowed" && id ? ` (Shop: ${id})` : ""}
        {msg.retry && (
          <>
            {" "}
            <a href={result === "signin" ? "/signin" : "/api/auth/tiktokshop/start"}>{result === "signin" ? "Sign in" : "Try again"}</a>
          </>
        )}
      </p>
      {["connected", "waiting", "waitlist", "taken"].includes(result ?? "") && (
        <p>
          <a href="/onboarding">Continue</a>
        </p>
      )}
    </Splash>
  );
}
