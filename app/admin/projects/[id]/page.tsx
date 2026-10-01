import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getEditableProject, getProjectSuggestions } from "@/lib/admin/items/load-projects";
import { requireAdmin } from "@/lib/auth";
import { ProjectForm } from "../project-form";

// Request-time work sits behind this page's own <Suspense> (see CLAUDE.md, "Admin pages").
export default function EditProject({ params }: PageProps<"/admin/projects/[id]">) {
  return (
    <Suspense fallback={<p className="py-6 text-fg-muted">Loading project…</p>}>
      <EditProjectForm params={params} />
    </Suspense>
  );
}

async function EditProjectForm({ params }: { params: PageProps<"/admin/projects/[id]">["params"] }) {
  const { id } = await params;
  await requireAdmin(`/admin/projects/${id}`);
  const [project, suggestions] = await Promise.all([getEditableProject(id), getProjectSuggestions()]);
  if (!project) notFound();

  // key: opening another project starts a fresh form instead of reusing this one's state.
  return <ProjectForm key={project.id} project={project} badgeSuggestions={suggestions.badges} stackSuggestions={suggestions.stack} />;
}
