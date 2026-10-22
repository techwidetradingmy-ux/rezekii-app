import type { Metadata } from "next";
import { SignInPage } from "./signin-page";

export const metadata: Metadata = { title: "Sign in · Rezekii" };

export default function SignIn() {
  return <SignInPage lang="en" />;
}
