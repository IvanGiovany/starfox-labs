import { Suspense } from "react";
import { getArticleOptions } from "@/lib/admin/items/article-options";
import { getTrackBadgeSuggestions } from "@/lib/admin/items/load-tracks";
import { requireAdmin } from "@/lib/auth";
import { TrackForm } from "../track-form";

// Request-time work sits behind this page's own <Suspense> (see CLAUDE.md, "Admin pages").
export default function NewTrack() {
  return (
    <Suspense fallback={<p className="py-6 text-fg-muted">Loading form…</p>}>
      <NewTrackForm />
    </Suspense>
  );
}

async function NewTrackForm() {
  await requireAdmin("/admin/music/new");
  const [badges, articles] = await Promise.all([getTrackBadgeSuggestions(), getArticleOptions()]);
  return <TrackForm track={null} badgeSuggestions={badges} articles={articles} />;
}
