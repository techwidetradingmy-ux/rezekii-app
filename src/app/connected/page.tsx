import { Splash } from "../splash";

const MESSAGES: Record<string, { title: string; body: string; retry?: boolean }> = {
  connected: { title: "TikTok Shop linked", body: "Your account is connected to Rezekii. You can close this page." },
  "not-allowed": { title: "Not part of this test", body: "This TikTok account isn't in the current test, so nothing was saved." },
  denied: { title: "Linking cancelled", body: "You didn't approve Rezekii in TikTok Shop.", retry: true },
  expired: { title: "Link expired", body: "This link expired or was opened in a different browser.", retry: true },
  error: { title: "Something went wrong", body: "TikTok Shop didn't finish linking.", retry: true },
  "partner-connected": { title: "Partner account linked", body: "Techwide's TAP campaigns are now connected to Rezekii. You can close this page." },
  "partner-not-allowed": { title: "Partner account not allowed", body: "This Partner Center account isn't on the test list, so nothing was saved." },
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
        {msg.retry && (
          <>
            {" "}
            <a href="/api/auth/tiktokshop/start">Try again</a>
          </>
        )}
      </p>
    </Splash>
  );
}
