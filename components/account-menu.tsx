"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { PROFILE_CHANGED } from "@/lib/profile-events";
import { rememberHadAccount } from "@/lib/sign-up-memory";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// The header's account control: "Sign in", or a small avatar button with a
// menu (name, Settings, Admin for the admin, Sign out). It runs in the browser, so every
// public page stays static: the session is read from the cookie here, and the
// name from the public profile. The header's right side fades in after a
// second, so this is settled before anyone sees it; its space is kept so
// nothing moves. Showing the menu is only cosmetic: what someone may do is
// still decided on the server and by the database.

type Account = { id: string; name: string; username: string | null; avatarPath: string | null; isAdmin: boolean };
type State = { status: "loading" } | { status: "signed-out" } | { status: "signed-in"; account: Account };

export function AccountMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });
  // The page the menu was opened on: it's open only there, so moving to
  // another page closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const close = () => setOpenOn(null);
  const loadedFor = useRef<string | null | undefined>(undefined);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Check the session on every page change, and when the tab comes back into
  // focus. Signing in with the code (a server action) or signing out of the
  // admin changes the cookie without telling this browser client, and the
  // header stays mounted across pages. Reading the cookie is cheap; the
  // profile is only fetched when the person changes, or when Settings says
  // the profile did (PROFILE_CHANGED).
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    async function check() {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id ?? null;
      if (cancelled || userId === loadedFor.current) return;
      loadedFor.current = userId;
      if (!userId) return setState({ status: "signed-out" });
      rememberHadAccount(); // the sign-up prompt never shows on this browser again

      const [{ data: profile }, { data: admin }] = await Promise.all([
        supabase.from("profiles").select("username, display_name, avatar_path").eq("id", userId).maybeSingle(),
        supabase.rpc("is_admin_account"), // the Admin link shows before the two-factor code too
      ]);
      if (cancelled || loadedFor.current !== userId) return;
      setState({
        status: "signed-in",
        account: {
          id: userId,
          name: profile?.display_name ?? "You",
          username: profile?.username ?? null,
          avatarPath: profile?.avatar_path ?? null,
          isAdmin: admin === true,
        },
      });
    }

    const reload = () => {
      loadedFor.current = undefined;
      check();
    };

    check();
    window.addEventListener("focus", check);
    window.addEventListener(PROFILE_CHANGED, reload);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", check);
      window.removeEventListener(PROFILE_CHANGED, reload);
    };
  }, [pathname]);

  // Close on Escape (focus back on the button), and on a click or tap
  // anywhere else.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      close();
      buttonRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  async function signOut() {
    // This browser only; other devices stay signed in.
    await createSupabaseBrowserClient().auth.signOut({ scope: "local" });
    loadedFor.current = null;
    setState({ status: "signed-out" });
    close();
    // Signed-in pages make no sense any more; every other page stays put.
    if (/^\/(admin|settings)(\/|$)/.test(pathname)) router.push("/");
    router.refresh();
  }

  if (state.status === "loading") {
    // Holds the avatar's space until the session is known.
    return <span className="block size-6" aria-hidden="true" />;
  }

  if (state.status === "signed-out") {
    const next = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return (
      <Link href={`/login${next}`} className="text-fg-muted no-underline transition-colors hover:text-fg">
        Sign in
      </Link>
    );
  }

  const { account } = state;
  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpenOn(open ? null : pathname)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Account: ${account.name}`}
        className="-m-1 flex cursor-pointer rounded-full p-1 transition-opacity hover:opacity-80"
      >
        <Avatar name={account.name} path={account.avatarPath} size={24} />
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          className="absolute top-full right-0 mt-3 w-60 rounded-lg border border-rule bg-bg p-1.5 shadow-lg"
        >
          <div className="flex items-center gap-3 px-3 pt-2 pb-2.5">
            <Avatar name={account.name} path={account.avatarPath} size={36} />
            <div className="min-w-0">
              <p className="truncate text-fg">{account.name}</p>
              {account.username && <p className="truncate text-xs text-fg-muted">@{account.username}</p>}
            </div>
          </div>
          {/* No prefetch for signed-in pages: after signing out, a prefetch of
              them is redirected to /login and only adds noise. */}
          <div className="border-t border-rule pt-1.5">
            <Link href="/settings" prefetch={false} className={ITEM}>
              Settings
            </Link>
            {account.isAdmin && (
              <Link href="/admin" prefetch={false} className={ITEM}>
                Admin
              </Link>
            )}
            <button type="button" onClick={signOut} className={`${ITEM} w-full cursor-pointer text-left`}>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const ITEM = "flex min-h-11 items-center rounded-md px-3 text-fg no-underline transition-colors hover:bg-bg-raised focus-visible:bg-bg-raised";
