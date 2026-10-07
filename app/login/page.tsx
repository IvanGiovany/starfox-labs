import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SectionHeader } from "@/components/section-header";
import { getCurrentUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/next-path";
import { signOut } from "./actions";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

// One sign-in for everyone: readers and the admin. Signing in only proves who
// you are; the admin is whoever is in public.admins (lib/auth.ts, RLS).
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <SectionHeader title="sign in">
        Optional: everything here can be read without an account. With one you get a profile
        with your name and picture, and soon you can comment on articles.
      </SectionHeader>
      {/* Reads the URL and the session cookie, so it renders per request. */}
      <Suspense fallback={<LoginForm next="/" />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
      <p className="mt-10 max-w-sm text-sm text-fg-muted">
        <Link href="/privacy" className="text-fg-muted underline underline-offset-4 hover:text-fg">
          Privacy
        </Link>
        : what an account stores, and who can see it.
      </p>
    </>
  );
}

const ERRORS: Record<string, string> = {
  link: "That sign-in link is invalid or has expired. Sign in again to get a new one.",
  google: "Google sign-in didn't finish. Try again, or use your email.",
};

const NOTICES: Record<string, string> = {
  "signed-out-everywhere": "You're signed out on all your devices.",
};

async function LoginContent({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  const error = typeof params.error === "string" ? params.error : null;
  const notice = typeof params.notice === "string" ? params.notice : null;

  const user = await getCurrentUser();

  if (user && error === "not-admin") {
    return (
      <div className="flex max-w-sm flex-col gap-4">
        <p className="text-fg-muted">
          You&apos;re signed in as <span className="text-fg">{user.email}</span>, but this account
          can&apos;t open the admin.
        </p>
        <form action={signOut}>
          <button type="submit" className="button-primary">
            Sign out
          </button>
        </form>
      </div>
    );
  }

  // Already signed in: nothing to do here.
  if (user) redirect(next);

  return (
    <div className="flex flex-col gap-4">
      {notice && NOTICES[notice] && (
        <p role="status" className="max-w-sm text-sm text-fg">
          {NOTICES[notice]}
        </p>
      )}
      {error && ERRORS[error] && (
        <p role="alert" className="max-w-sm text-sm text-danger">
          {ERRORS[error]}
        </p>
      )}
      <LoginForm next={next} />
    </div>
  );
}
