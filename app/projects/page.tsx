import type { Metadata } from "next";
import { Card } from "@/components/card";
import { CardGrid, spanClass } from "@/components/card-grid";
import { FramedScreenshot } from "@/components/framed-screenshot";
import { SectionHeader } from "@/components/section-header";
import { fillGrid, type Span } from "@/lib/grid";
import { getPublishedProjects, type Project } from "@/lib/projects";
import { openGraphDefaults, site } from "@/lib/site";

const description = "Things I've built, mostly for fun.";

export const metadata: Metadata = {
  title: "Projects",
  description,
  alternates: { canonical: "/projects" },
  openGraph: { ...openGraphDefaults, url: "/projects", title: "Projects", description },
};

// Projects, chester-style: wide and small cards, each showing a framed
// screenshot that rises out of the bottom of the card.
export default async function ProjectsPage() {
  const projects = await getPublishedProjects();
  const { spans, fillers } = fillGrid(projects.map((p) => (p.cardSize === "wide" ? 2 : 1)));

  return (
    <>
      <SectionHeader title="projects">
        {/* TODO(Ivan): rewrite in your own words. */}
        I like building things. Here are a few I&apos;ve made, from browser games to small tools, mostly for
        fun and to learn something new.
      </SectionHeader>

      {projects.length === 0 ? (
        <p className="pb-8 text-fg-muted">Nothing here yet.</p>
      ) : (
        <CardGrid>
          {projects.map((project, i) => (
            <ProjectCard key={project.id} project={project} span={spans[i]} index={i} />
          ))}
          {fillers.map((span, i) => (
            <MoreCard key={i} span={span} index={projects.length + i} />
          ))}
        </CardGrid>
      )}
    </>
  );
}

function ProjectCard({ project, span, index }: { project: Project; span: Span; index: number }) {
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
        // No screenshot yet: the project as a text card.
        <>
          <h2 className="line-clamp-2 font-serif text-3xl leading-[1.05] sm:text-4xl">{project.title}</h2>
          {project.summary && <p className="mt-2 line-clamp-3 text-sm text-fg-muted">{project.summary}</p>}
          {project.stack.length > 0 && <p className="mt-2 truncate text-xs text-fg-muted">{project.stack.join(" · ")}</p>}
        </>
      )}
    </Card>
  );
}

/** Fills a short last row: a quiet pointer to more of Ivan's work. */
function MoreCard({ span, index }: { span: Span; index: number }) {
  return (
    <Card label="Projects · More" href={site.links.github || undefined} index={index} className={spanClass(span)}>
      <p className="font-serif text-2xl leading-tight text-fg-muted sm:text-3xl">More on GitHub</p>
    </Card>
  );
}
