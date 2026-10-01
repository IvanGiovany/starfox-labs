"use client";

// A script that runs while the HTML is being parsed (e.g. applying the saved
// theme before the first paint), following Next's "preventing flash before
// hydration" guide.
//
// When React renders it in the browser (for instance when the 404 page is drawn
// by JavaScript), a <script> element would never run and React warns about it.
// So it's "text/javascript" in the server's HTML, where it runs once during
// parsing, and inert "text/plain" in the browser. It has to be a Client
// Component: in a Server Component, `typeof window` is always the server's answer.
// suppressHydrationWarning accepts the different `type` during hydration.
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
