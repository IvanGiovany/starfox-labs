import { Suspense } from "react";
import { getArticleOptions } from "@/lib/admin/items/article-options";
import { getBookBadgeSuggestions } from "@/lib/admin/items/load-books";
import { requireAdmin } from "@/lib/auth";
import { BookForm } from "../book-form";

// Request-time work sits behind this page's own <Suspense> (see CLAUDE.md, "Admin pages").
export default function NewBook() {
  return (
    <Suspense fallback={<p className="py-6 text-fg-muted">Loading form…</p>}>
      <NewBookForm />
    </Suspense>
  );
}

async function NewBookForm() {
  await requireAdmin("/admin/reading/new");
  const [badges, articles] = await Promise.all([getBookBadgeSuggestions(), getArticleOptions()]);
  return <BookForm book={null} badgeSuggestions={badges} articles={articles} />;
}
