import type { Metadata } from "next";
import { SectionHeader } from "@/components/section-header";
import { SettingsTabs } from "./settings-tabs";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

// Settings for a signed-in reader (or the admin, for their own profile).
// proxy.ts sends signed-out visitors to /login first; each page also checks
// with requireUser() inside its own <Suspense>, like the admin pages.
// Tabs: Profile, Appearance; Account (delete) comes in 4.4, Newsletter in Phase 6.
export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return (
    <>
      <SectionHeader title="settings">
        Your profile and how the site looks for you. Your name, username and picture are public;
        your email address never is.
      </SectionHeader>
      <SettingsTabs />
      <div className="mt-8 max-w-xl pb-8">{children}</div>
    </>
  );
}
