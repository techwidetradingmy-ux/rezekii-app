import { redirect } from "next/navigation";

/** AI picks moved into Analytics (owner, 28 Oct 2026). */
export default function Moved() {
  redirect("/app/data/ai-picks");
}
