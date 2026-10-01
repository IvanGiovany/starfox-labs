import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getArticleOptions } from "@/lib/admin/items/article-options";
import { getEditableTrack, getTrackBadgeSuggestions } from "@/lib/admin/items/load-tracks";
import { requireAdmin } from "@/lib/auth";
import { TrackForm } from "../track-form";

// Request-time work sits behind this page's own <Suspense> (see CLAUDE.md, "Admin pages").
export default function EditTrack({ params }: PageProps<"/admin/music/[id]">) {
  return (
    <Suspense fallback={<p className="py-6 text-fg-muted">Loading song…</p>}>
      <EditTrackForm params={params} />
    </Suspense>
  );
}

async function EditTrackForm({ params }: { params: PageProps<"/admin/music/[id]">["params"] }) {
  const { id } = await params;
  await requireAdmin(`/admin/music/${id}`);
  const [track, badges, articles] = await Promise.all([getEditableTrack(id), getTrackBadgeSuggestions(), getArticleOptions()]);
  if (!track) notFound();

  // key: opening another song starts a fresh form instead of reusing this one's state.
  return <TrackForm key={track.id} track={track} badgeSuggestions={badges} articles={articles} />;
}
