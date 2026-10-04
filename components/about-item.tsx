import Image from "next/image";
import { detailList, detailText, type PostItem } from "@/lib/post-items";

// The "about this" panel near the top of an article that an item links to: a
// quiet raised box with the item's picture and its key facts. Each section
// gets its own version as its public page is built (Phase 3); sections
// without one show nothing yet.
export function AboutItem({ item }: { item: PostItem }) {
  switch (item.section) {
    case "projects":
      return <AboutProject item={item} />;
    default:
      return null;
  }
}

function AboutProject({ item }: { item: PostItem }) {
  const url = detailText(item.details, "url");
  const repo = detailText(item.details, "repo_url");
  const stack = detailList(item.details, "stack");
  const links = [...(url ? [{ label: "Visit the project", href: url }] : []), ...(repo ? [{ label: "Source code", href: repo }] : [])];

  return (
    <aside aria-label="About this project" className="flex flex-col gap-4 rounded-xl bg-bg-raised p-4 sm:flex-row sm:items-center sm:p-5">
      {item.imageUrl && (
        <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-md border border-rule bg-bg sm:w-48">
          <Image src={item.imageUrl} alt={item.imageAlt} fill sizes="(min-width: 640px) 192px, 90vw" className="object-cover object-top" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs text-fg-muted">About this project</p>
        <p className="mt-1 font-serif text-2xl leading-tight">{item.title}</p>
        {stack.length > 0 && <p className="mt-1 text-sm text-fg-muted">{stack.join(" · ")}</p>}
        {links.length > 0 && (
          <p className="mt-2 flex flex-wrap gap-x-4 text-sm">
            {links.map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                {link.label} ↗
              </a>
            ))}
          </p>
        )}
      </div>
    </aside>
  );
}
