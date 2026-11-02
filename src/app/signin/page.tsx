import { redirect } from "next/navigation";
import { currentUser } from "@/app/current-user";
import SignIn from "./sign-in";

/**
 * Already signed in (owner, 2 Nov 2026: the home-screen app kept asking to sign in): straight into the app, unless she's
 * finishing sign-up or a sign-in came back with an error. Admins can still open it, to see it.
 */
export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  if (!q.details && !q.error) {
    const user = await currentUser();
    if (user && user.role !== "admin") redirect(typeof q.next === "string" && q.next.startsWith("/") && !q.next.startsWith("//") ? q.next : "/app");
  }
  return <SignIn />;
}
