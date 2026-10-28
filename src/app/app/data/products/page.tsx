import { redirect } from "next/navigation";

/** Products moved into Performance (owner, 28 Oct 2026). */
export default function Moved() {
  redirect("/app/data/performance#product");
}
