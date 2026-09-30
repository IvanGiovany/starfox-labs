import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SectionHeader } from "@/components/section-header";
import { getCurrentUser, isAdmin, safeNextPath } from "@/lib/auth";
import { signOut } from "./actions";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <SectionHeader title="sign in">
        This sign-in is for the site&apos;s admin. Reader accounts are coming later.
      </SectionHeader>
      {/* Reads the URL and the session cookie, so it renders per request. */}
      <Suspense fallback={<LoginForm next="/admin" />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function LoginContent({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  const error = typeof params.error === "string" ? params.error : null;

  const user = await getCurrentUser();

  // Already signed in as an admin: skip the form.
  if (user && error !== "not-admin" && (await isAdmin())) redirect(next);

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

  return (
    <div className="flex flex-col gap-4">
      {error === "link" && (
        <p role="alert" className="max-w-sm text-sm text-danger">
          That sign-in link is invalid or has expired. Enter your email to get a new one.
        </p>
      )}
      <LoginForm next={next} />
    </div>
  );
}
