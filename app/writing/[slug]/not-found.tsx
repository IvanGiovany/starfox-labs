import { NotFoundPage } from "@/components/not-found-page";

// /writing/<slug> for an article that doesn't exist or isn't published.
export default function ArticleNotFound() {
  return (
    <NotFoundPage>
      There&apos;s no article at this address. It may have been renamed, or it isn&apos;t published
      yet.
    </NotFoundPage>
  );
}
