"use client";

import "@/app/admin.css";
import { NumbersView } from "@/components/publish/numbers-view";

/** Admin › Posting › Community Numbers (as on rezekii.com): every Admin's channels, with Refresh. */
export default function PostingNumbers() {
  return <NumbersView newPost="/app/publish" admin />;
}
