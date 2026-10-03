import { Suspense } from "react";
import { getArticleOptions } from "@/lib/admin/items/article-options";
import { getGameSuggestions } from "@/lib/admin/items/load-games";
import { requireAdmin } from "@/lib/auth";
import { GameForm } from "../game-form";

// Request-time work sits behind this page's own <Suspense> (see CLAUDE.md, "Admin pages").
export default function NewGame() {
  return (
    <Suspense fallback={<p className="py-6 text-fg-muted">Loading form…</p>}>
      <NewGameForm />
    </Suspense>
  );
}

async function NewGameForm() {
  await requireAdmin("/admin/games/new");
  const [suggestions, articles] = await Promise.all([getGameSuggestions(), getArticleOptions()]);
  return <GameForm game={null} badgeSuggestions={suggestions.badges} platformSuggestions={suggestions.platforms} articles={articles} />;
}
