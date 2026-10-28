import { redirect } from "next/navigation";

/** Rating check moved into Risk check under Analytics (owner, 28 Oct 2026). */
export default function Moved() {
  redirect("/app/data/risk");
}
