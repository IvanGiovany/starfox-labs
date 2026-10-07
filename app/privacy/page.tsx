import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeader } from "@/components/section-header";
import { openGraphDefaults, site } from "@/lib/site";

// What the site stores and why, in plain words. Keep it true: update it when
// something changes (profile pictures in 4.3, deleting your account in 4.4,
// comments in Phase 5, the newsletter in Phase 6). Google's sign-in screen
// links here, so it must stay live.

const CONTACT = "starfoxlabs.contact@gmail.com";
const UPDATED = "7 October 2026";

const description = `What ${site.name} stores, who can see it, and how to remove it.`;

export const metadata: Metadata = {
  title: "Privacy",
  description,
  alternates: { canonical: "/privacy" },
  openGraph: { ...openGraphDefaults, url: "/privacy", title: "Privacy", description },
};

export default function PrivacyPage() {
  return (
    <>
      <SectionHeader title="privacy">
        The short version: you can read everything here without an account, and nothing tracks
        you. If you make an account, this page says exactly what&apos;s stored and who can see it.
      </SectionHeader>

      <div className="prose">
        <h2>Reading without an account</h2>
        <ul>
          <li>No analytics, no ads, no tracking cookies.</li>
          <li>
            Your light or dark theme choice is kept in your own browser (local storage). It never
            leaves your device.
          </li>
          <li>
            The site is hosted by Vercel, which keeps short-lived request logs (such as your IP
            address and browser) to run and protect the service.
          </li>
          <li>
            Videos are embedded from youtube-nocookie.com and only load when you press play. Their
            preview images do come from YouTube&apos;s servers, so Google sees that request.
          </li>
        </ul>

        <h2>If you make an account</h2>
        <p>Accounts are optional. You can sign in with Google or with your email address.</p>
        <p>
          <strong>Private</strong> (only you, and {site.author} as the site&apos;s owner, through the
          database):
        </p>
        <ul>
          <li>Your email address. It&apos;s used to sign you in and is never shown on the site.</li>
          <li>How you sign in (email, Google or both), and when you joined and last signed in.</li>
          <li>
            If you use Google: Google shares your name, email address and profile picture. Only
            your first name is used, as your starting display name, which you can change.
          </li>
        </ul>
        <p>
          <strong>Public</strong> (anyone can see it, for example next to comments): your display
          name, your username and when you joined. New accounts get a random username
          (like <code>reader_482913</code>) that you can change.
        </p>
        <p>
          To keep you signed in, the site sets sign-in cookies in your browser. They&apos;re used for
          nothing else.
        </p>

        <h2>Where it&apos;s stored</h2>
        <ul>
          <li>
            <strong>Supabase</strong>: the database, sign-in and uploaded files, in Tokyo, Japan.
          </li>
          <li>
            <strong>Vercel</strong>: hosts the site.
          </li>
          <li>
            <strong>Resend</strong>: sends the sign-in emails.
          </li>
          <li>
            <strong>Google</strong>: only if you choose to sign in with Google.
          </li>
        </ul>
        <p>Nothing is sold or shared with anyone else, and there are no ads.</p>

        <h2>Removing your account</h2>
        <p>
          Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a> from the address you signed up with, and
          your account and profile will be deleted. (A delete button in your settings is on its
          way.)
        </p>

        <h2>Questions</h2>
        <p>
          Anything else, write to <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>

        <p className="text-fg-muted">
          Last updated {UPDATED}. <Link href="/">Back home</Link>
        </p>
      </div>
    </>
  );
}
