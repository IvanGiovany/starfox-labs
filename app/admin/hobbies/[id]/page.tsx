import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getArticleOptions } from "@/lib/admin/items/article-options";
import { getEditableHobby, getHobbySuggestions } from "@/lib/admin/items/load-hobbies";
import { requireAdmin } from "@/lib/auth";
import { HobbyForm } from "../hobby-form";

// Request-time work sits behind this page's own <Suspense> (see CLAUDE.md, "Admin pages").
export default function EditHobby({ params }: PageProps<"/admin/hobbies/[id]">) {
  return (
    <Suspense fallback={<p className="py-6 text-fg-muted">Loading hobby item…</p>}>
      <EditHobbyForm params={params} />
    </Suspense>
  );
}

async function EditHobbyForm({ params }: { params: PageProps<"/admin/hobbies/[id]">["params"] }) {
  const { id } = await params;
  await requireAdmin(`/admin/hobbies/${id}`);
  const [hobby, suggestions, articles] = await Promise.all([getEditableHobby(id), getHobbySuggestions(), getArticleOptions()]);
  if (!hobby) notFound();

  // key: opening another item starts a fresh form instead of reusing this one's state.
  return <HobbyForm key={hobby.id} hobby={hobby} badgeSuggestions={suggestions.badges} categorySuggestions={suggestions.categories} articles={articles} />;
}
