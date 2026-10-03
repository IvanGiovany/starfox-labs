import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getArticleOptions } from "@/lib/admin/items/article-options";
import { getEditableGame, getGameSuggestions } from "@/lib/admin/items/load-games";
import { requireAdmin } from "@/lib/auth";
import { GameForm } from "../game-form";

// Request-time work sits behind this page's own <Suspense> (see CLAUDE.md, "Admin pages").
export default function EditGame({ params }: PageProps<"/admin/games/[id]">) {
  return (
    <Suspense fallback={<p className="py-6 text-fg-muted">Loading game…</p>}>
      <EditGameForm params={params} />
    </Suspense>
  );
}

async function EditGameForm({ params }: { params: PageProps<"/admin/games/[id]">["params"] }) {
  const { id } = await params;
  await requireAdmin(`/admin/games/${id}`);
  const [game, suggestions, articles] = await Promise.all([getEditableGame(id), getGameSuggestions(), getArticleOptions()]);
  if (!game) notFound();

  // key: opening another game starts a fresh form instead of reusing this one's state.
  return <GameForm key={game.id} game={game} badgeSuggestions={suggestions.badges} platformSuggestions={suggestions.platforms} articles={articles} />;
}
