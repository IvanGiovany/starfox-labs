import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeader } from "@/components/section-header";

export const metadata: Metadata = {
  title: "Account deleted",
  robots: { index: false, follow: false },
};

// Where Settings → Account → Delete account lands. Static: nothing here
// depends on who's visiting (by now, nobody is signed in).
export default function GoodbyePage() {
  return (
    <SectionHeader title="goodbye">
      Your account has been deleted: your sign-in, email address, profile and picture are gone.
      Thanks for reading, and you&apos;re always welcome back. <Link href="/">Back home</Link>
    </SectionHeader>
  );
}
