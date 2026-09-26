// Temporary design-system check. Replaced by the real home page in step 4.
export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">Starfox Labs</h1>
      <p className="mt-2 text-sm text-fg-muted">Design system preview</p>

      <div className="prose mt-10">
        <p>
          Body text in Newsreader, set at a comfortable reading width with{" "}
          <a href="#">an inline link</a> and some <code>inline code</code>.
        </p>
        <h2>A second-level heading</h2>
        <blockquote>A quote, in the muted ink color.</blockquote>
        <pre>
          <code>{`const theme = localStorage.getItem("theme");`}</code>
        </pre>
      </div>

      <p className="mt-10 text-sm">
        <span className="glow text-accent">Accent with glow</span>
        <span className="text-fg-muted"> · muted metadata · 2026-09-26</span>
      </p>
    </main>
  );
}
