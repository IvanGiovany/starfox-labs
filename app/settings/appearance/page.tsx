import { ThemeChoices } from "./theme-choices";

// Settings → Appearance. Nothing here needs the account: the choice is kept in
// this browser (lib/theme.ts), so the page itself is static.
export default function AppearancePage() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-serif text-2xl">Theme</h2>
      <ThemeChoices />
      <p className="text-sm text-fg-muted">
        Saved in this browser, so each of your devices keeps its own. The moon and sun button at the
        top of every page switches it too.
      </p>
    </section>
  );
}
