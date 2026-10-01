import { Suspense } from "react";
import { getArticleOptions } from "@/lib/admin/items/article-options";
import { getProjectSuggestions } from "@/lib/admin/items/load-projects";
import { requireAdmin } from "@/lib/auth";
import { ProjectForm } from "../project-form";

// Request-time work sits behind this page's own <Suspense> (see CLAUDE.md, "Admin pages").
export default function NewProject() {
  return (
    <Suspense fallback={<p className="py-6 text-fg-muted">Loading form…</p>}>
      <NewProjectForm />
    </Suspense>
  );
}

async function NewProjectForm() {
  await requireAdmin("/admin/projects/new");
  const [suggestions, articles] = await Promise.all([getProjectSuggestions(), getArticleOptions()]);
  return <ProjectForm project={null} badgeSuggestions={suggestions.badges} stackSuggestions={suggestions.stack} articles={articles} />;
}
