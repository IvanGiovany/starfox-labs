import { Suspense } from "react";
import { isAdmin, requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PictureField } from "./picture-field";
import { ProfileForm } from "./profile-form";
import { SignInMethods, type Identity } from "./sign-in-methods";

// Settings → Profile: picture, name and username, sign-in methods.
export default function ProfilePage({ searchParams }: PageProps<"/settings">) {
  return (
    <Suspense fallback={<p className="text-fg-muted">Loading your profile…</p>}>
      <Profile searchParams={searchParams} />
    </Suspense>
  );
}

async function Profile({ searchParams }: { searchParams: PageProps<"/settings">["searchParams"] }) {
  const user = await requireUser("/settings");
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const [{ data: profile }, { data: auth }, admin, { data: nextUsernameChange }] = await Promise.all([
    supabase.from("profiles").select("username, display_name, avatar_path").eq("id", user.id).single(),
    supabase.auth.getUser(),
    isAdmin(),
    supabase.rpc("next_username_change"), // null when it may change now (always for the admin)
  ]);

  if (!profile) {
    return <p className="text-danger">Your profile couldn&apos;t be loaded. Reload the page to try again.</p>;
  }

  const identities: Identity[] = (auth.user?.identities ?? []).map((identity) => ({
    provider: identity.provider,
    email: typeof identity.identity_data?.email === "string" ? identity.identity_data.email : null,
  }));

  return (
    <div className="flex flex-col gap-12">
      <Section title="Picture">
        <PictureField userId={user.id} name={profile.display_name} path={profile.avatar_path} />
      </Section>
      <Section title="Name">
        <ProfileForm
          userId={user.id}
          isAdmin={admin}
          initial={{ displayName: profile.display_name, username: profile.username }}
          nextUsernameChange={nextUsernameChange ?? null}
        />
      </Section>
      <Section title="Sign-in methods">
        <SignInMethods email={user.email} identities={identities} linkFailed={params.error === "google"} />
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
