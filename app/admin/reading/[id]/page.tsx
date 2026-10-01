import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getArticleOptions } from "@/lib/admin/items/article-options";
import { getBookBadgeSuggestions, getEditableBook } from "@/lib/admin/items/load-books";
import { requireAdmin } from "@/lib/auth";
import { BookForm } from "../book-form";

// Request-time work sits behind this page's own <Suspense> (see CLAUDE.md, "Admin pages").
export default function EditBook({ params }: PageProps<"/admin/reading/[id]">) {
  return (
    <Suspense fallback={<p className="py-6 text-fg-muted">Loading book…</p>}>
      <EditBookForm params={params} />
    </Suspense>
  );
}

async function EditBookForm({ params }: { params: PageProps<"/admin/reading/[id]">["params"] }) {
  const { id } = await params;
  await requireAdmin(`/admin/reading/${id}`);
  const [book, badges, articles] = await Promise.all([getEditableBook(id), getBookBadgeSuggestions(), getArticleOptions()]);
  if (!book) notFound();

  // key: opening another book starts a fresh form instead of reusing this one's state.
  return <BookForm key={book.id} book={book} badgeSuggestions={badges} articles={articles} />;
}
