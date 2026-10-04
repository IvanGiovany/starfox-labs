import { Suspense } from "react";
import { getArticleOptions } from "@/lib/admin/items/article-options";
import { getHobbySuggestions } from "@/lib/admin/items/load-hobbies";
import { requireAdmin } from "@/lib/auth";
import { HobbyForm } from "../hobby-form";

// Request-time work sits behind this page's own <Suspense> (see CLAUDE.md, "Admin pages").
export default function NewHobby() {
  return (
    <Suspense fallback={<p className="py-6 text-fg-muted">Loading form…</p>}>
      <NewHobbyForm />
    </Suspense>
  );
}

async function NewHobbyForm() {
  await requireAdmin("/admin/hobbies/new");
  const [suggestions, articles] = await Promise.all([getHobbySuggestions(), getArticleOptions()]);
  return <HobbyForm hobby={null} badgeSuggestions={suggestions.badges} categorySuggestions={suggestions.categories} articles={articles} />;
}
