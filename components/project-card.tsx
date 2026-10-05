import { Card } from "@/components/card";
import { spanClass } from "@/components/card-grid";
import { FramedScreenshot } from "@/components/framed-screenshot";
import type { Span } from "@/lib/grid";
import type { Project } from "@/lib/projects";

// A project card, chester-style: a framed screenshot rising out of the bottom
// of the card, or a text card without one. Used by /projects and the home grid.
export function ProjectCard({ project, span, index }: { project: Project; span: Span; index: number }) {
  return (
    <Card
      label={`Projects · ${project.title}`}
      href={project.href ?? undefined}
      links={project.links}
      linkLabel={project.title}
      index={index}
      className={spanClass(span)}
    >
      {project.imageUrl ? (
        <FramedScreenshot src={project.imageUrl} alt={project.imageAlt} wide={span === 2} />
      ) : (
        // No screenshot yet: the project as a text card, sized to the cell
        // (measured, with room for the small links): phones show the title only.
        <>
          <h2 className="line-clamp-2 shrink-0 font-serif text-2xl leading-[1.05] sm:text-4xl lg:text-3xl xl:text-4xl">{project.title}</h2>
          {project.summary && <p className="mt-2 hidden text-sm text-fg-muted sm:line-clamp-3 lg:line-clamp-1 xl:line-clamp-3">{project.summary}</p>}
          {project.stack.length > 0 && <p className="mt-2 hidden truncate text-xs text-fg-muted sm:block">{project.stack.join(" · ")}</p>}
        </>
      )}
    </Card>
  );
}
