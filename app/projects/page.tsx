import type { Metadata } from "next";
import { Card } from "@/components/card";
import { CardGrid, spanClass } from "@/components/card-grid";
import { ProjectCard } from "@/components/project-card";
import { SectionHeader } from "@/components/section-header";
import { StillGrowing } from "@/components/still-growing";
import { fillGrid, type Span } from "@/lib/grid";
import { getPublishedProjects } from "@/lib/projects";
import { openGraphDefaults, site } from "@/lib/site";
import { SECTION_META } from "@/lib/section-meta";

const { description } = SECTION_META.projects;

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
        <StillGrowing section="projects" />
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

/** Fills a short last row: a quiet pointer to more of Ivan's work. */
function MoreCard({ span, index }: { span: Span; index: number }) {
  return (
    <Card label="Projects · More" href={site.links.github || undefined} index={index} className={spanClass(span)}>
      <p className="font-serif text-2xl leading-tight text-fg-muted sm:text-3xl">More on GitHub</p>
    </Card>
  );
}
