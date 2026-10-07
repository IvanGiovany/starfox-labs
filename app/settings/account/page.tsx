import { Suspense } from "react";
import { isAdmin, requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOutEverywhere } from "./actions";
import { DeleteAccountForm } from "./delete-account-form";

// Settings → Account: the private details, signing out everywhere, and
// deleting the account (not the admin's).
export default function AccountPage() {
  return (
    <Suspense fallback={<p className="text-fg-muted">Loading your account…</p>}>
      <Account />
    </Suspense>
  );
}

async function Account() {
  const user = await requireUser("/settings/account");
  const supabase = await createSupabaseServerClient();
  const [{ data: profile }, admin] = await Promise.all([
    supabase.from("profiles").select("username, created_at").eq("id", user.id).single(),
    isAdmin(),
  ]);
  if (!profile) {
    return <p className="text-danger">Your account couldn&apos;t be loaded. Reload the page to try again.</p>;
  }

  return (
    <div className="flex flex-col gap-12">
      <Section title="Your account">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
          <dt className="text-fg-muted">Email</dt>
          <dd className="min-w-0 break-words">{user.email ?? "none"}</dd>
          <dt className="text-fg-muted">Member since</dt>
          <dd>
            <time dateTime={profile.created_at}>{formatDate(profile.created_at)}</time>
          </dd>
        </dl>
        <p className="text-sm text-fg-muted">Only you can see these.</p>
      </Section>

      <Section title="Sign out on all devices">
        <p className="text-fg-muted">
          Ends every session: this browser, your phone, anywhere else you&apos;re signed in. Handy
          if you lost a device or signed in somewhere you shouldn&apos;t have.
        </p>
        <form action={signOutEverywhere}>
          <button type="submit" autoComplete="off" className="button-secondary">
            Sign out everywhere
          </button>
        </form>
      </Section>

      <Section title="Delete account">
        {admin ? (
          <p className="text-fg-muted">
            This is the site&apos;s admin account, so it can&apos;t be deleted here.
          </p>
        ) : (
          <>
            <div className="text-fg-muted">
              <p>This deletes, for good:</p>
              <ul className="mt-2 list-disc pl-5">
                <li>your sign-in and email address</li>
                <li>your profile: name, username and picture</li>
              </ul>
              <p className="mt-2">
                You can sign up again later with the same email, as a new account.
              </p>
            </div>
            <DeleteAccountForm username={profile.username} />
          </>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-serif text-2xl">{title}</h2>
      {children}
    </section>
  );
}
