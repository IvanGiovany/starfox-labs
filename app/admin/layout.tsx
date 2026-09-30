import type { Metadata } from "next";
import { Suspense } from "react";
import { signOut } from "@/app/login/actions";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// Every page under /admin renders inside AdminGate: nothing is shown until the
// server has confirmed the visitor is an admin. Reading the session cookie is
// request-time work, which Cache Components requires inside <Suspense>.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<p className="py-10 text-fg-muted">Checking sign-in…</p>}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}

async function AdminGate({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="pb-8">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-rule pb-3 text-sm text-fg-muted">
        <span>
          Signed in as <span className="text-fg">{admin.email}</span>
        </span>
        <form action={signOut}>
          <button type="submit" className="min-h-11 cursor-pointer underline underline-offset-4 hover:text-fg">
            Sign out
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
