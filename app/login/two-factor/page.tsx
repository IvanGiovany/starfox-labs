import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SectionHeader } from "@/components/section-header";
import { getCurrentUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/next-path";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "../actions";
import { TwoFactorForm } from "./two-factor-form";

export const metadata: Metadata = {
  title: "Two-factor code",
  robots: { index: false, follow: false },
};

// The second step of signing in to the admin: a 6-digit code from the
// authenticator app (Phase 6). requireAdmin() sends the admin here while the
// session is still aal1; the code makes it aal2, then the page goes on to
// `next`. Anyone else reaching it is simply sent on.
export default function TwoFactorPage({ searchParams }: PageProps<"/login/two-factor">) {
  return (
    <>
      <SectionHeader title="one more step">
        Open your authenticator app and type the 6-digit code for Starfox Labs.
      </SectionHeader>
      <Suspense fallback={<p className="text-fg-muted">Loading…</p>}>
        <TwoFactorContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function TwoFactorContent({ searchParams }: { searchParams: PageProps<"/login/two-factor">["searchParams"] }) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null, "/admin");

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`); // signing in comes back through requireAdmin
  if (user.aal === "aal2") redirect(next);

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.mfa.listFactors();
  const factor = data?.totp[0]; // one factor, on as many devices as were scanned
  if (!factor) redirect(next);

  return (
    <div className="flex max-w-sm flex-col gap-6">
      <TwoFactorForm factorId={factor.id} next={next} />
      <p className="text-sm text-fg-muted">
        Lost your phone? Use the code from your backup device.
      </p>
      <form action={signOut}>
        <button type="submit" className="cursor-pointer text-sm text-fg-muted underline underline-offset-4 hover:text-fg">
          Sign out
        </button>
      </form>
    </div>
  );
}
