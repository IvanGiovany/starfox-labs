import { Suspense } from "react";
import { isAdminAccount, requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOutEverywhere } from "./actions";
import { DeleteAccountForm } from "./delete-account-form";
import { TwoFactorSetup } from "./two-factor";

// Settings → Account: the private details, two-factor sign-in (the admin
// only), signing out everywhere, and deleting the account (not the admin's).
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
  const [{ data: profile }, admin, { count: comments }] = await Promise.all([
    supabase.from("profiles").select("username, created_at").eq("id", user.id).single(),
    isAdminAccount(),
    // Comments the reader can see: on published articles (a placeholder isn't theirs any more).
    supabase.from("comments").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("deleted_at", null),
  ]);
  if (!profile) {
    return <p className="text-danger">Your account couldn&apos;t be loaded. Reload the page to try again.</p>;
  }
  // Verified authenticators (asked of Supabase Auth); the admin only.
  const factor = admin ? (await supabase.auth.mfa.listFactors()).data?.totp[0] : undefined;

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

      {admin && (
        <Section title="Two-factor sign-in" id="two-factor">
          <TwoFactorSetup factor={factor ? { id: factor.id, createdAt: factor.updated_at } : null} />
        </Section>
      )}

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
                {commentCount(comments ?? 0)} Your comments stay, shown as &ldquo;deleted user&rdquo;,
                without your name, username or picture. If you&apos;d like some gone, delete them
                first: each of your comments has a Delete button.
              </p>
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

/** "You've written 3 comments." */
function commentCount(n: number): string {
  if (n === 0) return "You haven't written any comments.";
  return `You've written ${n} comment${n === 1 ? "" : "s"}.`;
}

function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-28 flex-col gap-4">
      <h2 className="font-serif text-2xl">{title}</h2>
      {children}
    </section>
  );
}
